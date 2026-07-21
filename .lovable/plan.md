## Goal
In dark mode, several native `<select>` elements render with default black text (and browser-default white option menus), making them hard to read. Fix contrast consistently across the whole app.

## Root cause
Native `<select>` inherits `color: inherit` for the closed value, but many usages either:
- Use `bg-transparent` on a dark background with no explicit `text-*` for dark mode (e.g. Invoices status dropdown), so the value looks black.
- Have no `dark:bg-*` / `dark:text-*` / `dark:border-*`, so the closed control clashes with the surrounding dark surface.
- Never style the `<option>` children, which on some OSes/browsers render with light backgrounds regardless of theme.

## Fix (presentation only, no logic changes)

Sweep every `<select>` in the codebase and apply consistent dark-mode classes:

- Closed control: `text-gray-900 dark:text-gray-100`, `bg-white dark:bg-gray-900`, `border-gray-200 dark:border-gray-700` (only where a visible control exists — the Invoices status pill stays borderless/transparent but gets explicit `dark:text-gray-100`).
- Options: add `className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100"` to each `<option>` so the dropdown menu is legible in dark mode.
- Add a small global CSS rule in `src/index.css` as a safety net:
  ```css
  .dark select { color-scheme: dark; }
  .dark select option { background-color: rgb(17 24 39); color: rgb(243 244 246); }
  ```
  `color-scheme: dark` makes the browser render the native popup in dark chrome automatically, which handles any select we might miss now or add later.

## Files touched
- `src/index.css` — add the `.dark select` / `option` rule + `color-scheme`.
- `src/pages/Invoices.tsx` (status dropdown, line ~199) — add `dark:text-gray-100` and dark option styles.
- `src/pages/WorkflowBoard.tsx` (4 selects: contact picker, priority, move-to-column, filter) — dark text/bg/border + option styles.
- `src/components/ui.tsx` (shared Select at line 122) — dark text/bg/border + option styles so any consumer inherits the fix.
- `src/pages/Settings.tsx` (currency select).
- `src/pages/Contacts.tsx` (status filter).
- `src/components/invoices/GenerateInvoiceModal.tsx` (customer picker).
- `src/components/email/EmailComposer.tsx` (2 selects).

## Out of scope
- No changes to dropdown behavior, values, or business logic.
- Not replacing native selects with a custom component (rejected the "styled badge dropdown" option).
