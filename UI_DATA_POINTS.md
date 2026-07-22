# UI Data Points — AutoSuite Frontend

A per-screen inventory of every data point the UI shows or edits, mapped to the
intended backend entity/field from `developer.md` Part B (Domain Model). Use this
plus the mock seed shapes (`src/mocks/seed.ts`) to build the Supabase schema.

Legend:
- **R** = read-only (display).
- **W** = user-editable (create/update via the UI).
- Entity references use `developer.md` Part B names (e.g. `Order.number`).

> **Current state (be honest about mock vs. real).** The app runs entirely on the
> in-memory mock data layer (`VITE_USE_MOCKS=true`, `src/mocks/*`). Everything
> below is wired through `dataClient`, which is the mock today and the real
> `src/lib/api.ts` client when mocks are off. Several areas are **UI-only** and do
> not map to a live backend yet: roles (`roleStore`), profile photos
> (`profilePhotoStore`), notifications, and the financial statements. They are
> marked where they appear.

> **Display-convenience fields on `Order`.** A cluster of fields are hydrated on
> the order for board display and the Jira-style detail modal. Their suggested
> schema homes:
> - `Order.title` — short human title (display; derive from lead `Service.title` + count).
> - `Order.description` — free-text job description (persist directly on the order).
> - `Order.labels: OrderLabel[]` — colored chips; future `labels` catalog + `order_labels` join.
> - `Order.mechanicIds: string[]` — team members assigned to the car. Ids → `User`
>   (mock `MOCK_USERS`, `GET /users`). Editable from the detail **Details → Assignee**
>   field (`PATCH /orders/:id { mechanicIds }`); surfaced as card avatars + the board
>   mechanic filter. Future home: an order↔technician join (`order_assignments`).
> - `Order.photos: VehiclePhoto[]` (`{ id, url, sortOrder }`) — vehicle photos, lowest
>   `sortOrder` = card thumbnail. Future home: a `vehicle_photos` / `media` table keyed by `vehicleId`.
> - `Order.effort` / `Order.priority` — `'low' | 'medium' | 'high'`. Drive the card effort
>   icon and the Details Effort/Priority dropdowns.
> - `Order.startDate` — scheduled start (`YYYY-MM-DD`).
> - `Order.technicianName` — denormalized lead-tech display (derive from `LineItem.assignedTechnicianId → User`).

---

