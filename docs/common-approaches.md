# Common Approaches

This guide describes common ways to use `@skogro/skogfelt` fields in production apps.

## 1) Split Immediate Updates From Persistence

Use callbacks for separate concerns:

- `onChange`: fast local update (UI state, form state, cache state)
- `saveChange`: slower persistence call (API/database)

Typical pattern:

```tsx
onChange={async value => {
  setLocalState(value);
}}
saveChange={async value => {
  await api.save(value);
}}
```

## 2) Keep Parent `value` Authoritative

All fields are controlled inputs. Parent state should remain source of truth.

Recommended flow:

1. User edits field.
2. Field updates local UI state and runs callbacks.
3. Parent state/store eventually reflects saved value.
4. Parent passes canonical value back through the `value` prop.

If parent values lag behind async saves, components keep user edits visible until external value synchronization catches up.

## 3) Understand `saveOnChange` Semantics

`saveOnChange={false}` behaves differently depending on component:

- `StringTextField` and `NumericTextField`: suppresses callback save pipeline.
- `SelectField` and `DateField`: still call `onChange`, but skip `saveChange`.

Choose this intentionally based on your form architecture.

## 4) Handle Errors in Domain Layer

Components show inline failure status, but your app should still:

- log failures for observability
- show toast/snackbar when needed
- offer retries or fallback UX

Keep callback code idempotent and retry-friendly.

## 5) Form Library Integration (React Hook Form)

Wrap fields with `Controller` and map values in `render`:

```tsx
<Controller
  name="tier"
  control={control}
  render={({ field }) => (
    <SelectField
      value={field.value}
      label="Tier"
      options={options}
      onChange={async value => {
        field.onChange(value);
      }}
      saveChange={async value => {
        await saveTier(value);
      }}
    />
  )}
/>
```

## 6) DateField Setup Checklist

Always wrap any `DateField` usage with:

- `LocalizationProvider`
- `AdapterDayjs`

Also ensure your API contract supports nullable date values if users can clear the field.

## 7) Testing Strategy

Good component integration tests should cover:

- success path for `onChange` and `saveChange`
- `saveOnChange` behavior
- save status text transitions (`Saving`, `Saved`, `Failed`)
- stale parent value scenarios during async persistence
- blur/pagehide flushing for text and numeric inputs

This set catches most usability regressions early.

## 8) Internal Hook Consolidation (Maintainers)

The field save behavior is now intentionally centralized in shared internal hooks located in `src/hooks`:

- `useQueuedFieldSave`: shared queue sequencing, dirty tracking, external value sync handoff, and save status/error state.
- `useDebouncedSaveTrigger`: shared debounced save scheduling and flush behavior (`blur`, `pagehide`, and `visibilitychange`) for text-like inputs.

Current usage:

- `DateField` and `SelectField` use `useQueuedFieldSave` for immediate change flows.
- `StringTextField` and `NumericTextField` use both hooks for debounced save flows.

This keeps field behavior consistent and makes future save-flow fixes easier to apply across all components.
