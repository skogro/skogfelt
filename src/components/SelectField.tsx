import { MenuItem, Stack, TextField } from "@mui/material";
import { CSSProperties, useEffect, useState } from "react";
import FieldSaveStatus from "./FieldSaveStatus";
import useQueuedFieldSave from "../hooks/useQueuedFieldSave";

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
  const initialValue = value || defaultValue || "";
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const {
    changeExecuting,
    changeError,
    isDirty,
    updateInputKey,
    markUserInput,
    syncExternalKey,
    enqueueSave,
  } = useQueuedFieldSave<string>({
    initialInputKey: initialValue,
    initialExternalKey: initialValue,
  });

  useEffect(() => {
    updateInputKey(inputValue);
  }, [inputValue, updateInputKey]);

  useEffect(() => {
    const normalizedValue = value || defaultValue || "";
    syncExternalKey(normalizedValue, () => {
      setInputValue(normalizedValue);
    });
  }, [defaultValue, value, syncExternalKey]);

  return options ? (
    <Stack direction="column">
      <TextField
        select
        label={label}
        value={inputValue}
        defaultValue={defaultValue}
        onChange={event => {
          const nextValue = event.target.value;
          markUserInput(nextValue);
          setInputValue(nextValue);
          enqueueSave({
            valueKey: nextValue,
            showSavingStatus: saveOnChange,
            runSave: async () => {
              await onChange(nextValue);
              if (saveOnChange) {
                await saveChange(nextValue);
              }
            },
          });
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
      <FieldSaveStatus
        changeExecuting={changeExecuting}
        changeError={changeError}
        isDirty={isDirty}
        showSave={showSave}
        errorText="Save failed. Pick another option to retry."
      />
    </Stack>
  ) : null;
};

export default SelectField;
