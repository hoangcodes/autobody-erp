// ---------------------------------------------------------------------------
// In-memory mock API. Implements the SAME method surface as src/lib/api.ts
// (get / list / post / patch / del) so it is a drop-in for `api` when
// VITE_USE_MOCKS is on. Mutations update the in-memory store so the UI feels
// live (move card, add note, collect payment, create customer, send message…).
// ---------------------------------------------------------------------------

import type { ListResult } from '@/lib/api'
import type {
  AppNotification,
  Authorization,
  BacklogItem,
  Conversation,
  Customer,
  FinancialLine,
  FinancialStatement,
  FinancialStatementsResponse,
  LineItem,
  Message,
  Order,
  OrderActivity,
  OrderTotals,
  Payment,
  ReportResponse,
  Service,
  Vehicle,
  WorkflowStatus,
} from '@/types'
import {
  MOCK_ACTIVITY,
  MOCK_AUDIT,
  MOCK_BACKLOG_ITEMS,
  MOCK_CUSTOMERS,
  MOCK_FINANCIALS,
  MOCK_ME,
  MOCK_MESSAGES,
  MOCK_NOTIFICATIONS,
  MOCK_ORDERS,
  MOCK_PARTS,
  MOCK_PAYMENT_SETTINGS,
  MOCK_PAYMENTS,
  MOCK_PURCHASE_ORDERS,
  MOCK_TEMPLATES,
  MOCK_USERS,
  MOCK_VEHICLES,
  MOCK_VENDORS,
  MOCK_WORKFLOW_STATUSES,
  deriveConversations,
} from '@/mocks/seed'
import { summarizeBoardGl, type BoardGlSummary } from '@/features/orders/glImpact'

const TAX_RATE = 0.0825

// ---- store ------------------------------------------------------------------

interface Store {
  me: typeof MOCK_ME
  users: typeof MOCK_USERS
  workflowStatuses: WorkflowStatus[]
  customers: Customer[]
  vehicles: Vehicle[]
  orders: Order[]
  payments: Payment[]
  activity: OrderActivity[]
  messages: Message[]
  notifications: AppNotification[]
  templates: typeof MOCK_TEMPLATES
  audit: typeof MOCK_AUDIT
  parts: typeof MOCK_PARTS
  vendors: typeof MOCK_VENDORS
  purchaseOrders: typeof MOCK_PURCHASE_ORDERS
  paymentSettings: typeof MOCK_PAYMENT_SETTINGS
  backlogItems: BacklogItem[]
  financials: FinancialStatementsResponse
  seq: number
}

// deep-ish clone so the module-level seed arrays are never mutated
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

const store: Store = {
  me: clone(MOCK_ME),
  users: clone(MOCK_USERS),
  workflowStatuses: clone(MOCK_WORKFLOW_STATUSES),
  customers: clone(MOCK_CUSTOMERS),
  vehicles: clone(MOCK_VEHICLES),
  orders: clone(MOCK_ORDERS),
  payments: clone(MOCK_PAYMENTS),
  activity: clone(MOCK_ACTIVITY),
  messages: clone(MOCK_MESSAGES),
  notifications: clone(MOCK_NOTIFICATIONS),
  templates: clone(MOCK_TEMPLATES),
  audit: clone(MOCK_AUDIT),
  parts: clone(MOCK_PARTS),
  vendors: clone(MOCK_VENDORS),
  purchaseOrders: clone(MOCK_PURCHASE_ORDERS),
  paymentSettings: clone(MOCK_PAYMENT_SETTINGS),
  backlogItems: clone(MOCK_BACKLOG_ITEMS),
  financials: clone(MOCK_FINANCIALS),
  seq: 1000,
}

const nextId = (prefix: string) => `${prefix}_${++store.seq}`
const nowIso = () => new Date().toISOString()

// ---- totals engine ----------------------------------------------------------

function computeTotals(order: Order): OrderTotals {
  let subtotal = 0
  let discountTotal = 0
  let feeTotal = 0
  let taxableSubtotal = 0
  let costTotal = 0

  for (const svc of order.services ?? []) {
    for (const it of svc.lineItems ?? []) {
      const qty = it.quantity ?? 1
      const unitsForCost = it.type === 'labor' ? (it.hours ?? 0) * qty : qty
      const retail = it.type === 'labor' ? (it.hours ?? 0) * qty * (it.unitRetail ?? 0) : qty * (it.unitRetail ?? 0)
      costTotal += unitsForCost * (it.unitCost ?? 0)
      if (it.type === 'discount') {
        discountTotal += retail
      } else if (it.type === 'fee' || it.type === 'shop_supplies' || it.type === 'epa_fee') {
        feeTotal += retail
        if (it.taxable) taxableSubtotal += retail
      } else {
        subtotal += retail
        if (it.taxable) taxableSubtotal += retail
      }
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100
  const taxTotal = round(Math.max(0, taxableSubtotal - discountTotal) * TAX_RATE)
  const netRevenue = subtotal - discountTotal + feeTotal
  const total = round(netRevenue + taxTotal)
  const grossProfit = round(netRevenue - costTotal)
  const grossMarginPct = netRevenue > 0 ? round((grossProfit / netRevenue) * 100) : 0

  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    feeTotal: round(feeTotal),
    taxableSubtotal: round(taxableSubtotal),
    taxTotal,
    total,
    costTotal: round(costTotal),
    grossProfit,
    grossMarginPct,
  }
}

/** Recompute an order's derived money fields in place from its services + payments. */
function recomputeOrder(order: Order): Order {
  order.totals = computeTotals(order)
  const paid = store.payments
    .filter((p) => p.orderId === order.id && p.status === 'succeeded')
    .reduce((s, p) => s + p.amount - (p.refundedAmount ?? 0), 0)
  order.paidTotal = Math.round(paid * 100) / 100
  order.balanceDue = Math.max(0, Math.round((order.totals.total - order.paidTotal) * 100) / 100)
  if (order.balanceDue <= 0.005 && order.paidTotal > 0 && !order.fullyPaidAt) order.fullyPaidAt = nowIso()
  return order
}

// recompute all seeded orders once at boot
store.orders.forEach(recomputeOrder)

// Seed per-column board ordering (`boardPosition`) from the initial array order
// so the kanban board has a stable, persisted card order to sort by. Positions
// are only meaningful WITHIN a column, so we number each column independently.
function renumberColumn(workflowStatusId: string) {
  store.orders
    .filter((o) => o.workflowStatusId === workflowStatusId)
    .sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0))
    .forEach((o, i) => {
      o.boardPosition = i
    })
}
{
  const seen = new Set<string>()
  for (const o of store.orders) {
    if (seen.has(o.workflowStatusId)) continue
    seen.add(o.workflowStatusId)
    renumberColumn(o.workflowStatusId)
  }
}

