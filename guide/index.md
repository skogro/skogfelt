# @skogro/skogfelt - Agentic Guide

## Purpose

Reusable React form components and a debounce hook for MUI-based applications. This guide gives consuming models the context needed to correctly install, render, and wire `@skogro/skogfelt`.

## Documentation

- **[Usage Guide](./usage.md)** - Component behavior, props, and usage patterns
- **[Integration Guide](./integration.md)** - How to integrate skogfelt into apps, forms, and data flows

## Key Features

- **Async save-ready fields** - Components support async `onChange`/`saveChange` callbacks
- **Built-in validation** - Required and numeric validation for text and number inputs
- **Save state feedback** - "Saving Change..." and "Saved." status messaging in UI
- **Debounced updates** - 1-second default debounced save behavior for string and numeric fields
- **MUI-native ergonomics** - Built on MUI `TextField` and MUI X `DatePicker`
- **Shared save internals** - Internal hooks unify queueing/sync/debounce behavior across fields

## Public API

The library exports:

- `DateField`
- `NumericTextField`
- `SelectField`
- `StringTextField`
- `useDebounce`
- Types: `DateFieldProps`, `NumericTextFieldProps`, `SelectFieldProps`, `SelectOption`, `StringTextFieldProps`

## Installation

```bash
npm install @skogro/skogfelt
```

You must also provide required peer dependencies (React + MUI + Date Pickers):

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers dayjs
```

## Quick Example

```tsx
import { StringTextField } from "@skogro/skogfelt";
import { useState } from "react";

export function ProfileNameField() {
  const [name, setName] = useState("Ada Lovelace");

  return (
    <StringTextField
      value={name}
      name="fullName"
      label="Full Name"
      onChange={async value => {
        setName(value);
      }}
      saveChange={async value => {
        await fetch("/api/profile/name", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: value }),
        });
      }}
    />
  );
}
```

## Package Structure

```
src/
├── components/
│   ├── DateField.tsx
│   ├── FieldSaveStatus.tsx
│   ├── NumericTextField.tsx
│   ├── SelectField.tsx
│   └── StringTextField.tsx
├── hooks/
│   ├── useDebounce.ts
│   ├── useDebouncedSaveTrigger.ts   # internal
│   └── useQueuedFieldSave.ts        # internal
└── index.ts
```

`useDebouncedSaveTrigger` and `useQueuedFieldSave` are internal implementation hooks and are not exported from the package root.
