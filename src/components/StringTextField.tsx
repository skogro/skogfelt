import ClearIcon from "@mui/icons-material/Clear";
import { InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

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
  const [inputValue, setInputValue] = useState<string>(value ? String(value) : "");
  const [inputValueValid, setInputValueValid] = useState<boolean>(true);
  const [inputValueHelper, setInputValueHelper] = useState<string>("");
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const inputValueRef = useRef<string>(inputValue);
  const externalValueRef = useRef<string>(value ? String(value) : "");
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
    const normalizedValue = value ? String(value) : "";
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
  }, [value, isDirty]);

  useEffect(() => {
    if (required && inputValue.trim() === "") {
      setInputValueValid(false);
      setInputValueHelper(`${label} is required`);
      return;
    }

    setInputValueValid(true);
    setInputValueHelper("");
  }, [inputValue, label, required]);

  const enqueueSave = useCallback(
    (valueToSave: string) => {
      const saveSeq = ++queuedSaveSeqRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (saveSeq < queuedSaveSeqRef.current || !mountedRef.current) {
          return;
        }

        setChangeExecuting(true);
        setChangeError(null);

        try {
          await onChange(valueToSave);
          await saveChange(valueToSave);

          if (!mountedRef.current) {
            return;
          }

          setChangeExecuting(false);
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
        }
      });
    },
    [onChange, saveChange]
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
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        enqueueSave(nextValue);
      }, 1000);
    },
    [enqueueSave, saveOnChange]
  );

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

export default StringTextField;
