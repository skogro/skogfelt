# SelectField

`SelectField` is a controlled select input for string options, with async callback support and inline save status feedback.

## Import

```tsx
import { SelectField } from "@skogro/skogfelt";
```

## Required Props

- `value: string`
- `options: { value: string; label: string }[]`

## Optional Props

- `defaultValue?: string`
- `label?: string`
- `disabled?: boolean`
- `onChange?: (value: string) => Promise<unknown>`
- `saveChange?: (value: string) => Promise<unknown>`
- `saveOnChange?: boolean` (default: `true`)
- `showSave?: boolean` (default: `true`)
- `size?: "small" | "medium"` (default: `"medium"`)
- `sx?: CSSProperties`

## Behavior

- Calls async `onChange` immediately on selection change.
- Calls async `saveChange` when `saveOnChange` is `true`.
- Shows inline status text:
  - `Saving Change...`
  - `Saved.`
  - `Save failed. Pick another option to retry.`
- Uses save queueing and external-sync guards to avoid stale parent updates overwriting recent user selections.
- If `options` is `null`/missing, renders `null`.

## Example

```tsx
import { SelectField } from "@skogro/skogfelt";
import { useState } from "react";

const options = [
  { value: "small", label: "Small" },
  { value: "large", label: "Large" },
];

export function SizeField() {
  const [size, setSize] = useState("small");

  return (
    <SelectField
      value={size}
      label="Size"
      options={options}
      onChange={async nextValue => {
        setSize(nextValue);
      }}
      saveChange={async nextValue => {
        await fetch("/api/profile/size", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ size: nextValue }),
        });
      }}
    />
  );
}
```
