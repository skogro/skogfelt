import { Stack } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import FieldSaveStatus from "./FieldSaveStatus";
import useQueuedFieldSave from "../hooks/useQueuedFieldSave";

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
  const {
    changeExecuting,
    changeError,
    isDirty,
    updateInputKey,
    markUserInput,
    syncExternalKey,
    enqueueSave,
  } = useQueuedFieldSave<string>({
    initialInputKey: normalizeDateKey(value),
    initialExternalKey: normalizeDateKey(value),
  });

  useEffect(() => {
    updateInputKey(normalizeDayjsKey(inputValue));
  }, [inputValue, updateInputKey]);

  useEffect(() => {
    const normalizedValue = normalizeDateKey(value);
    syncExternalKey(normalizedValue, () => {
      setInputValue(value ? dayjs(value) : null);
    });
  }, [value, syncExternalKey]);

  return (
    <Stack direction="column">
      <DatePicker
        label={label}
        value={inputValue ?? null}
        disabled={disabled}
        onChange={newValue => {
          const normalizedValueToSave = normalizeDayjsKey(newValue);
          markUserInput(normalizedValueToSave);
          setInputValue(newValue);
          enqueueSave({
            valueKey: normalizedValueToSave,
            showSavingStatus: saveOnChange,
            beforeSave: () => {
              if (newValue && !newValue.isValid()) {
                return { skip: true, errorMessage: "Invalid date", keepDirty: true };
              }
              return {};
            },
            runSave: async () => {
              const dateValueToSave = newValue ? newValue.toDate() : null;
              await onChange(dateValueToSave);
              if (saveOnChange) {
                await saveChange(dateValueToSave);
              }
            },
          });
        }}
        sx={{ width: "100%", mt: 1, mb: 1 }}
      />
      <FieldSaveStatus
        changeExecuting={changeExecuting}
        changeError={changeError}
        isDirty={isDirty}
        marginTop={-3}
        errorText="Save failed. Pick another date to retry."
      />
    </Stack>
  );
};

export default DateField;