const getOrder = (id: string) => store.orders.find((o) => o.id === id)
const touch = (order: Order | undefined) => {
  if (order) {
    order.lastActivityAt = nowIso()
    order.updatedAt = nowIso()
  }
}
function addActivity(entry: Partial<OrderActivity> & Pick<OrderActivity, 'orderId' | 'kind' | 'actorType'>) {
  store.activity.unshift({
    id: nextId('act'),
    visibility: 'internal',
    mentions: [],
    at: nowIso(),
    ...entry,
  } as OrderActivity)
}

// Primitive order fields whose edits are worth recording as NetSuite-style
// field-change rows (System notes tab). Arrays/objects (labels, mechanicIds,
// services, totals, attachments…) are intentionally skipped to keep the log
// readable.
const AUDITED_ORDER_FIELDS = new Set([
  'title',
  'description',
  'priority',
  'effort',
  'startDate',
  'dueAt',
  'promisedAt',
  'status',
  'workflowStatusId',
  'customerId',
  'vehicleId',
])

/** Diff an incoming PATCH body against the current order and, for any changed
 * primitive field, append an `update` audit entry (per-field before/after +
 * actor). Powers the System notes tab. */
function recordOrderFieldChanges(order: Order, body: Record<string, unknown>) {
  const isPrimitive = (v: unknown) => v == null || typeof v !== 'object'
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const [key, next] of Object.entries(body)) {
    if (!AUDITED_ORDER_FIELDS.has(key)) continue
    const prev = (order as unknown as Record<string, unknown>)[key]
    if (!isPrimitive(prev) || !isPrimitive(next)) continue
    if ((prev ?? '') === (next ?? '')) continue
    before[key] = prev ?? ''
    after[key] = next ?? ''
  }
  if (Object.keys(after).length === 0) return
  store.audit.unshift({
    id: nextId('au'),
    entityType: 'order',
    entityId: order.id,
    action: 'update',
    actorId: store.me.user.id,
    actorType: 'user',
    before,
    after,
    at: nowIso(),
  })
}

// ---- tiny router ------------------------------------------------------------

type Query = Record<string, string | number | boolean | undefined | null>
type Ctx = { params: Record<string, string>; query: Query; body: unknown }
type Handler = (ctx: Ctx) => unknown

interface RouteDef {
  method: string
  keys: string[]
  re: RegExp
  h: Handler
}

const routes: RouteDef[] = []

function route(method: string, pattern: string, h: Handler) {
  const keys: string[] = []
  const re = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1))
        return '([^/]+)'
      }) +
      '$',
  )
  routes.push({ method, re, keys, h })
}

function dispatch(method: string, rawPath: string, query: Query, body: unknown): unknown {
  const path = rawPath.split('?')[0]!.replace(/\/+$/, '') || '/'
  for (const r of routes) {
    if (r.method !== method) continue
    const m = r.re.exec(path)
    if (!m) continue
    const params: Record<string, string> = {}
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)))
    return r.h({ params, query, body })
  }
  throw new MockError(404, 'not_found', `No mock handler for ${method} ${path}`)
}

class MockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const str = (q: Query, k: string) => (q[k] == null ? undefined : String(q[k]))

// ---- routes: identity -------------------------------------------------------

route('GET', '/auth/me', () => store.me)

// ---- routes: users (mechanic / team roster) --------------------------------

route('GET', '/users', () => [...store.users])

// ---- routes: workflow statuses ---------------------------------------------

route('GET', '/workflow-statuses', () => [...store.workflowStatuses].sort((a, b) => a.position - b.position))
route('POST', '/workflow-statuses', ({ body }) => {
  const ws = { id: nextId('ws'), position: store.workflowStatuses.length + 1, rule: 'none', ...(body as object) } as WorkflowStatus
  store.workflowStatuses.push(ws)
  return ws
})
route('PATCH', '/workflow-statuses/:id', ({ params, body }) => {
  const ws = store.workflowStatuses.find((s) => s.id === params.id!)
  if (!ws) throw new MockError(404, 'not_found', 'workflow status')
  Object.assign(ws, body)
  return ws
})
route('DELETE', '/workflow-statuses/:id', ({ params }) => {
  store.workflowStatuses = store.workflowStatuses.filter((s) => s.id !== params.id!)
  return { id: params.id! }
})
// Soft-archive: hide the column from the board without hard-deleting it.
route('POST', '/workflow-statuses/:id/archive', ({ params }) => {
  const ws = store.workflowStatuses.find((s) => s.id === params.id!)
  if (!ws) throw new MockError(404, 'not_found', 'workflow status')
  ws.archivedAt = nowIso()
  return ws
})

