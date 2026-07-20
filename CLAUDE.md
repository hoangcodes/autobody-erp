# CLAUDE.md — AutoSuite Frontend

Guidance for future agents/devs working in this repo.

## What this is

The web client for **AutoSuite**, an auto-repair shop management platform modeled
on Shopmonkey (see `developer.md` for the full spec). React + Vite + TypeScript.
It talks to the `autobody-erp-backend` API over REST (`/api/v1`).

## Tech stack

- React 18 + Vite + TypeScript (strict).
- Tailwind CSS + hand-rolled shadcn/ui-style components on Radix primitives.
- TanStack Query (server state) + Zustand (local UI state).
- React Router (data router) — all routes in `src/router.tsx`.
- `@dnd-kit` for the kanban drag-and-drop.

## Where things live

- `src/lib/api.ts` — the ONE typed API client. All requests go through `api.get/
  list/post/patch/del`. It attaches the Supabase bearer token + `x-location-id`
  header and unwraps the `{ data, meta }` envelope. Never `fetch` directly.
- `src/lib/queryClient.ts` — the QueryClient and the central `queryKeys` map.
  Add new cache keys here so invalidation stays consistent.
- `src/types/index.ts` — domain types that **mirror the backend contract**
  (camelCase). Single source of truth on the client; keep in sync with the API.
- `src/hooks/` — one file per domain (`useOrders`, `useCustomers`, `useMessages`,
  …). Hooks own the query keys + endpoints; components never call `api` directly.
- `src/components/ui/` — the primitive component library (Button, Card, Dialog,
  Tabs, Badge, Input, Select, Avatar, Skeleton, …). Reuse these; don't hand-roll
  one-off styled elements.
- `src/components/` — shared composite components: `AppShell` (nav + top bar),
  `DataTable`, `PageHeader`, `Timeline`.
- `src/features/<domain>/` — feature UIs. Page-level components end in `Page`
  and are wired in `router.tsx`.

## Key conventions

- **Data fetching:** always via a hook in `src/hooks/` → `api` → backend. Reads
  use `useQuery`, writes use `useMutation` and invalidate the relevant
  `queryKeys` on success.
- **Types:** import domain shapes from `@/types`. If the backend contract
  changes, update `src/types/index.ts` first.
- **Styling:** Tailwind utility classes + the `cn()` helper (`src/lib/utils.ts`)
  for conditional/merged classes. Colours come from CSS variables / the Tailwind
  theme (`bg-background`, `text-muted-foreground`, `primary-600`, …) — no raw
  hex in components.
- **UI state** (drawers, filters, selected ids) is local `useState` or Zustand
  (`authStore`); **server data** is never mirrored into Zustand.
- **Toasts:** use `toast` from `@/components/ui/toastStore` for success/error
  feedback on mutations.
- **Money/dates:** format via `formatMoney`, `formatDate`, `formatDateTime`,
  `formatRelativeTime` in `lib/utils.ts`. Don't inline `Intl` calls.

## The priority screen

`features/workflow/` is the heart of the app. `KanbanBoard` renders columns of
`OrderCard`s (draggable via dnd-kit; `useMoveCard` PATCHes the workflow column
and applies backend conversion rules). Clicking a card opens `OrderDetailDrawer`,
a full-size modal with tabs that **reuse** the same feature components used on the
standalone pages:

- Overview → `features/orders/ServicesEditor` (services/line-items + live totals)
- Inspections → `InspectionsTab` (scaffold)
- Messages → `features/messaging/MessageThread`
- Payments → `PaymentsTab` → `features/checkout/CollectPaymentModal`
- Activity → `ActivityTab` → `components/Timeline` (audit feed + notes/@mentions)

## Theming, mock mode, and the data seam

- **Theming / dark mode:** tokens live in `src/index.css` as CSS variables with
  full light + dark values (brand = AutoSuite Blue `#2B54D9`). Dark mode toggles
  a `dark` class on `<html>` via `src/features/theme/themeStore.ts` (Zustand,
  persisted to localStorage, respects `prefers-color-scheme`; applied on boot in
  `main.tsx`). The sidebar is a company-blue rail. Icons are `lucide-react`.
- **Mock mode (`VITE_USE_MOCKS`, default true):** hooks import `dataClient` from
  `src/lib/dataClient.ts` — NOT `api` directly. `dataClient` is the in-memory
  mock (`src/mocks/mockApi.ts`, seeded by `src/mocks/seed.ts`) when mocks are on,
  and the real `src/lib/api.ts` client when off. Both expose the same
  `get/list/post/patch/del` surface. The real `api` is intentionally kept for
  when the backend comes up — set `VITE_USE_MOCKS=false` to switch, no other
  changes needed. Add new endpoints to BOTH `mockApi.ts` (a route) and the real
  API expectations.
- **Schema doc:** `UI_DATA_POINTS.md` maps every screen's data points
  (read-only vs editable) to backend entities/fields for the future Supabase
  schema.

## Running

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:5173
npm run typecheck      # keep green
npm run build          # tsc -b + vite build
```

Choose **Continue in dev mode** on the login screen to use the backend's
`DEV_AUTH_BYPASS`. Data endpoints need the backend running with Supabase
configured + seeded; otherwise reads return `dependency_unavailable` and the UI
shows its error/empty states.

## Where to extend

- **New entity screen:** add types to `src/types`, a hook file in `src/hooks`,
  a `features/<domain>/…Page.tsx`, and a route in `router.tsx` (+ nav item in
  `AppShell` if top-level).
- **New primitive:** add to `src/components/ui` and reuse everywhere.
- **Scaffolded areas** (clearly marked TODO): Calendar/appointments, Inventory
  POs & returns, Inspections/DVI, Settings roles/workflow editors, full report
  catalog. Backend endpoints for most already exist.

## Gotchas

- **Do NOT run `git` here** — the repo lives on a mounted filesystem and git ops
  can corrupt the index. Create/edit files only; the user commits.
- **LF line endings** — enforced by `.gitattributes`.
- `npm install` must run on a local filesystem, not the mount, if the mount
  rejects npm's atomic renames (`ENOTEMPTY`). Not an issue on a normal checkout.
- The bundle is a single chunk; code-split with `React.lazy` before shipping.
