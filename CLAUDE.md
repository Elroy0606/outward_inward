# Inward Outward Shipment Tracker — CLAUDE.md

Persistent context for working in this repo. Read this before exploring the codebase from
scratch — it should answer "where does X live" and "how do I run Y" without a full scan.

## What this is

A Next.js (App Router) dashboard that replaces a manual Excel shipment tracker. Tracks two
directions of shipment — **INWARD** (received from suppliers) and **OUTWARD** (shipped to
customers) — against a single Supabase `shipments` table. Stack: TypeScript, Tailwind CSS v4,
shadcn/ui (Radix base, "Nova" preset), Framer Motion, react-hook-form + Zod, Supabase
(`@supabase/ssr`), SheetJS (`xlsx`) for Excel/CSV import.

## Commands

```bash
npm run dev              # start dev server (Turbopack, default in Next 16)
npm run build             # production build
npm run start             # run the production build
npx eslint .              # lint (there is no `next lint` in Next 16 — use eslint directly)
npx tsc --noEmit           # type-check only
```

There is no test runner configured yet.

### Database (Supabase)

No CLI/local Supabase project is wired up — migrations are plain SQL files applied by hand.

```bash
# Apply schema: paste each file in supabase/migrations/ into the Supabase SQL Editor IN ORDER
# (0001_init.sql, then 0002_merge_cost_center_oca.sql, ...), or if you have the Supabase CLI
# linked to a project:
supabase db push

# Optional demo rows:
# paste supabase/seed.sql into the SQL Editor after the migrations above
```

If you add more migrations, name them `NNNN_description.sql` in `supabase/migrations/`,
incrementing from `0001_init.sql`.

## Directory structure

```
src/
  app/
    layout.tsx              # root layout: fonts, metadata, <Toaster />
    page.tsx                # dashboard page (Server Component) — fetches shipments,
                             # renders <PageShell> + <DashboardShell>
    globals.css              # Tailwind v4 theme tokens (Tangerine palette lives here)
  components/
    ui/                       # shadcn/ui primitives — regenerate/extend via `npx shadcn add`,
                             # don't hand-edit generated internals beyond className tweaks
    motion/
      motion-button.tsx       # `motion.create(Button)` — hover/tap micro-interaction wrapper
    dashboard/
      dashboard-shell.tsx      # top-level client orchestrator: tab/filter state, KPIs,
                             # wires the card grid + all sheets/dialogs together
      type-tabs.tsx            # animated Inward/Outward switch (`layoutId="activeTab"`)
      kpi-sidebar.tsx           # vertical KPI panel (right column at `xl`+): status
                             # breakdown + recharts sparklines (14-day volume/charges)
      filters-bar.tsx           # search, status filter, export/import/add actions
      shipment-card-grid.tsx    # responsive card grid — stagger/exit + active-card state live here
      shipment-card.tsx          # single shipment card; "More details" opens the details dialog
      shipment-details-dialog.tsx # centered modal with a card's full details (read-only)
      status-popover.tsx          # two-step-confirm status changer (see below)
      status-badge.tsx          # plain status badge (read-only contexts, e.g. import preview,
                             # shipment-details-dialog.tsx)
      shipment-form-dialog.tsx   # create/edit shipment, centered modal (react-hook-form + zod)
      upload-sheet.tsx           # drag-and-drop Excel/CSV importer + preview
      delete-shipment-dialog.tsx # delete confirmation (AlertDialog)
  lib/
    types.ts                  # Shipment / ShipmentInsert / ShipmentUpdate / KPI types
    constants.ts                # EXCEL_COLUMN_MAP, STATUS_CONFIG, TYPE_CONFIG
    validations.ts               # Zod schemas: form schema + server insert/update schema
    excel-parser.ts               # header normalization + row mapping + coercion
    actions.ts                    # "use server" mutations (create/update/delete/bulk insert)
    format.ts                      # date/currency/number display helpers
    supabase/
      client.ts                    # browser Supabase client
      server.ts                    # server Supabase client (async cookies, Next 16)
supabase/
  migrations/0001_init.sql        # schema, indexes, updated_at trigger, RLS policies
  migrations/0002_merge_cost_center_oca.sql  # merges cost_center/oca_number -> cost_center_oca
  seed.sql                         # optional demo rows
.env.local.example                 # copy to .env.local and fill in real values
```