// ---- routes: backlog --------------------------------------------------------

route('GET', '/backlog-items', () =>
  [...store.backlogItems].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
)
route('POST', '/backlog-items', ({ body }) => {
  const b = (body ?? {}) as Partial<BacklogItem>
  const item: BacklogItem = {
    id: nextId('bk'),
    title: b.title?.trim() || 'Untitled item',
    customerId: b.customerId,
    vehicleId: b.vehicleId,
    customerName: b.customerName,
    vehicleName: b.vehicleName,
    note: b.note,
    createdAt: nowIso(),
  }
  store.backlogItems.unshift(item)
  return item
})
route('DELETE', '/backlog-items/:id', ({ params }) => {
  store.backlogItems = store.backlogItems.filter((i) => i.id !== params.id!)
  return { id: params.id! }
})
// Promote a backlog item into a real Order in the first (leftmost, non-archived)
// workflow column, then remove it from the backlog.
route('POST', '/backlog-items/:id/move-to-board', ({ params }) => {
  const item = store.backlogItems.find((i) => i.id === params.id!)
  if (!item) throw new MockError(404, 'not_found', 'backlog item')
  const firstColumn = [...store.workflowStatuses]
    .filter((s) => !s.archivedAt && !s.hidden)
    .sort((a, b) => a.position - b.position)[0]
  const customerId = item.customerId ?? store.customers[0]?.id ?? ''
  const vehicle = item.vehicleId
    ? store.vehicles.find((v) => v.id === item.vehicleId)
    : store.vehicles.find((v) => v.ownerCustomerId === customerId)
  const number = Math.max(0, ...store.orders.map((o) => o.number)) + 1
  const o: Order = {
    id: nextId('o'),
    number,
    status: 'estimate',
    workflowStatusId: firstColumn?.id ?? 'ws_dropped',
    customerId,
    vehicleId: vehicle?.id ?? store.vehicles[0]?.id ?? '',
    serviceWriterId: 'u_admin',
    totals: computeTotals({ services: [] } as unknown as Order),
    paidTotal: 0,
    balanceDue: 0,
    lastActivityAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    services: [],
    labels: [],
    mechanicIds: [],
    title: item.title,
  }
  o.boardPosition = -1
  store.orders.unshift(recomputeOrder(o))
  renumberColumn(o.workflowStatusId)
  store.backlogItems = store.backlogItems.filter((i) => i.id !== item.id)
  addActivity({ orderId: o.id, kind: 'system_event', actorType: 'system', body: `Estimate #${o.number} created from backlog.` })
  return o
})

// ---- routes: orders ---------------------------------------------------------

route('GET', '/orders', ({ query }) => {
  let items = [...store.orders]
  const status = str(query, 'status')
  const wsId = str(query, 'workflowStatusId')
  const customerId = str(query, 'customerId')
  const search = str(query, 'search')?.toLowerCase()
  if (status) items = items.filter((o) => o.status === status)
  if (wsId) items = items.filter((o) => o.workflowStatusId === wsId)
  if (customerId) items = items.filter((o) => o.customerId === customerId)
  if (search) items = items.filter((o) => String(o.number).includes(search) || (o.title ?? '').toLowerCase().includes(search))
  return items
})
route('GET', '/orders/:id', ({ params }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  return o
})
route('GET', '/orders/:id/totals', ({ params }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  return o.totals
})
route('POST', '/orders', ({ body }) => {
  const b = (body ?? {}) as Partial<Order>
  const number = Math.max(0, ...store.orders.map((o) => o.number)) + 1
  const o: Order = {
    id: nextId('o'),
    number,
    status: 'estimate',
    workflowStatusId: b.workflowStatusId ?? 'ws_dropped',
    customerId: b.customerId!,
    vehicleId: b.vehicleId!,
    serviceWriterId: 'u_admin',
    totals: computeTotals({ services: [] } as unknown as Order),
    paidTotal: 0,
    balanceDue: 0,
    lastActivityAt: nowIso(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    services: [],
    labels: [],
    mechanicIds: [],
    title: b.title ?? 'New job',
    effort: 'low',
    priority: 'medium',
    startDate: nowIso().slice(0, 10),
    description: '',
    boardPosition: -1,
    ...b,
  }
  store.orders.unshift(recomputeOrder(o))
  renumberColumn(o.workflowStatusId)
  addActivity({ orderId: o.id, kind: 'system_event', actorType: 'system', body: `Estimate #${o.number} created.` })
  return o
})
route('PATCH', '/orders/:id', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  recordOrderFieldChanges(o, (body ?? {}) as Record<string, unknown>)
  Object.assign(o, body)
  touch(recomputeOrder(o))
  return o
})
route('DELETE', '/orders/:id', ({ params }) => {
  store.orders = store.orders.filter((o) => o.id !== params.id!)
  return { id: params.id! }
})
route('PATCH', '/orders/:id/workflow', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const from = o.workflowStatusId
  const to = (body as { workflowStatusId: string }).workflowStatusId
  o.workflowStatusId = to
  const target = store.workflowStatuses.find((s) => s.id === to)
  // apply simple column conversion rules
  if (target?.rule === 'convert_to_repair_order' && o.status === 'estimate') o.status = 'repair_order'
  if (target?.rule === 'convert_to_invoice') {
    o.status = 'invoice'
    o.invoicedAt = o.invoicedAt ?? nowIso()
  }
  touch(recomputeOrder(o))
  addActivity({ orderId: o.id, kind: 'status_change', actorType: 'user', authorId: 'u_admin', body: `Moved to ${target?.name ?? to}.` })
  store.audit.unshift({ id: nextId('au'), entityType: 'order', entityId: o.id, action: 'status_change', actorId: 'u_admin', actorType: 'user', before: { workflowStatusId: from }, after: { workflowStatusId: to }, at: nowIso() })
  return o
})
// Positional move (kanban drag-and-drop): set the order's column AND its slot
// within that column (`index`), then persist by renumbering `boardPosition` so
// the card stays where it was dropped — both within a column and across
// columns. Column-conversion rules mirror PATCH /orders/:id/workflow.
route('PATCH', '/orders/:id/move', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const b = (body ?? {}) as { workflowStatusId?: string; index?: number }
  const from = o.workflowStatusId
  const to = b.workflowStatusId ?? from
  const changedColumn = to !== from
  o.workflowStatusId = to

  // Rebuild the target column's order: everyone already there (minus the moved
  // card), sorted by current position, with the moved card spliced in at `index`.
  const members = store.orders
    .filter((x) => x.workflowStatusId === to && x.id !== o.id)
    .sort((a, b2) => (a.boardPosition ?? 0) - (b2.boardPosition ?? 0))
  const index = Math.max(0, Math.min(b.index ?? members.length, members.length))
  members.splice(index, 0, o)
  members.forEach((x, i) => {
    x.boardPosition = i
  })
  // Compact the source column too so its ranks stay contiguous.
  if (changedColumn) renumberColumn(from)

  // Apply the same column-conversion rules as the workflow route.
  const target = store.workflowStatuses.find((s) => s.id === to)
  if (target?.rule === 'convert_to_repair_order' && o.status === 'estimate') o.status = 'repair_order'
  if (target?.rule === 'convert_to_invoice') {
    o.status = 'invoice'
    o.invoicedAt = o.invoicedAt ?? nowIso()
  }
  touch(recomputeOrder(o))
  if (changedColumn) {
    addActivity({ orderId: o.id, kind: 'status_change', actorType: 'user', authorId: 'u_admin', body: `Moved to ${target?.name ?? to}.` })
    store.audit.unshift({ id: nextId('au'), entityType: 'order', entityId: o.id, action: 'status_change', actorId: 'u_admin', actorType: 'user', before: { workflowStatusId: from }, after: { workflowStatusId: to }, at: nowIso() })
  }
  return o
})
route('POST', '/orders/:id/convert', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const to = (body as { to: 'repair_order' | 'invoice' }).to
  o.status = to
  if (to === 'invoice') o.invoicedAt = o.invoicedAt ?? nowIso()
  touch(recomputeOrder(o))
  addActivity({ orderId: o.id, kind: 'status_change', actorType: 'user', authorId: 'u_admin', body: `Converted to ${to.replace('_', ' ')}.` })
  return o
})

