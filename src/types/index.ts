// ---------------------------------------------------------------------------
// AutoSuite domain types — mirrors the backend contract exactly (camelCase).
// See developer.md Part B for the full domain model this is derived from.
// ---------------------------------------------------------------------------

// ---- API envelope -----------------------------------------------------

export interface ApiErrorShape {
  code: string
  message: string
  details?: unknown
}

export interface ApiSuccessEnvelope<T> {
  data: T
  meta?: PaginationMeta | Record<string, unknown>
}

export interface ApiErrorEnvelope {
  error: ApiErrorShape
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

// ---- Identity -----------------------------------------------------------

export type UserType = 'owner' | 'staff' | 'technician' | 'admin'

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  userType?: UserType
}

export interface AuthMeResponse {
  user: AuthUser
  companyId: string
  locationId: string
  locationIds: string[]
  allLocations: Location[]
  role: string
  permissions: string[]
}

export interface Location {
  id: string
  name: string
  address?: string
  timezone?: string
  active?: boolean
}

// ---- Customers & vehicles ------------------------------------------------

export type CustomerType = 'individual' | 'business'
export type ContactType = 'phone' | 'email'
export type PreferredContactMethod = 'sms' | 'email' | 'phone'

export interface Contact {
  label: string
  type: ContactType
  value: string
}

/** Selectable gender values (individual customers). */
export type Gender = 'male' | 'female'

/** Age bracket. Auto-selected from `dob` when present; independently editable
 * otherwise (used when the shop is estimating and DOB is unknown). */
export type AgeRange = '<18' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'

/** How the customer first heard about the shop. */
export type ReferralSource =
  | 'google'
  | 'referral'
  | 'social_media'
  | 'repeat_customer'
  | 'walk_in'
  | 'other'

export interface Customer {
  id: string
  locationId?: string
  type: CustomerType
  firstName?: string
  lastName?: string
  companyName?: string
  contacts: Contact[]
  preferredContactMethod: PreferredContactMethod
  taxExempt: boolean
  tags: string[]
  createdAt?: string
  updatedAt?: string
  // ---- demographics / intake (individual customers) ----
  gender?: Gender
  /** Full ISO date ('YYYY-MM-DD') OR year-only ('YYYY') to support imprecise DOB. */
  dob?: string
  /** Manually chosen age bracket. DERIVED from `dob` when a DOB is present. */
  ageRange?: AgeRange
  ethnicity?: string
  /** @deprecated Legacy single language. Kept readable for back-compat; new
   * writes populate `primaryLanguages` (and mirror the first into this field). */
  primaryLanguage?: string
  /** Languages the customer speaks (multi-select). Seeded from the legacy
   * singular `primaryLanguage` for existing rows that predate this field. */
  primaryLanguages?: string[]
  speaksEnglish?: boolean
  driverLicenseNumber?: string
  driverLicenseState?: string
  driverLicenseExp?: string
  /** City / state the customer is from. */
  city?: string
  state?: string
  referralSource?: ReferralSource
}

export interface Vehicle {
  id: string
  ownerCustomerId: string
  vin?: string
  licensePlate?: string
  plateState?: string
  year?: number
  make?: string
  model?: string
  submodel?: string
  engine?: string
  color?: string
  mileageIn?: number
  mileageOut?: number
}

// ---- Orders ----------------------------------------------------------

export type OrderStatus = 'estimate' | 'repair_order' | 'invoice'
export type AuthorizationStatus = 'pending' | 'authorized' | 'declined'
export type LineItemType =
  | 'labor'
  | 'part'
  | 'tire'
  | 'subcontract'
  | 'fee'
  | 'discount'
  | 'shop_supplies'
  | 'epa_fee'

export interface OrderTotals {
  subtotal: number
  discountTotal: number
  feeTotal: number
  taxableSubtotal: number
  taxTotal: number
  total: number
  costTotal: number
  grossProfit: number
  grossMarginPct: number
}

