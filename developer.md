# AutoSuite — Developer Specification

**A ground-up build spec for an auto repair shop management platform (Shopmonkey-class competitor).**

Version 0.1 · Drafted 2026-07-13 · Status: draft for engineering review

---

## 0. How to read this document

This is the master build spec for **AutoSuite**. It is intended to be handed to engineers (human or AI) to build the product from scratch. It is organized so you can build in phases:

1. **Part A — Product & scope** tells you *what* AutoSuite is and what it must do.
2. **Part B — Domain model** defines the entities, their fields, and relationships. This is the single most important section; the whole app hangs off it.
3. **Part C — Architecture & tech stack** defines *how* it's built.
4. **Part D — API surface** enumerates the backend endpoints.
5. **Part E — Feature specs** breaks down each feature into buildable detail (states, inputs, outputs, edge cases).
6. **Part F — Integrations** covers third-party dependencies.
7. **Part G — Non-functional requirements** (security, compliance, multi-tenancy, performance).
8. **Part H — Phased roadmap** sequences the work into shippable milestones.

> **Provenance note.** The feature set is modeled on publicly documented behavior of Shopmonkey and cross-checked against Tekmetric, Mitchell 1, Shop-Ware, and AutoLeap. We are cloning *functionality and workflows* (which are not protectable), not code, copy, trademarks, or visual design. Do not copy Shopmonkey's UI text, screenshots, brand assets, or proprietary content. See §G.7 (Legal/IP guardrails).

> **Confidence markers.** Items marked ⚠️ are inferred or unverified against primary sources and should be confirmed before committing engineering effort. Everything else is grounded in Shopmonkey's public help center, pricing page, or developer docs (see §I, Sources).

## 0.1 Implementation status / divergences (current build)

This spec describes the target product. The build today is a **mock-data
frontend**: the React app (`autobody-erp-frontend`) runs against an in-memory
mock API (`VITE_USE_MOCKS=true`, `src/mocks/*`) behind a single data seam
(`src/lib/dataClient.ts`), so every screen renders and mutates without a server.
The **Node/Express + Supabase backend** (`autobody-erp-backend`) is scaffolded
separately and not yet wired in; flipping `VITE_USE_MOCKS=false` (+ `VITE_API_URL`)
swaps the mock for the real REST client with no component changes.

Areas that are **mock / UI-only** so far (no backend enforcement or persistence
beyond localStorage): **roles & permissions** (a display/selection role switch,
no RBAC), **profile photos** (localStorage data-URLs), **notifications** (a mock
feed, no event bus), and the **financial statements / reports** (mock GL data;
there is no real ledger — see §A.4, §B.13). Where the shipped UI diverges from or
extends this spec, an inline "Current implementation" note calls it out
(see §J.1, §J.2, §J.4, §J.7, §J.8, §J.9).

---

# PART A — PRODUCT & SCOPE

## A.1 What AutoSuite is

AutoSuite is a cloud (multi-tenant SaaS) shop management system for automotive repair businesses. It runs the full front-office and shop-floor workflow: a customer/vehicle comes in, the shop writes an **estimate**, gets it **authorized**, does the work as a **repair order**, and closes it as a paid **invoice** — with digital inspections, parts ordering, scheduling, messaging, payments, and reporting wrapped around that spine.

Target users (personas):

- **Shop Owner / Manager** — cares about revenue, KPIs, multi-location oversight, staffing. Primarily web.
- **Service Writer / Advisor** — front desk. Builds estimates, talks to customers, schedules, collects payment. Primarily web.
- **Technician** — shop floor. Performs inspections, clocks labor time, views assigned jobs. Primarily mobile.
- **Parts Manager** — orders parts, manages inventory and POs. Web.
- **Accountant / Bookkeeper** — reconciles to QuickBooks. Web + integrations.

## A.2 The product spine (memorize this)

Everything centers on **one Order entity** that carries exactly one status at a time:

```
Estimate  ──►  Repair Order (optional)  ──►  Invoice
```

- The **Repair Order** stage is optional per shop setting. If disabled, Estimate → Invoice directly.
- Two orthogonal "status" concepts exist and must not be conflated:
  - **Order status** — `estimate | repair_order | invoice` (financial lifecycle).
  - **Workflow status** — the shop-defined kanban column an order card sits in (e.g. "Dropped Off", "In Progress"). A column *may* carry a rule that mutates order status when a card lands in it.

This dual-status model is foundational and is reflected throughout the domain model and API.

## A.3 v1 scope (per stakeholder decision)

All four functional pillars are in scope for the product, phased over milestones (see Part H). The MVP (Phase 1) is the **core shop-ops spine + invoicing**; parts/inventory, comms/CRM, and reporting/accounting follow.

| Pillar | Included capabilities |
|---|---|
| **Core shop ops** | Estimates, repair orders, workflow board, invoicing, DVI, scheduling, customer/vehicle, technician assignment, time clock, canned services, labor guide + labor/pricing matrices |
| **Parts & inventory** | Parts ordering (vendor integrations), inventory, purchase orders, returns, core charges, tire management |
| **Payments & financials** | Integrated card processing, text-to-pay, deposits, BNPL, tax handling, QuickBooks sync |
| **Comms / CRM** | Two-way SMS/email, appointment reminders, automated + one-time campaigns, review requests, online approvals/e-signature |
| **Reporting & accounting** | KPI dashboard, ~35 reports, technician efficiency, multi-location (HQ) reporting, accounting export |

## A.4 Explicit non-goals (v1)

- Native mobile app for service writers (web-responsive is enough for v1; the *technician* mobile app is Phase 3+).
- Building our own payment processor (we integrate Stripe or similar — see §F.3).
- Building our own labor-guide/parts database (we license MOTOR or equivalent — see §F.1).
- Full accounting ledger (we sync to QuickBooks, we are not a GL).

---

# PART B — DOMAIN MODEL

This is the heart of the spec. Types below use TypeScript-ish notation. All entities are **tenant-scoped** (`shopId` / `locationId`) unless noted. All carry `id`, `createdAt`, `updatedAt`, `createdBy`, and soft-delete `archivedAt`.

## B.1 Tenancy & org hierarchy

```
Company (tenant root)
  └─ SubCompany (optional grouping)
       └─ Location (a physical shop)   ◄── most data is scoped here
```

- `Company` — billing account, plan tier, feature flags.
- `Location` — a shop. Has address, hours, tax config, messaging numbers, payment account.
- **HQ** is not a separate entity — it's a *view scope* across Locations for multi-location customers.

```ts
type Company   = { id; name; planTier: 'basic'|'clever'|'genius'|'multishop'; featureFlags: string[] }
type Location  = { id; companyId; subCompanyId?; name; address; phone; timezone; hoursOfOperation; externalId?; taxConfigId; active: boolean }
```

## B.2 Identity, users, roles

```ts
type User = {
  id; companyId; email; phone?; firstName; lastName;
  userType;                       // owner | staff | technician | ...
  active: boolean;
  laborRate?; commissionConfig?;  // pay data
  notificationPrefs;
}

type Role = {
  id; companyId; name; description?;
  scope: 'shop' | 'hq';
  permissions: Permission[];      // permission is set ONLY at role level, never per-user
  active: boolean;
}

type UserLocationAccess = {
  userId; roleId;
  locationScope: 'all' | 'subset';
  locationIds?: string[];         // when subset
  visibleInAssignedLocations: boolean;
}
```

