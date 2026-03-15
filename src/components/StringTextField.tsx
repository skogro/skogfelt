import ClearIcon from "@mui/icons-material/Clear";
import { InputAdornment, Stack, TextField } from "@mui/material";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import FieldSaveStatus from "./FieldSaveStatus";
import useDebouncedSaveTrigger from "../hooks/useDebouncedSaveTrigger";
import useQueuedFieldSave from "../hooks/useQueuedFieldSave";

export type StringTextFieldProps = {
  value: string | number | null | undefined;
  name: string;
  label: string;
  disabled?: boolean;
  onChange?: (value: string) => Promise<unknown>;
  saveChange?: (value: string) => Promise<unknown>;
  saveOnChange?: boolean;
  multiline?: boolean;
  required?: boolean;
  showErase?: boolean;
  onErase?: () => Promise<unknown>;
  size?: "small" | "medium";
};

const noopAsync = async () => undefined;

const StringTextField = ({
  value,
  name,
  label,
  disabled = false,
  onChange = noopAsync,
  saveChange = noopAsync,
  saveOnChange = true,
  multiline = false,
  required = false,
  showErase = false,
  onErase = noopAsync,
  size = "medium",
}: StringTextFieldProps) => {
  const initialValue = value ? String(value) : "";
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const [inputValueValid, setInputValueValid] = useState<boolean>(true);
  const [inputValueHelper, setInputValueHelper] = useState<string>("");
  const {
    changeExecuting,
    changeError,
    isDirty,
    isDirtyRef,
    inputKeyRef,
    currentSavingValueRef,
    awaitingExternalSyncRef,
    pendingSavedValueRef,
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
    const normalizedValue = value ? String(value) : "";
    syncExternalKey(normalizedValue, () => {
      setInputValue(normalizedValue);
    });
  }, [value, syncExternalKey]);

  useEffect(() => {
    if (required && inputValue.trim() === "") {
      setInputValueValid(false);
      setInputValueHelper(`${label} is required`);
      return;
    }

    setInputValueValid(true);
    setInputValueHelper("");
  }, [inputValue, label, required]);

  const queueSave = useCallback(
    (valueToSave: string) => {
      enqueueSave({
        valueKey: valueToSave,
        runSave: async () => {
          await onChange(valueToSave);
          await saveChange(valueToSave);
        },
      });
    },
    [enqueueSave, onChange, saveChange]
  );

  const { flushPendingSave, scheduleSave } = useDebouncedSaveTrigger<string>({
    saveOnChange,
    isDirtyRef,
    inputKeyRef,
    currentSavingValueRef,
    awaitingExternalSyncRef,
    pendingSavedValueRef,
    queueSave,
  });

  return (
    <Stack direction="column">
      <TextField
        label={label}
        placeholder={inputValue === "" ? label : ""}
        name={name}
        value={inputValue || ""}
        helperText={inputValueHelper}
        error={!inputValueValid}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const nextValue = event.target.value;
          markUserInput(nextValue);
          setInputValue(nextValue);
          scheduleSave(nextValue);
        }}
        onBlur={flushPendingSave}
        size={size}
        sx={{ width: "100%" }}
        multiline={multiline}
        InputProps={{
          endAdornment:
            showErase && inputValue ? (
              <InputAdornment position="end" onClick={onErase}>
                <ClearIcon sx={{ color: "red" }} />
              </InputAdornment>
            ) : null,
        }}
      />
      <FieldSaveStatus
        changeExecuting={changeExecuting}
        changeError={changeError}
        isDirty={isDirty}
        errorText="Save failed. Keep typing to retry."
      />
    </Stack>
  );
};

export default StringTextField;