## Database schema & column mapping

Table: `public.shipments` (see `supabase/migrations/0001_init.sql` plus
`0002_merge_cost_center_oca.sql` for the authoritative DDL — the latter merges the original
`cost_center`/`oca_number` columns into one `cost_center_oca` column).
`id`, `created_at`, `updated_at` are DB-managed; everything else maps 1:1 to
`src/lib/types.ts#Shipment`.

The **source Excel headers → DB columns** mapping lives in `src/lib/constants.ts` as
`EXCEL_COLUMN_MAP` (keys are normalized — lowercased, trimmed, periods stripped — via
`normalizeHeader()` in `src/lib/excel-parser.ts`, so header casing/spacing in the source file
doesn't matter):

| Excel header             | Column              | Notes                                  |
| ------------------------- | -------------------- | --------------------------------------- |
| `Sr.No`                  | *(ignored)*          | DB generates its own `id` (uuid)        |
| `COMPANY NAME`            | `company_name`       | required                                |
| `COST CENTER`             | `cost_center_oca`    | merged field — see note below           |
| `OCA NO`                  | `cost_center_oca`    | joined with `COST CENTER` as `"A / B"` when both are present in a row |
| `date`                    | `shipment_date`      | required, `date`                        |
| `INVOCE NO`               | `invoice_number`     | matches source sheet's spelling         |
| `Particular sent`         | `particulars`        | required                                |
| `Shipped addres`          | `shipping_address`   |                                         |
| `GOODS TAKEN OUT BY`      | `taken_out_by`       |                                         |
| `TRANSPORTER NAME`        | `transporter_name`   |                                         |
| `Tracking no`             | `tracking_number`    |                                         |
| `DELIVERY DATE`           | `delivery_date`      | `date`, nullable                        |
| `Delivery confirmed WITH` | `confirmed_with`     |                                         |
| `shiping charges`         | `shipping_charges`   | numeric                                 |
| `weight of material`      | `weight_kg`          | numeric                                 |
| `Volume of material`      | `volume_cbm`         | numeric                                 |
| `CONTACT PERSON`          | `contact_person`     |                                         |
| `CONTACT NUMBER`          | `contact_number`     |                                         |
| `EMAIL ID`                | `email`              |                                         |
| `REMARK`                  | `remarks`            |                                         |

Because `COST CENTER` and `OCA NO` both map to the single `cost_center_oca` field, the
row-mapping loop in `excel-parser.ts` special-cases that field to join rather than overwrite —
see the `field === "cost_center_oca"` branch there if extending this mapping further.

`type` (`INWARD`/`OUTWARD`) isn't a source column — the importer asks the user to pick it (and
a default `status`, or "auto-detect": `DELIVERED` if a delivery date is present, else
`IN_TRANSIT` if a tracking number is present, else `PENDING`) once per import batch, applied to
every row. To support a new header spelling/variant, add a normalized key to
`EXCEL_COLUMN_MAP` — don't change the DB column names.

## Design tokens & Tangerine theme

All theming is CSS-variable-based in `src/app/globals.css` (Tailwind v4 `@theme` — there is no
`tailwind.config.ts`). Key pieces:

- **`--color-tangerine-{50..950}`** — the brand ramp (`theme.extend.colors.tangerine`
  equivalent), usable as `bg-tangerine-500`, `text-tangerine-600`, etc. `tangerine-600`
  (`oklch(0.646 0.222 41.116)`, ≈ Tailwind `orange-600`) is also wired as `--primary`.
- **Neutrals** are zinc-based grays (`--background`, `--foreground`, `--border`, `--muted`, …)
  for the "dark-grey SaaS" contrast look; the sidebar tokens default to a dark zinc surface
  even in light mode for extra contrast if a sidebar is ever added.