**Design rule (from Shopmonkey behavior):** permissions attach to **roles**, never to individual users. Editing a shared role while adding a user should fork a new custom role rather than mutating the shared one. Deactivating a role requires reassigning its users.

## B.3 Customers, fleets, vehicles

```ts
type Customer = {
  id; locationId;
  type: 'individual' | 'business';
  firstName?; lastName?; companyName?;
  contacts: Contact[];            // phones, emails, each with a label
  preferredContactMethod: 'sms'|'email'|'phone';
  referralSource?;                // google|referral|social_media|repeat_customer|walk_in|other
  fleetId?;                       // membership in a fleet
  tags: string[];
  taxExempt: boolean;
  pricingMatrixOverrideId?;       // auto-applied pricing
  laborMatrixOverrideId?;
  specialRates?;                  // per-customer fee/rate overrides
  marketingConsent: { optedIn: boolean; optInId?; optInDate?; source? };
  // ---- demographics / intake (individual customers) ----
  gender?: 'male' | 'female';
  dob?;                           // 'YYYY-MM-DD' OR year-only 'YYYY' (imprecise DOB)
  ageRange?: '<18'|'18-24'|'25-34'|'35-44'|'45-54'|'55-64'|'65+';  // AUTO-derived from dob when present; else manual
  ethnicity?;
  primaryLanguages?: string[];    // multi-select; legacy singular `primaryLanguage` kept + mirrored (first)
  primaryLanguage?;               // @deprecated back-compat
  speaksEnglish?: boolean;
  driverLicenseNumber?; driverLicenseState?; driverLicenseExp?;
  city?; state?;                  // where the customer is from
}

type Fleet = {
  id; locationId; name;
  billingContact;
  pricingMatrixOverrideId?; laborMatrixOverrideId?;
  // groups customers and/or vehicles; supports consolidated statements
}

type Vehicle = {
  id; locationId;
  ownerCustomerId?; fleetId?;
  vin?; licensePlate?; plateState?;
  year?; make?; model?; submodel?; engine?;
  color?; mileageIn?; mileageOut?; unitNumber?;   // unitNumber for fleets
  // decode source: vin | plate(CARFAX) | ymm
}
```

- **Duplicate prevention:** on customer (name/email/phone) and vehicle (plate/VIN/YMM).
- **Vehicle decode:** by VIN or Year/Make/Model always; by **license plate only when CARFAX is enabled** (§F.4). Mobile app supports VIN + plate scanning.
- **Service history** is derived: all Orders + deferred services for a vehicle/customer.

## B.4 The Order aggregate (core)

```ts
type Order = {
  id; locationId;
  number: number;                 // human-facing, auto-increment per location
  status: 'estimate' | 'repair_order' | 'invoice';
  workflowStatusId;               // which kanban column
  customerId; vehicleId; fleetId?;
  serviceWriterId?;               // one per order
  appointmentId?;
  dueAt?; promisedAt?;
  odometerIn?; odometerOut?;
  checklist?: ChecklistItem[];    // optional gate before convert
  authorizations: Authorization[];
  totals: OrderTotals;            // computed: subtotal, discounts, fees, tax, total, cost, grossProfit
  paidTotal; balanceDue;
  invoicedAt?; fullyPaidAt?;
  // ---- board-card / detail fields (see §J.2, §J.3) ----
  title?;                         // short human title, e.g. "Water Pump R&R and 3 More"
  description?;                   // free-text job description (Jira-style)
  labels?: { id; text; color }[]; // colored chips → future `labels` catalog + `order_labels` join
  mechanicIds?: string[];         // team members assigned to the car → User; future `order_assignments`
  photos?: { id; url; sortOrder }[]; // vehicle photos; lowest sortOrder = card thumbnail; future `vehicle_photos`
  effort?: 'low'|'medium'|'high'; // relative complexity → card effort icon + Details field
  priority?: 'low'|'medium'|'high';
  startDate?;                     // scheduled start ('YYYY-MM-DD')
  technicianName?;                // denormalized lead-tech display (derive from LineItem.assignedTechnicianId)
  // relations:
  services: Service[];
  inspections: Inspection[];
  timeEntries: TimeEntry[];
  payments: Payment[];
  purchaseOrders: PurchaseOrder[];
}

type Service = {
  id; orderId;
  title; customerNotes?;
  categoryIds?: string[];
  flags: {
    recommended: boolean;         // excluded from total until authorized
    lumpSum: boolean;             // show only service total to customer
    hideLineItemPricing: boolean;
    hideFromCustomer: boolean;
  };
  authorizationStatus: 'pending'|'authorized'|'declined';
  deferred: boolean;              // set when invoiced/archived while unauthorized/declined
  lineItems: LineItem[];
}

type LineItem = {
  id; serviceId;
  type: 'labor'|'part'|'tire'|'subcontract'|'fee'|'discount'|'shop_supplies'|'epa_fee';
  name; notes?;
  quantity?; hours?;              // hours for labor
  unitCost?; unitRetail?;
  laborMatrixId?; laborMultiplier?;
  assignedTechnicianId?;          // labor lines assign a tech
  taxable: boolean;
  partRef?: { inventoryPartId?; sku?; mpn?; manufacturer?; reduceInventory: boolean; coreCharge?; };
}

type ChecklistItem = { id; label; confirmed: boolean; confirmedBy?; confirmedAt? }
```

**Totals engine rules:**
- `recommended` services are excluded from order total until authorized.
- `lumpSum` hides line-item breakdown from the customer view (shop still sees it).
- Gross profit = Σ(retail) − Σ(cost) across line items.
- Tax computed per line-item `taxable` × category taxability (§B.9).

## B.5 Authorization (per-service state machine)

```ts
type Authorization = {
  id; orderId;
  serviceIds: string[];           // which services this authorization covers
  method: 'online'|'phone'|'sms'|'email'|'in_person';
  approvedServiceIds: string[];   // customer can approve/decline each service
  declinedServiceIds: string[];
  eSignature?: { image; signedAt; signerName };
  authorizedBy?;                  // staff who recorded verbal auth
  authorizedAt;
}
```

- Customer opens a web link, expands each service, approves/declines **individually**, optionally e-signs.
- Optional rule: **reset authorization when a service's price increases** (retain prior signatures in history).
- Full authorization history retained on the order.

## B.6 Inspections (DVI)

```ts
type InspectionTemplate = {
  id; locationId; name;
  type?: 'check_in'|'multipoint'|'pre_purchase'|'custom';
  items: InspectionTemplateItem[];
}

type Inspection = {
  id; orderId; templateId?;
  title;
  status: 'in_progress'|'complete';
  performedBy?; completedAt?;
  history: { event; user; at }[];
  items: InspectionItem[];
}

type InspectionItem = {
  id; inspectionId;
  name;
  status: 'passed'|'needs_attention'|'failed'|'na';   // green/yellow/red/grey
  notes?;
  quickNoteIds?: string[];
  media: Media[];                 // images/video/pdf, 50MB/file max ⚠️(limit is SM's; set our own)
  action?: 'estimate_requested'|'deferred_by_customer';
}

type Media = { id; kind:'image'|'video'|'pdf'; url; thumbnailUrl?; sizeBytes; }
```

