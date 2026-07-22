# CLAUDE.md — AutoSuite Frontend

Guidance for future agents/devs working in this repo.

## What this is

The web client for **AutoSuite**, an auto-repair shop management platform modeled
on Shopmonkey (see `developer.md` for the full spec). React + Vite + TypeScript.

**Current state:** the app runs entirely on an **in-memory mock data layer**
(`VITE_USE_MOCKS=true`, default) so every screen renders and is interactive
without a backend. The real REST client (`src/lib/api.ts`, targeting the
`autobody-erp-backend` `/api/v1` surface) is kept intact behind the same seam and
switches on with one env flag. A few areas are **mock/UI-only** and have no
backend counterpart yet: roles, profile photos, notifications, and the financial
statements (all noted below).

## Tech stack

- React 18 + Vite + TypeScript (strict).
- Tailwind CSS + hand-rolled shadcn/ui-style components on Radix primitives.
- TanStack Query (server state) + Zustand (local UI state).
- React Router (data router) — all routes in `src/router.tsx`.
- `@dnd-kit` for the kanban drag-and-drop.
- SheetJS (`xlsx`) for client-side report export.

## The data seam (read this first)

- **`src/lib/dataClient.ts`** is the ONE thing hooks import — NOT `api` directly.
  It exposes `get/list/post/patch/del` and resolves to:
  - `src/mocks/mockApi.ts` (in-memory, seeded by `src/mocks/seed.ts`) when
    `VITE_USE_MOCKS !== 'false'` (the default today), or
  - `src/lib/api.ts` (real REST client; attaches the Supabase bearer token +
    `x-location-id`, unwraps the `{ data, meta }` envelope) when mocks are off.
- Both clients are structurally identical, so switching is a drop-in: set
  `VITE_USE_MOCKS=false` and point `VITE_API_URL` at the backend — no hook or
  component changes.
- **When you add an endpoint, add it in BOTH places:** a route in `mockApi.ts`
  (and seed data in `seed.ts` if needed) AND the real API expectation.
- The mock adds a small artificial `LATENCY` so loading skeletons are visible.

## Where things live

- `src/hooks/` — one file per domain (`useOrders`, `useCustomers`, `useMessages`,
  `useNotifications`, `useFinancials`, `useWorkflowStatuses`, `useUsers`, …).
  Hooks own the query keys + endpoints and call `dataClient`; components never
  call the data client directly.
- `src/lib/queryClient.ts` — the QueryClient and the central `queryKeys` map. Add
  new cache keys here so invalidation stays consistent.
- `src/types/index.ts` — domain types that **mirror the backend contract**
  (camelCase). Single source of truth on the client; keep in sync with the API.
- `src/components/ui/` — the primitive component library (Button, Card, Dialog,
  Tabs, Badge, Input, Select, Avatar, Skeleton, **MultiCombobox**, …). Reuse
  these; don't hand-roll one-off styled elements.
- `src/components/` — shared composites: `AppShell` (nav + top bar), `DataTable`,
  `PageHeader`, `Timeline`, and the small brand/avatar marks: `BrandLogo`,
  `CarBrandMark`, `MechanicAvatar`.
- `src/features/<domain>/` — feature UIs. Page-level components end in `Page` and
  are wired in `router.tsx`.

## Feature overview

- **`features/workflow/`** — the priority screen. `KanbanBoard` renders `Column`s
  of `OrderCard`s (draggable via dnd-kit with a placeholder slot + drop
  animation; `useMoveCard` PATCHes the workflow column and applies backend
  conversion rules). Columns come from the mock `workflow_statuses` (To Do, In
  Progress, Pending, Invoices, Ready for Pickup, Done). Rename/archive exist;
  the "+ Add column" affordance is intentionally hidden. Columns are
  content-height, capped at the viewport, with an internal scroll and a pinned
  "+ Create". The board has its own local search and a mechanic-avatar filter
  cluster (separate from the top-bar global search). Clicking a card opens
  `OrderDetailDrawer`.
