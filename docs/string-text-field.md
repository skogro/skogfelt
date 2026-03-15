# StringTextField

`StringTextField` is a controlled text input with optional required validation, debounced save behavior, and inline save status feedback.

## Import

```tsx
import { StringTextField } from "@skogro/skogfelt";
```

## Required Props

- `value: string | number | null | undefined`
- `name: string`
- `label: string`

## Optional Props

- `disabled?: boolean`
- `onChange?: (value: string) => Promise<unknown>`
- `saveChange?: (value: string) => Promise<unknown>`
- `saveOnChange?: boolean` (default: `true`)
- `multiline?: boolean` (default: `false`)
- `required?: boolean` (default: `false`)
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
- Preserves user edits while waiting for parent state to catch up after async persistence.

## Validation

- When `required` is `true` and value is blank, shows:
  - `"<label> is required"`

## Example

```tsx
import { StringTextField } from "@skogro/skogfelt";
import { useState } from "react";

export function TeamNameField() {
  const [name, setName] = useState("");

  return (
    <StringTextField
      value={name}
      name="teamName"
      label="Team Name"
      required
      onChange={async nextValue => {
        setName(nextValue);
      }}
      saveChange={async nextValue => {
        await fetch("/api/team/name", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: nextValue }),
        });
      }}
    />
  );
}
```