- Techs perform inspections on mobile; customer receives an SMS/email link to review, comment, authorize line items, and e-sign the inspection.
- Failed/Needs-Attention items can spawn estimate line items or become deferred work.

## B.7 Scheduling

```ts
type Appointment = {
  id; locationId;
  customerId?; vehicleId?; orderId?;
  startAt; endAt; allDay?; multiDay?;
  dropOffAt?; pickUpAt?;
  recurringRule?;                 // RRULE
  color?;
  assignedTechnicianId?;
  notes?;
  confirmation?: { sentAt?; state: 'pending'|'confirmed'|'canceled' };
  reminders: { leadTime; channel; sentAt? }[];
}
```

- Calendar views: by-tech grouping, color filter, day/week.
- Customer confirms via SMS reply ("1" confirm / "2" cancel) → drives `confirmation.state`.
- Self-service **online booking widget** (public) creates appointments (CRM add-on tier).

## B.8 Catalog: canned services, labor, pricing matrices

```ts
type CannedService = {              // reusable service template
  id; locationId; title; customerNotes?;
  categoryIds?; recommended; lumpSum;
  lineItems: LineItem[];            // template line items
}

type LaborRate  = { id; locationId; name; hourlyRate; isDefault }

type LaborMatrix = {                // adjusts hours OR rate by hour bands
  id; locationId; name; isDefault;
  affects: 'hours'|'rate';
  bands: { minHours; maxHours; multiplier }[];
}

type PricingMatrix = {              // sets retail from cost by cost bands
  id; locationId; name; isDefault;
  bands: { minCost; maxCost; markupPct?; marginPct? }[];
}
```

- **Labor guide** (parts + labor lookup by vehicle) is an *integration* (MOTOR/ALLDATA), not stored catalog — see §F.1. Distinguish clearly from the **labor matrix** (a multiplier engine) — they are different mechanisms.
- Matrices: one default (starred); per-line override; customer/fleet override auto-applies; edits are **not retroactive** ("Update to Latest" action re-applies).

## B.9 Parts, tires, inventory

```ts
type Part = {
  id; locationId;
  name; sku?; mpn?; manufacturer?;
  categoryId?; vendorId?;
  cost; retail;
  qtyOnHand; minQty?;             // minQty triggers reorder alert
  binLocation?;                   // ⚠️ not confirmed in SM; we should include it
  taxable: boolean;
  isTire?: boolean;
  tire?: { brand; model; size; tin? };   // Tire Identification Number
  trackInventory: boolean;        // "reduce inventory count" toggle
  coreCharge?;
}

type InventoryAdjustment = { id; partId; delta; reason; note; by; at }   // bulk adjustments
```

## B.10 Purchasing & returns

```ts
type PurchaseOrder = {
  id; locationId;
  number;                         // auto-increment
  vendorId; vendorInvoiceNumber?;
  orderId?;                       // linked work order
  status: 'draft'|'ordered'|'received'|'fulfilled'|'canceled';
  lines: POLine[];
  fees?; taxes?;                  // incl. Canada GST/PST/HST
}

type POLine = {
  id; poId;
  partId?; tireId?; partNumber?; serviceId?;
  isInventory: boolean;           // inventory parts update on-hand when received
  cost; qtyOrdered; qtyReceived;
}

type Return = {
  id; locationId;
  partId?; tireId?; isCore?: boolean;
  quantity; amount;
  status: 'not_ready'|'ready_to_return'|'returned'|'refunded'|'not_refundable';
  rmaNumber?;
  creditMethod?;
  reason: 'defective'|'not_needed'|'warranty'|'wrong_part'|'other';
  note?;
}

type Vendor = { id; locationId; name; contact; accountNumber?; integrationRef? }
```

- One order can spawn **multiple POs (one per vendor)**.
- Receiving inventory-linked parts increments `qtyOnHand`; non-inventory parts do not.
- Returns marked `returned` update inventory. Core returns are a parallel flow (`isCore`).

## B.11 Payments & money movement

```ts
type Payment = {
  id; orderId; locationId;
  method: 'card_present'|'card_online'|'ach'|'cash'|'check'|'bnpl'|'other';
  amount;
  isDeposit: boolean;
  processorRef?;                  // gateway transaction id
  surcharge?;                     // credit-only, not debit/ACH/BNPL
  createdBy; createdAt;
}

type Payout = { id; locationId; initiatedAt; arrivalAt; bankAccount; amount; status }

type CashDrawer = {               // cash management
  id; locationId; name; roleScope?;
  cashOnHand;
  events: { type:'sale'|'safe_drop'|'bank_run'|'change'; amount; by; at }[];
}

type Statement = {                // aggregate multiple invoices (fleet billing)
  id; locationId; fleetId?; customerId?;
  invoiceOrderIds: string[];
  total; balanceDue;
}
```

- **BNPL**: shop is paid in full immediately; customer repays the financier over installments.
- **Text-to-pay**: send a payment link over SMS/email.
- **Bulk Payments**: one capture across multiple invoices.

## B.12 Messaging & marketing

```ts
type Message = {
  id; locationId; customerId; orderId?;
  channel: 'sms'|'email';
  direction: 'inbound'|'outbound';
  body; attachments?: Media[];
  status: 'queued'|'sent'|'delivered'|'read'|'failed';  // read only reliable for email
  at;
}

type Notification = {                // shop-side bell feed (see §J.7)
  id; locationId;
  type: 'message'|'appointment'|'payment'|'part'|'dvi'|'mention'|'inventory';
  title; body;
  at; read: boolean;
  refId?;                            // linked order/thread/appointment for deep-link
}

type Campaign = {
  id; locationId;
  kind: 'automated'|'one_time';
  channel: 'sms'|'email';
  trigger?: 'canned_service_reminder'|'deferred_service_reminder'|'reengagement'|'service_follow_up';
  audienceFilter?;                // stackable filters (spend, tag, last invoice, vehicle, mileage, year...)
  status: 'active'|'paused'|'sending'|'sent'|'error';
  metrics: { optIns; subscriptions; revenue; sent; openRate; clickRate; failedPct };
}

type ReviewRequest = {
  id; locationId; orderId;
  trigger: 'order_archived'|'order_invoiced'|'payment_collected'|'invoiced_and_paid';
  delay: 'immediate'|'24h'|'48h'|'3d';
  channel; sentAt?;
  response?: { rating; text; respondedInApp?; aiSuggestedResponse? };
}
```

- Two distinct phone numbers: a **transactional messaging number** and a **marketing SMS number** (opt-out-safe).
- Consent model: opt-in via forms/scheduler/"START"; bulk CSV opt-in with opt-in id + date.

## B.13 Reporting (materialized/derived)

Reports are read-models over the transactional data. Do not model them as first-class stored entities except for **saved report views** (`{ id; reportKey; filters; ownerUserId }`). Key derived metrics are defined in §E.9.

## B.14 Audit log, activity timeline & system notes (traceability — first-class)

Traceability is a core product requirement, not an afterthought. Two complementary layers record everything:

**1. `AuditLog` — immutable, system-generated, compliance-grade.** The "who did what, when, and what changed" record.

