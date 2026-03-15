# Integration Guide

Guide for integrating `@skogro/skogfelt` into React applications, design systems, and AI-generated workflows.

## Table of Contents

- [Integration Requirements](#integration-requirements)
- [Application Architecture Patterns](#application-architecture-patterns)
- [State Management Integration](#state-management-integration)
- [API and Persistence Integration](#api-and-persistence-integration)
- [Form Library Integration](#form-library-integration)
- [Model Consumption Rules](#model-consumption-rules)
- [Testing Integration](#testing-integration)

## Integration Requirements

### Runtime dependencies

- React 19+
- MUI Core (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- MUI X Date Pickers (`@mui/x-date-pickers`) and `dayjs`

### Date picker provider

`DateField` depends on MUI X date context:

```tsx
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

<LocalizationProvider dateAdapter={AdapterDayjs}>
  {/* DateField components here */}
</LocalizationProvider>;
```

## Application Architecture Patterns

### Recommended field flow

1. User edits field.
2. Component updates local internal value.
3. Component invokes async `onChange` and optional async `saveChange`.
4. Parent updates canonical state and passes updated `value` back.

### Parent state authority

Treat component internal state as transient UI state; parent/store state remains the source of truth.

### Internal save pipeline architecture

Within the library, save-flow behavior is centralized in shared hooks under `src/hooks`:

- `useQueuedFieldSave` for queueing and external-sync reconciliation
- `useDebouncedSaveTrigger` for debounced scheduling and flush triggers

This consolidation keeps behavior consistent across components and reduces regression risk when save-flow logic changes.

## State Management Integration

### Local state (simple pages)

Use `useState` in parent container and pass async wrappers to field callbacks.

### Centralized stores (Redux/Zustand)

- `onChange`: dispatch immediate local/domain update.
- `saveChange`: dispatch thunk/saga/async action for server persistence.

### React Query / TanStack Query

- `onChange`: update component or query cache optimistically.
- `saveChange`: call mutation; on success keep value, on error invalidate and reconcile.

## API and Persistence Integration

### Callback split strategy

- Use `onChange` for local state updates (should be lightweight).
- Use `saveChange` for network persistence (can be slower/failable).

### Error handling strategy

`StringTextField` and `NumericTextField` surface save failures with inline status text. Integrate with telemetry and retry at your domain layer.

### Example container component

```tsx
import { NumericTextField, StringTextField } from "@skogro/skogfelt";
import { useState } from "react";

type Profile = {
  name: string;
  monthlyLimit: number | null;
};

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>({
    name: "Ada",
    monthlyLimit: 5000,
  });

  return (
    <>
      <StringTextField
        value={profile.name}
        name="name"
        label="Name"
        onChange={async name => {
          setProfile(current => ({ ...current, name }));
        }}
        saveChange={async name => {
          await fetch("/api/profile/name", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
          });
        }}
      />

      <NumericTextField
        value={profile.monthlyLimit}
        label="Monthly Limit"
        min={0}
        onChange={async monthlyLimit => {
          setProfile(current => ({ ...current, monthlyLimit }));
        }}
        saveChange={async monthlyLimit => {
          await fetch("/api/profile/monthly-limit", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ monthlyLimit }),
          });
        }}
      />
    </>
  );
}
```

## Form Library Integration

### React Hook Form pattern

Wrap skogfelt fields with `Controller` and map values through form state:

```tsx
import { Controller, useForm } from "react-hook-form";
import { SelectField } from "@skogro/skogfelt";

type FormValues = { tier: string };

export function TierForm() {
  const { control } = useForm<FormValues>({
    defaultValues: { tier: "small" },
  });

  return (
    <Controller
      name="tier"
      control={control}
      render={({ field }) => (
        <SelectField
          value={field.value}
          label="Tier"
          options={[
            { value: "small", label: "Small" },
            { value: "large", label: "Large" },
          ]}
          onChange={async value => {
            field.onChange(value);
          }}
          saveChange={async () => {
            // optional persistence side effect
          }}
        />
      )}
    />
  );
}
```

## Model Consumption Rules

Use these rules when generating code with an AI model:

1. Import from package root only: `@skogro/skogfelt`.
2. Always pass required props (`value`, labels, identifiers such as `name` where required).
3. Provide async callbacks (`async` functions returning promises).
4. For `DateField`, ensure `LocalizationProvider` + `AdapterDayjs` are present.
5. Keep parent state synchronized with saved values.
6. Respect field-specific save semantics:
   - `StringTextField`/`NumericTextField`: `saveOnChange={false}` suppresses callback save pipeline.
   - `SelectField`/`DateField`: `onChange` still runs when `saveOnChange={false}`.
7. Use explicit `min`/`max`/`required` constraints for numeric/text quality.
8. Avoid passing null/undefined options to `SelectField`.
9. Do not import internal hooks directly from package internals; consume the public package API from `@skogro/skogfelt`.

## Testing Integration

### Unit tests

- Mock MUI and date picker layers where needed.
- Assert callback behavior and validation helper text.
- Assert save feedback text for saving/saved/error states.

### Behavior to verify in consumer apps

- Debounced save timing for string/numeric fields.
- Blur/pagehide flush behavior for pending string/numeric saves.
- Correct sync between parent `value` and displayed field state after persistence.
