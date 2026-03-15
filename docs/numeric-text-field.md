# NumericTextField

`NumericTextField` is a controlled number input with validation rules, optional formatting, debounced save behavior, and inline save status feedback.

## Import

```tsx
import { NumericTextField } from "@skogro/skogfelt";
```

## Required Props

- `value: number | null`
- `label: string`

## Optional Props

- `disabled?: boolean`
- `onChange?: (value: number) => Promise<unknown>`
- `saveChange?: (value: number) => Promise<unknown>`
- `saveOnChange?: boolean` (default: `true`)
- `required?: boolean` (default: `false`)
- `format?: string` (numeral format string)
- `allowNegative?: boolean` (default: `false`)
- `min?: number`
- `max?: number`
- `showErase?: boolean` (default: `false`)
- `onErase?: () => Promise<unknown>`
- `size?: "small" | "medium"` (default: `"medium"`)

## Behavior

- Debounces save pipeline by ~1000ms while typing.
- Flushes pending save on blur and page hide.
- Shows inline status text:
  - `Saving Change...`
  - `Saved.`
  - `Save failed. Keep typing to retry.`
- Protects in-progress edits from stale parent value updates while async save is reconciling.

## Validation

Validation can show:

- `"<label> is required"`
- `"<label> must be a number"`
- `"<label> must be greater than 0"`
- `"<label> must be greater than <min>"`
- `"<label> must be less than <max>"`

## Example

```tsx
import { NumericTextField } from "@skogro/skogfelt";
import { useState } from "react";

export function MonthlyBudgetField() {
  const [budget, setBudget] = useState<number | null>(1000);

  return (
    <NumericTextField
      value={budget}
      label="Monthly Budget"
      min={0}
      max={100000}
      onChange={async nextValue => {
        setBudget(nextValue);
      }}
      saveChange={async nextValue => {
        await fetch("/api/budget", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ budget: nextValue }),
        });
      }}
    />
  );
}
```