```ts
type AuditLog = {
  id; companyId; locationId;
  entityType;            // 'order'|'service'|'line_item'|'payment'|'inventory'|'purchase_order'|'customer'|'vehicle'|'role'|'user'|'message'|'appointment'|...
  entityId;
  action;                // 'create'|'update'|'delete'|'status_change'|'auth_recorded'|'payment_captured'|'payment_refunded'|'inventory_adjusted'|'received'|'login'|...
  actorId?;              // user id; null when system/automation
  actorType: 'user' | 'system' | 'integration' | 'customer';
  before?: Json;         // changed fields, prior values
  after?: Json;          // changed fields, new values (field-level diff)
  ip?; userAgent?;
  at;                    // server UTC timestamp
}
```

- **Append-only.** Never edited, never deleted (not even soft-deleted). Its own table, partitioned by month.
- Written through the **event-bus/outbox** (§C.4) so no application code path can skip it.
- **Minimum coverage:** order status transitions; line-item add/remove/quantity/price/cost changes; discount/fee changes; authorization recorded (method + who); payment captured/refunded/voided; deposit taken; inventory adjustments, receiving, and on-hand deltas; PO status changes; message sent/received/delivered/failed; role & permission changes; user login/logout; customer PII edits; integration sync results; setting changes (esp. tax, pricing matrix, payment config).
- Surfaced read-only in an **Audit Log report/viewer** filterable by entity, actor, action, and date; each order also shows its own slice.

**2. `OrderActivity` / `Note` — the human-facing timeline on each order.** A single reverse-chronological feed blending auto-generated system events with manual notes. This is what renders inside the kanban card detail (§J.2).

```ts
type OrderActivity = {
  id; orderId;
  kind: 'system_event' | 'user_note' | 'internal_message' | 'customer_message'
      | 'status_change' | 'payment' | 'authorization' | 'inspection'
      | 'assignment' | 'appointment' | 'part_event';
  authorId?;                 // user who wrote a note; null for system events
  visibility: 'internal' | 'customer_visible';
  body?;                     // note text; supports @mentions and attachments
  mentions?: string[];       // userIds @-mentioned → notified
  refId?;                    // linked payment/message/inspection/PO/etc.
  pinned?: boolean;
  at;
}
```