// ---- routes: services + line items -----------------------------------------

route('POST', '/orders/:id/services', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const svc: Service = {
    id: nextId('svc'),
    orderId: o.id,
    title: 'New service',
    categoryIds: [],
    flags: { recommended: false, lumpSum: false, hideLineItemPricing: false, hideFromCustomer: false },
    authorizationStatus: 'pending',
    deferred: false,
    position: (o.services?.length ?? 0),
    lineItems: [],
    ...(body as Partial<Service>),
  }
  o.services = [...(o.services ?? []), svc]
  touch(recomputeOrder(o))
  return svc
})
route('PATCH', '/orders/:id/services/:sid', ({ params, body }) => {
  const o = getOrder(params.id!)
  const svc = o?.services?.find((s) => s.id === params.sid!)
  if (!o || !svc) throw new MockError(404, 'not_found', 'service')
  Object.assign(svc, body)
  touch(recomputeOrder(o))
  return svc
})
route('DELETE', '/orders/:id/services/:sid', ({ params }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  o.services = (o.services ?? []).filter((s) => s.id !== params.sid!)
  touch(recomputeOrder(o))
  return { id: params.sid! }
})
route('POST', '/orders/:id/services/:sid/line-items', ({ params, body }) => {
  const o = getOrder(params.id!)
  const svc = o?.services?.find((s) => s.id === params.sid!)
  if (!o || !svc) throw new MockError(404, 'not_found', 'service')
  const item: LineItem = {
    id: nextId('li'),
    serviceId: svc.id,
    orderId: o.id,
    type: 'labor',
    name: 'New line item',
    quantity: 1,
    taxable: true,
    position: svc.lineItems?.length ?? 0,
    ...(body as Partial<LineItem>),
  }
  svc.lineItems = [...(svc.lineItems ?? []), item]
  touch(recomputeOrder(o))
  return item
})
route('PATCH', '/orders/:id/line-items/:iid', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  for (const svc of o.services ?? []) {
    const it = svc.lineItems?.find((l) => l.id === params.iid!)
    if (it) {
      Object.assign(it, body)
      touch(recomputeOrder(o))
      return it
    }
  }
  throw new MockError(404, 'not_found', 'line item')
})
route('DELETE', '/orders/:id/line-items/:iid', ({ params }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  for (const svc of o.services ?? []) {
    svc.lineItems = (svc.lineItems ?? []).filter((l) => l.id !== params.iid!)
  }
  touch(recomputeOrder(o))
  return { id: params.iid! }
})

// ---- routes: authorizations -------------------------------------------------