export interface ServiceFlags {
  recommended: boolean
  lumpSum: boolean
  hideLineItemPricing: boolean
  hideFromCustomer: boolean
}

export interface LineItem {
  id: string
  serviceId: string
  orderId: string
  type: LineItemType
  name: string
  notes?: string
  quantity?: number
  hours?: number
  unitCost?: number
  unitRetail?: number
  taxable: boolean
  assignedTechnicianId?: string
  position: number
}

export interface Service {
  id: string
  orderId: string
  title: string
  customerNotes?: string
  categoryIds: string[]
  flags: ServiceFlags
  authorizationStatus: AuthorizationStatus
  deferred: boolean
  position: number
  lineItems?: LineItem[]
}

/** A colored chip shown on a workflow card (e.g. "VIP", "Paid", "Brakes").
 * Client/display concept for now; future schema: an `order_labels` join to a
 * per-location `labels` catalog ({ id, text, color }). */
export type OrderLabelColor = 'purple' | 'red' | 'green' | 'blue' | 'orange' | 'gray'

export interface OrderLabel {
  id: string
  text: string
  color: OrderLabelColor
}

/** A vehicle photo shown on the board card (first = thumbnail) and in the
 * order-detail carousel. Display/demo data today; maps cleanly to a future
 * `vehicle_photos` / `media` table ({ id, vehicleId, url/storageKey, sortOrder }).
 * The lowest `sortOrder` is the main thumbnail. */
export interface VehiclePhoto {
  id: string
  url: string
  sortOrder: number
}

export interface Order {
  id: string
  number: number
  status: OrderStatus
  workflowStatusId: string
  customerId: string
  vehicleId: string
  serviceWriterId?: string
  promisedAt?: string
  dueAt?: string
  totals: OrderTotals
  paidTotal: number
  balanceDue: number
  invoicedAt?: string
  fullyPaidAt?: string
  lastActivityAt?: string
  services?: Service[]
  // client-only convenience fields the board may hydrate for display
  customer?: Customer
  vehicle?: Vehicle
  /** Short human title shown on the board card, e.g. "Water Pump R&R and 3 More". */
  title?: string
  /** Relative effort/complexity of the job. Drives the board card effort icon and
   * the Jira-style "Effort" field in the order-detail Details panel. */
  effort?: 'low' | 'medium' | 'high'
  /** Job priority. Drives the Details "Priority" dropdown. */
  priority?: 'low' | 'medium' | 'high'
  /** Scheduled start date (ISO 'YYYY-MM-DD'). Editable in the order-detail modal. */
  startDate?: string
  /** Free-text job description (Jira-style). Editable in the order-detail modal. */
  description?: string
  /** Colored label chips shown on the card. */
  labels?: OrderLabel[]
  /** Vehicle photos (display/demo). Lowest sortOrder is the card thumbnail.
   * Future home: a `vehicle_photos` table keyed by `vehicleId`. */
  photos?: VehiclePhoto[]
  /** Denormalized display name of the lead technician (derived from line-item
   * `assignedTechnicianId` → user on the backend). */
  technicianName?: string
  unreadMessageCount?: number
  waitingOnParts?: boolean
  hasDeposit?: boolean
  /** Team members (mechanics/technicians) assigned to work this car. Ids point
   * at `MOCK_USERS` / `User`. Drives the board mechanic avatars + filter and the
   * order-detail "Mechanics" section. Future home: an order↔technician
   * assignment join (`order_assignments`). */
  mechanicIds?: string[]
}

export interface Authorization {
  id: string
  orderId: string
  serviceIds: string[]
  method: 'online' | 'phone' | 'sms' | 'email' | 'in_person'
  approvedServiceIds: string[]
  declinedServiceIds: string[]
  eSignature?: { image: string; signedAt: string; signerName: string }
  authorizedBy?: string
  authorizedAt?: string
}

