import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { CSSProperties, useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  value: string;
  defaultValue?: string;
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  onChange?: (value: string) => Promise<unknown>;
  saveChange?: (value: string) => Promise<unknown>;
  saveOnChange?: boolean;
  showSave?: boolean;
  size?: "small" | "medium";
  sx?: CSSProperties;
};

const defaultSx = {
  width: "100%",
};

const noopAsync = async () => undefined;

const SelectField = ({
  value,
  defaultValue,
  options,
  label,
  onChange = noopAsync,
  saveChange = noopAsync,
  saveOnChange = true,
  disabled = false,
  showSave = true,
  size = "medium",
  sx,
}: SelectFieldProps) => {
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const onChangeRef = useRef(onChange);
  const saveChangeRef = useRef(saveChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    saveChangeRef.current = saveChange;
  }, [saveChange]);

  useEffect(() => {
    if (value) {
      setInputValue(value);
    } else {
      setInputValue(defaultValue || "");
    }
  }, [defaultValue, value]);

  useEffect(() => {
    if (!inputChanged) {
      return;
    }

    (async () => {
      await onChangeRef.current(inputValue);
      if (saveOnChange) {
        setChangeExecuting(true);
        await saveChangeRef.current(inputValue);
        setChangeExecuting(false);
      }
      setInputChanged(false);
    })();
  }, [inputChanged, inputValue, saveOnChange]);

  return options ? (
    <Stack direction="column">
      <TextField
        select
        label={label}
        value={inputValue === null ? defaultValue : inputValue}
        defaultValue={defaultValue}
        onChange={event => {
          setInputValue(event.target.value);
          setInputChanged(true);
        }}
        sx={Object.assign({}, defaultSx, sx)}
        size={size}
        disabled={disabled}
      >
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
      {changeExecuting === true && showSave && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "grey" }}>
          Saving Change...
        </Typography>
      )}
      {changeExecuting === false && showSave && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "green" }}>
          Saved.
        </Typography>
      )}
    </Stack>
  ) : null;
};

export default SelectField;
