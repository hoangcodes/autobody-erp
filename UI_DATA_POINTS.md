# UI Data Points — AutoSuite Frontend

A per-screen inventory of every data point the UI shows or edits, mapped to the
intended backend entity/field from `developer.md` Part B (Domain Model). Use this
plus the mock seed shapes (`src/mocks/seed.ts`) to build the Supabase schema.

Legend:
- **R** = read-only (display).
- **W** = user-editable (create/update via the UI).
- Entity references use `developer.md` Part B names (e.g. `Order.number`).

> Note: A few board-card fields are display conveniences today
> (`Order.title`, `Order.labels`, `Order.technicianName`). Suggested schema homes
> are called out below (a `labels` catalog + `order_labels` join; `title` derived
> from services; technician derived from `LineItem.assignedTechnicianId → User`).
>
> Note: `Order.mechanicIds: string[]` (editable) holds the team members assigned
> to work a car. Ids reference `User` (mock: `MOCK_USERS`, served at `GET /users`).
> Editable from the order-detail **Mechanics** section (`PATCH /orders/:id` with
> `{ mechanicIds }`); surfaced as avatars on the card and as the board mechanic
> filter. Future home: an order↔technician assignment join (`order_assignments`).

---

## Top bar / Profile (`AppShell`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Global search query (placeholder/aria "Global search") | W (client) | n/a (drives search across Orders/Customers/Vehicles) |
| Add menu (New Estimate / Appointment / Customer) | W | creates `Order` / `Appointment` / `Customer` |
| Messenger icon (LEFT of bell) — opens Chats dropdown | W (client) | toggles chat dock (`chatDock` store); unread derived from `Message` |
| Notification count badge | R | derived: unread `Message` count |
| User name | R | `User.firstName` + `User.lastName` |
| User email | R | `User.email` |
| User role label ("Role: <name>") | R | `Role.name` (via `UserLocationAccess.roleId`) — e.g. "View Only", "Edit Only", "Administrator" |
| Role selector (View Only / Edit Only / Administrator) | W (client) | selects active `Role` (`UserLocationAccess.roleId`); display + selection only today, no RBAC enforcement yet. Client store: `src/features/auth/roleStore.ts` (localStorage `autosuite.role`, default Administrator) |
| Location switcher | W | `Location.id/name`; selection scopes data (`UserLocationAccess`) |
| "User Preferences" link (→ /settings) | R | navigates to Settings (renamed in dropdown only; sidebar item stays "Settings") |

---

## Sidebar (`AppShell`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Nav items (Calendar, **Backlog**, Workflow → **Completed / Invoiced** sub-item, Customers, Inventory, Reports, Settings) | R | static routes. **Messages removed** — messaging now lives in the top bar + docked chat windows (see Messaging dock). Backlog → `/backlog`; Completed/Invoiced → `/workflow/completed`. |
| Theme (light/dark) | W (client) | localStorage `autosuite.theme` (UI pref, not backend) |
| Collapsed state | W (client) | local UI state |

---

## Workflow board (`KanbanBoard`, `Column`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Column name (editable inline via "…" → Rename) | W | `WorkflowStatus.name` (`PATCH /workflow-statuses/:id`) |
| Column order (left→right: To Do, In Progress, **Pending**, Invoices, Ready for Pickup, **Done**) | R (W in Settings) | `WorkflowStatus.position`. Estimates column removed (its orders reassigned to To Do); "Pending" (violet) added right of In Progress; "Completed" renamed to "Done". Columns are fixed 270×800px with a scrolling card list |
| Add column ("+ Add column" affordance) | W | creates `WorkflowStatus` (`POST /workflow-statuses`) |
| Archive column ("…" → Archive column) | W | soft-delete `WorkflowStatus.archivedAt` (`POST /workflow-statuses/:id/archive`); archived columns hidden from board, not hard-deleted |
| Column count badge | R | derived: count of `Order` in column |
| Column accent icon ($ on Ready/Invoices) | R | derived from `WorkflowStatus.rule` / name |
| **"+ Create" (bottom of each column)** | W | inline add-card; creates a minimal `Order` in THAT column (`POST /orders` with `workflowStatusId` + `title`) |
| Board search (client-side, separate from global search) | W (client) | filters loaded `Order`s by number/title/customer/vehicle; clear button; seeded from `?search=` handoff |
| **Mechanic avatar filter (next to board search)** | W (client) | round avatar per team member (`GET /users`); toggles filter to cards whose `Order.mechanicIds` include any selected mechanic (multi-select + Clear; overflow past 5 → "+N") |
| Card's column (drag between columns) | W | `Order.workflowStatusId` (`PATCH /orders/:id/workflow`) |
| View toggle (list/board/condensed), Parts | W (client) | local UI state |
| Filter chips (Archived / Technicians / Labels) | W (client) | future: `Order` filters (archived flag, `assignedTechnicianId`, labels) |
| "New Job" (top-of-board) | W | creates `Order` (status `estimate`) |