// ---- Workflow ----------------------------------------------------------

export type WorkflowRule =
  | 'none'
  | 'convert_to_repair_order'
  | 'convert_to_invoice'
  | 'archive_paid'
  | 'archive_when_inactive'

export interface WorkflowStatus {
  id: string
  name: string
  position: number
  rule: WorkflowRule
  ruleConfig?: { inactiveDays?: number } & Record<string, unknown>
  color?: string
  hidden?: boolean
  /** Soft-delete timestamp. Archived columns are hidden from the board but not
   * hard-deleted (future `workflow_statuses.archived_at`). */
  archivedAt?: string
}

// ---- Backlog ------------------------------------------------------------

/** A lightweight, pre-board work item (Jira-style backlog row). Kept minimal:
 * a title plus optional customer/vehicle/note. "Move to board" spawns a real
 * `Order` in the first workflow column. Future home: a `backlog_items` table. */
export interface BacklogItem {
  id: string
  title: string
  customerId?: string
  vehicleId?: string
  /** Denormalized display strings for the list (customer/vehicle names). */
  customerName?: string
  vehicleName?: string
  note?: string
  createdAt: string
}

// ---- Activity / audit ----------------------------------------------------

export type OrderActivityKind =
  | 'system_event'
  | 'user_note'
  | 'internal_message'
  | 'customer_message'
  | 'status_change'
  | 'payment'
  | 'authorization'
  | 'inspection'
  | 'assignment'
  | 'appointment'
  | 'part_event'

export type ActivityVisibility = 'internal' | 'customer_visible'

export interface OrderActivity {
  id: string
  orderId: string
  kind: OrderActivityKind
  authorId?: string
  actorType: 'user' | 'system' | 'integration' | 'customer'
  visibility: ActivityVisibility
  body?: string
  mentions: string[]
  refId?: string
  pinned?: boolean
  at: string
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId?: string
  actorType: 'user' | 'system' | 'integration' | 'customer'
  before?: unknown
  after?: unknown
  at: string
}

// ---- Payments ----------------------------------------------------------

export type PaymentMethod =
  | 'cash'
  | 'check'
  | 'card_present'
  | 'card_online'
  | 'ach'
  | 'bnpl'
  | 'other'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded'

export interface Payment {
  id: string
  orderId: string
  method: PaymentMethod
  amount: number
  isDeposit: boolean
  status: PaymentStatus
  referenceNumber?: string
  changeDue?: number
  surcharge?: number
  refundedAmount?: number
  createdAt?: string
}

export interface CollectPaymentResponse {
  payment: Payment
  clientSecret?: string
  paymentUrl?: string
  simulated?: boolean
}

export interface PaymentSettings {
  surchargeEnabled: boolean
  surchargePct: number
  allowOnlinePaymentOnInvoices: boolean
  payoutSchedule: 'daily' | 'weekly' | 'monthly'
  connectStatus?: 'not_started' | 'pending' | 'active'
  readerId?: string
}

// ---- Messaging ----------------------------------------------------------

export type MessageChannel = 'sms' | 'email'
export type MessageDirection = 'inbound' | 'outbound'

export interface Message {
  id: string
  customerId: string
  orderId?: string
  channel: MessageChannel
  direction: MessageDirection
  subject?: string
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  sentByUserId?: string
  createdAt: string
}

export interface Conversation {
  customerId: string
  customerName: string
  lastMessage: string
  unreadCount: number
  /** ISO timestamp of the most recent message (for the chat list). */
  lastMessageAt?: string
  /** Channel of the most recent message. */
  lastChannel?: MessageChannel
}

export interface MessageTemplate {
  id: string
  name: string
  channel: MessageChannel
  subject?: string
  body: string
}

// ---- Notifications ------------------------------------------------------