route('GET', '/orders/:id/authorizations', ({ params }) => {
  const o = getOrder(params.id!)
  const list = o?.services?.some((s) => s.authorizationStatus === 'authorized')
    ? [{ id: `auth_${params.id!}`, orderId: params.id!, serviceIds: (o?.services ?? []).map((s) => s.id), method: 'online', approvedServiceIds: (o?.services ?? []).filter((s) => s.authorizationStatus === 'authorized').map((s) => s.id), declinedServiceIds: [], authorizedAt: hoursAgoIso(24) } as Authorization]
    : []
  return list
})
route('POST', '/orders/:id/authorizations', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const auth: Authorization = { id: nextId('auth'), orderId: o.id, serviceIds: [], method: 'in_person', approvedServiceIds: [], declinedServiceIds: [], authorizedAt: nowIso(), ...(body as Partial<Authorization>) }
  for (const sid of auth.approvedServiceIds) {
    const s = o.services?.find((x) => x.id === sid)
    if (s) s.authorizationStatus = 'authorized'
  }
  touch(recomputeOrder(o))
  addActivity({ orderId: o.id, kind: 'authorization', actorType: 'user', authorId: 'u_admin', body: 'Authorization recorded.' })
  return auth
})

// ---- routes: activity -------------------------------------------------------

route('GET', '/orders/:id/activity', ({ params }) =>
  store.activity.filter((a) => a.orderId === params.id!).sort((a, b) => +new Date(b.at) - +new Date(a.at)),
)
route('POST', '/orders/:id/activity/notes', ({ params, body }) => {
  const b = (body ?? {}) as { body: string; visibility?: 'internal' | 'customer_visible'; mentions?: string[]; pinned?: boolean }
  const entry: OrderActivity = {
    id: nextId('act'),
    orderId: params.id!,
    kind: 'user_note',
    authorId: 'u_admin',
    actorType: 'user',
    visibility: b.visibility ?? 'internal',
    body: b.body,
    mentions: b.mentions ?? [],
    pinned: b.pinned,
    at: nowIso(),
  }
  store.activity.unshift(entry)
  touch(getOrder(params.id!))
  return entry
})

// ---- routes: customers ------------------------------------------------------

route('GET', '/customers', ({ query }) => {
  const search = str(query, 'search')?.toLowerCase()
  let items = [...store.customers]
  if (search) {
    items = items.filter((c) => {
      const name = [c.firstName, c.lastName, c.companyName].filter(Boolean).join(' ').toLowerCase()
      const contact = c.contacts.map((x) => x.value).join(' ').toLowerCase()
      return name.includes(search) || contact.includes(search)
    })
  }
  return items
})
route('GET', '/customers/:id', ({ params }) => {
  const c = store.customers.find((x) => x.id === params.id!)
  if (!c) throw new MockError(404, 'not_found', 'customer')
  return c
})
route('GET', '/customers/:id/history', ({ params }) => store.orders.filter((o) => o.customerId === params.id!))
route('GET', '/customers/:id/deferred', ({ params }) => {
  const rows: unknown[] = []
  for (const o of store.orders.filter((o) => o.customerId === params.id!)) {
    for (const s of o.services ?? []) {
      if (s.deferred || s.authorizationStatus === 'declined') rows.push({ id: s.id, orderId: o.id, title: s.title, at: o.lastActivityAt })
    }
  }
  return rows
})
route('POST', '/customers', ({ body }) => {
  const c: Customer = {
    id: nextId('c'),
    type: 'individual',
    contacts: [],
    preferredContactMethod: 'sms',
    taxExempt: false,
    tags: [],
    createdAt: nowIso(),
    ...(body as Partial<Customer>),
  }
  store.customers.unshift(c)
  return c
})
route('PATCH', '/customers/:id', ({ params, body }) => {
  const c = store.customers.find((x) => x.id === params.id!)
  if (!c) throw new MockError(404, 'not_found', 'customer')
  Object.assign(c, body, { updatedAt: nowIso() })
  return c
})

// ---- routes: vehicles -------------------------------------------------------

route('GET', '/vehicles', ({ query }) => {
  const owner = str(query, 'ownerCustomerId')
  return owner ? store.vehicles.filter((v) => v.ownerCustomerId === owner) : [...store.vehicles]
})
route('POST', '/vehicles', ({ body }) => {
  const v: Vehicle = { id: nextId('v'), ownerCustomerId: '', ...(body as Partial<Vehicle>) } as Vehicle
  store.vehicles.unshift(v)
  return v
})
route('PATCH', '/vehicles/:id', ({ params, body }) => {
  const v = store.vehicles.find((x) => x.id === params.id!)
  if (!v) throw new MockError(404, 'not_found', 'vehicle')
  Object.assign(v, body)
  return v
})
route('POST', '/vehicles/decode', ({ body }) => {
  const b = (body ?? {}) as { vin?: string; plate?: string; ymm?: { year: number; make: string; model: string } }
  return { year: b.ymm?.year ?? 2018, make: b.ymm?.make ?? 'Honda', model: b.ymm?.model ?? 'Accord', vin: b.vin, licensePlate: b.plate }
})

// ---- routes: messaging ------------------------------------------------------

route('GET', '/messages', () => deriveConversations(store.messages, store.customers) as unknown as Conversation[])
route('GET', '/messages/thread', ({ query }) => {
  const customerId = str(query, 'customerId')
  const orderId = str(query, 'orderId')
  return store.messages
    .filter((m) => (!customerId || m.customerId === customerId) && (!orderId || m.orderId === orderId))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
})
route('POST', '/messages', ({ body }) => {
  const b = (body ?? {}) as { customerId: string; orderId?: string; channel: 'sms' | 'email'; body: string; subject?: string }
  const msg: Message = {
    id: nextId('m'),
    customerId: b.customerId,
    orderId: b.orderId,
    channel: b.channel,
    direction: 'outbound',
    subject: b.subject,
    body: b.body,
    status: 'sent',
    sentByUserId: 'u_admin',
    createdAt: nowIso(),
  }
  store.messages.push(msg)
  if (b.orderId) addActivity({ orderId: b.orderId, kind: 'customer_message', actorType: 'user', authorId: 'u_admin', visibility: 'customer_visible', body: b.body })
  return msg
})
route('POST', '/messages/:id/read', ({ params }) => {
  const m = store.messages.find((x) => x.id === params.id!)
  if (m) m.status = 'read'
  return { id: params.id! }
})
route('GET', '/message-templates', () => [...store.templates])