## Backlog page (`BacklogPage`, `/backlog`)

Jira-backlog-style list of lightweight pre-board items. Suggested new entity
`backlog_items { id, title, customerId?, vehicleId?, note?, createdAt }`.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Item title | W | `BacklogItem.title` (`POST /backlog-items`) |
| Linked customer (optional select) | W | `BacklogItem.customerId` / denormalized `customerName` |
| Vehicle (optional free text) | W | `BacklogItem.vehicleName` (free text; future `vehicleId`) |
| Note (optional) | W | `BacklogItem.note` |
| Move to board | W | creates an `Order` in the first (leftmost, non-archived) column + removes the item (`POST /backlog-items/:id/move-to-board`) |
| Delete item | W | `DELETE /backlog-items/:id` |

## Completed / Invoiced page (`CompletedPage`, `/workflow/completed`)

Read-only list of finished work: orders where `status = invoice` OR the workflow
column reads as done (Completed / Ready for Pickup). Row click → `/orders/:id`.

| Data point | R/W | Backend entity.field |
|---|---|---|
| # / vehicle / customer / technician | R | `Order.number`, `Vehicle`, `Customer`, `Order.technicianName` |
| Total | R | `Order.totals.total` |
| Paid / Remaining | R | `Order.paidTotal` / `Order.balanceDue` |
| Date | R | `Order.invoicedAt` (fallback `lastActivityAt`) |

## Workflow card (`OrderCard`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Car photo (fixed ~120px tall, pinned to top of card) | R | first `VehiclePhoto` by `sortOrder` (`Order.photos[]`; future `vehicle_photos`/`media` keyed by `vehicleId`). Neutral placeholder when 0 photos. Card is a strict 262px wide; details body ~146px tall |
| Card title `#<number> <title>` | R | `Order.number` (R); `Order.title` (display — derive from lead `Service.title` + count) |
| Label chips + colors | R (W via "New +") | display now; future `Label {id,text,color}` + `order_labels` join |
| Vehicle text | R | `Vehicle.year/make/model/submodel` |
| Technician | R | `Order.technicianName` (display; derive from `LineItem.assignedTechnicianId → User`) |
| **Mechanic avatars (footer, overlapping)** | R | `Order.mechanicIds[] → User` (deterministic color by id); overflow past 3 → "+N" |
| Footer action icons (check/list/calendar) | R (affordances) | future quick actions (inspection/checklist/appointment) |
| Total amount | R | `Order.totals.total` (`OrderTotals`) |
| Paid / Remaining | R | `Order.paidTotal` / `Order.balanceDue` |

---

## Order detail drawer + tabs (`OrderDetailDrawer`)

Header: `Order.number` (R), `Order.status` (R), `Order.balanceDue` (R),
customer name (R, `Customer`), vehicle (R, `Vehicle`).