/** Category of a bell-menu notification; drives the row icon + tint. */
export type NotificationType =
  | 'message'
  | 'appointment'
  | 'payment'
  | 'part'
  | 'dvi'
  | 'mention'
  | 'inventory'

/** A single notification shown in the top-bar bell dropdown. Named
 * `AppNotification` to avoid clashing with the DOM `Notification` global. */
export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  /** ISO timestamp of when the notification fired. */
  at: string
  read: boolean
}

// ---- Catalog / inventory (lighter areas) ---------------------------------

export interface LaborRate {
  id: string
  name: string
  hourlyRate: number
  isDefault: boolean
}

export interface LaborMatrix {
  id: string
  name: string
  isDefault: boolean
  affects: 'hours' | 'rate'
  bands: { minHours: number; maxHours: number; multiplier: number }[]
}

export interface PricingMatrix {
  id: string
  name: string
  isDefault: boolean
  bands: { minCost: number; maxCost: number; markupPct?: number; marginPct?: number }[]
}

export interface CannedService {
  id: string
  title: string
  customerNotes?: string
  recommended: boolean
  lumpSum: boolean
  lineItems: Partial<LineItem>[]
}

export interface Part {
  id: string
  name: string
  sku?: string
  mpn?: string
  manufacturer?: string
  vendorId?: string
  cost: number
  retail: number
  qtyOnHand: number
  minQty?: number
  taxable: boolean
  trackInventory: boolean
}

export interface Vendor {
  id: string
  name: string
  contact?: string
  accountNumber?: string
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'fulfilled' | 'canceled'

export interface PurchaseOrder {
  id: string
  number: number
  vendorId: string
  status: PurchaseOrderStatus
  lines: {
    id: string
    partId?: string
    partNumber?: string
    cost: number
    qtyOrdered: number
    qtyReceived: number
  }[]
}

export type ReturnStatus = 'not_ready' | 'ready_to_return' | 'returned' | 'refunded' | 'not_refundable'

export interface ReturnItem {
  id: string
  partId?: string
  isCore?: boolean
  quantity: number
  amount: number
  status: ReturnStatus
  reason: 'defective' | 'not_needed' | 'warranty' | 'wrong_part' | 'other'
}

// ---- Reports ----------------------------------------------------------

export interface ReportKpis {
  totalOrders: number
  invoicedOrders: number
  revenue: number
  grossProfit: number
  grossMarginPct: number
  aro: number
  closeRate: number
  collected: number
  outstanding: number
}

export interface ReportResponse {
  reportKey: string
  kpis: ReportKpis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report row shapes vary per reportKey
  rows: any[]
}

// ---- Financial statements (mock accounting read-model) -------------------

/** A single transaction/breakdown row shown when a statement line is expanded. */
export interface FinancialDetailRow {
  label: string
  current: number
  prior: number
  /** One amount per selected reporting period (aligned to `FinancialStatement.columns`). */
  values?: number[]
}

export type FinancialLineKind = 'header' | 'line' | 'subtotal' | 'total'

export interface FinancialLine {
  id: string
  label: string
  /** Amounts for the two reported periods. `undefined` for pure header rows. */
  current?: number
  prior?: number
  kind: FinancialLineKind
  /** Indentation level for nested sections (0 = top). */
  indent?: number
  /** Underlying breakdown revealed on drill-down. */
  detail?: FinancialDetailRow[]
  /** One amount per selected reporting period (aligned to `FinancialStatement.columns`).
   * `undefined` for header / section rows with no figure. */
  values?: number[]
}

export interface FinancialStatement {
  key: 'income_statement' | 'balance_sheet'
  title: string
  currentPeriodLabel: string
  priorPeriodLabel: string
  /** Column headers, one per selected period (drives the multi-period view). */
  columns?: string[]
  lines: FinancialLine[]
}

export interface FinancialStatementsResponse {
  currency: string
  incomeStatement: FinancialStatement
  balanceSheet: FinancialStatement
}