- **`OrderDetailDrawer`** — a large Jira-issue-style modal: inline-editable title
  + tabs (Overview / Inspections / Messages / Payments / Activity). The Overview
  tab is `features/orders/ServicesEditor`, a 3-column layout: **main** (Services
  accordion → editable Description → Photos carousel) | **Details** (a field form:
  Vehicle, Assignee→`mechanicIds`, Customer, Labels, Year/Make/Model/Color
  [mandatory; Make/Model/Color allow +New and persist onto the Vehicle], Start
  date, Priority, Effort) | **Invoice** (totals + Send / Convert / Collect Payment
  / Print / Email / SMS). Sections are collapsible Cards.
- **`features/messaging/`** — Facebook-style global chat dock, rendered once from
  `AppShell`. State lives in `chatDockStore` (Zustand). The top-bar messenger
  icon opens the right-hugging `ChatsDropdown` (All/Unread); a bottom-right
  launcher opens a `ComposeWindow` with a To: picker (customers + team); docked
  `ChatWindow`s stack (cap 3, overflow "+N more"); `MessengerComposer` toggles
  its idle media cluster into a "+" + Send while typing. `MessageThread` is
  reused inside each window and in the order detail Messages tab. The Chats and
  Notifications dropdowns share fixed geometry and are mutually exclusive (both
  flags live in `chatDockStore`).
- **`features/notifications/`** — `NotificationsDropdown` (bell, All/Unread) over
  the mock `notifications` collection (`AppNotification`). **Mock/UI-only.**
- **`features/customers/`** — list (list + grid views) + profile + the shared
  `CustomerFormDialog` (identity + demographics: gender, dob→derived age/age
  range, ethnicity, `primaryLanguages[]` multi-select, speaks English, driver
  license, city/state, referral source).
- **`features/reports/ReportsPage`** — Income Statement + Balance Sheet with a
  sticky customization footer (Month/Quarter/Year granularity + multi-period
  select drive the columns via `useFinancials`), line drill-down, and .xlsx
  export. **Mock GL data.**
- **`features/backlog/`**, **`features/calendar/`**, **`features/inventory/`**,
  **`features/settings/`** — backlog list, calendar scaffold, parts list (+ PO /
  returns scaffolds), Stripe payments setup.
- **`features/auth/`** — `authStore` (session/location), `roleStore` (UI role,
  localStorage; **no RBAC enforcement**), `profilePhotoStore` (userId → data-URL,
  localStorage; **UI-only**).

## Key conventions

- **Data fetching:** always via a hook in `src/hooks/` → `dataClient` → mock/real
  API. Reads use `useQuery`, writes use `useMutation` and invalidate the relevant
  `queryKeys` on success.
- **Types:** import domain shapes from `@/types`. If the backend contract
  changes, update `src/types/index.ts` first.
- **Reuse `MultiCombobox`** (`src/components/ui/MultiCombobox.tsx`) for any
  text-plus-list multi-select (assignees, labels, languages). It supports
  `allowNew` ("+ Add …"), custom chips, and exports `useOutsideClose`. There is a
  single-select sibling (`SingleCombobox`) inside `ServicesEditor` for the same
  pattern.
- **Styling:** Tailwind utility classes + the `cn()` helper (`src/lib/utils.ts`).
  Colours come from CSS variables / the Tailwind theme (`bg-background`,
  `text-muted-foreground`, `primary-600`, …) — no raw hex in components.
- **Avatar palette:** `MechanicAvatar` / `CarBrandMark` derive a deterministic
  color per id/string via `avatarColorFromString` (a navy / blue / purple
  palette) so a person or make keeps the same color everywhere.
- **UI state** (drawers, filters, selected ids, chat dock, theme, role) is local
  `useState` or Zustand; **server data** is never mirrored into Zustand.
