# Sidebar UX refinement — diagnosis + options

## How the sidebar is currently structured

`client/src/app/layout/sidebar/sidebar.{ts,html,css}` is a single
standalone component, used by `MainLayout` which is a flex row of
`<app-sidebar>` + `<main class="wf-shell-main">`. The shell is in
RTL (`dir="rtl"`), so visually the sidebar sits on the **right** edge
of the viewport and `<main>` fills the rest.

The nav itself contains:

```
[ IH ]  InvoiceHub
תפריט              ← mono "MENU" label
01  דשבורד    •    ← number, label, active dot
02  העלאת חשבוניות
03  חשבוניות
04  דוחות
05  אזור אישי

[ יציאה ]          ← logout (full-width button with border)
─────────
( אב )  אריאל לוי   ← avatar + name + email
        ariel@…
```

### Where the numbering comes from

Template `sidebar.html`, the `*ngFor` block, line 32:

```html
<span class="wf-side-item-num">{{ '0' + (i + 1) }}</span>
```

Styled by `.wf-side-item-num` in `sidebar.css` (mono, 10px, muted,
18px wide). Pure decoration; no other code touches it.

### Where the active dot comes from

Template line 34:

```html
<span class="wf-side-item-dot" *ngIf="rla.isActive"></span>
```

Styled by `.wf-side-item-dot` (4×4 round, `--wf-accent`,
`margin-inline-start: auto`). It sits at the inline-end of the row.

The `.wf-side-item.is-active` rule already applies:

- `background: var(--wf-surface-2)`
- `border-color: var(--wf-border)` (over a transparent default border)
- `color: var(--wf-text)`
- `font-weight: 500`

So the active state is already visually clear without the dot.
Removing the dot leaves a clean "filled tile" treatment.

### Where width / layout is controlled

- **Sidebar width**: hard-coded `width: 220px` in `sidebar.css`
  (`.wf-side`).
- **Shell**: `MainLayout` uses `display: flex` with the sidebar
  taking its intrinsic width and `<main>` taking `flex: 1`.
  When the sidebar narrows, the main content reflows automatically.
- **Mobile (≤1024px)**: the sidebar becomes `position: fixed` with
  `transform: translateX(100%)` (slides out off the inline-end).
  A separate `.wf-side-toggle` hamburger (fixed top-right) flips
  `isOpen()`; an overlay scrim closes on click. `body.sidebar-lock`
  is also set so the background doesn't scroll.

### Existing responsive / mobile state

- `isOpen = signal(false)` in `sidebar.ts` — controls **only the
  mobile drawer**, not desktop.
- `toggleSidebar()` / `closeSidebar()` / Esc key handler all exist.
- Auto-close on `NavigationEnd` is wired.
- Desktop sidebar is currently **always visible** — there's no
  desktop collapse/hide concept yet.

### RTL constraints

- The shell is RTL. With `flex-direction: row`, the first flex
  child renders on the right. So `<app-sidebar><main>` puts the
  sidebar on the right and the main content on the left, which is
  what we want.
- `border-left` on `.wf-side` is physically the inline-end edge of
  the nav, facing the main content. That separator works either
  way after a collapse-width change.
- A future collapsed state needs to keep the same edge layout —
  no `dir` flips needed.

### Smallest safe change per issue

| Issue | Smallest safe fix |
|---|---|
| 1. Numbering | Delete the `<span class="wf-side-item-num">…` line + its CSS block. No behavior touched. |
| 2. Active dot | Delete the `<span class="wf-side-item-dot">` line + its CSS block. The `.is-active` background already conveys selection. |
| 3. Collapse | Add an `isCollapsed` signal to `SidebarComponent` + a `[class.is-collapsed]` toggle on `.wf-side`, plus CSS variants for the collapsed widths. Local to sidebar.ts/html/css. |

## Three implementation options (ordered least → most invasive)

### Option A — clean up only, no collapse (smallest)

**What changes visually**

- Remove the `01–05` mono number column from each item.
- Remove the small `•` active dot.
- Render the icon from `menuItems[i].icon` (already in the data;
  currently unused in the template) so each row reads
  `[icon] [label]` — restores a balanced visual hierarchy without
  the number eyebrow.