## Top bar / Profile (`AppShell`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Company brand logo (`BrandLogo`) | R | drop-in `public/abs-autobody-logo.png` (or bundled `src/assets/image.png`); white-mark fallback emblem when absent. Asset convention only, no backend field |
| Location name (bold) | R | `Location.name` (active location) |
| Account ID (NetSuite-style, numeric) + **PRODUCTION** pill | R | placeholder tenant id (`ACCOUNT_ID` constant); no backend provisioning yet |
| Global search query (submits → `/workflow?search=`) | W (client) | n/a (hands the query to the board's board-local search) |
| +Add menu (New Estimate / Appointment / Customer) | W | navigates to create flows for `Order` / `Appointment` / `Customer` |
| Messenger icon (LEFT of bell) — toggles Chats dropdown | W (client) | `chatDockStore.dropdownOpen`; badge = unread `Message` count |
| Bell icon (bordered) — toggles Notifications dropdown | W (client) | `chatDockStore.notificationsOpen`; badge = unread `AppNotification` count |
| User name + role label ("Role: <name>") | R | `User.firstName`+`lastName`; role from `roleStore` (UI-only) |
| User email | R | `User.email` |
| Profile photo (upload / change / remove) | W (client) | `profilePhotoStore` (userId → data-URL, localStorage). **UI-only**, no backend |
| Role selector (View Only / Edit Only / Administrator) | W (client) | `roleStore` (localStorage `autosuite.role`, default Administrator). Display/selection only — **no RBAC enforcement yet**. Maps to `Role.name` via `UserLocationAccess.roleId` |
| Location switcher | W | `Location.id/name` (`authStore.currentLocationId`); scopes data (`UserLocationAccess`) |
| "User Preferences" link (→ /settings) | R | navigates to Settings |

---

## Sidebar (`AppShell`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Nav items: Calendar, **Backlog**, Workflow (→ **Completed / Invoiced** sub-item), Customers, Inventory, Reports, Settings | R | static routes. **No Messages nav item** — messaging lives in the top bar + docked chat windows. Default landing route = Workflow |
| Theme toggle (light/dark) — sits ABOVE the collapse button | W (client) | localStorage `autosuite.theme` (`themeStore`; UI pref, not backend) |
| Collapse / expand | W (client) | local UI state |

---

## Workflow board (`KanbanBoard`, `Column`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Column name (inline via "…" → Rename) | W | `WorkflowStatus.name` (`PATCH /workflow-statuses/:id`) |
| Column order (left→right: **To Do, In Progress, Pending, Invoices, Ready for Pickup, Done**) | R (W in Settings) | `WorkflowStatus.position` (from mock `workflow_statuses`). Pending is violet; Invoices/Ready/Done show a green $ accent |
| Add column | W | `POST /workflow-statuses`. **The "+ Add column" affordance is hidden in the UI** (`hidden` class; kept for later) but the create path exists |
| Archive column ("…" → Archive column) | W | soft-delete `WorkflowStatus.archivedAt` (`POST /workflow-statuses/:id/archive`); archived columns are hidden from the board, not hard-deleted |
| Column count badge | R | derived: count of `Order` in the column |
| Column money accent ($ on Ready/Invoices/pickup or `archive_paid` rule) | R | derived from `WorkflowStatus.name` / `rule` |
| Column sizing | R | 288px wide; **content-height, capped at the board (viewport) height** — the card list then scrolls internally and the "+ Create" footer stays pinned |
| **"+ Create" (pinned footer of each column)** | W | inline add-card; creates a minimal `Order` in THAT column (`POST /orders` with `workflowStatusId` + `title`) |
| Board-local search (separate from global search) | W (client) | filters loaded `Order`s by number/title/customer name/vehicle; clear button; seeded from `?search=` handoff |
| **Mechanic-avatar filter cluster** (next to board search) | W (client) | overlapping avatars per team member (`GET /users`); click toggles the filter to cards whose `Order.mechanicIds` include a selected mechanic (multi-select + Clear; overflow past 4 → "+N" checkbox dropdown) |
| Drag card between columns (placeholder slot + drop animation) | W | `Order.workflowStatusId` (`PATCH /orders/:id/workflow`); target column `rule` may convert `Order.status` |
| View toggle (List / Board / Condensed) + Parts | W (client) | local UI state (Parts view is a scaffold) |
| Filter chips (Archived / Technicians / Labels) + "+ Add Filter" | W (client) | future: `Order` filters (archived flag, `assignedTechnicianId`, labels) |
| "New Job" (top of board) | W | opens create-estimate flow (`?new=estimate`) → `Order` |

## Backlog page (`BacklogPage`, `/backlog`)

Jira-backlog-style list of lightweight pre-board items. Suggested new entity
`backlog_items { id, title, customerId?, vehicleId?, note?, createdAt }`.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Item title | W | `BacklogItem.title` (`POST /backlog-items`) |
| Linked customer (optional) | W | `BacklogItem.customerId` / denormalized `customerName` |
| Vehicle (optional) | W | `BacklogItem.vehicleId` / `vehicleName` |
| Note (optional) | W | `BacklogItem.note` |
| Move to board | W | creates an `Order` in the first (leftmost non-archived) column + removes the item (`POST /backlog-items/:id/move-to-board`) |
| Delete item | W | `DELETE /backlog-items/:id` |

## Completed / Invoiced page (`CompletedPage`, `/workflow/completed`)

Read-only list of finished work (orders where `status = invoice` or the column
reads as done). Row click → order detail.

| Data point | R/W | Backend entity.field |
|---|---|---|
| # / vehicle / customer / technician | R | `Order.number`, `Vehicle`, `Customer`, `Order.technicianName` |
| Total / Paid / Remaining | R | `Order.totals.total` / `paidTotal` / `balanceDue` |
| Date | R | `Order.invoicedAt` (fallback `lastActivityAt`) |

## Workflow card (`OrderCard`)

Fixed **262px** wide; content-height (grows with content). Layout top→bottom:
photo, title, labels, vehicle, lead technician, footer.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Car photo thumbnail (~112px tall, top of card) | R | tries `/car-photos/<vehicleId>.jpg` → first `Order.photos[]` by `sortOrder` → neutral `Car` glyph placeholder |
| Card title (no leading `#`; falls back to `#<number>`) | R | `Order.title` (display) |
| Label chips + colors | R | `Order.labels[]` (`OrderLabel {id,text,color}`); edited from the detail Details → Labels field |
| Vehicle text ("color year make model") + per-make brand mark (`CarBrandMark`) | R | `Vehicle.color/year/make/model` |
| Lead technician | R | `Order.technicianName` (display; derive from `LineItem.assignedTechnicianId → User`) |
| **Mechanic avatars (footer, overlapping, ABOVE the #id)** | R | `Order.mechanicIds[] → User` (deterministic color by id; photo from `profilePhotoStore` on the filter cluster); overflow past 3 → clickable "+N" list |
| Effort icon (low = green gauge, medium = amber gauge, high = red flame) | R | `Order.effort` |
| `#<number>` (footer, left, below avatars) | R | `Order.number` |
| Total amount (footer, right) | R | `Order.totals.total` |
| Paid / Remaining (under total) | R | `Order.paidTotal` / `Order.balanceDue` |
| Edit (pencil) button | W | opens the order detail modal (same as clicking the card) |

---

## Order detail modal (`OrderDetailDrawer`) — Jira-issue-style

Large modal. Header: inline-editable **title**, `#number` (R), `status` badge (R),
balance-due / Paid badge (R). Tabs: **Overview / Inspections / Messages /
Payments / Activity**. Each tab reuses the same feature components as the
standalone pages.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Inline job title (click to edit; Enter/blur saves, Esc cancels) | W | `Order.title` (`PATCH /orders/:id`) |
| Status badge / balance-due badge | R | `Order.status` / `Order.balanceDue` |

### Overview tab (`ServicesEditor`) — 3-column layout

Grid `[1fr | 280px | 240px]` = **main | Details | Invoice**. Sections are
collapsible Cards with larger headers (chevron left of the title).

**COL 1 (main): Services → Description → Photos**

| Data point | R/W | Backend entity.field |
|---|---|---|
| **Services** section — service list (`ServiceAccordionItem`, `LineItemRow`) | W | `Service.*` / `LineItem.*` (add/update/delete via `/orders/:id/services` + `/line-items`) |
| Service title | W | `Service.title` |
| Service flags: recommended / lumpSum / hideLineItemPricing / hideFromCustomer | W | `Service.flags.*` |
| Service authorization status / deferred | R | `Service.authorizationStatus` / `Service.deferred` |
| Line item type / name / qty / hours / unit retail / unit cost / taxable / assigned tech | W | `LineItem.type/name/quantity/hours/unitRetail/unitCost/taxable/assignedTechnicianId` |
| **Description** block (click to edit; Save/Cancel; "Add a description…" placeholder) | W | `Order.description` (`PATCH /orders/:id`) |
| **Photos** section — vehicle photo carousel (`VehiclePhotoCarousel`) | R (reorder W) | `Order.photos[]`; drop-in `/car-photos/<vehicleId>.jpg` shown first (read-only preview, never persisted); reorder persists `VehiclePhoto.sortOrder`. Future `vehicle_photos` |

**COL 2: Details** — one editable field per row (`DetailsForm`)

| Field | R/W | Backend entity.field |
|---|---|---|
| Vehicle (derived, with `CarBrandMark`) | R | `Vehicle.color/year/make/model` (display of the fields below) |
| Assignee (multi-select over team roster) | W | `Order.mechanicIds[]` (`PATCH /orders/:id`); roster from `GET /users` |
| Customer (single combobox) | W | `Order.customerId` (`PATCH /orders/:id`) |
| Labels (multi combobox, preset palette + free text) | W | `Order.labels[]` (`PATCH /orders/:id`) |
| **Year** (mandatory) | W | `Vehicle.year` (`PATCH /vehicles/:id`) |
| **Make/Brand** (mandatory, +New) | W | `Vehicle.make` (`PATCH /vehicles/:id`) |
| **Model** (mandatory, +New) | W | `Vehicle.model` (`PATCH /vehicles/:id`) |
| **Color** (mandatory, +New) | W | `Vehicle.color` (`PATCH /vehicles/:id`) |
| Start date | W | `Order.startDate` (`PATCH /orders/:id`) |
| Priority (Low/Medium/High) | W | `Order.priority` (`PATCH /orders/:id`) |
| Effort (Low/Medium/High) | W | `Order.effort` (`PATCH /orders/:id`) |

> Make/Model/Color allow a "+ Add …" for new values and persist onto the Vehicle,
> so the board card + carousel reflect the change immediately. Mandatory fields
> show a red hint while empty.

**COL 3: Invoice** — totals + actions

| Data point | R/W | Backend entity.field |
|---|---|---|
| Totals (subtotal / total, via `TotalsRail bare`) | R | `OrderTotals.subtotal/total` (computed) |
| Send | W | opens `SendOrderDialog` (`POST /messages`) |
| Convert to Repair Order / Invoice (conditional on status) | W | `POST /orders/:id/convert` |
| Collect Payment (shows balance) | W | opens `CollectPaymentModal` (`POST /orders/:id/payments`) |
| Print | W | `window.print()` |
| Email to customer / SMS to customer | W | opens `SendOrderDialog` on the chosen channel (`POST /messages`) |

### Send order dialog (`SendOrderDialog`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Channel (SMS/email) | W | `Message.channel` |
| Message body | W | `Message.body` |
| Allow online payment / Request authorization / Request e-signature | W | link flags / `Authorization` request / `Authorization.eSignature` |

### Inspections tab (`InspectionsTab`) — scaffold

| Data point | R/W | Backend entity.field |
|---|---|---|
| Inspection title / status | R | `Inspection.title` / `Inspection.status` |
| Item status (pass/needs-attention/failed/na) | W | `InspectionItem.status` |
| Item notes / media | W | `InspectionItem.notes` / `InspectionItem.media[]` |

### Messages tab (`MessageThread`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Message bubbles (body/subject/direction/channel/time) | R | `Message.body/subject/direction/channel/createdAt` |
| Quick templates | R | `MessageTemplate.name/body` |
| Channel toggle + compose (`MessengerComposer`) | W | `Message.channel` + `Message.body` (`POST /messages`) |

### Payments tab (`PaymentsTab`, `CollectPaymentModal`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Balance due | R | `Order.balanceDue` |
| Payment rows (method/amount/status/deposit/time) | R | `Payment.method/amount/status/isDeposit/createdAt` |
| Refund | W | `POST /payments/:id/refund` → `Payment.refundedAmount/status` |
| Tender amount / amount tendered / change | W | `Payment.amount` / (`amountTendered`) / `Payment.changeDue` |
| Method (cash/check/card present/card online/ACH/BNPL/other) | W | `Payment.method` |
| Reference / check number | W | `Payment.referenceNumber` |
| Deposit flag | W | `Payment.isDeposit` |
| Text-to-pay link | W (R result) | `POST /orders/:id/payment-link` |

### Activity tab (`ActivityTab`, `Timeline`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Activity entries (kind/body/actor/visibility/time/pinned) | R | `OrderActivity.kind/body/actorType/visibility/at/pinned` |
| Add note body | W | `OrderActivity.body` (kind `user_note`) |
| Visibility (internal / customer-visible) | W | `OrderActivity.visibility` |
| @mentions / Pin | W | `OrderActivity.mentions[]` / `OrderActivity.pinned` |
| (Audit mirror) | R | `AuditLog` (append-only) |

---

## Messaging dock (`ChatDock`, `ChatsDropdown`, `MessengerComposer`) — Facebook-style, global

Rendered from `AppShell` on every page. State lives in the `chatDockStore`
Zustand store (`src/features/messaging/chatDockStore.ts`); conversation data +
threads reuse the existing `Message` hooks. `MessagesPage` (`/messages`) remains
a fallback route but is not in the sidebar.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Top-bar messenger icon → **Chats dropdown** (`ChatsDropdown`) | W (client) | `chatDockStore.dropdownOpen`. Right-hugging fixed panel (368px, top-16 → bottom-6) with All/Unread pills + "Search Messenger" |
| Chats list rows (avatar / name / vehicle subtitle / last message / relative time / unread dot) | R | derived `Conversation.customerName/lastMessage/unreadCount/lastMessageAt/lastChannel` (grouped from `Message` by `customerId`) |
| Chats search + All/Unread filter | W (client) | filters the conversation list |
| Bottom-right compose launcher → **New message** window (`ComposeWindow`) | W (client) | `chatDockStore.composeOpen` |
| New-message **To:** picker (searches customers + team members, tagged "Customer"/"Team") | W (client) | `GET /customers` + `GET /users`; choosing a recipient switches the window into that `MessageThread`. The composer row stays hidden until a recipient is chosen |
| Docked chat windows (stack; cap `MAX_OPEN_WINDOWS`=3, overflow "+N more") | W (client) | `chatDockStore.openChats[]` |
| Window minimize / close | W (client) | `chatDockStore.minimized{}` / `closeChat` |
| Composer (`MessengerComposer`): idle media cluster ↔ typing "+" + Send | W | `Message.*` (`POST /messages`). Media buttons are visual affordances ("coming soon"); emoji appends 🙂 |

> **Chats & Notifications dropdowns share identical fixed geometry and are mutually
> exclusive** — both open-states live in `chatDockStore`, so opening one closes the other.

## Notifications dropdown (`NotificationsDropdown`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Bell → bounded dropdown (368px, All/Unread pills) | W (client) | `chatDockStore.notificationsOpen` |
| Notification rows (type icon + tint, bold title, body, relative time, unread dot) | R | `AppNotification.type/title/body/at/read` from the mock `notifications` collection (`GET /notifications`) |
| Bell unread badge | R | count of unread `AppNotification` |

> **Notifications are mock/UI-only today.** Suggested new entity `notifications
> { id, type, title, body, at, read }` fed by the same event bus as the audit log
> (`developer.md` J.7).

---

## Customers list (`CustomersListPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Search | W (client) | filters `Customer` |
| **List / Grid view toggle** | W (client) | local UI state (grid = responsive customer cards) |
| Name / type / primary contact / tax-exempt / from (city, state) | R | `Customer.firstName/lastName/companyName/type`, `contacts[0].value`, `taxExempt`, `city`/`state` |
| New/edit customer (opens shared `CustomerFormDialog`) | W | see the form field list below |

## Customer profile (`CustomerProfilePage`) — compact, left-aligned

An **Edit** button opens the shared `CustomerFormDialog`.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Name / type / tags / tax-exempt | R | `Customer.firstName/lastName/companyName/type/tags/taxExempt` |
| Contacts (label + value) | R | `Customer.contacts[]` |
| Gender | R (W in form) | `Customer.gender` (`male` / `female`) |
| Date of birth (full date OR year-only) | R (W in form) | `Customer.dob` (`YYYY-MM-DD` or `YYYY`) |
| **Age** | R — **DERIVED** | computed from `Customer.dob` (`ageFromDob`); shown "(approx)" for year-only DOB |
| Age range | R (W in form) | `Customer.ageRange`. **Auto-set from DOB when present** (`ageRangeFromDob`); manually editable only when DOB is empty |
| Ethnicity | R (W in form) | `Customer.ethnicity` (common options + Other) |
| **Language(s)** (multi-select chips) | R (W in form) | `Customer.primaryLanguages[]` (multi). Legacy singular `Customer.primaryLanguage` kept and mirrored (first entry) for back-compat |
| Speaks English | R (W in form) | `Customer.speaksEnglish` |
| Driver license (number / state / expiration) | R (W in form) | `Customer.driverLicenseNumber` / `driverLicenseState` / `driverLicenseExp` |
| City / State | R (W in form) | `Customer.city` / `Customer.state` |
| Heard about us (referral source) | R (W in form) | `Customer.referralSource` (Google / Referral / Social media / Repeat customer / Walk-in / Other) |
| Vehicles (name / plate / VIN) | R | `Vehicle.year/make/model`, `licensePlate`, `vin` |
| **Vehicle photo thumbnail** | R | first `Order.photos[]` by `sortOrder` for that vehicle; neutral placeholder when none. Future `vehicle_photos` keyed by `vehicleId` |
| Service history (order #, date, total, status) | R | `Order.number/invoicedAt/totals.total/status` |
| New estimate | W | creates `Order` |

### Shared customer form (`CustomerFormDialog`) — create + edit

Sections: Identity (name, phone, email, city, state), Demographics (gender, dob,
age range, ethnicity, primary language(s) via `MultiCombobox`, speaks English),
Driver license & source. Age is never stored — `ageRange` is written (auto from
`dob` when present, else the manual selection). Maps to the `customers` entity
(suggested new columns: `gender, dob, age_range, ethnicity, primary_languages
(jsonb/array; keep legacy primary_language), speaks_english,
driver_license_number, driver_license_state, driver_license_exp, city, state,
referral_source`). Vehicle photos map to a suggested `vehicle_photos` entity.

---

## Calendar (`CalendarPage`) — scaffold

| Data point | R/W | Backend entity.field |
|---|---|---|
| Week grid (days × hours) | R | static |
| Appointment blocks / drop-off / pick-up / confirmation | R/W (Phase 2) | `Appointment.startAt/endAt/assignedTechnicianId/orderId/notes/dropOffAt/pickUpAt/confirmation.state` |

---

## Inventory (`InventoryPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Part name / SKU / MPN / manufacturer | R | `Part.name/sku/mpn/manufacturer` |
| Cost / retail | R | `Part.cost/retail` |
| On-hand (+ reorder badge when ≤ minQty) | R | `Part.qtyOnHand` vs `Part.minQty` |
| Purchase Orders / Returns (scaffold) | R/W (Phase 3) | `PurchaseOrder.*` / `Return.*` |
| Vendors | R | `Vendor.name/contact/accountNumber` |

---

## Reports — financial statements (`ReportsPage`)

SEC-filing-style financial reporting: **Income Statement** and **Balance Sheet**
tabs, one column per selected period, bold subtotal/total rows, right-aligned
monetary columns, line drill-down, and client-side .xlsx export (SheetJS). A
compact KPI strip sits above the statements.

| Data point | R/W | Backend entity.field |
|---|---|---|
| KPI strip (revenue / gross profit / margin / ARO / collected / outstanding) | R | `ReportKpis.*` (`GET /reports/:key`) |
| Statement tabs (Income Statement / Balance Sheet) | W (client) | selects `FinancialStatement` |
| Statement lines (label / per-period columns, sections + subtotals + totals) | R | `FinancialStatement.lines[]` (`FinancialLine.kind/label/values[]/indent`) — `GET /financial-statements` |
| Line drill-down (breakdown modal) | R | `FinancialLine.detail[]` (`FinancialDetailRow.label/values[]`) |
| **Customization footer (sticky)**: Month/Quarter/Year granularity + multi-period select | W (client) | `granularity` + `periods[]` params drive the statement columns (part of the query key) |
| Export to .xlsx (active statement) | W (client) | client-side SheetJS workbook; values + number formats + column widths only |

> Statement figures are **mock GL data for demonstration** (roles/finance are
> UI-only). A real general ledger / chart of accounts is out of scope; production
> reports remain read-models (`developer.md` B.13). Suggested future entities if
> implemented: `gl_accounts`, `journal_entries`, or a `financial_statements`
> snapshot read-model.

---

## Settings → Payments (`SettingsPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Stripe Connect status / start onboarding | R / W | `PaymentSettings.connectStatus` / `POST /settings/payments/connect` |
| Paired reader id / pair reader | R / W | `PaymentSettings.readerId` / `POST /settings/payments/reader` |
| Surcharge enabled + pct | W / R | `PaymentSettings.surchargeEnabled/surchargePct` |
| Payout schedule | R | `PaymentSettings.payoutSchedule` |
| Workflow columns / Roles editors (scaffold) | W (Phase) | `WorkflowStatus.*` / `Role.*` |

---

## Audit log (surfaced in Activity + future viewer)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Entity type / id / action | R | `AuditLog.entityType/entityId/action` |
| Actor (user/system) | R | `AuditLog.actorId/actorType` |
| Before / after diff | R | `AuditLog.before/after` |
| Timestamp | R | `AuditLog.at` |

Append-only, never edited/deleted (`developer.md` B.14).

---

## Suggested new backend entities (surfaced by current UI)

| Entity | Shape (suggested) | Driven by |
|---|---|---|
| `vehicle_photos` (a.k.a. `media`) | `{ id, vehicleId, url/storageKey, sortOrder }` | `Order.photos[]` (card thumb + carousel), customer-profile vehicle thumbnail |
| `order_assignments` | order↔user join | `Order.mechanicIds[]` (card avatars, board filter, Details → Assignee) |
| `order_labels` + `labels` catalog | `{ id, text, color }` + join | `Order.labels[]` |
| `notifications` | `{ id, type, title, body, at, read }` | bell dropdown |
| `backlog_items` | `{ id, title, customerId?, vehicleId?, note?, createdAt }` | Backlog page |
| Order columns | `title, description, effort, priority, startDate` | board card + detail Details |
| Customer columns | demographics + `primary_languages` (see form section) | customer form/profile |
| Asset conventions (not DB) | `public/abs-autobody-logo.png`, `public/car-logos/<make>.png`, `public/car-photos/<vehicleId>.jpg` | BrandLogo, CarBrandMark, card/carousel drop-ins |
