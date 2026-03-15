import { Stack, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

export type DateFieldProps = {
  value: Date | null;
  label: string;
  disabled?: boolean;
  onChange?: (value: Date | null) => Promise<unknown>;
  saveChange?: (value: Date | null) => Promise<unknown>;
  saveOnChange?: boolean;
};

const noopAsync = async () => undefined;
const normalizeDateKey = (dateValue: Date | null): string => (dateValue ? dayjs(dateValue).format("YYYY-MM-DD") : "");
const normalizeDayjsKey = (dateValue: Dayjs | null): string =>
  dateValue && dateValue.isValid() ? dateValue.format("YYYY-MM-DD") : "";

const DateField = ({
  value,
  label,
  disabled = false,
  onChange = noopAsync as (value: Date | null) => Promise<unknown>,
  saveChange = noopAsync as (value: Date | null) => Promise<unknown>,
  saveOnChange = true,
}: DateFieldProps) => {
  const [inputValue, setInputValue] = useState<Dayjs | null>(value ? dayjs(value) : null);
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const inputValueRef = useRef<string>(normalizeDateKey(value));
  const externalValueRef = useRef<string>(normalizeDateKey(value));
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
    inputValueRef.current = normalizeDayjsKey(inputValue);
  }, [inputValue]);

  useEffect(() => {
    const normalizedValue = normalizeDateKey(value);
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
      setInputValue(value ? dayjs(value) : null);
    }
  }, [value, isDirty]);

  const enqueueSave = useCallback(
    (valueToSave: Dayjs | null) => {
      const saveSeq = ++queuedSaveSeqRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (saveSeq < queuedSaveSeqRef.current || !mountedRef.current) {
          return;
        }

        if (valueToSave && !valueToSave.isValid()) {
          setChangeExecuting(false);
          setChangeError("Invalid date");
          setIsDirty(true);
          return;
        }

        const normalizedValueToSave = normalizeDayjsKey(valueToSave);
        const dateValueToSave = valueToSave ? valueToSave.toDate() : null;

        currentSavingValueRef.current = normalizedValueToSave;
        setChangeExecuting(saveOnChange ? true : null);
        setChangeError(null);

        try {
          await onChange(dateValueToSave);
          if (saveOnChange) {
            await saveChange(dateValueToSave);
          }

          if (!mountedRef.current) {
            return;
          }

          setChangeExecuting(saveOnChange ? false : null);
          setChangeError(null);
          if (inputValueRef.current === normalizedValueToSave && saveSeq === queuedSaveSeqRef.current) {
            if (externalValueRef.current === normalizedValueToSave) {
              awaitingExternalSyncRef.current = false;
              pendingSavedValueRef.current = null;
              setIsDirty(false);
            } else {
              awaitingExternalSyncRef.current = true;
              pendingSavedValueRef.current = normalizedValueToSave;
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
          if (currentSavingValueRef.current === normalizedValueToSave) {
            currentSavingValueRef.current = null;
          }
        }
      });
    },
    [onChange, saveChange, saveOnChange]
  );

  return (
    <Stack direction="column">
      <DatePicker
        label={label}
        value={inputValue ?? null}
        disabled={disabled}
        onChange={newValue => {
          awaitingExternalSyncRef.current = false;
          pendingSavedValueRef.current = null;
          setInputValue(newValue);
          setIsDirty(true);
          setChangeError(null);
          setChangeExecuting(null);
          enqueueSave(newValue);
        }}
        sx={{ width: "100%", mt: 1, mb: 1 }}
      />
      {changeExecuting === true && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -3, pt: 0, mr: 1, color: "grey" }}>
          Saving Change...
        </Typography>
      )}
      {changeExecuting === false && !changeError && !isDirty && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -3, pt: 0, mr: 1, color: "green" }}>
          Saved.
        </Typography>
      )}
      {changeError && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -3, pt: 0, mr: 1, color: "error.main" }}>
          Save failed. Pick another date to retry.
        </Typography>
      )}
    </Stack>
  );
};

export default DateField;