// ---- routes: notifications --------------------------------------------------

route('GET', '/notifications', () =>
  [...store.notifications].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
)

// ---- routes: payments -------------------------------------------------------

route('GET', '/payments', ({ query }) => {
  const orderId = str(query, 'orderId')
  return orderId ? store.payments.filter((p) => p.orderId === orderId) : [...store.payments]
})
route('POST', '/orders/:id/payments', ({ params, body }) => {
  const o = getOrder(params.id!)
  if (!o) throw new MockError(404, 'not_found', 'order')
  const b = (body ?? {}) as { method: Payment['method']; amount: number; isDeposit?: boolean; amountTendered?: number; referenceNumber?: string }
  const payment: Payment = {
    id: nextId('pay'),
    orderId: o.id,
    method: b.method,
    amount: b.amount,
    isDeposit: b.isDeposit ?? false,
    status: 'succeeded',
    referenceNumber: b.referenceNumber,
    changeDue: b.method === 'cash' && b.amountTendered ? Math.max(0, b.amountTendered - b.amount) : undefined,
    createdAt: nowIso(),
  }
  store.payments.push(payment)
  touch(recomputeOrder(o))
  addActivity({ orderId: o.id, kind: 'payment', actorType: 'user', authorId: 'u_admin', body: `${b.isDeposit ? 'Deposit' : 'Payment'} of $${b.amount.toFixed(2)} collected (${b.method}).` })
  return { payment, simulated: true }
})
route('POST', '/orders/:id/payment-link', ({ params, body }) => {
  const amount = (body as { amount?: number })?.amount ?? 0
  return { paymentUrl: `https://pay.autosuite.dev/${params.id!}?amt=${amount}` }
})
route('POST', '/payments/:id/refund', ({ params, body }) => {
  const p = store.payments.find((x) => x.id === params.id!)
  if (!p) throw new MockError(404, 'not_found', 'payment')
  const amount = (body as { amount?: number })?.amount ?? p.amount
  p.refundedAmount = (p.refundedAmount ?? 0) + amount
  p.status = p.refundedAmount >= p.amount ? 'refunded' : 'partially_refunded'
  const o = getOrder(p.orderId)
  if (o) touch(recomputeOrder(o))
  return p
})

// ---- routes: payment settings ----------------------------------------------

route('GET', '/settings/payments', () => store.paymentSettings)
route('PATCH', '/settings/payments', ({ body }) => {
  Object.assign(store.paymentSettings, body)
  return store.paymentSettings
})
route('POST', '/settings/payments/connect', () => {
  store.paymentSettings.connectStatus = 'active'
  return { url: 'https://connect.stripe.com/setup/mock', status: 'active' }
})
route('POST', '/settings/payments/reader', ({ body }) => {
  const readerId = (body as { readerId: string }).readerId
  store.paymentSettings.readerId = readerId
  return { readerId, status: 'paired' }
})

// ---- routes: inventory ------------------------------------------------------

route('GET', '/parts', ({ query }) => {
  const search = str(query, 'search')?.toLowerCase()
  let items = [...store.parts]
  if (search) items = items.filter((p) => [p.name, p.sku, p.mpn, p.manufacturer].filter(Boolean).join(' ').toLowerCase().includes(search))
  return items
})
route('GET', '/vendors', () => [...store.vendors])
route('GET', '/purchase-orders', () => [...store.purchaseOrders])

// ---- routes: audit + reports -----------------------------------------------

route('GET', '/audit-logs', ({ query }) => {
  const entityType = str(query, 'entityType')
  const entityId = str(query, 'entityId')
  let items = [...store.audit].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  if (entityType) items = items.filter((a) => a.entityType === entityType)
  if (entityId) items = items.filter((a) => a.entityId === entityId)
  return items
})
// The base seed (store.financials) is treated as a single-period template whose
// `.current` figure is the base amount. For each SELECTED period we scale every
// line by a deterministic per-period factor, producing one column per period.
// Because the SAME factor is applied to every line in a statement, the Balance
// Sheet identity (Assets = Liabilities + Equity) is preserved: both sides scale
// and round identically.
type Granularity = 'month' | 'quarter' | 'year'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function defaultPeriods(g: Granularity): string[] {
  if (g === 'year') return ['2025', '2026']
  if (g === 'month') return ['Apr 2026', 'May 2026', 'Jun 2026']
  return ['Q1 2026', 'Q2 2026']
}

/** Deterministic scale factor for a period: a ~7%/yr growth trend off the 2026
 * baseline, times intra-year seasonality (quarterly ramp / summer-peak monthly
 * wave). Distinct-but-plausible, and uniform across all lines so totals balance. */
function periodFactor(g: Granularity, period: string): number {
  const year = Number(period.match(/(20\d{2})/)?.[1] ?? '2026')
  const yearTrend = 1 + (year - 2026) * 0.07
  let seasonal = 1
  if (g === 'quarter') {
    const q = Number(period.match(/Q([1-4])/)?.[1] ?? '2')
    seasonal = [0.94, 0.99, 1.03, 1.08][q - 1] ?? 1
  } else if (g === 'month') {
    const mi = MONTH_LABELS.findIndex((m) => period.startsWith(m))
    seasonal = 0.9 + 0.18 * Math.sin(((mi < 0 ? 5 : mi) / 11) * Math.PI)
  }
  return Math.round(yearTrend * seasonal * 1000) / 1000
}

