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
# (0001_init.sql, 0002_merge_cost_center_oca.sql, 0003_profiles_and_roles.sql,
# 0004_shipments_rbac_policies.sql, ...), or if you have the Supabase CLI linked to a project:
supabase db push

# Optional demo rows:
# paste supabase/seed.sql into the SQL Editor after the migrations above
```

If you add more migrations, name them `NNNN_description.sql` in `supabase/migrations/`,
incrementing from `0001_init.sql`.

## Directory structure

```
src/
  middleware.ts               # auth wall: redirects logged-out visitors to /login (see
                             # src/lib/supabase/middleware.ts for the actual session logic)
  app/
    layout.tsx              # root layout: fonts, metadata, <Toaster />
    page.tsx                # dashboard page (Server Component) — fetches the current user +
                             # profile role and shipments, renders <PageShell> + <DashboardShell>
    login/
      page.tsx                 # server component: redirects to `/` if already signed in
      login-form.tsx            # client form — calls the `signIn` server action
    globals.css              # Tailwind v4 theme tokens (Tangerine palette lives here)
  components/
    ui/                       # shadcn/ui primitives — regenerate/extend via `npx shadcn add`,
                             # don't hand-edit generated internals beyond className tweaks
    motion/
      motion-button.tsx       # `motion.create(Button)` — hover/tap micro-interaction wrapper
    dashboard/
      dashboard-shell.tsx      # top-level client orchestrator: tab/filter/sort/page state,
                             # wires the shipment table + all sheets/dialogs together
      type-tabs.tsx            # animated Inward/Outward switch (`layoutId="activeTab"`)
      status-tabs.tsx           # All/Pending/In Transit/Delivered/Cancelled tabs + aging counts
      filters-bar.tsx           # search, export/import/add actions
      shipment-table.tsx        # dense desktop table + compact mobile rows, transit age display
      shipment-details-dialog.tsx # centered modal with a shipment's full details — tangerine header
                             # bar, sectioned key/value grids, and an in-place Edit toggle
                             # (react-hook-form + zod) that PATCHes via `updateShipment`
      status-popover.tsx          # two-step-confirm status changer (see below)
      status-badge.tsx          # plain status badge (read-only contexts, e.g. import preview,
                             # shipment-details-dialog.tsx)
      shipment-form-dialog.tsx   # create/edit shipment, centered modal (react-hook-form + zod)
      upload-sheet.tsx           # drag-and-drop Excel/CSV importer + preview
      delete-shipment-dialog.tsx # delete confirmation (AlertDialog)
      user-menu.tsx               # header dropdown: signed-in email/role + sign-out
  lib/
    types.ts                  # Shipment / ShipmentInsert / ShipmentUpdate types
    transit.ts                # transit aging helper + TRANSIT_AGING_CONFIG thresholds
    constants.ts                # EXCEL_COLUMN_MAP, STATUS_CONFIG, TYPE_CONFIG
    validations.ts               # Zod schemas: form schema + server insert/update schema, plus
                             # shipmentToFormValues()/formValuesToShipmentInsert() converters
                             # shared by shipment-form-dialog.tsx and shipment-details-dialog.tsx
    excel-parser.ts               # header normalization + row mapping + coercion
    actions.ts                    # "use server" mutations (create/update/delete/bulk insert)
    auth-actions.ts                # "use server" signIn/signOut (Supabase Auth)
    format.ts                      # date/currency/number display helpers
    supabase/
      client.ts                    # browser Supabase client
      server.ts                    # server Supabase client (async cookies, Next 16)
      middleware.ts                 # session-refresh + login-wall logic used by src/middleware.ts
supabase/
  migrations/0001_init.sql        # schema, indexes, updated_at trigger, RLS policies
  migrations/0002_merge_cost_center_oca.sql  # merges cost_center/oca_number -> cost_center_oca
  migrations/0003_profiles_and_roles.sql      # profiles table, is_admin()/user_role(), auto-
                                             # provisioning trigger on new auth.users rows
  migrations/0004_shipments_rbac_policies.sql # replaces the 0001 "allow all" shipments RLS
                                             # policies with role-gated ones (admin/staff)
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
- **`.glass-card`** — the standard elevated surface for *every* panel (header, tab pill, shipment
  table, empty/error states): `backdrop-blur-md`, semi-transparent
  white/slate background, soft border, `shadow-xl`. Defined once in `globals.css`; apply it
  directly on a plain `<div>` rather than through shadcn's `<Card>` — `<Card>` ships its own
  opaque `bg-card`, and layering a second background utility on top of it is a merge-order
  footgun (`cn()`/tailwind-merge only reliably dedupes literal Tailwind utilities against each
  other, not against a custom compound class like `.glass-card`). `dashboard-shell.tsx` is
  the reference implementation.
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