- **Atmosphere / background** — the page is never flat white. `layout.tsx` renders two fixed,
  `aria-hidden`, `-z-10`/`-z-20` layers behind everything: `.atmosphere` (radial tangerine/amber
  glows over the base `--background`, via `--glow-tangerine-{1,2,3}` tokens, redefined per theme)
  and `.bg-grid` (a faint 36px grid, masked with a radial gradient so it fades out toward the
  edges instead of tiling edge-to-edge). Don't put a solid `bg-background` on page-level
  containers — that hides the atmosphere; let it show through and put opaque surfaces only on
  the actual cards/panels (see `.glass-card` below).
- **`.glass-card`** — the standard elevated surface for *every* panel (header, KPI tiles, filter
  toolbar, tab pill, shipment cards, empty/error states): `backdrop-blur-md`, semi-transparent
  white/slate background, soft border, `shadow-xl`. Defined once in `globals.css`; apply it
  directly on a plain `<div>` rather than through shadcn's `<Card>` — `<Card>` ships its own
  opaque `bg-card`, and layering a second background utility on top of it is a merge-order
  footgun (`cn()`/tailwind-merge only reliably dedupes literal Tailwind utilities against each
  other, not against a custom compound class like `.glass-card`). `kpi-sidebar.tsx` and
  `shipment-card.tsx` are the reference implementations.
- **`.glass-card-hover`** — pairs with `.glass-card` on hoverable surfaces: lifts (`-translate-y`),
  brightens the border to tangerine, and deepens the shadow with a tangerine tint.
- **Status colors** — don't hardcode status colors in components. Use `STATUS_CONFIG` in
  `src/lib/constants.ts`, which maps each `ShipmentStatus` to:
  - `badgeClass` — tinted background/foreground (read-only badges, e.g. import preview)
  - `dotClass` — small status dot color
  - `glowClass` — colored ambient box-shadow ring (`.status-glow-{pending,transit,delivered,cancelled}`)
    used on the live status badge in `status-popover.tsx`
  - `solidClass` — vivid solid button color (amber/sky/emerald/rose) used for the *armed*/
    *confirming* option inside the status popover
  - `PENDING` → amber/tangerine · `IN_TRANSIT` → sky blue · `DELIVERED` → emerald ·
    `CANCELLED` → rose
- **Utilities**: `.glow-tangerine` (soft primary box-shadow, header logo mark), `.focus-tangerine`
  (tangerine focus ring for custom interactive elements).
- **Dark mode**: full `.dark` token set exists (including `--grid-line` and `--glow-tangerine-*`
  dark variants), but there's no theme toggle wired up yet (`next-themes` is installed as a
  shadcn dependency; `Toaster` already reads from it defensively via a default of `"system"`).

## Dashboard layout

`dashboard-shell.tsx` renders `TypeTabs` full-width, then a 2-column CSS grid
(`grid-cols-1 xl:grid-cols-[1fr_320px]`): the main column (filters + card grid) on the left,
`KpiSidebar` on the right. Below `xl` the grid collapses to a single stacked column; the
sidebar carries `order-first xl:order-none` so KPIs still appear *before* the filters/grid on
mobile even though they're markup-last (needed for the right-column placement at `xl`). The
sidebar is `xl:sticky xl:top-24` so it stays in view while the card grid scrolls.

`KpiSidebar` (`kpi-sidebar.tsx`) receives both the derived `ShipmentKpis` (for headline numbers)
and the raw filtered `Shipment[]` for the active type (to build its own 14-day daily series —
see `buildDailySeries`, local to that file). It renders three stacked `.glass-card` panels:
status breakdown (plain divs — a proportional stacked bar + counts, not a chart), a recharts
`AreaChart` sparkline of shipment volume, and a recharts `LineChart` sparkline of shipping
charges, both over the last 14 calendar days (zero-filled so they always render). Chart
stroke/fill use a literal `oklch(...)` constant mirroring `--color-tangerine-500` rather than
`var(--color-tangerine-500)`, since SVG presentation attributes resolve CSS custom properties
inconsistently across browsers.

