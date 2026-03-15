# DateField

`DateField` is a controlled date input built on MUI X `DatePicker`, with async callbacks and inline save status feedback.

## Import

```tsx
import { DateField } from "@skogro/skogfelt";
```

## Required Props

- `value: Date | null`
- `label: string`

## Optional Props

- `disabled?: boolean`
- `onChange?: (value: Date | null) => Promise<unknown>`
- `saveChange?: (value: Date | null) => Promise<unknown>`
- `saveOnChange?: boolean` (default: `true`)

## Required Provider Setup

`DateField` requires MUI date localization context:

```tsx
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

<LocalizationProvider dateAdapter={AdapterDayjs}>
  <DateField value={date} label="Start Date" />
</LocalizationProvider>;
```

## Behavior

- Calls async `onChange` on date updates (including clear to `null`).
- Calls async `saveChange` when `saveOnChange` is `true`.
- Shows inline status text:
  - `Saving Change...`
  - `Saved.`
  - `Save failed. Pick another date to retry.`
- Handles stale parent value updates by preserving in-progress user edits until external state catches up.

## Example

```tsx
import { DateField } from "@skogro/skogfelt";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useState } from "react";

export function StartDateField() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateField
        value={date}
        label="Start Date"
        onChange={async nextValue => {
          setDate(nextValue);
        }}
        saveChange={async nextValue => {
          await fetch("/api/start-date", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              date: nextValue ? nextValue.toISOString() : null,
            }),
          });
        }}
      />
    </LocalizationProvider>
  );
}
```