`dashboard-shell.tsx` renders the direction tabs and actions, then one solid white, bordered,
soft-shadowed panel (deliberately not `.glass-card`, so it stands off the warm page tint) containing
`StatusTabs`, the "Oldest in transit first" toggle, `ShipmentTable`, and 50-row pagination. Cost
metrics and charts are intentionally not on this screen. `shipping_charges` remains on the record,
form, details dialog, import, and export.

`ShipmentTable` has three layouts with no horizontal scrolling: two-line strips below `md`, a
5-column table from `md` to `lg` (no Date or Tracking Number), and the full table from `lg`. Below
1440px the table uses fixed column widths. The full table shows seven columns: Date, OCA No, Name of Customer, Item
(`particulars`, truncated with the full text on hover), Transporter Name, Tracking Number, and
Transit / Status (day count for In Transit, a status badge otherwise).
Status changes, edit, and delete live in the details
dialog. Celsun brand colors are `#f18124` orange and `#494847` charcoal, with near-black text on
orange because white fails contrast. Row click opens the single `ShipmentDetailsDialog` owned by `DashboardShell`. The last opened row keeps
a tangerine outline through `activeId`.

## Transit aging and sorting

`src/lib/transit.ts` owns the rules. Change thresholds, weekend days, or time zone in
`TRANSIT_AGING_CONFIG`. Only `IN_TRANSIT` shipments get an age, counted from `in_transit_at` and
falling back to `shipment_date` when null. The start day is day 0. A database trigger in
`0007_shipments_in_transit_at.sql` stamps the column on every write path, so server actions must
not set it.

The color scale lives in `TRANSIT_AGING_CONFIG.steps` and uses calendar days, matching the number
in the badge. Business days appear only in the badge tooltip.

- Day 0 to 1: light yellow.
- Day 2: warm yellow.
- Day 3: amber.
- Day 4 to 6: orange (warning).
- Day 7 and up: red, "Call courier" (critical).

The default priority sort places In Transit first, oldest first, then other statuses newest first.
Clicking a sortable column replaces it until the priority toggle is turned back on.

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
- Status popover micro-interactions: per-option `whileHover`/`whileTap` scale, `AnimatePresence
  mode="wait"` swapping the trailing icon/label between idle → "Click again" → spinner → check
  pop (see `status-popover.tsx`).

## Data flow / conventions

- All mutations go through Server Actions in `src/lib/actions.ts` (never call Supabase directly
  from a Client Component) and re-validate with the Zod schemas in `validations.ts` server-side,
  even though the form already validated client-side.
- After a mutation succeeds, components call `router.refresh()` (via the `onSaved`/`onDeleted`/
  `onImported` callbacks threaded from `dashboard-shell.tsx`) rather than mutating local state —
  the server is the source of truth.
- Auth is Supabase Auth, gated by `src/middleware.ts` (redirects logged-out requests to
  `/login`) and by RLS — see `supabase/migrations/0003_profiles_and_roles.sql` (a `profiles`
  table with an `admin`/`staff` `role`, auto-provisioned via an `auth.users` insert trigger)
  and `0004_shipments_rbac_policies.sql` (SELECT for any provisioned user; INSERT/UPDATE for
  `staff`/`admin`; DELETE for `admin` only). There's no public sign-up flow — invite users from
  Supabase Studio → Authentication → Users, or disable public sign-ups under Authentication →
  Providers → Email. Promote a user to `admin` with
  `update public.profiles set role = 'admin' where email = '...'`.
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
3. Under Authentication → Providers → Email, disable public sign-ups (this app has no sign-up
   page — users are provisioned by invite only). Then invite yourself and any teammates from
   Authentication → Users → Invite; each invite auto-creates a `staff`-role `profiles` row via
   the `0003_profiles_and_roles.sql` trigger. Promote admins with
   `update public.profiles set role = 'admin' where email = '...'`.
4. `npm run dev` and confirm `/login` loads, you can sign in with an invited account, and the
   dashboard loads without the "Couldn't load shipments" error afterwards.
5. On Vercel: add the same two `NEXT_PUBLIC_*` env vars in Project Settings → Environment
   Variables (all environments), then deploy.