## Card Grid UI architecture

Shipments render as a **responsive card grid**, not a table (`shipment-card-grid.tsx` +
`shipment-card.tsx`) — 1 column on mobile, 2 on `sm`, 3 on `2xl`. (Breakpoints stay one step
wider than they'd otherwise be because the grid shares the page with the `KpiSidebar` — see
"Dashboard layout" below.) Each `ShipmentCard` is a self-contained `glass-card` with:

- Header: direction icon + company name (bold) + Cost Center/OCA or invoice reference,
  `StatusPopover` and an edit/delete kebab menu top-right.
- Particulars (2-line clamp) and a compact meta row (shipment date, transporter/tracking).
- A "More details" button that opens `ShipmentDetailsDialog` (`shipment-details-dialog.tsx`) — a
  centered modal with the full `<dl>` (cost center/OCA, weight, volume, shipping charges, contact
  info, address, remarks). This used to be an inline `AnimatePresence` accordion under the card,
  but that made one card's expansion push the height of its entire grid row on desktop; a modal
  sidesteps that regardless of grid position. The dialog is self-contained per card (its own
  `useState` in `ShipmentCard`) — it doesn't need the shipment lifted anywhere.

**Active/recently-viewed highlight**: `ShipmentCardGrid` holds `activeId` (the single most
recently opened card's id) and passes each card `isActive`/`onOpenDetails`. Opening a card's
details dialog calls `onOpenDetails`, which sets `activeId` — `ShipmentCard` then renders a
persistent `ring-2 ring-tangerine-500` while `isActive` is true, and the ring **stays** after the
dialog closes (it isn't cleared on close) so the user can see which card they last opened. Only
one card is active at a time. This state is intentionally local to `ShipmentCardGrid`, not lifted
to `dashboard-shell.tsx` — nothing outside the grid needs it.

**Grid orchestration** (`shipment-card-grid.tsx`): the grid's outer `motion.div` carries
`cardGridVariants` (`hidden` → `show` with `staggerChildren`) and is **keyed by `stackKey`**
(passed in from `dashboard-shell.tsx` as `` `${activeType}-${statusFilter}` ``). Changing the
active tab or the status filter changes that key, which remounts *that JSX subtree* (including
every `ShipmentCard`) and replays the staggered entrance for the whole new batch — but it does
**not** remount `ShipmentCardGrid` itself (React only remounts a component when its parent
changes *its* key), so `activeId` survives a tab switch even though the card DOM underneath is
torn down and rebuilt. Within a stable key (e.g. typing in the search box, or a single card being
added/edited/deleted), an inner `AnimatePresence mode="popLayout"` handles individual
enter/exit/layout-reorder without restarting the stagger.

⚠️ That inner `AnimatePresence` must **not** be given `initial={false}` — since the outer grid
remounts (and with it, a fresh `AnimatePresence` instance) on every `stackKey` change, `initial`
must stay at its default (`true`) so each new instance's first batch of children actually plays
the `hidden → show` entrance instead of snapping straight to their end state. This was a real bug
caught during review; if the tab-switch stagger ever stops animating, check this first.

`ShipmentCard`'s root `motion.div` uses `cardVariants` (exported from `shipment-card.tsx`) with
`hidden`/`show`/`exit` keys and relies on variant propagation from the grid's stagger — it does
not set its own `initial`/`animate` props.

## Status popover (two-step confirm)

`status-popover.tsx` replaces the old status dropdown. It wraps shadcn's Radix-based `Popover`
(for positioning, outside-click, and escape handling) around a `StatusBadge`-style trigger with
a `.status-glow-*` ring, and a floating menu of the four statuses styled from `STATUS_CONFIG`.

State machine (all local component state, no effects involved):

1. **Click an option** that isn't the current status → it becomes *armed*: the row switches to
   its `solidClass` color and shows "Click again". A 3s timeout (`ARM_TIMEOUT_MS`) auto-disarms
   it if the user doesn't follow through.
2. **Click the same armed option again** → calls the `onChange(status): Promise<boolean>` prop
   (wired to `dashboard-shell.tsx#handleStatusChange`, which runs the `updateShipmentStatus`
   Server Action) and shows a spinner while awaiting it.
3. On success, the option shows a brief scale-pop checkmark, then the popover auto-closes; on
   failure the popover stays open (armed state cleared) and the parent's `toast.error` surfaces
   the reason.

This is intentionally **not** a `useEffect`-driven state machine — the busy/success sequencing
all happens inside the `async` click handler (`await onChange(...)`), which sidesteps the
`react-hooks/set-state-in-effect` lint rule entirely and is simpler to follow than syncing to a
`pending` prop. If you need similar "open → arm → confirm → await → resolve" UX elsewhere, copy
this component's shape rather than reaching for an effect.

## Motion conventions (Framer Motion)

- Tab switch: shared `layoutId="activeTab"` pill in `type-tabs.tsx`.
- Buttons: wrap with `MotionButton` (`src/components/motion/motion-button.tsx`,
  `motion.create(Button)`) and apply `whileHover={{ scale: 1.02 }}` / `whileTap={{ scale: 0.98 }}`
  — only on primary/CTA buttons, not every button.
- Cards: hover lift via `whileHover={{ y: -4 }}` + `.glass-card-hover`'s border/shadow
  transition; entrance via the grid's `cardGridVariants`/`cardVariants` stagger (see above); a
  persistent `ring-2 ring-tangerine-500` (not animated) while the card is the grid's `activeId`.
- No inline expandable accordions remain — card details open in `ShipmentDetailsDialog` instead
  (see "Card Grid UI architecture" above). If you need an "expand in place" pattern elsewhere,
  the old approach was `AnimatePresence` + `motion.div` animating `height`/`opacity`, wrapped in
  `overflow-hidden` — still fine for cases that aren't in a multi-column grid.
- Status popover micro-interactions: per-option `whileHover`/`whileTap` scale, `AnimatePresence
  mode="wait"` swapping the trailing icon/label between idle → "Click again" → spinner → check
  pop (see `status-popover.tsx`).
- When adding a new list-like UI that needs "reveal on filter change" behavior, follow the
  `stackKey` pattern above rather than trying to re-trigger `staggerChildren` on an
  already-mounted parent (it won't re-run without a remount).

## Data flow / conventions

- All mutations go through Server Actions in `src/lib/actions.ts` (never call Supabase directly
  from a Client Component) and re-validate with the Zod schemas in `validations.ts` server-side,
  even though the form already validated client-side.
- After a mutation succeeds, components call `router.refresh()` (via the `onSaved`/`onDeleted`/
  `onImported` callbacks threaded from `dashboard-shell.tsx`) rather than mutating local state —
  the server is the source of truth.
- No auth is implemented. RLS policies in `0001_init.sql` currently allow full CRUD for
  anon/authenticated roles, which is fine for an internal/private-network tool. **Add Supabase
  Auth and tighten these policies before exposing this publicly.**
- Zod v4 is in use (not v3) — prefer top-level formats (`z.email()`) over the deprecated
  `z.string().email()` chain if extending schemas.
- This is a Next.js 16 project (Turbopack by default, async `cookies()`/`params`/`searchParams`,
  no `next lint`). If something looks like it contradicts older Next.js knowledge, check
  `node_modules/next/dist/docs/` before assuming — see `AGENTS.md`.

## Setup checklist (env + Vercel)

1. Copy `.env.local.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase → Project Settings → API.
2. Run every file in `supabase/migrations/` in order (and optionally `supabase/seed.sql`) in the
   Supabase SQL Editor.
3. `npm run dev` and confirm the dashboard loads without the "Couldn't load shipments" error.
4. On Vercel: add the same two `NEXT_PUBLIC_*` env vars in Project Settings → Environment
   Variables (all environments), then deploy.