### Overview / Estimate–RO–Invoice editor (`ServicesEditor`, `ServiceAccordionItem`, `LineItemRow`, `TotalsRail`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Customer + vehicle summary | R | `Customer`, `Vehicle` |
| Vehicle photo carousel (main image + thumbnail strip) | R | `Order.photos[]` → future `vehicle_photos`/`media` ({ id, vehicleId, url/storageKey, sortOrder }) |
| **Mechanics section (assign / remove team members)** | W | `Order.mechanicIds[]` (`PATCH /orders/:id`); roster from `GET /users` (`MOCK_USERS`). Reflects on the card avatars + board mechanic filter. Future `order_assignments` |
| Photo reorder (drag thumbnails) | W | `VehiclePhoto.sortOrder` (persisted via `PATCH /orders/:id` with `{ photos }`); lowest sortOrder = card thumbnail |
| Service title | W | `Service.title` |
| Service flags: recommended / lumpSum / hideLineItemPricing / hideFromCustomer | W | `Service.flags.*` |
| Service authorization status | R | `Service.authorizationStatus` |
| Service deferred | R | `Service.deferred` |
| Line item type | W | `LineItem.type` |
| Line item name | W | `LineItem.name` |
| Line item qty / hours | W | `LineItem.quantity` / `LineItem.hours` |
| Line item unit retail | W | `LineItem.unitRetail` |
| Line item unit cost | W | `LineItem.unitCost` |
| Line item taxable | W | `LineItem.taxable` |
| Assigned technician | W | `LineItem.assignedTechnicianId` |
| Totals: subtotal/discounts/fees/tax/total | R | `OrderTotals.*` (computed server-side) |
| Cost / gross profit / margin (staff-only) | R | `OrderTotals.costTotal/grossProfit/grossMarginPct` |
| Send / Convert / Collect Payment / Print | W | `POST /messages`, `/orders/:id/convert`, `/orders/:id/payments` |

### Send order dialog (`SendOrderDialog`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Channel (SMS/email) | W | `Message.channel` |
| Message body | W | `Message.body` |
| Allow online payment | W | future `Order`/link flag |
| Request authorization | W | creates `Authorization` request |
| Request e-signature | W | `Authorization.eSignature` |

### Inspections tab (`InspectionsTab`) — scaffold

| Data point | R/W | Backend entity.field |
|---|---|---|
| Inspection title / status | R | `Inspection.title` / `Inspection.status` |
| Item status (pass/needs-attention/failed/na) | W | `InspectionItem.status` |
| Item notes / media | W | `InspectionItem.notes` / `InspectionItem.media[]` |

### Messages tab (`MessageThread`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Message bubbles (body/subject/direction/channel/time) | R | `Message.body/subject/direction/channel/at` |
| Quick templates | R | `MessageTemplate.name/body` |
| Channel toggle + compose | W | `Message.channel` + `Message.body` (`POST /messages`) |

### Payments tab (`PaymentsTab`, `CollectPaymentModal`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Balance due | R | `Order.balanceDue` |
| Payment rows (method/amount/status/deposit/time) | R | `Payment.method/amount/status/isDeposit/createdAt` |
| Refund | W | `POST /payments/:id/refund` → `Payment.refundedAmount/status` |
| Tender amount / amount tendered / change | W | `Payment.amount` / (`amountTendered`) / `Payment.changeDue` |
| Method (cash/check/debit/credit/ACH/BNPL/other) | W | `Payment.method` |
| Check / reference number | W | `Payment.referenceNumber` / `processorRef` |
| Deposit flag | W | `Payment.isDeposit` |
| Text-to-pay link | W (R result) | `POST /orders/:id/payment-link` |

### Activity tab (`ActivityTab`, `Timeline`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Activity entries (kind/body/actor/visibility/time/pinned) | R | `OrderActivity.kind/body/actorType/visibility/at/pinned` |
| Add note body | W | `OrderActivity.body` (kind `user_note`) |
| Visibility (internal / customer-visible) | W | `OrderActivity.visibility` |
| @mentions | W | `OrderActivity.mentions[]` |
| Pin | W | `OrderActivity.pinned` |
| (Audit mirror) | R | `AuditLog` (append-only) |

---

## Messaging dock (`ChatDock`, `ChatsPanel`, `ChatWindow`) — Facebook-style, global

