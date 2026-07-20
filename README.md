# AutoSuite — Frontend

React + Vite + TypeScript web client for **AutoSuite**, an auto repair shop management platform
(a Shopmonkey-class competitor). This is the shop-floor and front-counter UI: workflow board,
estimates/repair-orders/invoices, messaging, payments, customers, inventory, and reporting.

The backend lives in a separate repo (`autobody-erp-backend`). See `developer.md` in this repo for
the full product/architecture specification.

## Tech stack

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** + hand-rolled shadcn/ui-style components (Radix primitives under the hood)
- **TanStack Query** for server state, **Zustand** for local UI state
- **React Router** for routing
- **@dnd-kit** for the draggable kanban board
- A single typed **API client** (`src/lib/api.ts`) against the backend's `/api/v1` surface

## Getting started

```bash
npm install
cp .env.example .env      # point VITE_API_URL at the backend (default http://localhost:4000)
npm run dev               # Vite dev server on http://localhost:5173
```

The backend ships with a dev auth bypass (`DEV_AUTH_BYPASS=true`), so you can run the whole app
locally without configuring Supabase Auth. On the login screen choose **Continue in dev mode**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `ts`/`tsx` |
| `npm run preview` | Serve the production build locally |

## Environment

| Var | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend (client appends `/api/v1`). Default `http://localhost:4000`. |
| `VITE_USE_MOCKS` | Use the in-memory mock data layer instead of the backend. Default **`true`** while the backend isn't up. Set to `false` to hit the real API. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Optional; only needed for real Supabase auth. Blank is fine in dev. |

## Theming (light / dark) + brand

The app uses design-token CSS variables in `src/index.css` (consumed by
`tailwind.config.js`) with full **light and dark** values. Brand color is
**AutoSuite Blue `#2B54D9`** (`primary-600`; hover `#2242B8`), with accent green
`#16A34A` (paid) and orange `#EA580C` (remaining/overdue). Dark mode toggles a
`dark` class on `<html>`, persists to `localStorage`, and respects
`prefers-color-scheme` on first load — see `src/features/theme/themeStore.ts`
(applied on boot in `main.tsx`). Toggle it from the sidebar. Icons are
[`lucide-react`](https://lucide.dev); the default font is **Inter**.

## Mock data layer (backend not required)

While the backend isn't running, `VITE_USE_MOCKS=true` (default) routes all data
through an in-memory mock (`src/mocks/mockApi.ts` + `src/mocks/seed.ts`) that
implements the same `get/list/post/patch/del` surface as `src/lib/api.ts`.
Mutations (move card, add note, collect payment, create customer, send message)
update the in-memory store so the UI feels live. Hooks import `dataClient` from
`src/lib/dataClient.ts`, which is the mock when mocks are on and the real `api`
when off. **To go live later:** set `VITE_USE_MOCKS=false` and point
`VITE_API_URL` at the backend — no hook/component changes needed.

## Future schema reference

`UI_DATA_POINTS.md` lists, per screen/component, every data point shown and
whether it's read-only or user-editable, mapped to the intended backend
entity/field (`developer.md` Part B). Use it plus the mock seed shapes to build
the Supabase schema.

## Project structure

```
src/
  components/         Shared UI: AppShell, DataTable, PageHeader, Timeline
    ui/               Primitive component library (Button, Card, Dialog, Tabs, Badge, …)
  features/           One folder per domain area
    auth/             Login + auth store (Zustand)
    workflow/         Kanban board, columns, cards, OrderDetailDrawer (the priority screen)
    orders/           Estimate/RO/Invoice editor + services/line-items + live totals rail
    checkout/         CollectPaymentModal (cash/check/card/split/text-to-pay)
    messaging/        Message thread + Messages center
    customers/        Customers list + customer profile
    inventory/        Parts list (+ PO/returns scaffolds)
    reports/          KPI dashboard
    calendar/         Scheduling scaffold
    settings/         Settings incl. Stripe payments setup
  hooks/              TanStack Query hooks, one file per domain (useOrders, useMessages, …)
  lib/                api client, query client + query keys, supabase, utils
  types/              Domain types that MIRROR the backend API contract (single source of truth)
  router.tsx          All route definitions
  main.tsx            App entry
```

See `CLAUDE.md` for conventions and where to extend each feature.
