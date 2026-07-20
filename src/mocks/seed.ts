// ---------------------------------------------------------------------------
// AutoSuite mock seed — rich, realistic in-memory data so every screen renders
// and is interactive while the backend isn't up. Shapes mirror src/types so
// swapping VITE_USE_MOCKS off (real API) is a drop-in.
// ---------------------------------------------------------------------------

import type {
  AppNotification,
  AuthMeResponse,
  AuditLog,
  BacklogItem,
  Conversation,
  Customer,
  FinancialStatementsResponse,
  LineItem,
  Location,
  Message,
  MessageTemplate,
  Order,
  OrderActivity,
  OrderLabel,
  Part,
  Payment,
  PaymentSettings,
  PurchaseOrder,
  Service,
  Vehicle,
  Vendor,
  WorkflowStatus,
} from '@/types'
import { buildPhotos } from '@/assets/carPhotos'

// ---- time helpers -----------------------------------------------------------

const now = Date.now()
const hours = (h: number) => new Date(now + h * 3_600_000).toISOString()
const days = (d: number) => new Date(now + d * 86_400_000).toISOString()

// ---- label helper -----------------------------------------------------------

const L = (text: string, color: OrderLabel['color']): OrderLabel => ({
  id: `lbl_${text.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  text,
  color,
})

// ---- identity / org ---------------------------------------------------------

export const MOCK_LOCATIONS: Location[] = [
  { id: 'loc_main', name: 'ABS Autobody', address: '128 Market St, Denver, CO', timezone: 'America/Denver', active: true },
  { id: 'loc_north', name: 'ABS Autobody LV', address: '900 Federal Blvd, Denver, CO', timezone: 'America/Denver', active: true },
]

/** The signed-in mock user shown in the top-bar profile. */
export const MOCK_ME: AuthMeResponse = {
  user: { id: 'u_admin', email: 'kevin@autosuite.dev', firstName: 'Kevin', lastName: 'Du', userType: 'owner' },
  companyId: 'co_autosuite',
  locationId: 'loc_main',
  locationIds: ['loc_main', 'loc_north'],
  allLocations: MOCK_LOCATIONS,
  role: 'Administrator',
  permissions: ['*'],
}

/** The three selectable UI roles (display + selection only for now). Maps to
 * `Role.name` via `UserLocationAccess.roleId` on the backend. */
export const MOCK_ROLES = ['View Only', 'Edit Only', 'Administrator'] as const

// team members (service writers + technicians) referenced by orders
export const MOCK_USERS = [
  { id: 'u_admin', name: 'Kevin Du' },
  { id: 'u_mike', name: 'Mike Rooney' },
  { id: 'u_sara', name: 'Sara Lopez' },
  { id: 'u_dev', name: 'Dev Patel' },
  { id: 'u_tanya', name: 'Tanya Cole' },
]

// ---- workflow columns -------------------------------------------------------

// Column order (left→right): To Do, In Progress, Pending, Invoices,
// Ready for Pickup, Done. "Done" is a terminal column for delivered work; orders
// there also show on the Completed / Invoiced list page. "Pending" (violet) sits
// immediately right of In Progress for work that is parked/awaiting something.
export const MOCK_WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'ws_dropped', name: 'To Do', position: 1, rule: 'none', color: '#0EA5E9' },
  { id: 'ws_progress', name: 'In Progress', position: 2, rule: 'convert_to_repair_order', color: '#F59E0B' },
  { id: 'ws_pending', name: 'Pending', position: 3, rule: 'none', color: '#8B5CF6' },
  { id: 'ws_invoices', name: 'Invoices', position: 4, rule: 'convert_to_invoice', color: '#2B54D9' },
  { id: 'ws_ready', name: 'Ready for Pickup', position: 5, rule: 'none', color: '#16A34A' },
  { id: 'ws_completed', name: 'Done', position: 6, rule: 'none', color: '#0F766E' },
]

// ---- customers --------------------------------------------------------------

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', type: 'individual', firstName: 'Marcus', lastName: 'Bell', contacts: [{ label: 'mobile', type: 'phone', value: '(303) 555-0142' }, { label: 'primary', type: 'email', value: 'marcus.bell@example.com' }], preferredContactMethod: 'sms', taxExempt: false, tags: ['VIP'], gender: 'male', dob: '1985-04-12', ethnicity: 'Black or African American', primaryLanguage: 'English', speaksEnglish: true, driverLicenseNumber: 'CO-8842190', driverLicenseState: 'CO', driverLicenseExp: '2027-04-12', city: 'Denver', state: 'CO', referralSource: 'referral' },
  { id: 'c2', type: 'individual', firstName: 'Priya', lastName: 'Nair', contacts: [{ label: 'mobile', type: 'phone', value: '(303) 555-0170' }], preferredContactMethod: 'sms', taxExempt: false, tags: [], gender: 'female', dob: '1992', ageRange: '25-34', ethnicity: 'Asian', primaryLanguage: 'Hindi', speaksEnglish: true, city: 'Aurora', state: 'CO', referralSource: 'google' },
  { id: 'c3', type: 'business', companyName: 'Summit Landscaping', contacts: [{ label: 'office', type: 'phone', value: '(720) 555-0088' }, { label: 'billing', type: 'email', value: 'ap@summitland.com' }], preferredContactMethod: 'email', taxExempt: true, tags: ['Fleet'] },
  { id: 'c4', type: 'individual', firstName: 'Dana', lastName: 'Whitfield', contacts: [{ label: 'mobile', type: 'phone', value: '(303) 555-0199' }, { label: 'primary', type: 'email', value: 'dana.w@example.com' }], preferredContactMethod: 'email', taxExempt: false, tags: [], gender: 'female', ageRange: '45-54', ethnicity: 'White', primaryLanguage: 'English', speaksEnglish: true, city: 'Lakewood', state: 'CO', referralSource: 'repeat_customer' },
  { id: 'c5', type: 'individual', firstName: 'Owen', lastName: 'Grant', contacts: [{ label: 'mobile', type: 'phone', value: '(720) 555-0231' }], preferredContactMethod: 'phone', taxExempt: false, tags: ['VIP'], gender: 'male', dob: '1978-11-30', ethnicity: 'White', primaryLanguage: 'English', speaksEnglish: true, driverLicenseNumber: 'CO-7770231', driverLicenseState: 'CO', driverLicenseExp: '2026-11-30', city: 'Denver', state: 'CO', referralSource: 'social_media' },
  { id: 'c6', type: 'individual', firstName: 'Lena', lastName: 'Fischer', contacts: [{ label: 'mobile', type: 'phone', value: '(303) 555-0256' }, { label: 'primary', type: 'email', value: 'lena.fischer@example.com' }], preferredContactMethod: 'sms', taxExempt: false, tags: [], gender: 'female', dob: '2001-07-08', ethnicity: 'Hispanic or Latino', primaryLanguage: 'Spanish', speaksEnglish: false, city: 'Denver', state: 'CO', referralSource: 'walk_in' },
  { id: 'c7', type: 'individual', firstName: 'Theo', lastName: 'Reyes', contacts: [{ label: 'mobile', type: 'phone', value: '(720) 555-0311' }], preferredContactMethod: 'sms', taxExempt: false, tags: [] },
  { id: 'c8', type: 'business', companyName: 'BlueLine Couriers', contacts: [{ label: 'dispatch', type: 'phone', value: '(303) 555-0402' }, { label: 'billing', type: 'email', value: 'fleet@blueline.co' }], preferredContactMethod: 'email', taxExempt: true, tags: ['Fleet'] },
  { id: 'c9', type: 'individual', firstName: 'Grace', lastName: 'Kim', contacts: [{ label: 'mobile', type: 'phone', value: '(720) 555-0455' }, { label: 'primary', type: 'email', value: 'grace.kim@example.com' }], preferredContactMethod: 'sms', taxExempt: false, tags: [] },
  { id: 'c10', type: 'individual', firstName: 'Sam', lastName: 'Okoye', contacts: [{ label: 'mobile', type: 'phone', value: '(303) 555-0488' }], preferredContactMethod: 'phone', taxExempt: false, tags: [] },
]

// ---- vehicles ---------------------------------------------------------------

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', ownerCustomerId: 'c1', year: 2013, make: 'BMW', model: 'M5', submodel: 'Base', licensePlate: 'JHK-8842', plateState: 'CO', color: 'Black', vin: 'WBSFV9C50DD095476', mileageIn: 78210 },
  { id: 'v2', ownerCustomerId: 'c2', year: 2019, make: 'Honda', model: 'CR-V', submodel: 'EX', licensePlate: 'CPR-1180', plateState: 'CO', color: 'Silver', mileageIn: 44120 },
  { id: 'v3', ownerCustomerId: 'c3', year: 2020, make: 'Ford', model: 'F-250', submodel: 'XL', licensePlate: 'SUM-004', plateState: 'CO', color: 'White', mileageIn: 91200 },
  { id: 'v4', ownerCustomerId: 'c4', year: 2016, make: 'Subaru', model: 'Outback', submodel: 'Limited', licensePlate: 'DNW-2213', plateState: 'CO', color: 'Green', mileageIn: 102500 },
  { id: 'v5', ownerCustomerId: 'c5', year: 2022, make: 'Tesla', model: 'Model 3', submodel: 'LR', licensePlate: 'OWG-777', plateState: 'CO', color: 'Blue', mileageIn: 21100 },
  { id: 'v6', ownerCustomerId: 'c6', year: 2011, make: 'Toyota', model: 'Camry', submodel: 'SE', licensePlate: 'LNF-5521', plateState: 'CO', color: 'Gray', mileageIn: 143000 },
  { id: 'v7', ownerCustomerId: 'c7', year: 2018, make: 'Jeep', model: 'Wrangler', submodel: 'Sport', licensePlate: 'TRY-9090', plateState: 'CO', color: 'Red', mileageIn: 63400 },
  { id: 'v8', ownerCustomerId: 'c8', year: 2021, make: 'Ram', model: 'ProMaster', submodel: '1500', licensePlate: 'BLC-3301', plateState: 'CO', color: 'White', mileageIn: 58800 },
  { id: 'v9', ownerCustomerId: 'c9', year: 2017, make: 'Mazda', model: 'CX-5', submodel: 'Touring', licensePlate: 'GKM-4412', plateState: 'CO', color: 'Red', mileageIn: 71200 },
  { id: 'v10', ownerCustomerId: 'c10', year: 2014, make: 'Chevrolet', model: 'Silverado', submodel: 'LT', licensePlate: 'SMO-1234', plateState: 'CO', color: 'Black', mileageIn: 118400 },
  { id: 'v11', ownerCustomerId: 'c1', year: 2009, make: 'Audi', model: 'A4', submodel: 'Quattro', licensePlate: 'JHK-2000', plateState: 'CO', color: 'White', mileageIn: 132000 },
  { id: 'v12', ownerCustomerId: 'c4', year: 2020, make: 'Kia', model: 'Telluride', submodel: 'SX', licensePlate: 'DNW-8080', plateState: 'CO', color: 'Gray', mileageIn: 39900 },
  { id: 'v13', ownerCustomerId: 'c8', year: 2020, make: 'Ford', model: 'Transit', submodel: '250', licensePlate: 'BLC-3302', plateState: 'CO', color: 'White', mileageIn: 66120 },
  { id: 'v14', ownerCustomerId: 'c5', year: 2015, make: 'Porsche', model: 'Cayenne', submodel: 'S', licensePlate: 'OWG-115', plateState: 'CO', color: 'Black', mileageIn: 88400 },
]

// ---- line-item / service builders ------------------------------------------

let liSeq = 0
const li = (
  orderId: string,
  serviceId: string,
  type: LineItem['type'],
  name: string,
  fields: Partial<{ quantity: number; hours: number; unitCost: number; unitRetail: number; taxable: boolean; assignedTechnicianId: string }>,
): LineItem => ({
  id: `li_${++liSeq}`,
  serviceId,
  orderId,
  type,
  name,
  quantity: fields.quantity ?? 1,
  hours: fields.hours,
  unitCost: fields.unitCost ?? 0,
  unitRetail: fields.unitRetail ?? 0,
  taxable: fields.taxable ?? true,
  assignedTechnicianId: fields.assignedTechnicianId,
  position: 0,
})

let svcSeq = 0
function service(orderId: string, title: string, items: ReturnType<typeof li>[], opts?: Partial<Service>): Service {
  const id = `svc_${++svcSeq}`
  const lineItems = items.map((it, i) => ({ ...it, serviceId: id, orderId, position: i }))
  return {
    id,
    orderId,
    title,
    categoryIds: [],
    flags: { recommended: false, lumpSum: false, hideLineItemPricing: false, hideFromCustomer: false },
    authorizationStatus: opts?.authorizationStatus ?? 'authorized',
    deferred: false,
    position: 0,
    lineItems,
    ...opts,
  }
}

// ---- orders -----------------------------------------------------------------
// Totals / paidTotal / balanceDue are recomputed at store init (recomputeOrder).

const emptyTotals = { subtotal: 0, discountTotal: 0, feeTotal: 0, taxableSubtotal: 0, taxTotal: 0, total: 0, costTotal: 0, grossProfit: 0, grossMarginPct: 0 }

function order(o: Partial<Order> & Pick<Order, 'id' | 'number' | 'status' | 'workflowStatusId' | 'customerId' | 'vehicleId'>): Order {
  return {
    serviceWriterId: 'u_admin',
    totals: { ...emptyTotals },
    paidTotal: 0,
    balanceDue: 0,
    lastActivityAt: hours(-2),
    services: [],
    labels: [],
    mechanicIds: [],
    ...o,
  }
}

export const MOCK_ORDERS: Order[] = [
  // --- To Do (formerly Estimates; the Estimates column was removed and its
  // orders reassigned here so none are orphaned) ---
  order({
    id: 'o1', number: 1577, status: 'estimate', workflowStatusId: 'ws_dropped', customerId: 'c1', vehicleId: 'v1',
    title: 'Water Pump R&R and 3 More', technicianName: 'Mike Rooney', serviceWriterId: 'u_sara',
    dueAt: days(2), lastActivityAt: hours(-3),
    labels: [L('Inspection', 'purple'), L('VIP', 'red')],
    services: [
      service('o1', 'Water Pump R&R', [
        li('o1', '', 'labor', 'Replace water pump', { hours: 2.5, unitCost: 40, unitRetail: 145, assignedTechnicianId: 'u_mike' }),
        li('o1', '', 'part', 'Water pump - OEM', { quantity: 1, unitCost: 88, unitRetail: 189 }),
        li('o1', '', 'part', 'Coolant (gal)', { quantity: 2, unitCost: 12, unitRetail: 24 }),
      ]),
      service('o1', 'Cooling system inspection', [
        li('o1', '', 'labor', 'Pressure test cooling system', { hours: 0.5, unitCost: 40, unitRetail: 72.5 }),
      ], { authorizationStatus: 'pending' }),
    ],
  }),
  order({
    id: 'o2', number: 1578, status: 'estimate', workflowStatusId: 'ws_dropped', customerId: 'c6', vehicleId: 'v6',
    title: 'Front Brake Pads & Rotors', technicianName: 'Dev Patel', serviceWriterId: 'u_sara',
    dueAt: days(1), lastActivityAt: hours(-6),
    labels: [L('Brakes', 'purple'), L('Due 1/14', 'orange')],
    services: [
      service('o2', 'Front brakes', [
        li('o2', '', 'labor', 'R&R front pads and rotors', { hours: 1.8, unitCost: 40, unitRetail: 145 }),
        li('o2', '', 'part', 'Brake pad set', { quantity: 1, unitCost: 42, unitRetail: 96 }),
        li('o2', '', 'part', 'Rotor (pair)', { quantity: 1, unitCost: 78, unitRetail: 168 }),
      ], { authorizationStatus: 'pending' }),
    ],
  }),
  order({
    id: 'o3', number: 1579, status: 'estimate', workflowStatusId: 'ws_dropped', customerId: 'c9', vehicleId: 'v9',
    title: 'Pre-Purchase Inspection', technicianName: 'Tanya Cole', serviceWriterId: 'u_admin',
    dueAt: hours(20), lastActivityAt: hours(-1),
    labels: [L('Inspection', 'purple')],
    services: [
      service('o3', 'Pre-purchase inspection', [
        li('o3', '', 'labor', 'Full pre-purchase inspection', { hours: 1.0, unitCost: 40, unitRetail: 129 }),
      ], { authorizationStatus: 'pending' }),
    ],
  }),

  // --- To Do ---
  order({
    id: 'o4', number: 1571, status: 'repair_order', workflowStatusId: 'ws_dropped', customerId: 'c2', vehicleId: 'v2',
    title: 'Oil Change + Tire Rotation', technicianName: 'Mike Rooney', serviceWriterId: 'u_mike',
    dueAt: hours(6), lastActivityAt: hours(-4), waitingOnParts: false,
    labels: [L('Detail Done', 'blue')],
    services: [
      service('o4', 'Maintenance', [
        li('o4', '', 'labor', 'Full synthetic oil change', { hours: 0.5, unitCost: 20, unitRetail: 49.99 }),
        li('o4', '', 'part', 'Synthetic oil (qt)', { quantity: 5, unitCost: 6.5, unitRetail: 11 }),
        li('o4', '', 'part', 'Oil filter', { quantity: 1, unitCost: 7, unitRetail: 16 }),
        li('o4', '', 'labor', 'Tire rotation', { hours: 0.3, unitCost: 20, unitRetail: 29 }),
      ]),
    ],
  }),
  order({
    id: 'o5', number: 1572, status: 'repair_order', workflowStatusId: 'ws_pending', customerId: 'c7', vehicleId: 'v7',
    title: 'Check Engine Light Diagnosis', technicianName: 'Dev Patel', serviceWriterId: 'u_sara',
    dueAt: days(1), lastActivityAt: hours(-7), waitingOnParts: true,
    labels: [L('Waiting on Parts', 'orange'), L('Diagnostic', 'purple')],
    services: [
      service('o5', 'Diagnostics', [
        li('o5', '', 'labor', 'CEL scan & diagnosis', { hours: 1.0, unitCost: 40, unitRetail: 129 }),
      ]),
    ],
  }),
  order({
    id: 'o6', number: 1573, status: 'repair_order', workflowStatusId: 'ws_dropped', customerId: 'c3', vehicleId: 'v3',
    title: 'Fleet PM Service — Unit 004', technicianName: 'Tanya Cole', serviceWriterId: 'u_admin',
    dueAt: days(2), lastActivityAt: hours(-10),
    labels: [L('Fleet', 'blue')],
    services: [
      service('o6', 'Preventive maintenance', [
        li('o6', '', 'labor', 'PM service (diesel)', { hours: 1.5, unitCost: 40, unitRetail: 189, taxable: false }),
        li('o6', '', 'part', 'Fuel filter kit', { quantity: 1, unitCost: 54, unitRetail: 118, taxable: false }),
      ]),
    ],
  }),

  // --- In Progress ---
  order({
    id: 'o7', number: 1566, status: 'repair_order', workflowStatusId: 'ws_progress', customerId: 'c4', vehicleId: 'v4',
    title: 'Head Gasket Replacement', technicianName: 'Mike Rooney', serviceWriterId: 'u_mike',
    dueAt: days(-1), lastActivityAt: hours(-1), waitingOnParts: true, hasDeposit: true,
    labels: [L('VIP', 'red'), L('Waiting on Parts', 'orange')],
    services: [
      service('o7', 'Head gasket', [
        li('o7', '', 'labor', 'R&R head gasket', { hours: 9.0, unitCost: 40, unitRetail: 145, assignedTechnicianId: 'u_mike' }),
        li('o7', '', 'part', 'Head gasket set', { quantity: 1, unitCost: 165, unitRetail: 349 }),
        li('o7', '', 'part', 'Coolant (gal)', { quantity: 3, unitCost: 12, unitRetail: 24 }),
        li('o7', '', 'shop_supplies', 'Shop supplies', { quantity: 1, unitCost: 0, unitRetail: 35 }),
      ]),
    ],
  }),
  order({
    id: 'o8', number: 1567, status: 'repair_order', workflowStatusId: 'ws_pending', customerId: 'c5', vehicleId: 'v5',
    title: 'Cabin Filter + Software Update', technicianName: 'Dev Patel', serviceWriterId: 'u_dev',
    dueAt: hours(4), lastActivityAt: hours(-2),
    labels: [L('EV', 'green')],
    services: [
      service('o8', 'Maintenance', [
        li('o8', '', 'labor', 'Cabin filter replacement', { hours: 0.4, unitCost: 20, unitRetail: 39 }),
        li('o8', '', 'part', 'Cabin filter', { quantity: 1, unitCost: 18, unitRetail: 44 }),
      ]),
    ],
  }),
  order({
    id: 'o9', number: 1568, status: 'repair_order', workflowStatusId: 'ws_progress', customerId: 'c10', vehicleId: 'v10',
    title: 'Suspension — Struts & Alignment', technicianName: 'Tanya Cole', serviceWriterId: 'u_admin',
    dueAt: days(1), lastActivityAt: hours(-5),
    labels: [L('Suspension', 'purple')],
    services: [
      service('o9', 'Front struts', [
        li('o9', '', 'labor', 'R&R front struts', { hours: 3.0, unitCost: 40, unitRetail: 145 }),
        li('o9', '', 'part', 'Strut assembly (pair)', { quantity: 1, unitCost: 210, unitRetail: 445 }),
        li('o9', '', 'labor', '4-wheel alignment', { hours: 1.0, unitCost: 30, unitRetail: 119 }),
      ]),
    ],
  }),

  // --- Ready for Pickup ---
  order({
    id: 'o10', number: 1560, status: 'invoice', workflowStatusId: 'ws_ready', customerId: 'c1', vehicleId: 'v11',
    title: 'Timing Belt Service', technicianName: 'Mike Rooney', serviceWriterId: 'u_mike',
    lastActivityAt: hours(-1), invoicedAt: hours(-3),
    labels: [L('Prep for Sale', 'green'), L('Detail Done', 'blue')],
    services: [
      service('o10', 'Timing belt', [
        li('o10', '', 'labor', 'Timing belt + water pump', { hours: 4.5, unitCost: 40, unitRetail: 145 }),
        li('o10', '', 'part', 'Timing belt kit', { quantity: 1, unitCost: 165, unitRetail: 329 }),
      ]),
    ],
    // partial deposit taken (see MOCK_PAYMENTS) -> "Remaining"
  }),
  order({
    id: 'o11', number: 1561, status: 'invoice', workflowStatusId: 'ws_ready', customerId: 'c6', vehicleId: 'v6',
    title: 'AC Recharge & Leak Test', technicianName: 'Dev Patel', serviceWriterId: 'u_sara',
    lastActivityAt: hours(-2), invoicedAt: hours(-4),
    labels: [L('Paid', 'green')],
    services: [
      service('o11', 'AC service', [
        li('o11', '', 'labor', 'AC recharge & dye leak test', { hours: 1.2, unitCost: 40, unitRetail: 139 }),
        li('o11', '', 'part', 'Refrigerant R-1234yf', { quantity: 1, unitCost: 55, unitRetail: 98 }),
      ]),
    ],
    // fully paid (see MOCK_PAYMENTS) -> "Paid"
  }),
  order({
    id: 'o12', number: 1562, status: 'invoice', workflowStatusId: 'ws_completed', customerId: 'c9', vehicleId: 'v9',
    title: 'Battery Replacement', technicianName: 'Tanya Cole', serviceWriterId: 'u_admin',
    lastActivityAt: hours(-6), invoicedAt: hours(-8), fullyPaidAt: hours(-6),
    labels: [L('Detail Done', 'blue')],
    services: [
      service('o12', 'Battery', [
        li('o12', '', 'labor', 'R&R battery + test charging', { hours: 0.5, unitCost: 20, unitRetail: 49 }),
        li('o12', '', 'part', 'AGM battery', { quantity: 1, unitCost: 118, unitRetail: 229 }),
      ]),
    ],
  }),

  // --- Invoices ---
  order({
    id: 'o13', number: 1554, status: 'invoice', workflowStatusId: 'ws_completed', customerId: 'c8', vehicleId: 'v8',
    title: 'Fleet Brake Job — 2 Vans', technicianName: 'Mike Rooney', serviceWriterId: 'u_admin',
    lastActivityAt: days(-1), invoicedAt: days(-1), fullyPaidAt: days(-1),
    labels: [L('Fleet', 'blue')],
    services: [
      service('o13', 'Brakes (van 1)', [
        li('o13', '', 'labor', 'Front & rear brakes', { hours: 3.5, unitCost: 40, unitRetail: 145, taxable: false }),
        li('o13', '', 'part', 'Brake kit', { quantity: 2, unitCost: 96, unitRetail: 210, taxable: false }),
      ]),
    ],
  }),
  order({
    id: 'o14', number: 1555, status: 'invoice', workflowStatusId: 'ws_invoices', customerId: 'c5', vehicleId: 'v14',
    title: 'Major Service — 90k', technicianName: 'Dev Patel', serviceWriterId: 'u_dev',
    lastActivityAt: days(-2), invoicedAt: days(-2), fullyPaidAt: days(-2),
    labels: [L('VIP', 'red'), L('Paid', 'green')],
    services: [
      service('o14', '90k service', [
        li('o14', '', 'labor', '90k major service', { hours: 5.0, unitCost: 40, unitRetail: 145 }),
        li('o14', '', 'part', 'Spark plugs (set)', { quantity: 1, unitCost: 96, unitRetail: 210 }),
        li('o14', '', 'part', 'Filters kit', { quantity: 1, unitCost: 62, unitRetail: 138 }),
      ]),
    ],
  }),
]

// ---- vehicle photos (display/demo, offline inline-SVG) ----------------------
// Attached to a handful of orders. First (lowest sortOrder) photo is the card
// thumbnail. Some orders are intentionally left with 0 photos to exercise the
// neutral placeholder. Maps to a future `vehicle_photos` table (keyed by
// vehicleId); stored on the order here for simple hydration on the board.

const PHOTO_SETS: Record<string, { hue: number; label: string; count: number }> = {
  o1: { hue: 210, label: '2013 BMW M5', count: 4 },
  o2: { hue: 24, label: '2011 Toyota Camry', count: 3 },
  o4: { hue: 150, label: '2019 Honda CR-V', count: 1 },
  o7: { hue: 130, label: '2016 Subaru Outback', count: 5 },
  o9: { hue: 280, label: '2014 Chevrolet Silverado', count: 3 },
  o10: { hue: 45, label: '2009 Audi A4', count: 2 },
  o14: { hue: 340, label: '2015 Porsche Cayenne', count: 4 },
}

for (const o of MOCK_ORDERS) {
  const set = PHOTO_SETS[o.id]
  o.photos = set ? buildPhotos(o.id, set.hue, set.label, set.count) : []
}

// ---- mechanic assignment (team members working each car) --------------------
// Deterministically assign 1–2 mechanics (from MOCK_USERS) to every order so the
// board avatars + mechanic filter + detail "Mechanics" section have data. Maps
// to a future order↔technician assignment (`order_assignments`).
const MECHANIC_POOL = ['u_mike', 'u_sara', 'u_dev', 'u_tanya', 'u_admin']
MOCK_ORDERS.forEach((o, i) => {
  const a = MECHANIC_POOL[i % MECHANIC_POOL.length]!
  const b = MECHANIC_POOL[(i + 2) % MECHANIC_POOL.length]!
  o.mechanicIds = i % 3 === 0 ? [a] : [a, b]
})

// ---- effort + priority + start date + description ---------------------------
// Give each order an effort ('low' | 'medium' | 'high'), a priority (mix), a
// scheduled start date, and a short description for a few orders; the rest are
// left empty to exercise the "Add a description…" placeholder in the modal.
const HIGH_EFFORT_IDS = new Set(['o1', 'o7', 'o9', 'o13', 'o14'])
const MEDIUM_EFFORT_IDS = new Set(['o2', 'o5', 'o10', 'o12'])
const HIGH_PRIORITY_IDS = new Set(['o1', 'o7', 'o13'])
const LOW_PRIORITY_IDS = new Set(['o3', 'o6', 'o11'])
const ORDER_DESCRIPTIONS: Record<string, string> = {
  o1: 'Customer reports coolant smell and rising temp gauge on the highway. Confirm water pump weep before authorizing full R&R; pressure-test cooling system after.',
  o2: 'Front brakes grinding under light braking. Measure rotor thickness and inspect calipers for uneven pad wear.',
  o5: 'CEL on with intermittent misfire. Pull codes, note freeze-frame data, and flag any parts to order before quoting the repair.',
  o7: 'Overheating with white exhaust smoke. Block test came back positive — plan for full head gasket R&R, machine-shop check on the head, and coolant flush.',
  o9: 'Clunk over bumps and uneven tire wear. Replace front struts as a pair and follow with a 4-wheel alignment.',
}
MOCK_ORDERS.forEach((o, i) => {
  o.effort = HIGH_EFFORT_IDS.has(o.id) ? 'high' : MEDIUM_EFFORT_IDS.has(o.id) ? 'medium' : 'low'
  o.priority = HIGH_PRIORITY_IDS.has(o.id) ? 'high' : LOW_PRIORITY_IDS.has(o.id) ? 'low' : 'medium'
  // Stagger start dates around "now" so the Details date field has varied data.
  const start = new Date()
  start.setDate(start.getDate() - 3 + (i % 10))
  o.startDate = start.toISOString().slice(0, 10)
  o.description = ORDER_DESCRIPTIONS[o.id] ?? ''
})

// ---- payments (drive paid/remaining on cards) -------------------------------

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'pay_1', orderId: 'o7', method: 'card_online', amount: 500, isDeposit: true, status: 'succeeded', createdAt: days(-3) },
  { id: 'pay_2', orderId: 'o10', method: 'card_present', amount: 300, isDeposit: true, status: 'succeeded', createdAt: days(-1) },
  { id: 'pay_3', orderId: 'o11', method: 'card_present', amount: 264.11, isDeposit: false, status: 'succeeded', createdAt: hours(-3) },
  { id: 'pay_4', orderId: 'o14', method: 'card_online', amount: 588.19, isDeposit: false, status: 'succeeded', createdAt: days(-2) },
]

// ---- order activity ---------------------------------------------------------

export const MOCK_ACTIVITY: OrderActivity[] = [
  { id: 'act_1', orderId: 'o1', kind: 'system_event', actorType: 'system', visibility: 'internal', body: 'Estimate #1577 created.', mentions: [], at: hours(-3) },
  { id: 'act_2', orderId: 'o1', kind: 'user_note', authorId: 'u_sara', actorType: 'user', visibility: 'internal', body: 'Customer said coolant smell after highway drives. Prioritize pressure test.', mentions: [], pinned: true, at: hours(-2.5) },
  { id: 'act_3', orderId: 'o1', kind: 'customer_message', actorType: 'customer', visibility: 'customer_visible', body: 'Thanks for the quick look — go ahead with the water pump.', mentions: [], at: hours(-1) },
  { id: 'act_4', orderId: 'o7', kind: 'payment', actorType: 'user', authorId: 'u_mike', visibility: 'internal', body: 'Deposit of $500.00 collected (credit card).', mentions: [], at: days(-3) },
  { id: 'act_5', orderId: 'o7', kind: 'part_event', actorType: 'system', visibility: 'internal', body: 'Head gasket set on backorder — ETA 2 days.', mentions: [], at: hours(-6) },
  { id: 'act_6', orderId: 'o7', kind: 'status_change', actorType: 'user', authorId: 'u_mike', visibility: 'internal', body: 'Moved to In Progress.', mentions: [], at: hours(-1) },
  { id: 'act_7', orderId: 'o11', kind: 'payment', actorType: 'user', authorId: 'u_sara', visibility: 'internal', body: 'Paid in full — $264.11 (debit).', mentions: [], at: hours(-3) },
  { id: 'act_8', orderId: 'o14', kind: 'authorization', actorType: 'customer', visibility: 'customer_visible', body: 'Customer authorized all services online and e-signed.', mentions: [], at: days(-2) },
]

// ---- messaging --------------------------------------------------------------

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', customerId: 'c1', orderId: 'o1', channel: 'sms', direction: 'outbound', body: 'Hi Marcus, your estimate #1577 is ready to review.', status: 'delivered', sentByUserId: 'u_sara', createdAt: hours(-3) },
  { id: 'm2', customerId: 'c1', orderId: 'o1', channel: 'sms', direction: 'inbound', body: 'Thanks — go ahead with the water pump.', status: 'read', createdAt: hours(-1) },
  { id: 'm3', customerId: 'c4', orderId: 'o7', channel: 'sms', direction: 'outbound', body: 'Update: head gasket parts are on the way, ETA 2 days.', status: 'delivered', sentByUserId: 'u_mike', createdAt: hours(-6) },
  { id: 'm4', customerId: 'c4', orderId: 'o7', channel: 'sms', direction: 'inbound', body: 'Ok, keep me posted!', status: 'read', createdAt: hours(-5) },
  { id: 'm5', customerId: 'c6', orderId: 'o11', channel: 'email', direction: 'outbound', subject: 'Your invoice #1561', body: 'Your AC service is complete and paid. Thanks for visiting!', status: 'sent', sentByUserId: 'u_sara', createdAt: hours(-3) },
  { id: 'm6', customerId: 'c2', channel: 'sms', direction: 'inbound', body: 'Is my CR-V ready for pickup?', status: 'delivered', createdAt: hours(-2) },
]

export const MOCK_TEMPLATES: MessageTemplate[] = [
  { id: 'tpl_1', name: 'Ready for pickup', channel: 'sms', body: 'Good news! Your vehicle is ready for pickup. See you soon.' },
  { id: 'tpl_2', name: 'Estimate ready', channel: 'sms', body: 'Your estimate is ready to review. Tap the link to approve.' },
  { id: 'tpl_3', name: 'Running late', channel: 'sms', body: 'We need a little more time on your vehicle — we will update you shortly.' },
  { id: 'tpl_4', name: 'Thanks / review', channel: 'email', subject: 'Thanks from ABS Autobody', body: 'Thanks for trusting us with your vehicle. Mind leaving us a quick review?' },
]

// ---- notifications ----------------------------------------------------------
// Facebook-style bell feed. Realistic mix of shop events, read + unread.
// Maps to a future `notifications` table ({ id, type, title, body, at, read }).

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'message', title: 'New message from Priya Nair', body: 'Is my CR-V ready for pickup?', at: hours(-0.3), read: false },
  { id: 'n2', type: 'mention', title: 'Sara Lopez mentioned you', body: '@Kevin can you approve the water pump estimate #1577?', at: hours(-1.2), read: false },
  { id: 'n3', type: 'payment', title: 'Payment received', body: 'Lena Fischer paid $264.11 on invoice #1561.', at: hours(-3), read: false },
  { id: 'n4', type: 'appointment', title: 'Appointment confirmed', body: 'Owen Grant confirmed Tue 9:00 AM — Model 3 service.', at: hours(-5), read: false },
  { id: 'n5', type: 'part', title: 'Part received', body: 'Refrigerant R-1234yf (6) received on PO #3011.', at: hours(-7), read: true },
  { id: 'n6', type: 'dvi', title: 'Inspection approved', body: 'Marcus Bell approved the digital vehicle inspection for #1577.', at: hours(-9), read: false },
  { id: 'n7', type: 'inventory', title: 'Low inventory', body: 'Brake Rotor (pair) is below minimum (4 of 6).', at: hours(-12), read: true },
  { id: 'n8', type: 'message', title: 'New message from Dana Whitfield', body: 'Thanks, see you at pickup!', at: hours(-20), read: true },
  { id: 'n9', type: 'appointment', title: 'New appointment booked', body: 'BlueLine Couriers booked a fleet PM for 3 vans.', at: days(-1), read: true },
  { id: 'n10', type: 'payment', title: 'Deposit collected', body: 'Dana Whitfield deposit of $500.00 on order #1566.', at: days(-1), read: true },
  { id: 'n11', type: 'inventory', title: 'Low inventory', body: 'Refrigerant R-1234yf is below minimum (3 of 4).', at: days(-2), read: true },
]

/** Derive the conversation list (one row per customer) from messages. */
export function deriveConversations(messages: Message[], customers: Customer[]): Conversation[] {
  const byCustomer = new Map<string, Message[]>()
  for (const m of messages) {
    const arr = byCustomer.get(m.customerId) ?? []
    arr.push(m)
    byCustomer.set(m.customerId, arr)
  }
  const nameOf = (id: string) => {
    const c = customers.find((x) => x.id === id)
    if (!c) return 'Unknown'
    return c.type === 'business' ? c.companyName ?? 'Business' : [c.firstName, c.lastName].filter(Boolean).join(' ')
  }
  return Array.from(byCustomer.entries()).map(([customerId, msgs]) => {
    const sorted = [...msgs].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    const last = sorted[sorted.length - 1]!
    const unreadCount = msgs.filter((m) => m.direction === 'inbound' && m.status !== 'read').length
    return {
      customerId,
      customerName: nameOf(customerId),
      lastMessage: last.body,
      unreadCount,
      lastMessageAt: last.createdAt,
      lastChannel: last.channel,
    }
  })
}

// ---- audit log --------------------------------------------------------------

export const MOCK_AUDIT: AuditLog[] = [
  { id: 'au_1', entityType: 'order', entityId: 'o7', action: 'status_change', actorId: 'u_mike', actorType: 'user', before: { workflowStatusId: 'ws_dropped' }, after: { workflowStatusId: 'ws_progress' }, at: hours(-1) },
  { id: 'au_2', entityType: 'payment', entityId: 'pay_3', action: 'payment_captured', actorId: 'u_sara', actorType: 'user', after: { amount: 264.11, method: 'card_present' }, at: hours(-3) },
  { id: 'au_3', entityType: 'customer', entityId: 'c1', action: 'update', actorId: 'u_admin', actorType: 'user', before: { tags: [] }, after: { tags: ['VIP'] }, at: days(-1) },
]

// ---- inventory --------------------------------------------------------------

export const MOCK_PARTS: Part[] = [
  { id: 'prt_1', name: 'Synthetic Oil 5W-30 (qt)', sku: 'OIL-5W30', manufacturer: 'Mobil 1', cost: 6.5, retail: 11, qtyOnHand: 84, minQty: 24, taxable: true, trackInventory: true },
  { id: 'prt_2', name: 'Oil Filter — Spin-on', sku: 'FLT-OIL-22', manufacturer: 'WIX', cost: 7, retail: 16, qtyOnHand: 40, minQty: 12, taxable: true, trackInventory: true },
  { id: 'prt_3', name: 'Front Brake Pad Set', sku: 'BRK-PAD-F', mpn: 'D1210', manufacturer: 'Akebono', cost: 42, retail: 96, qtyOnHand: 9, minQty: 6, taxable: true, trackInventory: true },
  { id: 'prt_4', name: 'Brake Rotor (pair)', sku: 'BRK-ROT-P', manufacturer: 'Centric', cost: 78, retail: 168, qtyOnHand: 4, minQty: 6, taxable: true, trackInventory: true },
  { id: 'prt_5', name: 'AGM Battery Group 48', sku: 'BAT-AGM-48', manufacturer: 'Interstate', cost: 118, retail: 229, qtyOnHand: 6, minQty: 3, taxable: true, trackInventory: true },
  { id: 'prt_6', name: 'Cabin Air Filter', sku: 'FLT-CAB-14', manufacturer: 'Bosch', cost: 18, retail: 44, qtyOnHand: 22, minQty: 8, taxable: true, trackInventory: true },
  { id: 'prt_7', name: 'Refrigerant R-1234yf', sku: 'AC-1234YF', manufacturer: 'Honeywell', cost: 55, retail: 98, qtyOnHand: 3, minQty: 4, taxable: true, trackInventory: true },
  { id: 'prt_8', name: 'All-Season Tire 225/65R17', sku: 'TIR-2256517', manufacturer: 'Michelin', cost: 96, retail: 189, qtyOnHand: 16, minQty: 8, taxable: true, trackInventory: true },
]

export const MOCK_VENDORS: Vendor[] = [
  { id: 'vd_1', name: 'NAPA Auto Parts', contact: '(303) 555-1000', accountNumber: 'NAPA-4471' },
  { id: 'vd_2', name: 'WorldPac', contact: '(800) 555-2020', accountNumber: 'WP-88120' },
  { id: 'vd_3', name: 'Discount Tire Wholesale', contact: '(720) 555-3300', accountNumber: 'DT-1029' },
]

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: 'po_1', number: 3012, vendorId: 'vd_2', status: 'ordered', lines: [{ id: 'pol_1', partId: 'prt_4', cost: 78, qtyOrdered: 6, qtyReceived: 0 }] },
  { id: 'po_2', number: 3011, vendorId: 'vd_1', status: 'received', lines: [{ id: 'pol_2', partId: 'prt_7', cost: 55, qtyOrdered: 6, qtyReceived: 6 }] },
]

// ---- payment settings -------------------------------------------------------

export const MOCK_PAYMENT_SETTINGS: PaymentSettings = {
  surchargeEnabled: false,
  surchargePct: 3,
  allowOnlinePaymentOnInvoices: true,
  payoutSchedule: 'daily',
  connectStatus: 'active',
  readerId: 'tmr_WISEPOS_E_001',
}

// ---- backlog items ----------------------------------------------------------
// Lightweight pre-board work items (Jira backlog). "Move to board" creates a
// real Order in the first workflow column. Future home: `backlog_items` table.

export const MOCK_BACKLOG_ITEMS: BacklogItem[] = [
  { id: 'bk_1', title: 'Grinding noise on braking — needs inspection', customerId: 'c7', vehicleId: 'v7', customerName: 'Theo Reyes', vehicleName: '2018 Jeep Wrangler', note: 'Customer called; wants an appointment next week.', createdAt: days(-1) },
  { id: 'bk_2', title: 'Fleet tire rotation (3 vans)', customerId: 'c8', vehicleId: 'v13', customerName: 'BlueLine Couriers', vehicleName: '2020 Ford Transit', note: 'Quarterly PM — schedule when parts arrive.', createdAt: days(-2) },
  { id: 'bk_3', title: 'Windshield chip repair', customerId: 'c2', vehicleId: 'v2', customerName: 'Priya Nair', vehicleName: '2019 Honda CR-V', createdAt: hours(-30) },
  { id: 'bk_4', title: 'Follow up on declined suspension work', note: 'No vehicle linked yet — waiting on customer callback.', createdAt: hours(-6) },
]

// ---- financial statements (mock accounting read-model) ----------------------
// Realistic, self-consistent numbers styled like a small SEC filing. Balance
// Sheet balances (Assets = Liabilities + Equity). Each detail[] powers the
// drill-down panel. This is mock GL data; a real ledger is out of scope.

const CUR = 'Q2 2026'
const PRIOR = 'Q1 2026'

export const MOCK_FINANCIALS: FinancialStatementsResponse = {
  currency: 'USD',
  incomeStatement: {
    key: 'income_statement',
    title: 'Income Statement',
    currentPeriodLabel: CUR,
    priorPeriodLabel: PRIOR,
    lines: [
      { id: 'rev_hdr', label: 'Revenue', kind: 'header' },
      { id: 'rev_labor', label: 'Labor', kind: 'line', indent: 1, current: 412500, prior: 388200, detail: [
        { label: 'Mechanical labor', current: 268400, prior: 251900 },
        { label: 'Diagnostics', current: 78300, prior: 74100 },
        { label: 'Alignment & suspension', current: 65800, prior: 62200 },
      ] },
      { id: 'rev_parts', label: 'Parts', kind: 'line', indent: 1, current: 286900, prior: 271500, detail: [
        { label: 'OEM parts', current: 171200, prior: 162000 },
        { label: 'Aftermarket parts', current: 115700, prior: 109500 },
      ] },
      { id: 'rev_tires', label: 'Tires', kind: 'line', indent: 1, current: 98400, prior: 91200, detail: [
        { label: 'Passenger / light truck', current: 71200, prior: 66400 },
        { label: 'Performance', current: 27200, prior: 24800 },
      ] },
      { id: 'rev_fees', label: 'Shop supplies & fees', kind: 'line', indent: 1, current: 34200, prior: 31900, detail: [
        { label: 'Shop supplies', current: 21400, prior: 20100 },
        { label: 'EPA / disposal fees', current: 12800, prior: 11800 },
      ] },
      { id: 'rev_total', label: 'Total revenue', kind: 'subtotal', current: 832000, prior: 782800 },
      { id: 'cogs_hdr', label: 'Cost of goods sold', kind: 'header' },
      { id: 'cogs_parts', label: 'Parts & tires cost', kind: 'line', indent: 1, current: 268300, prior: 255100, detail: [
        { label: 'Parts cost', current: 179400, prior: 170200 },
        { label: 'Tire cost', current: 88900, prior: 84900 },
      ] },
      { id: 'cogs_labor', label: 'Direct technician labor', kind: 'line', indent: 1, current: 171200, prior: 162800, detail: [
        { label: 'Wages', current: 148600, prior: 141200 },
        { label: 'Payroll taxes & benefits', current: 22600, prior: 21600 },
      ] },
      { id: 'cogs_total', label: 'Total COGS', kind: 'subtotal', current: 439500, prior: 417900 },
      { id: 'gross_profit', label: 'Gross profit', kind: 'total', current: 392500, prior: 364900 },
      { id: 'opex_hdr', label: 'Operating expenses', kind: 'header' },
      { id: 'opex_rent', label: 'Rent & facilities', kind: 'line', indent: 1, current: 62000, prior: 61000, detail: [
        { label: 'Base rent', current: 48000, prior: 48000 },
        { label: 'Utilities', current: 14000, prior: 13000 },
      ] },
      { id: 'opex_admin', label: 'Salaries & administrative', kind: 'line', indent: 1, current: 118500, prior: 112300, detail: [
        { label: 'Service advisors', current: 64200, prior: 60800 },
        { label: 'Management & office', current: 54300, prior: 51500 },
      ] },
      { id: 'opex_mktg', label: 'Marketing & advertising', kind: 'line', indent: 1, current: 28600, prior: 24900 },
      { id: 'opex_depr', label: 'Depreciation & amortization', kind: 'line', indent: 1, current: 19800, prior: 19800 },
      { id: 'opex_other', label: 'Insurance, software & other', kind: 'line', indent: 1, current: 33400, prior: 31200 },
      { id: 'opex_total', label: 'Total operating expenses', kind: 'subtotal', current: 262300, prior: 249200 },
      { id: 'op_income', label: 'Operating income', kind: 'total', current: 130200, prior: 115700 },
      { id: 'other_hdr', label: 'Other income & expense', kind: 'header' },
      { id: 'int_exp', label: 'Interest expense', kind: 'line', indent: 1, current: -6800, prior: -7200 },
      { id: 'tax_exp', label: 'Income tax provision', kind: 'line', indent: 1, current: -29600, prior: -25900 },
      { id: 'net_income', label: 'Net income', kind: 'total', current: 93800, prior: 82600 },
    ],
  },
  balanceSheet: {
    key: 'balance_sheet',
    title: 'Balance Sheet',
    currentPeriodLabel: CUR,
    priorPeriodLabel: PRIOR,
    lines: [
      { id: 'assets_hdr', label: 'Assets', kind: 'header' },
      { id: 'ca_hdr', label: 'Current assets', kind: 'line', indent: 1 },
      { id: 'ca_cash', label: 'Cash & cash equivalents', kind: 'line', indent: 2, current: 214800, prior: 176400, detail: [
        { label: 'Operating account', current: 178300, prior: 142100 },
        { label: 'Payroll account', current: 36500, prior: 34300 },
      ] },
      { id: 'ca_ar', label: 'Accounts receivable', kind: 'line', indent: 2, current: 96200, prior: 101300, detail: [
        { label: 'Fleet accounts', current: 61200, prior: 66800 },
        { label: 'Retail / insurance', current: 35000, prior: 34500 },
      ] },
      { id: 'ca_inv', label: 'Parts & tire inventory', kind: 'line', indent: 2, current: 128400, prior: 121700 },
      { id: 'ca_total', label: 'Total current assets', kind: 'subtotal', current: 439400, prior: 399400 },
      { id: 'nca_hdr', label: 'Non-current assets', kind: 'line', indent: 1 },
      { id: 'nca_equip', label: 'Equipment & lifts (net)', kind: 'line', indent: 2, current: 186500, prior: 194200 },
      { id: 'nca_lease', label: 'Right-of-use lease asset', kind: 'line', indent: 2, current: 142000, prior: 150000 },
      { id: 'nca_total', label: 'Total non-current assets', kind: 'subtotal', current: 328500, prior: 344200 },
      { id: 'assets_total', label: 'Total assets', kind: 'total', current: 767900, prior: 743600 },
      { id: 'liab_hdr', label: 'Liabilities', kind: 'header' },
      { id: 'cl_hdr', label: 'Current liabilities', kind: 'line', indent: 1 },
      { id: 'cl_ap', label: 'Accounts payable', kind: 'line', indent: 2, current: 74300, prior: 81200, detail: [
        { label: 'Parts vendors', current: 52100, prior: 58400 },
        { label: 'Tire distributors', current: 22200, prior: 22800 },
      ] },
      { id: 'cl_accr', label: 'Accrued wages & taxes', kind: 'line', indent: 2, current: 38600, prior: 36100 },
      { id: 'cl_lease', label: 'Current lease liability', kind: 'line', indent: 2, current: 32000, prior: 31000 },
      { id: 'cl_total', label: 'Total current liabilities', kind: 'subtotal', current: 144900, prior: 148300 },
      { id: 'ltl_hdr', label: 'Long-term liabilities', kind: 'line', indent: 1 },
      { id: 'ltl_loan', label: 'Equipment loan', kind: 'line', indent: 2, current: 118000, prior: 131000 },
      { id: 'ltl_lease', label: 'Long-term lease liability', kind: 'line', indent: 2, current: 110000, prior: 119000 },
      { id: 'ltl_total', label: 'Total long-term liabilities', kind: 'subtotal', current: 228000, prior: 250000 },
      { id: 'liab_total', label: 'Total liabilities', kind: 'total', current: 372900, prior: 398300 },
      { id: 'eq_hdr', label: 'Equity', kind: 'header' },
      { id: 'eq_paid', label: 'Paid-in capital', kind: 'line', indent: 1, current: 150000, prior: 150000 },
      { id: 'eq_re', label: 'Retained earnings', kind: 'line', indent: 1, current: 245000, prior: 195300, detail: [
        { label: 'Beginning balance', current: 195300, prior: 112700 },
        { label: 'Net income for period', current: 93800, prior: 82600 },
        { label: 'Distributions', current: -44100, prior: 0 },
      ] },
      { id: 'eq_total', label: 'Total equity', kind: 'total', current: 395000, prior: 345300 },
      { id: 'liab_eq_total', label: 'Total liabilities & equity', kind: 'total', current: 767900, prior: 743600 },
    ],
  },
}
