# skogfelt Documentation

This directory contains user-focused docs for each component in `@skogro/skogfelt`.

## Getting Started

Install the package:

```bash
npm install @skogro/skogfelt
```

Install peer dependencies:

```bash
npm install react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers dayjs
```

## Component Guides

- [StringTextField](./string-text-field.md)
- [NumericTextField](./numeric-text-field.md)
- [SelectField](./select-field.md)
- [DateField](./date-field.md)

## Common Patterns

- [Common Approaches](./common-approaches.md)

## Internal Architecture Notes

The field components now share internal save orchestration hooks under `src/hooks`:

- `useQueuedFieldSave` (queueing, dirty/sync guards, save state)
- `useDebouncedSaveTrigger` (debounce + blur/pagehide/visibility flush)

These hooks are implementation details for maintainers and are not part of the public package API.

Use these docs together:

- Start with each component page to learn props and behavior.
- Use the common approaches page when wiring components into app state, APIs, or form libraries.
