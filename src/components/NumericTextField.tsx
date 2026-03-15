import ClearIcon from "@mui/icons-material/Clear";
import { InputAdornment, Stack, TextField } from "@mui/material";
import numeral from "numeral";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import validator from "validator";
import FieldSaveStatus from "./FieldSaveStatus";
import useDebouncedSaveTrigger from "../hooks/useDebouncedSaveTrigger";
import useQueuedFieldSave from "../hooks/useQueuedFieldSave";

export type NumericTextFieldProps = {
  value: number | null;
  label: string;
  disabled?: boolean;
  onChange?: (value: number) => Promise<unknown>;
  saveChange?: (value: number) => Promise<unknown>;
  saveOnChange?: boolean;
  required?: boolean;
  format?: string;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  showErase?: boolean;
  onErase?: () => Promise<unknown>;
  size?: "small" | "medium";
};

const noopAsync = async () => undefined;

const NumericTextField = ({
  value,
  label,
  disabled = false,
  onChange = noopAsync as (value: number) => Promise<unknown>,
  saveChange = noopAsync as (value: number) => Promise<unknown>,
  saveOnChange = true,
  required = false,
  allowNegative = false,
  format,
  min,
  max,
  showErase = false,
  onErase = noopAsync,
  size = "medium",
}: NumericTextFieldProps) => {
  const formatValue = useCallback(
    (val: number | null) => (format ? numeral(val).format(format) : String(val ?? "")),
    [format]
  );

  const initialValue = formatValue(value);
  const [inputValue, setInputValue] = useState<string>(initialValue);
  const [inputValueValid, setInputValueValid] = useState<boolean>(true);
  const [inputValueHelper, setInputValueHelper] = useState<string>("");
  const areValuesEquivalent = useCallback((left: string, right: string) => {
    const leftNumber = numeral(left).value();
    const rightNumber = numeral(right).value();
    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber === rightNumber;
    }
    return left === right;
  }, []);
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
    isEqual: areValuesEquivalent,
  });

  useEffect(() => {
    updateInputKey(inputValue);
  }, [inputValue, updateInputKey]);

  useEffect(() => {
    const normalizedValue = formatValue(value);
    syncExternalKey(normalizedValue, () => {
      setInputValue(normalizedValue);
    });
  }, [formatValue, syncExternalKey, value]);

  const validateValue = useCallback(
    (val: string) => {
      if (val.trim() === "") {
        if (required) {
          setInputValueValid(false);
          setInputValueHelper(`${label} is required`);
        } else {
          setInputValueValid(true);
          setInputValueHelper("");
        }
        return { valid: false, parsed: null as number | null, shouldSave: false };
      }

      if (!validator.isNumeric(val.toString())) {
        setInputValueValid(false);
        setInputValueHelper(`${label} must be a number`);
        return { valid: false, parsed: null as number | null, shouldSave: false };
      }

      const parsed = Number(val);

      if (!allowNegative && parsed < 0) {
        setInputValueValid(false);
        setInputValueHelper(`${label} must be greater than 0`);
        return { valid: false, parsed: null as number | null, shouldSave: false };
      }

      if (min !== undefined && parsed < min) {
        setInputValueValid(false);
        setInputValueHelper(`${label} must be greater than ${min}`);
        return { valid: false, parsed: null as number | null, shouldSave: false };
      }

      if (max !== undefined && parsed > max) {
        setInputValueValid(false);
        setInputValueHelper(`${label} must be less than ${max}`);
        return { valid: false, parsed: null as number | null, shouldSave: false };
      }

      setInputValueValid(true);
      setInputValueHelper("");
      return { valid: true, parsed, shouldSave: true };
    },
    [allowNegative, label, max, min, required]
  );

  useEffect(() => {
    validateValue(inputValue);
  }, [inputValue, validateValue]);

  const queueSave = useCallback(
    (valueToSave: string) => {
      enqueueSave({
        valueKey: valueToSave,
        beforeSave: () => {
          const validation = validateValue(valueToSave);
          if (!validation.valid || validation.parsed === null || !validation.shouldSave) {
            return { skip: true };
          }
          return {};
        },
        runSave: async () => {
          const validation = validateValue(valueToSave);
          if (!validation.valid || validation.parsed === null || !validation.shouldSave) {
            return;
          }

          await onChange(validation.parsed);
          await saveChange(validation.parsed);
        },
      });
    },
    [enqueueSave, onChange, saveChange, validateValue]
  );

  const shouldScheduleNumericSave = useCallback(
    (nextValue: string) => {
      const validation = validateValue(nextValue);
      return validation.valid && validation.shouldSave;
    },
    [validateValue]
  );

  const { flushPendingSave, scheduleSave } = useDebouncedSaveTrigger<string>({
    saveOnChange,
    isDirtyRef,
    inputKeyRef,
    currentSavingValueRef,
    awaitingExternalSyncRef,
    pendingSavedValueRef,
    queueSave,
    isEquivalent: areValuesEquivalent,
    shouldSchedule: shouldScheduleNumericSave,
  });

  return (
    <Stack direction="column">
      <TextField
        label={label}
        placeholder={inputValue === "" ? label : ""}
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

export default NumericTextField;
