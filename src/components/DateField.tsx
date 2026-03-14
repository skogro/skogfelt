import { Stack, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";

export type DateFieldProps = {
  value: Date | null;
  label: string;
  disabled?: boolean;
  onChange?: (value: Date) => Promise<unknown>;
  saveChange?: (value: Date) => Promise<unknown>;
  saveOnChange?: boolean;
};

const noopAsync = async () => undefined;

const DateField = ({
  value,
  label,
  disabled = false,
  onChange = noopAsync as (value: Date) => Promise<unknown>,
  saveChange = noopAsync as (value: Date) => Promise<unknown>,
  saveOnChange = true,
}: DateFieldProps) => {
  const [inputChanged, setInputChanged] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<Dayjs | null>(null);
  const [changeExecuting, setChangeExecuting] = useState<boolean | null>(null);

  useEffect(() => {
    if (value) {
      setInputValue(dayjs(value));
    } else {
      setInputValue(null);
    }
  }, [value]);

  const executeSaveChange = useCallback(
    async (dateValue: Date) => {
      setChangeExecuting(true);
      await saveChange(dateValue);
      setChangeExecuting(false);
    },
    [saveChange]
  );

  useEffect(() => {
    if (!(inputValue && inputChanged)) {
      return;
    }

    (async () => {
      await onChange(inputValue.toDate());
      if (saveOnChange) {
        await executeSaveChange(inputValue.toDate());
      }
      setInputChanged(false);
    })();
  }, [inputValue, inputChanged, onChange, saveOnChange, executeSaveChange]);

  return (
    <Stack direction="column">
      <DatePicker
        label={label}
        value={inputValue ?? null}
        disabled={disabled}
        onChange={newValue => {
          setInputChanged(true);
          setInputValue(newValue);
        }}
        sx={{ width: "100%", mt: 1, mb: 1 }}
      />
      {changeExecuting === true && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -3, pt: 0, mr: 1, color: "grey" }}>
          Saving Change...
        </Typography>
      )}
      {changeExecuting === false && (
        <Typography sx={{ textAlign: "right", fontSize: 10, mt: -3, pt: 0, mr: 1, color: "green" }}>
          Saved.
        </Typography>
      )}
    </Stack>
  );
};

export default DateField;