- Active state stays as the surface-2 filled tile already in CSS.

**What changes behaviorally** — nothing. Mobile drawer untouched.

**Files** — `sidebar.html`, `sidebar.css`.
**Size** — ~10 LOC removed, ~3 added.
**Risk** — very low.
**Design language** — preserved exactly.
**RTL** — fine. Desktop and mobile both fine.

**Trade-off** — solves issues 1 & 2, but does NOT address the
"want to open/collapse the sidebar" requirement.

### Option B — clean up + desktop collapse rail (recommended)

**What changes visually**

- Everything in Option A.
- A small toggle button (`pi-angle-left` / `pi-angle-right`) sits
  inside the sidebar header next to the brand block.
- Collapsed state on desktop: sidebar narrows from `220px` → `64px`,
  labels fade out, user info collapses to just the avatar, logout
  becomes an icon-only button. Brand text hides; "IH" logo stays
  as the click target. Tooltips via `title=` attribute reveal the
  label of each item on hover.

**What changes behaviorally**

- New `isCollapsed` signal, persisted to
  `localStorage['sidebar-collapsed']` (same pattern as
  `ThemeService`).
- Default = open (matches today). On first refresh after
  collapsing, the rail state restores.
- Mobile behavior unchanged (drawer slide-in stays).
- Below 1024px the collapsed flag is ignored; mobile always uses
  the drawer.

**Files** — `sidebar.ts` (one signal, one method, one
localStorage read/write), `sidebar.html` (toggle button, two
`[class.is-collapsed]` bindings, `title` attrs), `sidebar.css`
(rail-width CSS + label/text hide rules).

**Size** — ~50–80 LOC across three files.
**Risk** — low. Self-contained; MainLayout uses `flex: 1` so the
content area reflows automatically when the sidebar shrinks.
**Design language** — same tokens, same primitives, same spacing
rhythm. No new component, no new icons (uses PrimeIcons already
imported).
**RTL** — works as-is; width changes are physical and apply
identically on both sides.
**Desktop + mobile** — desktop gets the new collapse; mobile keeps
the existing drawer.

**Why persistence:** the collapse choice is a preference, not a
per-page state. A user who prefers the rail wants it to stick
across refresh / login, similar to the dark/light theme they just
got — same pattern, consistent UX.

### Option C — full Gmail-style three states (open / rail / hidden)

**What changes visually**

- Everything in Option B.
- A 3rd "hidden" state where the sidebar disappears completely
  from desktop. The TopBar then grows a "menu" toggle on its
  inline-start to bring the sidebar back.

**What changes behaviorally** — three-way cycle; TopBar wiring to
a shared signal/service.

**Files** — sidebar + `<app-top-bar>` + a small shared service so
the TopBar can flip the same signal the Sidebar owns.

**Size** — ~150 LOC, touches the TopBar component and adds a
shared service.
**Risk** — medium. More moving parts, more UX edge cases
(remembering which state cycle order should be).
**Design language** — preserved but adds another layer of state.
**Why probably overkill** — this app has 5 nav items. A rail state
is plenty; a fully hidden state mostly benefits document-canvas
apps (Gmail, Notion editor) where every pixel counts. InvoiceHub
screens are already comfortable at ~1100px – 220px = 880px main
width.

---

## Open UX questions that need a decision before I implement Option B

(Asked via the next chat turn, not silently chosen.)

1. **Where does the toggle button live?**
   - Inside the sidebar header (small chevron in the brand row).
   - In the TopBar (next to the breadcrumb).
   - (recommend the first — keeps it scoped to the sidebar, no
     shared signal needed.)

2. **Default state on first ever visit?**
   - Open (recommended — matches the current behavior; users
     opt-in to the rail).
   - Rail.

3. **Tooltips in collapsed mode?**
   - Native `title=` (recommended — no new dep).
   - PrimeNG `pTooltip` (slightly nicer styling, slightly more
     code).

I'll wait for your call on 1–3 (or for an "Option A / B / C"
selection) before touching code.
