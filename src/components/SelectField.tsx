import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

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
  const [inputValue, setInputValue] = useState<string>(value || defaultValue || "");
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const inputValueRef = useRef<string>(inputValue);
  const externalValueRef = useRef<string>(value || defaultValue || "");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const queuedSaveSeqRef = useRef<number>(0);
  const currentSavingValueRef = useRef<string | null>(null);
  const mountedRef = useRef<boolean>(true);
  const awaitingExternalSyncRef = useRef<boolean>(false);
  const pendingSavedValueRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    const normalizedValue = value || defaultValue || "";
    externalValueRef.current = normalizedValue;

    if (awaitingExternalSyncRef.current) {
      if (normalizedValue === pendingSavedValueRef.current) {
        awaitingExternalSyncRef.current = false;
        pendingSavedValueRef.current = null;
        setIsDirty(false);
      }
      return;
    }

    if (!isDirty) {
      setInputValue(normalizedValue);
    }
  }, [defaultValue, value, isDirty]);

  const enqueueSave = useCallback(
    (valueToSave: string) => {
      const saveSeq = ++queuedSaveSeqRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (saveSeq < queuedSaveSeqRef.current || !mountedRef.current) {
          return;
        }

        currentSavingValueRef.current = valueToSave;
        setChangeExecuting(saveOnChange ? true : null);
        setChangeError(null);

        try {
          await onChange(valueToSave);
          if (saveOnChange) {
            await saveChange(valueToSave);
          }

          if (!mountedRef.current) {
            return;
          }

          setChangeExecuting(saveOnChange ? false : null);
          setChangeError(null);
          if (inputValueRef.current === valueToSave && saveSeq === queuedSaveSeqRef.current) {
            if (externalValueRef.current === valueToSave) {
              awaitingExternalSyncRef.current = false;
              pendingSavedValueRef.current = null;
              setIsDirty(false);
            } else {
              awaitingExternalSyncRef.current = true;
              pendingSavedValueRef.current = valueToSave;
            }
          }
        } catch (error) {
          if (!mountedRef.current) {
            return;
          }

          const message = error instanceof Error ? error.message : "Failed to save";
          setChangeExecuting(false);
          setChangeError(message);
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setIsDirty(true);
        } finally {
          if (currentSavingValueRef.current === valueToSave) {
            currentSavingValueRef.current = null;
          }
        }
      });
    },
    [onChange, saveChange, saveOnChange]
  );

  return options ? (
    <Stack direction="column">
      <TextField
        select
        label={label}
        value={inputValue}
        defaultValue={defaultValue}
        onChange={event => {
          const nextValue = event.target.value;
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setInputValue(nextValue);
          setIsDirty(true);
          setChangeError(null);
          setChangeExecuting(null);
          enqueueSave(nextValue);
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
      {changeExecuting === false && !changeError && !isDirty && showSave && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "green" }}>
          Saved.
        </Typography>
      )}
      {changeError && showSave && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "error.main" }}>
          Save failed. Pick another option to retry.
        </Typography>
      )}
    </Stack>
  ) : null;
};

export default SelectField;
