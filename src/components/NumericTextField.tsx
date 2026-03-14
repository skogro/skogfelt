import ClearIcon from "@mui/icons-material/Clear";
import { InputAdornment, Stack, TextField, Typography } from "@mui/material";
import numeral from "numeral";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import validator from "validator";

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
  const [inputValue, setInputValue] = useState<string>(format ? numeral(value).format(format) : String(value ?? ""));
  const [inputValueValid, setInputValueValid] = useState<boolean>(true);
  const [inputValueHelper, setInputValueHelper] = useState<string>("");
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const inputValueRef = useRef<string>(inputValue);
  const externalValueRef = useRef<string>(format ? numeral(value).format(format) : String(value ?? ""));
  const isDirtyRef = useRef<boolean>(isDirty);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedSaveSeqRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const awaitingExternalSyncRef = useRef<boolean>(false);
  const pendingSavedValueRef = useRef<string | null>(null);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const normalizedValue = format ? numeral(value).format(format) : String(value ?? "");
    externalValueRef.current = normalizedValue;

    if (awaitingExternalSyncRef.current) {
      const externalNumber = numeral(normalizedValue).value();
      const pendingNumber = numeral(pendingSavedValueRef.current ?? "").value();
      const hasNumericMatch =
        externalNumber !== null && pendingNumber !== null && externalNumber === pendingNumber;
      const hasStringMatch = normalizedValue === pendingSavedValueRef.current;

      if (hasNumericMatch || hasStringMatch) {
        awaitingExternalSyncRef.current = false;
        pendingSavedValueRef.current = null;
        setIsDirty(false);
      }
      return;
    }

    if (!isDirty) {
      setInputValue(normalizedValue);
    }
  }, [format, value, isDirty]);

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

  const enqueueSave = useCallback(
    (valueToSave: string) => {
      const saveSeq = ++queuedSaveSeqRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (saveSeq < queuedSaveSeqRef.current || !mountedRef.current) {
          return;
        }

        const validation = validateValue(valueToSave);
        if (!validation.valid || validation.parsed === null || !validation.shouldSave) {
          return;
        }

        setChangeExecuting(true);
        setChangeError(null);

        try {
          await onChange(validation.parsed);
          await saveChange(validation.parsed);

          if (!mountedRef.current) {
            return;
          }

          setChangeExecuting(false);
          setChangeError(null);
          if (inputValueRef.current === valueToSave && saveSeq === queuedSaveSeqRef.current) {
            const externalNumber = numeral(externalValueRef.current).value();
            const savedNumber = numeral(valueToSave).value();
            const hasNumericMatch =
              externalNumber !== null && savedNumber !== null && externalNumber === savedNumber;
            const hasStringMatch = externalValueRef.current === valueToSave;

            if (hasNumericMatch || hasStringMatch) {
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
        }
      });
    },
    [onChange, saveChange, validateValue]
  );

  const flushPendingSave = useCallback(() => {
    if (!saveOnChange || !isDirtyRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    enqueueSave(inputValueRef.current);
  }, [enqueueSave, saveOnChange]);

  useEffect(() => {
    if (!saveOnChange) {
      return;
    }

    const onPageHide = () => {
      flushPendingSave();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingSave();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [flushPendingSave, saveOnChange]);

  const scheduleSave = useCallback(
    (nextValue: string) => {
      if (!saveOnChange) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const validation = validateValue(nextValue);
      if (!validation.valid || !validation.shouldSave) {
        return;
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        enqueueSave(nextValue);
      }, 1000);
    },
    [enqueueSave, saveOnChange, validateValue]
  );

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
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setInputValue(nextValue);
          setIsDirty(true);
          setChangeError(null);
          setChangeExecuting(null);
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
      {changeExecuting === true && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "grey" }}>
          Saving Change...
        </Typography>
      )}
      {changeExecuting === false && !changeError && !isDirty && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "green" }}>
          Saved.
        </Typography>
      )}
      {changeError && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -2, pt: 0, mr: 1, color: "error.main" }}>
          Save failed. Keep typing to retry.
        </Typography>
      )}
    </Stack>
  );
};

export default NumericTextField;