function projectStatement(base: FinancialStatement, g: Granularity, periods: string[]): FinancialStatement {
  const factors = periods.map((p) => periodFactor(g, p))
  return {
    key: base.key,
    title: base.title,
    columns: [...periods],
    currentPeriodLabel: periods[0] ?? base.currentPeriodLabel,
    priorPeriodLabel: periods[1] ?? '',
    lines: base.lines.map((line) => ({
      ...line,
      values: line.current == null ? undefined : factors.map((f) => Math.round(line.current! * f)),
      detail: line.detail?.map((d) => ({
        ...d,
        values: factors.map((f) => Math.round(d.current * f)),
      })),
    })),
  }
}

// ---- board-derived GL → financial statements -------------------------------
// Aggregate the per-order GL (same `orderGlLines` logic the modal shows) across
// ALL orders and fold it into the statement TEMPLATE's baseline figures, then
// recompute the dependent subtotals/totals and a balancing Retained earnings
// line so the Balance Sheet identity (Assets = Liabilities + Equity) still
// holds. `projectStatement` then scales that board-derived baseline per selected
// period exactly as before, so the footer/drill-down/xlsx all keep working and
// the reports genuinely mirror the board.

function boardGlSummary(): BoardGlSummary {
  const nameById = new Map(store.workflowStatuses.map((s) => [s.id, s.name]))
  // "non-archived orders": orders live independently of column archival, so we
  // roll up every order in the store.
  return summarizeBoardGl(store.orders, (o) => nameById.get(o.workflowStatusId))
}

const findLine = (lines: FinancialLine[], id: string) => lines.find((l) => l.id === id)
const findDetail = (line: FinancialLine | undefined, label: string) =>
  line?.detail?.find((d) => d.label === label)

/** Set a line's total and proportionally rescale its drill-down detail so the
 * detail keeps summing to the (new) line total — divide-by-zero safe. */
function setLineTotal(line: FinancialLine | undefined, newTotal: number): void {
  if (!line) return
  const detail = line.detail
  if (detail && detail.length) {
    const oldTotal = detail.reduce((s, d) => s + d.current, 0)
    if (oldTotal !== 0) {
      const f = newTotal / oldTotal
      detail.forEach((d) => (d.current = Math.round(d.current * f)))
    } else {
      const each = Math.round(newTotal / detail.length)
      detail.forEach((d) => (d.current = each))
    }
    // Absorb any rounding drift into the last detail row.
    const sum = detail.reduce((s, d) => s + d.current, 0)
    detail[detail.length - 1]!.current += newTotal - sum
  }
  line.current = newTotal
}

function applyBoardGl(base: FinancialStatementsResponse): FinancialStatementsResponse {
  const s = boardGlSummary()
  const next = clone(base)

  // ----- Income Statement -----
  const is = next.incomeStatement.lines
  const revLabor = findLine(is, 'rev_labor')
  const revIds = ['rev_labor', 'rev_parts', 'rev_tires', 'rev_fees']
  const baseRevSum = revIds.reduce((t, id) => t + (findLine(is, id)?.current ?? 0), 0)
  const revF = baseRevSum > 0 ? s.revenueAll / baseRevSum : 0
  for (const id of revIds) {
    const l = findLine(is, id)
    if (l) setLineTotal(l, Math.round((l.current ?? 0) * revF))
  }
  const revTotal = revIds.reduce((t, id) => t + (findLine(is, id)?.current ?? 0), 0)
  // If the template had no revenue lines to scale, still reflect board revenue.
  if (baseRevSum === 0 && revLabor) setLineTotal(revLabor, s.revenueAll)
  const revenueLine = findLine(is, 'rev_total')
  if (revenueLine) revenueLine.current = baseRevSum > 0 ? revTotal : s.revenueAll

  const cogsIds = ['cogs_parts', 'cogs_labor']
  const baseCogsSum = cogsIds.reduce((t, id) => t + (findLine(is, id)?.current ?? 0), 0)
  const cogsF = baseCogsSum > 0 ? s.costBilled / baseCogsSum : 0
  for (const id of cogsIds) {
    const l = findLine(is, id)
    if (l) setLineTotal(l, Math.round((l.current ?? 0) * cogsF))
  }
  const cogsTotal = cogsIds.reduce((t, id) => t + (findLine(is, id)?.current ?? 0), 0)
  const cogsLine = findLine(is, 'cogs_total')
  if (cogsLine) cogsLine.current = baseCogsSum > 0 ? cogsTotal : s.costBilled

  const revenue = revenueLine?.current ?? s.revenueAll
  const cogs = cogsLine?.current ?? s.costBilled
  const grossProfit = revenue - cogs
  const gp = findLine(is, 'gross_profit')
  if (gp) gp.current = grossProfit

  // Keep the rest of the IS internally consistent (opex/other lines unchanged).
  const opexTotal = findLine(is, 'opex_total')?.current ?? 0
  const opIncome = grossProfit - opexTotal
  const opIncomeLine = findLine(is, 'op_income')
  if (opIncomeLine) opIncomeLine.current = opIncome
  const intExp = findLine(is, 'int_exp')?.current ?? 0
  const taxExp = findLine(is, 'tax_exp')?.current ?? 0
  const netIncome = opIncome + intExp + taxExp
  const netIncomeLine = findLine(is, 'net_income')
  if (netIncomeLine) netIncomeLine.current = netIncome

  // ----- Balance Sheet -----
  const bs = next.balanceSheet.lines
  const cashLine = findLine(bs, 'ca_cash')
  const baseCash = cashLine?.current ?? 0
  const newCash = baseCash + s.cashDone
  if (cashLine) {
    // Book collected cash into the operating account detail row (keeps detail summing).
    const op = findDetail(cashLine, 'Operating account')
    if (op) op.current += s.cashDone
    cashLine.current = newCash
  }

  const arLine = findLine(bs, 'ca_ar')
  setLineTotal(arLine, s.arBilled)
  const newAr = arLine?.current ?? s.arBilled

  const invLine = findLine(bs, 'ca_inv')
  const newInv = (invLine?.current ?? 0) - s.invBilled
  if (invLine) invLine.current = newInv

  const caTotalLine = findLine(bs, 'ca_total')
  const caTotal = newCash + newAr + newInv
  if (caTotalLine) caTotalLine.current = caTotal

  const ncaTotal = findLine(bs, 'nca_total')?.current ?? 0
  const assetsTotal = caTotal + ncaTotal
  const assetsTotalLine = findLine(bs, 'assets_total')
  if (assetsTotalLine) assetsTotalLine.current = assetsTotal

  const liabTotal = findLine(bs, 'liab_total')?.current ?? 0
  const paidIn = findLine(bs, 'eq_paid')?.current ?? 0

  // Balancing plug: Retained earnings = Assets − Liabilities − Paid-in capital.
  const retained = assetsTotal - liabTotal - paidIn
  const reLine = findLine(bs, 'eq_re')
  if (reLine) {
    reLine.current = retained
    // Keep the drill-down consistent: beginning = RE − net income − distributions.
    const dist = findDetail(reLine, 'Distributions')?.current ?? 0
    const netInDetail = findDetail(reLine, 'Net income for period')
    if (netInDetail) netInDetail.current = netIncome
    const beginning = findDetail(reLine, 'Beginning balance')
    if (beginning) beginning.current = retained - netIncome - dist
  }
  const eqTotalLine = findLine(bs, 'eq_total')
  const eqTotal = paidIn + retained
  if (eqTotalLine) eqTotalLine.current = eqTotal
  const liabEqLine = findLine(bs, 'liab_eq_total')
  if (liabEqLine) liabEqLine.current = liabTotal + eqTotal // == assetsTotal

  return next
}