- **Toasts:** use `toast` from `@/components/ui/toastStore` for mutation feedback.
- **Money/dates:** format via `formatMoney`, `formatDate`, `formatDateTime`,
  `formatRelativeTime`, and demographic helpers `ageFromDob` / `ageRangeFromDob`
  in `lib/utils.ts`. Don't inline `Intl` calls.

## Drop-in assets (no bundled logos/photos)

The repo ships with **no** licensed automaker logos or vehicle photos — only
generated placeholders — so nothing copyrighted is committed. Drop files in and
they are picked up automatically (see the `public/**/README.md` files):

- `public/abs-autobody-logo.png` — company logo (`BrandLogo` falls back to a white
  vector emblem; also bundles `src/assets/image.png`).
- `public/car-logos/<make>.png` — per-make logo (`CarBrandMark`; make lowercased,
  non-alphanumerics → `-`). Falls back to a colored monogram, then a `Car` icon.
- `public/car-photos/<vehicleId>.jpg` — real vehicle photo (card + carousel).
  Falls back to the order's `photos[]`, then a generated SVG placeholder. The
  drop-in photo is a read-only preview and is never persisted into `photos[]`.

## Theming & mock mode

- Tokens live in `src/index.css` as CSS variables with full light + dark values
  (brand = AutoSuite Blue `#2B54D9`). Dark mode toggles a `dark` class on
  `<html>` via `src/features/theme/themeStore.ts` (Zustand, persisted, respects
  `prefers-color-scheme`; applied on boot in `main.tsx`). Toggle it from the
  sidebar (above the collapse button). Icons are `lucide-react`.
- `UI_DATA_POINTS.md` maps every screen's data points (read-only vs editable) to
  backend entities/fields for the future Supabase schema.

## Running

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173  (mocks on by default)
npm run typecheck      # keep green
npm run build          # tsc -b + vite build
```

With mocks on (default) no backend is needed. To hit the real backend set
`VITE_USE_MOCKS=false` and `VITE_API_URL`, run the backend with Supabase seeded,
and choose **Continue in dev mode** on the login screen (`DEV_AUTH_BYPASS`).

## Where to extend

- **New entity screen:** add types to `src/types`, a hook file in `src/hooks`
  (calling `dataClient`), a mock route in `src/mocks/mockApi.ts` (+ seed data), a
  `features/<domain>/…Page.tsx`, and a route in `router.tsx` (+ nav item in
  `AppShell` if top-level).
- **New primitive:** add to `src/components/ui` and reuse everywhere.
- **Scaffolded areas** (clearly marked): Calendar/appointments, Inventory POs &
  returns, Inspections/DVI, Settings roles/workflow editors, the board Parts view.
- **Wire mock/UI-only areas to the backend** when it lands: roles → real RBAC,
  profile photos → Supabase Storage, notifications → a `notifications` feed,
  financial statements → a real read-model.

## Gotchas

- **Do NOT run `git` here** — the repo lives on a mounted filesystem and git ops
  can corrupt the index. Create/edit files only; the user commits.
- **LF line endings** — enforced by `.gitattributes`.
- **Windows/macOS case-safety for filenames:** the filesystem is
  case-insensitive, so a store file must not collide case-insensitively with a
  component of the same base name. This is why stores are named
  `chatDockStore.ts` (not `chatDock.ts`, which would clash with `ChatDock.tsx`)
  and `profilePhotoStore.ts`. Keep this convention.
- **npm install / build off the mount:** if the mount rejects npm's atomic
  renames (`ENOTEMPTY`) you can't build in place. Copy the repo to a local dir
  (e.g. under `/tmp`) and run `npm install` / `npm run build` there to verify —
  it's a filesystem quirk, not a code issue, and doesn't apply to a normal local
  checkout.
- The bundle is a single chunk; code-split with `React.lazy` before shipping.