Rendered from `AppShell` on every page. Backed by the `chatDock` Zustand store
(`src/features/messaging/chatDock.ts`) for open/minimized windows; conversation
data + threads reuse the existing `Message` hooks. `MessagesPage` (`/messages`)
remains as a fallback route but is no longer in the sidebar.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Floating launcher (bottom-right) + top-bar messenger icon | W (client) | open/close Chats dropdown (`chatDock.dropdownOpen`) |
| Chats dropdown list (avatar / name / snippet / unread dot / timestamp) | R | derived from `Message` grouped by `customerId` (`Conversation.customerName/lastMessage/unreadCount/lastMessageAt/lastChannel`) |
| Chats dropdown search | W (client) | filters conversation list by name |
| Open docked windows (stack horizontally, cap + "+N more" overflow) | W (client) | `chatDock.openChats[]` |
| Window minimize / close | W (client) | `chatDock.minimized{}` / `closeChat` |
| Message bubbles + composer (inside each window) | R / W | `Message.*`; send via `POST /messages` |

---

## Customers list (`CustomersListPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Search | W (client) | filters `Customer` |
| Name | R | `Customer.firstName/lastName/companyName` |
| Type (individual/business) | R | `Customer.type` |
| Primary contact | R | `Customer.contacts[0].value` |
| Tax-exempt badge | R | `Customer.taxExempt` |
| From (city, state) | R | `Customer.city` / `Customer.state` |
| New/edit customer form fields (identity + demographics + DL + source) | W | see the shared `CustomerFormDialog` field list below |

## Customer profile (`CustomerProfilePage`) — compact, left-aligned, constrained width

Layout tightened: content is width-constrained (`max-w-4xl`, left-aligned), with a
compact two-column detail grid and reduced whitespace. An **Edit** button opens the
shared `CustomerFormDialog`.

