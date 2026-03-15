# Usage Guide

Comprehensive guide for consuming `@skogro/skogfelt` in React applications.

## Table of Contents

- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Component APIs](#component-apis)
- [Hook API](#hook-api)
- [Behavioral Notes for Models](#behavioral-notes-for-models)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Installation

```bash
npm install @skogro/skogfelt
```

Install peer dependencies:

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers dayjs
```

## Core Concepts

### Controlled inputs

All field components are intended for controlled usage (`value` provided by parent state).

### Async callback pipeline

Most fields support:

- `onChange` (async callback, usually local state or domain updates)
- `saveChange` (async callback, usually persistence/API write)

### Save behavior

- `StringTextField` and `NumericTextField` debounce saves by ~1000ms, flush on blur, and show save status text.
- `DateField` and `SelectField` execute immediately after change.

## Component APIs

### `StringTextField`

Use for freeform text with optional required validation and erase action.

Key props:

- `value: string | number | null | undefined`
- `name: string`
- `label: string`
- `onChange?: (value: string) => Promise<unknown>`
- `saveChange?: (value: string) => Promise<unknown>`
- `saveOnChange?: boolean` (default `true`)
- `required?: boolean`
- `multiline?: boolean`
- `showErase?: boolean`
- `onErase?: () => Promise<unknown>`
- `size?: "small" | "medium"`

Validation:

- If `required` and input is empty, shows `"<label> is required"`.

### `NumericTextField`

Use for numeric inputs with validation and optional formatting.

Key props:

- `value: number | null`
- `label: string`
- `onChange?: (value: number) => Promise<unknown>`
- `saveChange?: (value: number) => Promise<unknown>`
- `saveOnChange?: boolean` (default `true`)
- `required?: boolean`
- `allowNegative?: boolean` (default `false`)
- `min?: number`
- `max?: number`
- `format?: string` (numeral.js format string)
- `showErase?: boolean`
- `onErase?: () => Promise<unknown>`
- `size?: "small" | "medium"`

Validation messages include:

- `"<label> is required"`
- `"<label> must be a number"`
- `"<label> must be greater than 0"`
- `"<label> must be greater than <min>"`
- `"<label> must be less than <max>"`

### `SelectField`

Use for selection from string options.

Key props:

- `value: string`
- `defaultValue?: string`
- `options: { value: string; label: string }[]`
- `label?: string`
- `onChange?: (value: string) => Promise<unknown>`
- `saveChange?: (value: string) => Promise<unknown>`
- `saveOnChange?: boolean` (default `true`)
- `showSave?: boolean` (default `true`)
- `disabled?: boolean`
- `size?: "small" | "medium"`
- `sx?: CSSProperties`

Behavior:

- If `options` is missing/null, renders `null`.

### `DateField`

Use for date inputs backed by MUI X `DatePicker`.

Key props:

- `value: Date | null`
- `label: string`
- `onChange?: (value: Date) => Promise<unknown>`
- `saveChange?: (value: Date) => Promise<unknown>`
- `saveOnChange?: boolean` (default `true`)
- `disabled?: boolean`

Important:

- Wrap consuming UI with MUI X `LocalizationProvider` and an adapter such as `AdapterDayjs`.

## Hook API

### `useDebounce`

```ts
useDebounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => unknown,
  delay?: number
): (...args: TArgs) => unknown
```

- Debounces callback execution by `delay` ms (default `1000`).
- Keeps callback reference fresh across re-renders.

## Behavioral Notes for Models

These details are important when generating integration code:

- `StringTextField` and `NumericTextField` only run `onChange`/`saveChange` through their save pipeline. If `saveOnChange={false}`, those callbacks will not execute.
- `SelectField` and `DateField` still call `onChange` when values change, even if `saveOnChange={false}` (only `saveChange` is skipped).
- For save status to clear correctly, parent state should eventually reflect saved values back into the `value` prop.
- Callbacks should be async-safe and idempotent where possible.

## Examples

### String field with API persistence

```tsx
import { StringTextField } from "@skogro/skogfelt";
import { useState } from "react";

export function TeamNameField() {
  const [teamName, setTeamName] = useState("");

  return (
    <StringTextField
      value={teamName}
      name="teamName"
      label="Team Name"
      required
      onChange={async value => {
        setTeamName(value);
      }}
      saveChange={async value => {
        await fetch("/api/team/name", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ value }),
        });
      }}
    />
  );
}
```

### Numeric field with min/max constraints

```tsx
import { NumericTextField } from "@skogro/skogfelt";
import { useState } from "react";

export function BudgetField() {
  const [budget, setBudget] = useState<number | null>(1000);

  return (
    <NumericTextField
      value={budget}
      label="Budget"
      min={0}
      max={1000000}
      onChange={async value => {
        setBudget(value);
      }}
      saveChange={async value => {
        await fetch("/api/budget", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ budget: value }),
        });
      }}
    />
  );
}
```

### Date field with MUI localization provider

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
        onChange={async value => setDate(value)}
        saveChange={async value => {
          await fetch("/api/start-date", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ date: value.toISOString() }),
          });
        }}
      />
    </LocalizationProvider>
  );
}
```

## Best Practices

- Keep field `value` synced from authoritative parent state.
- Implement async callbacks with error handling and retries where appropriate.
- Use `saveOnChange={false}` only if you intentionally want to suppress built-in save behavior.
- Keep `onChange` fast; move expensive work to `saveChange`.
- Preserve accessible labels (`label` prop) since components render MUI input labels directly.