- **@mentions** notify the mentioned user (matches Shopmonkey's internal-notes-with-@mentions behavior).
- **Internal** notes are never shown to customers; **customer-visible** notes can surface on shared links.
- `pinned` notes stick to the top of the card timeline.
- Every entry is also mirrored to `AuditLog` where it represents a state change; `OrderActivity` is the readable narrative, `AuditLog` is the forensic record.

---

# PART C — ARCHITECTURE & TECH STACK

## C.1 Chosen stack (React/TypeScript + Node.js + Supabase)

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** end-to-end (Node + React) | Shared types across FE/BE + Supabase's generated types; catches shape/schema mismatches across the ~30-entity domain |
| Frontend | **React + Vite** (SPA), TypeScript | Fast dev/build; React Router for routing; add SSR later only if public-page SEO demands it |
| UI | **Tailwind CSS + shadcn/ui + Radix** | Fast, accessible, own the design system (do NOT copy SM's UI) |
| State/data | **TanStack Query** (server state) + Zustand (local UI) | Cache, optimistic updates for kanban |
| Backend | **Node.js + Express** (or Fastify), TypeScript | Custom API for business logic, integrations, and the pricing engine |
| Data platform | **Supabase** | Managed Postgres + Auth + Storage + Realtime + auto REST (PostgREST) in one service |
| API style | **REST + webhooks** from the Node API; Supabase client used directly for simple reads/realtime | Node API owns writes and business logic; Supabase handles auth, storage, realtime, and simple CRUD |
| Realtime | **Supabase Realtime** (Postgres change streams) | Kanban board, messaging, time-clock live updates — no separate WebSocket server to run |
| DB | **Supabase Postgres** | Relational domain, strong constraints, JSONB for flexible bits; RLS for tenancy |
| DB access (Node) | **supabase-js** + **Drizzle** (or Prisma) for schema/migrations | Migrations run against the Supabase connection string; supabase-js for app queries |
| Auth | **Supabase Auth** | Email+password, Google OAuth, JWTs; RLS policies key off the JWT claims |
| File storage | **Supabase Storage** (S3-backed) | Inspection photos/videos, signatures, attachments |
| Cache/queue | **Redis** + **BullMQ** | Job queue for messaging, campaigns, syncs, reminders |
| Search | **Postgres FTS** (built into Supabase) first; OpenSearch later | Customer/vehicle/order search |
| Payments | **Stripe** (Connect + Terminal) | Card-present + online + payouts + surcharging; avoid building a processor |
| Infra | **Supabase (managed)** + **Docker** for the Node API/worker on Fly/Render/Railway | Supabase hosts DB/auth/storage/realtime; you host the API + worker |
| Observability | **Sentry** + Supabase logs + optional Grafana | Errors, traces, metrics |
| CI/CD | **GitHub Actions** + **Supabase CLI** | Lint/test/build/deploy; CLI applies DB migrations |

> **Supabase division of labor.** Supabase is not just a database — it also provides Auth, Storage, Realtime, and an auto-generated REST API (PostgREST). The Node API therefore shrinks to what genuinely needs server-side logic: the pricing/totals engine, third-party integrations (Stripe, Twilio, MOTOR, PartsTech, QuickBooks), webhook handling, and background jobs. Simple CRUD and realtime subscriptions can go straight from the React app to Supabase, protected by RLS.

## C.2 Multi-tenancy model

- **Single database, shared schema, row-level tenant scoping** by `companyId`/`locationId`. Enforce with **Supabase Row-Level Security (RLS)** policies that read the tenant claim from the Supabase Auth JWT, plus an application-level tenant guard in the Node API (belt and suspenders).
- Every query goes through a tenant context (from the authenticated session). No cross-tenant reads without an explicit HQ scope.
- Consider schema-per-tenant only if a large enterprise customer demands isolation; default is row-level.

## C.3 Service decomposition (modular monolith first)

Start as a **modular monolith** (Express route modules + a domain service layer), extract services only when scale demands:

```
apps/
  web/            React + Vite app (dashboard + public customer pages)
  api/            Node.js + Express backend (business logic, integrations)
  worker/         BullMQ workers (messaging, campaigns, syncs, reminders)
supabase/
  migrations/     SQL migrations (Supabase CLI)
  policies/       RLS policies
packages/
  types/          Shared TS domain types + zod schemas
  ui/             Shared React component library
  sdk/            API client (also basis for public API SDK)
```

Domain modules inside `api/`: `orders`, `catalog`, `inventory`, `purchasing`, `customers`, `vehicles`, `scheduling`, `inspections`, `payments`, `messaging`, `marketing`, `reporting`, `iam` (users/roles), `integrations`, `hq`.

## C.4 Key cross-cutting concerns

- **Totals/pricing engine** — a pure, well-tested module. Given an Order, compute subtotals, matrix-adjusted retail, discounts, fees, tax, totals, and gross profit. Deterministic, unit-tested heavily. This is the highest-risk correctness area.
- **Event bus** — domain events (`OrderInvoiced`, `PaymentCollected`, `InspectionCompleted`, `ServiceDeferred`) feed webhooks, campaigns, review requests, accounting sync. Use an outbox pattern for reliable delivery.
- **Idempotency** — all write endpoints and webhook handlers accept idempotency keys.
- **Audit log** — append-only record of who changed what (needed for authorizations, payments, inventory).

---

# PART D — API SURFACE

REST, versioned under `/api/v1`. All endpoints tenant-scoped by session; HQ endpoints add a location filter. Below is the resource map (mirrors ~48 resources SM exposes). Standard CRUD verbs implied (`GET` list/one, `POST`, `PATCH`, `DELETE`=archive) unless noted.

### Identity & org
- `/companies`, `/locations`, `/users`, `/roles`, `/user-location-access`
- `POST /auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`

### Customers & vehicles
- `/customers`, `/fleets`, `/vehicles`
- `POST /vehicles/decode` — `{ vin | plate+state | ymm }` → decoded attributes (VIN always; plate via CARFAX)
- `GET /customers/:id/history` — orders + deferred services
- `GET /customers/:id/deferred`

### Orders (core)
- `/orders` (filter by status, workflowStatusId, tech, date)
- `POST /orders/:id/convert` — `{ to: 'repair_order'|'invoice' }` (respects checklist gate)
- `/orders/:id/services`, `/services/:id/line-items`
- `POST /orders/:id/authorizations` — record/collect authorization
- `GET  /orders/:id/authorizations` — history
- `POST /orders/:id/send` — `{ channel, templateId, toggles }` (share estimate/invoice/inspection link)
- `GET  /public/orders/:token` — customer-facing view (approve/decline/e-sign/pay)
- `POST /public/orders/:token/authorize`
- `GET  /orders/:id/totals` — computed totals (also embedded on order)

### Workflow
- `/workflow-statuses` (columns: create/rename/reorder/hide, per-column rules)
- `PATCH /orders/:id/workflow` — move card (may trigger status conversion)

### Catalog
- `/canned-services`, `/labor-rates`, `/labor-matrices`, `/pricing-matrices`, `/categories`
- `GET /catalog/labor-lookup?vehicleId=&service=` — MOTOR/ALLDATA labor guide (§F.1)

### Inspections
- `/inspection-templates`, `/inspections`, `/inspections/:id/items`
- `POST /inspections/:id/items/:itemId/media`
- `POST /inspections/:id/complete`

### Scheduling
- `/appointments` (calendar range queries)
- `POST /appointments/:id/reminders`, `/confirmations`
- `GET  /public/booking/:locationSlug` + `POST /public/booking/:locationSlug` (online scheduler)

### Inventory & purchasing
- `/parts`, `/tires`, `/vendors`, `/inventory-adjustments` (bulk)
- `/purchase-orders`, `POST /purchase-orders/:id/receive` `{ lines:[{poLineId, qty}] }`
- `/returns`
- `POST /integrations/parts/search` — vendor catalog search (PartsTech/Nexpart/WorldPac)
- `POST /orders/:id/parts/order` — hand off cart to vendor, create draft PO on return

### Payments
- `/payments`, `POST /orders/:id/payments`
- `POST /orders/:id/payment-link` — text-to-pay
- `/payouts`, `/cash-drawers`, `/statements`, `POST /payments/bulk`
- `POST /payments/bnpl/prequalify` (Sunbit/Affirm)

### Messaging & marketing
- `/messages` (list conversations), `POST /messages` (send)
- `WS /realtime` — inbound messages, kanban, time-clock
- `/campaigns`, `POST /campaigns/:id/send`
- `/review-requests`, `/reviews` (+ AI suggested response endpoint)

### Time clock
- `/time-entries`, `POST /time-entries/clock-in`, `/clock-out`, `/switch` `{ orderId?, serviceId? }`

### Reporting
- `GET /reports/:reportKey?filters=...` — returns snapshot KPIs + detail rows
- `/report-views` (saved views)
- `GET /hq/reports/:reportKey?locationIds=&country=` — multi-location

### Integrations & platform
- `/webhooks` (subscribe to events), `/webhook-deliveries`
- `/integrations/quickbooks/*` (OAuth connect, mapping, sync status)
- `/integrations/carfax`, `/integrations/google`, `/integrations/motor`
- **Public API**: expose the above (read + key writes) with API-key auth + rate limits for third-party developers (a first-tier differentiator — SM ships this on all plans).

---

# PART E — FEATURE SPECS (buildable detail)

## E.1 Estimate builder
**Goal:** service writer builds a priced estimate fast.
- Create from: global +Add, appointment, customer/vehicle page, search.
- Structure: Order → Services → Line items (labor/parts/tires/subcontract/fee + service-level discount/shop supplies/EPA).
- Add lines from: manual entry, canned service, labor-guide lookup (§F.1), parts vendor search (§F.5).
- Per-service flags: recommended, lump sum, hide line pricing, hide from customer.
- Live totals with matrix-applied retail and gross-profit display for staff.
- **States:** draft estimate → sent → (per-service) authorized/declined → convert.
- **Edge cases:** price increase after authorization (optional re-auth reset); recommended services excluded from total; tax-exempt customer; customer/fleet pricing override.

## E.2 Authorization & customer approval
- Send link via SMS/email with toggles (allow payment, request auth, request e-sign, show messages/inspections/history).
- Customer approves/declines each service, optional e-signature.
- Staff can record verbal/phone approval with method.
- Persist full authorization history; unauthorized recommended work becomes **deferred** on invoice/archive.

## E.3 Workflow board (kanban)
- Views: Columns, List, Parts & Tires.
- Columns are shop-defined; per-column rules: archive-paid, archive-when-inactive (N days), convert-to-RO, convert-to-invoice.
- Drag card → may mutate order status via column rule. Realtime sync across users.
- Card density Standard/Condensed; hiding columns is per-user.

## E.4 Digital Vehicle Inspection
- Build from template or ad hoc; item statuses passed/needs-attention/failed/N-A.
- Attach photos/video/PDF per item; reusable quick notes; recommendations.
- Complete + history tracking; send to customer for review/comment/authorize/e-sign.
- Failed/attention items → estimate line items or deferred work.
- Techs perform on mobile (Phase 3).

## E.5 Scheduling & reminders
- Calendar (day/week, group-by-tech, color filter). Appointments with drop-off/pick-up, recurring, tech assignment, linked order.
- Confirmation (one-shot at save) + multiple reminders with lead times; SMS reply 1/2 → confirm/cancel.
- Public online booking widget (add-on tier).

## E.6 Customers, vehicles, history
- CRUD with duplicate detection; VIN/plate/YMM decode (plate needs CARFAX).
- Fleet grouping with pricing overrides and consolidated statements.
- Per-vehicle service history + deferred-services suggestions surfaced on new estimates.

## E.7 Time clock & labor tracking
- General clock-in and order/service-specific "switch"; multiple techs per order.
- Manual entry (in/out, duration, tech, activity, notes).
- Feeds Summary by Technician (hours, labor cost, labor billed, efficiency %).

## E.8 Parts, inventory, purchasing
- Parts + Tires + Bulk Adjustments pages; on-hand auto-decrement on invoice (when `trackInventory`).
- Min-qty reorder alerts; SKU/MPN/manufacturer/bin; barcode + TIN scanning.
- Vendor search/order (PartsTech/Nexpart/WorldPac) → swap items → draft PO → place order.
- PO state machine draft→ordered→received→fulfilled→canceled; per-line receiving updates inventory; multiple POs per order.
- Returns + core returns with RMA/status/reason.
- Pricing matrix sets retail from cost; not retroactive.

## E.9 Reporting & KPIs
Report catalog (~35) grouped: Shop Performance, Payments, Estimates & Invoices, Parts & Line Items, Inventory, Deferred Services, Individual Performance, Purchasing, Marketing. Each = filters + KPI snapshot + detail table + drill-down + saved views.

**Defined KPIs (implement exactly):**
- **ARO / Avg Sales** = total revenue ÷ invoiced orders
- **Gross Profit** = total retail − total cost
- **Close Rate** = invoices ÷ total orders
- **Order/Total Efficiency** = billed hours ÷ (order hours | total clocked hours) × 100 (can exceed 100% under flat-rate/multipliers)
- **Car Count** per tech; **Labor Cost (Order)** vs **Labor Cost (Time)**
- **End of Day** dashboard toggled by Invoiced vs Fully-Paid date basis.

## E.10 Multi-location (HQ)
- Company→SubCompany→Location hierarchy; List/Hierarchy/Map views.
- Shared customer + inventory data; cross-location oversight; benchmark reporting with Country/Location filters; region-targeted campaigns.

## E.11 Roles & permissions
- Unlimited custom roles; permissions at role level only; HQ vs shop scope; location-access scope (all incl. future | subset).

---

# PART F — INTEGRATIONS

| Integration | Purpose | Notes / tier |
|---|---|---|
| **Stripe (Connect + Terminal)** | Card-present, online, ACH, payouts, surcharging, instant payout | Replaces "Shopmonkey Payments"; use Terminal for WisePOS-class readers |
| **Sunbit / Affirm** | Consumer BNPL | Shop paid immediately; soft credit check; not all US states |
| **MOTOR** (+ optional **ALLDATA**) | Parts & labor guide, diagrams, procedures | License required; core to estimate speed |
| **CARFAX** | Plate-based decode, service history, recalls; report-back completed service | All tiers |
| **PartsTech / Nexpart / WorldPac / RepairLink** | Parts + tire catalog, live pricing, ordering | Embedded ordering flow |
| **QuickBooks Online** (+ Desktop via connector) | Accounting sync: invoices, payments/payouts, POs, inventory | Map line-item types → QBO items; one-way + reconciliation |
| **Google Business Profile** | Reviews read/respond, request campaigns | OAuth |
| **Twilio / SendGrid** | SMS + email transport (transactional + marketing numbers) | Two separate numbers; consent/opt-out handling |
| **Google SSO** | Auth | |

**Integration architecture:** each vendor behind an adapter interface in the `integrations` module; credentials stored encrypted per location; all external calls go through the worker with retries + circuit breakers.

⚠️ **Verify before committing:** Epicor, FleetNet, Wisetack are unconfirmed as SM integrations — treat as optional. Confirm MOTOR/ALLDATA/CARFAX/PartsTech commercial terms early; these are gating dependencies and licensing can be slow.

---

# PART G — NON-FUNCTIONAL REQUIREMENTS

## G.1 Security
- OWASP Top-10 baseline; parameterized queries (Prisma); input validation with zod on every endpoint.
- Encryption in transit (TLS) and at rest; secrets in a vault (not env files in prod).
- RLS + tenant guards; no cross-tenant access.
- Audit log for auth, payments, inventory, role changes.

## G.2 Payments compliance
- **PCI DSS** — never touch raw card data; use Stripe Elements / Terminal so card data never hits our servers (SAQ-A scope).
- Store only processor tokens/refs. Surcharging rules (credit-only) enforced server-side.

## G.3 Messaging compliance
- **TCPA / A2P 10DLC** registration for SMS; explicit opt-in + opt-out ("STOP"); separate marketing number; consent records with timestamps.
- CAN-SPAM for email; unsubscribe links.

## G.4 Data & privacy
- **CCPA/CPRA** (California shops) data export/delete; **PIPEDA** for Canada.
- Customer PII minimization; data-retention policy; per-tenant export.

## G.5 Performance & reliability
- Kanban and messaging feel realtime (<200ms perceived via optimistic UI + WS).
- Report queries offloaded to read replicas / materialized views; heavy reports async.
- Target 99.9% uptime; graceful degradation when an integration is down.

## G.6 Accessibility & i18n
- WCAG 2.1 AA; customer-facing pages especially.
- i18n from day one (customer `preferredLanguage`); English + Spanish at launch; currency + tax localization (US + Canada GST/PST/HST).

## G.7 Legal / IP guardrails
- Do **not** copy Shopmonkey (or competitor) UI text, layouts, icons, screenshots, help content, or brand assets.
- Build our own design system and copy. Features/workflows are not protectable; expression is.
- License any third-party data (MOTOR, CARFAX) — do not scrape.

---

# PART H — PHASED ROADMAP

### Phase 0 — Foundations (weeks 0–4)
Monorepo, CI/CD, auth + multi-tenancy + RLS, org/user/role model, base UI shell, Postgres + Prisma schema for core entities, tenant guard, audit log, event bus/outbox skeleton.

### Phase 1 — Core shop-ops spine (MVP) (weeks 4–12)
Customers/vehicles (+VIN/YMM decode), Order aggregate (estimate→RO→invoice), Services/line items, **totals & pricing engine**, labor/pricing matrices, canned services, workflow kanban (realtime), authorization + public customer approval link + e-signature, invoicing. **Milestone: a shop can run a job end to end and get paid manually.**

### Phase 2 — Payments, inspections, scheduling (weeks 12–20)
Stripe integration (online + card-present + text-to-pay + deposits), BNPL, DVI with media + customer review/e-sign, calendar + appointments + reminders + online booking, tax engine (US + Canada).

### Phase 3 — Parts, inventory, purchasing + technician mobile (weeks 20–30)
Inventory + tires, pricing matrix on parts, PO lifecycle + receiving + returns/cores, PartsTech/Nexpart/WorldPac ordering, labor-guide (MOTOR) integration, **technician mobile app** (inspections, time clock, assigned jobs, VIN/plate scan).

### Phase 4 — Comms/CRM + reporting + accounting (weeks 30–40)
Two-way messaging center, automated + one-time campaigns, review manager (Google + AI response), full report catalog + KPI dashboard, QuickBooks Online sync, CARFAX.

### Phase 5 — Multi-location (HQ) + public API + enterprise (weeks 40+)
HQ hierarchy + cross-location reporting/campaigns, roles at HQ scope, public REST API + webhooks + developer portal, heavy-duty/fleet verticals, QuickBooks Desktop connector.

---

# PART J — UI/UX & SCREEN SPECIFICATIONS

> Derived from Shopmonkey's public overview video ("Shopmonkey Overview," chapters: Workflow → Estimates → Customer Communication → Calendar → DVI → Invoicing & Payment) and messaging video ("Customer Messaging Made Easy"), plus the public help center. This section documents **screen structure, information architecture, and interaction patterns** so we can build a functionally equivalent product with our **own** visual design — not a pixel copy (see §G.7 for the IP guardrail). Where a detail is inferred rather than confirmed on video, it's marked ⚠️.

## J.1 Global layout & shell

- **Left vertical nav** (primary sections): Workflow, Calendar, Messages, Customers, Inventory, Reports, Settings. Collapsible; icons + labels. Unread badges on Messages.
- **Top bar** (persistent): global **search** (customers, vehicles, orders — by name, phone, license plate, VIN, RO number); global **"+ Add"** (New Estimate / Appointment / Customer); **notifications** bell; **messages** indicator; **location switcher** (multi-location); user/account menu.
- **Content area**: list view, board view, or detail pane depending on section.
- **Realtime everywhere**: board cards, message threads, and notifications update live via Supabase Realtime — no manual refresh.

> **Current implementation.** The shipped left nav is *Calendar · Backlog ·
> Workflow (→ Completed / Invoiced) · Customers · Inventory · Reports · Settings*
> — there is **no Messages item** (messaging is the top-bar dock, §J.4), and the
> theme toggle sits above the sidebar collapse. The top bar shows the company
> **`BrandLogo`** (drop-in asset, §J.9), the active location name (bold) with a
> NetSuite-style **Account ID** + a **PRODUCTION** pill, global search, +Add, the
> messenger icon, a bordered bell, and the profile block (name + role, photo
> upload, role switch, location switch).

## J.2 Workflow board (the priority screen) — deep dive

This is the operational heart: "keeping track of cars." It is a **kanban board** where each card is an Order (a car/job) moving left-to-right through shop-defined columns.

**View modes** (tabs on the board): **Columns** (kanban), **List** (sortable table), **Parts & Tires** (work grouped by part status).

**Columns**
- Shop-defined and fully editable: add, rename, reorder (drag), archive (soft-delete, hidden not destroyed), delete. Example default set: *Estimates · Dropped Off · In Progress · Waiting on Parts · Ready for Pickup · Invoices*.
- Each column carries optional **rules**: Convert to Repair Order, Convert to Invoice, Archive Paid Orders, Archive When Inactive after N days.
- Dragging a card into a column **applies that column's rule** — e.g. dropping into "Invoices" converts the order status to invoice (see the dual-status model, §A.2). This is the key interaction; it must be transactional and logged to the timeline + audit log.
- Card density toggle: Standard / Condensed.
- Drag UX: a dashed landing placeholder marks the drop position and cards settle with a drop animation.

> **Current implementation.** The shipped column set is *To Do · In Progress ·
> Pending · Invoices · Ready for Pickup · Done* (from mock `workflow_statuses`).
> Rename + archive are wired; the "+ Add column" affordance is present but hidden
> in the UI. Columns are content-height, capped at the viewport with an internal
> scroll and a pinned "+ Create" footer (inline card creation into that column).
> The board has its own local search and a mechanic-avatar filter cluster,
> separate from the top-bar global search.

**Card front (at-a-glance)** — each card shows (as implemented on `OrderCard`):
- A **vehicle photo thumbnail** at the top (drop-in `/car-photos/<vehicleId>.jpg` → order `photos[]` → generated placeholder).
- The job **title** and **colored label chips** (`Order.labels`).
- Vehicle line ("color year make model") with a per-make brand mark, and the lead technician.
- Footer: overlapping **mechanic avatars** (`Order.mechanicIds`, overflow "+N") on top, then an **effort icon** (low/medium/high) + the `#number` below them, with the **$ total** and **paid/remaining** pinned right.
- Other intended indicators (unread message, inspection status, waiting-on-parts, deposit): ⚠️ our icon set to design.
- `Order.effort` and `Order.priority` are first-class card/detail fields (effort drives the card icon; both are edited in the detail Details panel).

**Card detail (opens on click — the "car's full record")** — organized in tabs. Given the priority on detail and audit trails, this is spec'd richly:

1. **Overview** — implemented as a Jira-issue-style 3-column layout: **main** (Services → line-items editor, an inline-editable **Description**, and a **Photos** carousel) | **Details** (a field form: Vehicle, Assignee→`mechanicIds`, Customer, Labels, Year/Make/Model/Color [mandatory; Make/Model/Color allow "+New" and persist onto the Vehicle], Start date, Priority, Effort) | **Invoice** (live totals + Send / Convert / Collect Payment / Print / Email / SMS). The modal header has an inline-editable job title.
2. **Inspections** — DVIs attached to this order, status per item, media, send-to-customer.
3. **Messages** — the two-way SMS/email thread for this customer inline on the order (send estimate/invoice/photos/status with one click; see J.4).
4. **Payments** — payments taken, balance due, deposits, "Collect Payment" button (see J.5).
5. **Activity / Timeline** — **the audit-rich feed** (backed by `OrderActivity` + `AuditLog`, §B.14). Reverse-chronological, showing:
   - every status change (who moved the card, from/to which column, when);
   - every line-item edit (added "Brake pads", price changed $45→$52, by whom);
   - authorizations (customer approved Service X online with e-signature at time; or "verbal approval recorded by J. Doe");
   - payments (captured $220 credit card, refunded, deposit taken);
   - messages sent/received; inspection completed; technician assigned; appointment linked;
   - **manual notes** with @mentions (internal or customer-visible), pinnable.
   - Each entry: actor (user/system/customer/integration), timestamp, and a "what changed" diff on hover. Filterable by type (notes / system events / payments / messages).

**Board-level behaviors**
- Filter by column, technician, service writer, date, tag, status.
- Search within board.
- Live updates as other users move cards or customers respond.

## J.3 Estimate / Repair Order / Invoice editor

One editor, three statuses (§A.2). Left: Services accordion (each Service expands to line items of type labor/part/tire/subcontract/fee, plus service-level discount/shop-supplies/EPA). Right rail: customer/vehicle, totals (subtotal, discounts, fees, tax, total, and staff-only cost + gross profit), authorization panel, assignments, checklist. Top actions: **Send** (choose SMS/email + toggles: allow online payment, request authorization, request e-signature, show inspections/messages/history), Convert (to RO/Invoice), Collect Payment, Print. Add-line sources: manual, canned service, labor-guide lookup, parts-vendor search.

## J.4 Messaging center (priority feature)

Confirmed behaviors from the messaging video, spec'd for build:

- **Two-way texting and email** from inside the app; send method defaults to the customer's **preferred contact method**.
- **Global Messages view**: conversation list (search by name/phone, recent threads, unread badges) + thread pane. Also embedded **per-order** (J.2 tab 3).
- **One-click sends** of: estimates, invoices, digital inspections, **pictures**, job/status updates, and **payment requests** (text-to-pay link).
- **Automation hooks**: automated **appointment reminders** (reduce no-shows); estimate-authorization requests; invoice payment requests.
- **Instant notifications to the shop** when a customer: authorizes work, cancels an appointment, replies with a question, or makes a payment. These fire into the notifications system (J.6) and the order timeline (J.2 tab 5).
- **Full message history** retained on the customer profile and viewable any time; every message logged to `AuditLog` (sent/received/delivered/failed) — see `Message` entity §B.12.
- Attachments supported; message templates for common sends.
- Two numbers under the hood: a **transactional** messaging number and a separate **marketing** number (opt-in/opt-out compliant) — §B.12, §G.3.

> **Current implementation (Facebook-style dock).** Messaging is not a sidebar
> page; it is a global dock rendered from the app shell (state in a `chatDock`
> store). The top-bar messenger icon opens a right-hugging **Chats dropdown**
> (All/Unread + search); a bottom-right launcher opens a **New message** window
> whose To: picker searches both customers and team members (its composer stays
> hidden until a recipient is chosen); selecting a conversation opens a docked
> chat window (windows stack, capped with a "+N more" overflow, each
> minimize/close). The composer collapses its media cluster into a "+" while
> typing. Conversation rows are derived from `Message` grouped by `customerId`.

## J.5 Checkout / collect payment (priority feature)

Triggered by "Collect Payment" on an order (typically once work is done and it's an Invoice, but deposits can be taken earlier).

**Checkout modal — tender selection.** Support all of:
- **Cash** — enter amount tendered; system computes **change due**; updates the cash drawer (§B.11 `CashDrawer`).
- **Check** — enter amount + **check/reference number**.
- **Debit card** and **Credit card** — processed via the integrated processor (Stripe): **card-present** through a connected reader (Stripe Terminal) or **online / text-to-pay** via a payment link the customer opens on their phone.
- **ACH bank transfer**, **BNPL** (Sunbit/Affirm — shop paid in full immediately), and **Other/gift** as additional tenders.
- **Split payments**: multiple tenders against one invoice (e.g. $100 cash + remainder on card); running balance-due updates until $0.
- On success: mark line/order paid, optionally auto-convert fully-paid order → Invoice, send receipt (SMS/email), log to timeline + audit log, decrement inventory for invoiced parts.

**Card-payment mechanics (build detail).**
- **In person:** app sends the amount to the paired reader; reader captures chip/tap/contactless; result returns to the order. Optional **surcharge on credit only** (never debit/ACH/BNPL), configurable.
- **Remote:** "Text to pay" / "Email invoice" sends a secure link; customer pays on the hosted page; webhook marks the order paid in realtime.
- **Deposits:** share estimate with "Allow Online Payment" + "Request Deposit"; customer prepays before work.

> **Compliance (non-negotiable, §G.2):** raw card data never touches our servers. Use Stripe Elements (web) and Stripe Terminal (in-person) so we stay in PCI SAQ-A scope. We store only processor tokens/refs, never PANs. Entering card numbers on a customer's behalf is out of scope by policy — the customer taps/enters their own card on the reader or hosted page.

## J.6 "Set up credit card payments" — merchant onboarding flow (Settings → Payments)

The ability for a shop to *turn on* card payments. A guided setup:
1. **Connect payments account** — launch Stripe Connect onboarding (business details, identity, **bank account for payouts**). We never handle those credentials directly; Stripe's hosted onboarding does. Status shown as Not started / Pending / Active.
2. **Order / pair a card reader** — register a Stripe Terminal reader (WisePOS-class); pair to the location; test transaction.
3. **Configure options** — surcharge on/off (credit-only), default "allow online payment on invoices," receipt templates, tip settings ⚠️ if desired, payout schedule / instant payouts.
4. **Tax & accounting mapping** — tax rate + per-category taxability (§B.9), and QuickBooks item mapping if connected.
5. **Go live** — once Connect status = Active and a reader is paired, "Collect Payment" (J.5) exposes card tenders.

Every step writes to `AuditLog` (setting changes, account status) so payment-config history is fully traceable.

## J.7 Notifications

A bell + feed for shop-side events: customer authorized work, appointment confirmed/canceled, customer replied, payment received, part received, @mention in a note. Deep-links to the relevant order/thread. Backed by the same event bus that feeds the audit log.

> **Current implementation.** A bordered top-bar bell opens a bounded All/Unread
> dropdown fed by a mock `notifications` collection (the `Notification` entity,
> §B.12), with a per-type icon/tint and an unread badge. The Chats and
> Notifications dropdowns share identical fixed geometry and are mutually
> exclusive. Notifications are **mock/UI-only** today (no event bus yet).

## J.8 Other screens (structure only)

Calendar (day/week, group-by-tech, color filter, appointment create with reminders + online-booking widget), Customers/Vehicles (list + grid views + profile with history, demographic intake, and deferred-service suggestions), Inventory (Parts/Tires/Bulk Adjustments + POs + returns), Reports (catalog + KPI dashboard, §E.9), Settings (workflow columns, roles & permissions, fees & taxes, integrations, messaging numbers, payments per J.6).

> **Reports — current implementation.** Reports ships as an SEC-filing-style
> financial view: **Income Statement** and **Balance Sheet** tabs with a sticky
> customization footer (Month/Quarter/Year granularity + a multi-period select
> that drives one statement column per selected period), line drill-down, a KPI
> strip, and client-side .xlsx export. Figures are **mock GL data** — a real
> ledger/chart of accounts remains out of scope (§B.13, §A.4); production reports
> stay read-models.

## J.9 Brand & vehicle imagery (drop-in assets)

No copyrighted logos or photos are bundled; the UI ships generated placeholders
and picks up real assets when dropped in (served from the site root):
- `public/abs-autobody-logo.png` — company logo (`BrandLogo`; white-vector emblem fallback).
- `public/car-logos/<make>.png` — per-make logo (`CarBrandMark`; monogram → car-icon fallback).
- `public/car-photos/<vehicleId>.jpg` — real vehicle photo for the board card + carousel
  (falls back to the order's `photos[]`, then a placeholder). These map to a future
  `vehicle_photos` / `media` table; the drop-in file itself is a read-only preview.

---

# PART I — SOURCES & CONFIDENCE

Feature research grounded primarily in Shopmonkey's public help center (support.shopmonkey.io), pricing page (shopmonkey.io/pricing, verified 2026-07-02), product pages, and developer docs (shopmonkey.dev, github.com/shopmonkeyus), cross-checked against Tekmetric, Mitchell 1 (Manager SE / ProDemand), Shop-Ware, and AutoLeap, plus review directories (Capterra, G2, Software Advice).

**Video sources (Part J):**
- "Shopmonkey Overview - Shop Management Software" (youtube.com/watch?v=AOwTejOhzNs, published 2025-05-05) — chapters confirm the feature flow: Workflow → Creating Estimates → Customer Communication → Calendar & Appointments → Digital Vehicle Inspections → Invoicing & Collecting Payment.
- "Customer Messaging Made Easy for Auto Repair Shops" (youtube.com/watch?v=UGVuWmDi-Ec, published 2025-07-11) — full transcript captured; confirms two-way texting + email, one-click sends of estimates/invoices/pictures/status, automated appointment reminders, instant shop notifications on customer authorize/cancel/reply/pay, and always-available message history (all reflected in §J.4).
- **Limitation:** video *narration and chapters* were captured, but individual UI frames/pixels were not extracted (I can't watch video playback). Part J documents screen structure and interaction patterns for an original design, not a visual clone.

**Items to verify before building (⚠️):**
1. Parts integrations beyond PartsTech/Nexpart/WorldPac/RepairLink (Epicor/FleetNet unconfirmed).
2. BNPL partners — Sunbit + Affirm confirmed; Wisetack unconfirmed.
3. Inventory bin/shelf location field (we include it regardless).
4. Core-return exact fields (inferred from returns model).
5. Public API auth method + rate limits (confirm at shopmonkey.dev/quickstart).
6. Whether SM's "customer portal" is a persistent account or per-order links (we spec per-order links; decide if we want true accounts).
7. HQ per-location report filtering completeness.
8. Media file-size limits are SM's; set our own.

**Not verifiable without a signed-in account:** exact screen layouts, keyboard flows, hidden settings, and admin-only screens. If you provide a live login (connect your browser), we can walk the signed-in UI and tighten Part E and the API surface.