| Data point | R/W | Backend entity.field |
|---|---|---|
| Name / type / tags / tax-exempt | R | `Customer.firstName/lastName/companyName/type/tags/taxExempt` |
| Contacts (label + value) | R | `Customer.contacts[]` |
| **Gender** | R (W in form) | `Customer.gender` (`male` / `female`) |
| **Date of birth** (full date OR year-only) | R (W in form) | `Customer.dob` (`YYYY-MM-DD` or `YYYY`) |
| **Age** | R — **DERIVED** | computed from `Customer.dob` (`ageFromDob`); approximate for year-only DOB |
| **Age range** | R (W in form) | `Customer.ageRange` (`<18`…`65+`). **Auto-set from DOB when present** (`ageRangeFromDob`); manually editable only when DOB is empty |
| **Ethnicity** | R (W in form) | `Customer.ethnicity` (common options + Other) |
| **Primary language** + **Speaks English** | R (W in form) | `Customer.primaryLanguage` / `Customer.speaksEnglish` |
| **Driver license** (number / state / expiration) | R (W in form) | `Customer.driverLicenseNumber` / `driverLicenseState` / `driverLicenseExp` |
| **City / State** (where from) | R (W in form) | `Customer.city` / `Customer.state` |
| **Heard about us** (referral source) | R (W in form) | `Customer.referralSource` (Google / Referral / Social media / Repeat customer / Walk-in / Other) |
| Vehicles (name / plate / VIN) | R | `Vehicle.year/make/model`, `licensePlate`, `vin` |
| **Vehicle photo thumbnail** | R | first `VehiclePhoto` by `sortOrder` from an order for that vehicle (`Order.photos[]` → future `vehicle_photos` keyed by `vehicleId`); neutral placeholder when none |
| Service history (order #, date, total, status) | R | `Order.number/invoicedAt/totals.total/status` |
| New estimate | W | creates `Order` |

### Shared customer form (`CustomerFormDialog`) — create + edit

All demographic fields above are **W** here. Age is never stored — `ageRange` is
written (auto from `dob` when present, else the manual selection). Maps to the
`customers` entity (suggested new columns: `gender, dob, age_range, ethnicity,
primary_language, speaks_english, driver_license_number, driver_license_state,
driver_license_exp, city, state, referral_source`). Vehicle photos map to a
suggested `vehicle_photos` entity `{ id, vehicleId, url/storageKey, sortOrder }`.

---

## Calendar (`CalendarPage`) — scaffold

| Data point | R/W | Backend entity.field |
|---|---|---|
| Week grid (days × hours) | R | static |
| Appointment blocks | R/W (Phase 2) | `Appointment.startAt/endAt/assignedTechnicianId/orderId/notes` |
| Drop-off / pick-up | R/W (Phase 2) | `Appointment.dropOffAt/pickUpAt` |
| Confirmation state | R | `Appointment.confirmation.state` |

---

## Inventory (`InventoryPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Part name | R (W later) | `Part.name` |
| SKU / MPN / manufacturer | R | `Part.sku/mpn/manufacturer` |
| Cost / retail | R | `Part.cost/retail` |
| On-hand (+ reorder badge when ≤ minQty) | R | `Part.qtyOnHand` vs `Part.minQty` |
| Purchase Orders (scaffold) | R/W (Phase 3) | `PurchaseOrder.number/status/lines[]`, `POLine.*` |
| Returns (scaffold) | R/W (Phase 3) | `Return.status/reason/amount`, `isCore` |
| Vendors | R | `Vendor.name/contact/accountNumber` |

---

## Reports — financial statements (`ReportsPage`)

Rebuilt into an SEC-filing-style financial reporting view: **Income Statement**
and **Balance Sheet** tabs, current vs. prior period columns, bold subtotal/total
rows, right-aligned monetary columns, line drill-down, and client-side .xlsx export
(SheetJS). A compact KPI strip is kept above the statements.

| Data point | R/W | Backend entity.field |
|---|---|---|
| KPI strip (revenue / gross profit / margin / ARO / collected / outstanding) | R | `ReportKpis.*` (from `Order.totals` / `Payment`) |
| Statement tabs (Income Statement / Balance Sheet) | W (client) | selects `FinancialStatement` |
| Statement lines (label / current / prior, sections + subtotals + totals) | R | `FinancialStatement.lines[]` (`FinancialLine.kind/label/current/prior/indent`) — `GET /financial-statements` |
| Line drill-down (breakdown modal) | R | `FinancialLine.detail[]` (`FinancialDetailRow.label/current/prior`) |
| Export to .xlsx (current statement) | W (client) | client-side SheetJS workbook (one sheet per statement); values + number formats + column widths only (community build has no cell styling) |

Statement figures are **mock GL data** for demonstration. A real general ledger /
chart of accounts is **out of scope**; production reports remain read-models
(`developer.md` B.13). Suggested future entities if implemented: `gl_accounts`,
`journal_entries`, or a `financial_statements` snapshot read-model.

---

## Settings → Payments (`SettingsPage`)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Stripe Connect status | R | `PaymentSettings.connectStatus` |
| Start/resume onboarding | W | `POST /settings/payments/connect` |
| Paired reader id | R | `PaymentSettings.readerId` |
| Pair reader | W | `POST /settings/payments/reader` |
| Surcharge enabled + pct | W (enabled) / R (pct) | `PaymentSettings.surchargeEnabled/surchargePct` |
| Payout schedule | R | `PaymentSettings.payoutSchedule` |
| Workflow columns editor (scaffold) | W (Phase) | `WorkflowStatus.*` |
| Roles editor (scaffold) | W (Phase) | `Role.*` / `Permission[]` (role-level only) |

---

## Audit log (surfaced in Activity + future viewer)

| Data point | R/W | Backend entity.field |
|---|---|---|
| Entity type / id | R | `AuditLog.entityType/entityId` |
| Action | R | `AuditLog.action` |
| Actor (user/system) | R | `AuditLog.actorId/actorType` |
| Before / after diff | R | `AuditLog.before/after` |
| Timestamp | R | `AuditLog.at` |

Append-only, never edited/deleted (`developer.md` B.14).
