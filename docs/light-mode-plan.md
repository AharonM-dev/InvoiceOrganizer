# Adding Light Mode — plan + diagnosis

## How the current dark style is implemented

The dark theme is already token-based and lives almost entirely in
one place. There is no Tailwind `dark:` class usage, no PrimeNG theme
variable plumbing, no per-component dark constants.

* **Source of truth — `client/src/styles.css`**.
  A `:root` block defines `--wf-bg`, `--wf-surface`,
  `--wf-surface-2`, `--wf-border`, `--wf-text`,
  `--wf-text-secondary`, `--wf-text-muted`, `--wf-bar`,
  `--wf-accent`, `--wf-accent-on`, `--wf-accent-dim`,
  `--wf-success`, `--wf-success-dim`, `--wf-warn`, `--wf-warn-dim`,
  `--wf-danger`, `--wf-danger-dim`, plus font-family tokens. Every
  PrimeNG override and every reusable helper (`.wf-surface`,
  `.wf-btn-*`, `.wf-tag-*`, `.wf-input`, `.p-datatable`, `.p-button`,
  `.p-tag`, `.p-card`, `.p-select`, `.p-dialog`, `.p-toast`, etc.)
  consumes the tokens via `var(--wf-*)`.
* **Component CSS files** for the sidebar, top-bar, dashboard,
  invoices, upload, review, reports, settings, login, register,
  home, file-upload — all consume `var(--wf-*)`. There are no
  per-component hard-coded hex backgrounds. Theming them is free.
* **Tailwind** — `tailwind.config.js` maps `bg`, `surface`,
  `surface-2`, `wf-border`, `wf-text`, `text-sec`, `muted`, `accent`,
  `accent-dim`, `success`, `warn`, `danger`, etc. to the same CSS
  variables. Any Tailwind utility (e.g. `bg-surface`) is themed
  automatically.
* **`index.html`** loads Google Fonts via `<link>`; no body-class.
  The body and html start with `background: var(--wf-bg)`.

### Where literals DO live

Three remaining places still use raw hex / rgba instead of tokens:

1. **`features/dashboard/dashboard.ts`** — `initCharts()` and
   `processCategoryData()` build Chart.js datasets with hex literals
   for accent (`#c8a76d`), grid lines (`rgba(38, 38, 44, 0.6)`),
   tick / label colors (`#72727a`, `#b8b8bf`), donut segment ring
   (`borderColor: '#131316'`), and an empty-state border tone
   (`'#26262c'`).
2. **`features/reports/reports.ts`** — same pattern in `initCharts()`,
   `updateCategoryChart()`, tooltip colors, etc.
3. **`sidebar.css`** — mobile-drawer backdrop uses
   `rgba(0, 0, 0, 0.55)` and a shadow `rgba(0, 0, 0, 0.5)`. These
   are intentionally dark on both themes (it's a dim/scrim);
   leaving as-is is fine.

Charts re-init when the component re-mounts (every route navigation
re-creates feature components in this app — no caching). So if we
read the chart colors from the CSS variables at init time, charts
respect the active theme automatically on next navigation.

## Strategy

Use CSS custom properties keyed off a `data-theme` attribute on
`<html>` and store the user's preference in `localStorage`.

* `[data-theme="dark"]` block keeps **the exact current values
  byte-for-byte**. The default cascade also points there, so even
  without an attribute the dark palette wins.
* `[data-theme="light"]` block holds the light counterparts. Token
  names and shapes are identical; only the values change. Same
  accent gold (`#c8a76d`) on both themes — only the surrounding
  surface/text inverts.

The current `:root { ... }` block in `styles.css` becomes
`:root, [data-theme="dark"] { ... }`. Light is purely additive.

A small `ThemeService` (no new state library) reads the persisted
value on construction and writes `data-theme` to
`document.documentElement`. It's bootstrapped via an
`APP_INITIALIZER` factory in `app.config.ts` so the attribute is
set before the first render — no flash of wrong theme. A
`setTheme()` method handles toggle clicks and re-persists.

A simple toggle goes in the existing Settings → Profile screen
under a new "Appearance" surface — using the same `wf-surface` /
`wf-btn` / `wf-mono` primitives already there. No new tab; the
existing wireframe's "Profile" view fits two surfaces side by side.

Chart palettes in `dashboard.ts` / `reports.ts` get replaced with a
tiny `cssVar(name)` helper that reads
`getComputedStyle(document.documentElement)`. Charts then become
theme-aware on the next render (typically the next route visit).

### Light palette values (derived from the dark palette)

```
--wf-bg              #0b0b0d  →  #f5f5f7    (off-white surface bg)
--wf-surface         #131316  →  #ffffff
--wf-surface-2       #1b1b20  →  #efeff2
--wf-border          #26262c  →  #e2e2e6
--wf-text            #ececef  →  #1a1a1d
--wf-text-secondary  #b8b8bf  →  #4a4a52
--wf-text-muted      #72727a  →  #8a8a93
--wf-bar             #2e2e35  →  #d6d6dc
--wf-accent          #c8a76d  →  #c8a76d    (same brand gold)
--wf-accent-on       #1a1308  →  #1a1308    (dark text on gold)
--wf-accent-dim      #4a3d27  →  #e3d2a8    (pale gold chip border)
--wf-success         #6fa890  →  #3c8d72    (deeper for white bg contrast)
--wf-success-dim     #2f4a40  →  #c6dfd2
--wf-warn            #c89860  →  #a87a35
--wf-warn-dim        #4a3a25  →  #e8d4b2
--wf-danger          #c47878  →  #a44a4a
--wf-danger-dim      #4a2f2f  →  #ecc6c6
```

Hue is preserved; lightness inverts. State colors are slightly
deepened on light to keep readable against `#ffffff` surfaces.

## What changes vs. stays

Touched files (small, focused):

* `client/src/styles.css` — wrap existing tokens in
  `:root, [data-theme="dark"]`, add `[data-theme="light"]` block.
  No selector or helper rewrites.
* `client/src/app/core/services/theme.service.ts` — new, ~30 lines.
* `client/src/app/app.config.ts` — register an APP_INITIALIZER.
* `client/src/app/features/settings/settings/settings.{ts,html}` —
  add an Appearance surface in the Profile tab.
* `client/src/app/features/dashboard/dashboard.ts`,
  `client/src/app/features/reports/reports.ts` — switch the hard-
  coded chart hex constants to read from CSS variables via a
  shared tiny helper.

Untouched: layout, sidebar, top-bar, tables, forms, modals,
routing, auth, services, OCR flow, invoices flow, register/login
look. None of those need to change because they already consume
the tokens.