function buildFinancials(g: Granularity, periods: string[]): FinancialStatementsResponse {
  const sel = periods.length ? periods : defaultPeriods(g)
  // Fold the aggregated board GL into the baseline template, THEN scale per period.
  const base = applyBoardGl(store.financials)
  return {
    currency: base.currency,
    incomeStatement: projectStatement(base.incomeStatement, g, sel),
    balanceSheet: projectStatement(base.balanceSheet, g, sel),
  }
}

route('GET', '/financial-statements', ({ query }) => {
  const g = ((str(query, 'granularity') as Granularity | undefined) ?? 'quarter') as Granularity
  const raw = str(query, 'periods')
  const periods = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : defaultPeriods(g)
  return buildFinancials(g, periods)
})
route('GET', '/reports/:key', ({ params }) => {
  const invoiced = store.orders.filter((o) => o.status === 'invoice')
  const revenue = invoiced.reduce((s, o) => s + o.totals.total, 0)
  const grossProfit = invoiced.reduce((s, o) => s + o.totals.grossProfit, 0)
  const collected = store.payments.filter((p) => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0)
  const outstanding = store.orders.reduce((s, o) => s + o.balanceDue, 0)
  const round = (n: number) => Math.round(n * 100) / 100
  const report: ReportResponse = {
    reportKey: params.key!,
    kpis: {
      totalOrders: store.orders.length,
      invoicedOrders: invoiced.length,
      revenue: round(revenue),
      grossProfit: round(grossProfit),
      grossMarginPct: revenue > 0 ? round((grossProfit / revenue) * 100) : 0,
      aro: invoiced.length ? round(revenue / invoiced.length) : 0,
      closeRate: store.orders.length ? round((invoiced.length / store.orders.length) * 100) : 0,
      collected: round(collected),
      outstanding: round(outstanding),
    },
    rows: invoiced.map((o) => ({ number: o.number, total: o.totals.total, grossProfit: o.totals.grossProfit })),
  }
  return report
})

function hoursAgoIso(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString()
}

// ---- public client (matches src/lib/api.ts surface) -------------------------

// Small artificial latency so TanStack Query `isLoading` states (skeletons)
// are actually visible in mock mode — the in-memory store would otherwise
// resolve synchronously. This lives ONLY in the mock client, so it has no
// effect on the real API. To remove: set LATENCY back to 0 (or ~90).
const LATENCY = 450
const delay = <T>(value: T): Promise<T> => new Promise((res) => setTimeout(() => res(value), LATENCY))

type QueryValue = string | number | boolean | undefined | null

export const mockApi = {
  get: <T>(path: string, params?: Record<string, QueryValue>): Promise<T> =>
    delay(dispatch('GET', path, params ?? {}, undefined) as T),

  list: async <T>(path: string, params?: Record<string, QueryValue>): Promise<ListResult<T>> => {
    const result = dispatch('GET', path, params ?? {}, undefined)
    const items = (Array.isArray(result) ? result : []) as T[]
    const pageSize = Number(params?.pageSize ?? items.length) || items.length
    return delay({
      items,
      meta: { page: 1, pageSize, total: items.length, totalPages: 1 },
    })
  },

  post: <T>(path: string, body?: unknown): Promise<T> => delay(dispatch('POST', path, {}, body) as T),

  patch: <T>(path: string, body?: unknown): Promise<T> => delay(dispatch('PATCH', path, {}, body) as T),

  del: <T>(path: string): Promise<T> => delay(dispatch('DELETE', path, {}, undefined) as T),
}
