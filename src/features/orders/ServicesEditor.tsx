import * as React from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { Customer, MessageChannel, Order, OrderLabel, OrderLabelColor, Vehicle } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MechanicAvatar } from '@/components/MechanicAvatar'
import { CarBrandMark } from '@/components/CarBrandMark'
import { MultiCombobox, useOutsideClose, type ComboOption } from '@/components/ui/MultiCombobox'
import { ServiceAccordionItem } from '@/features/orders/ServiceAccordionItem'
import { VehiclePhotoCarousel } from '@/features/workflow/VehiclePhotoCarousel'
import { TotalsRail } from '@/features/orders/TotalsRail'
import { SendOrderDialog } from '@/features/orders/SendOrderDialog'
import { CollectPaymentModal } from '@/features/checkout/CollectPaymentModal'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useVehicleDirectory, useUpdateVehicle } from '@/hooks/useVehicles'
import { useUsers } from '@/hooks/useUsers'
import {
  useCreateService,
  useUpdateService,
  useDeleteService,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useConvertOrder,
  useUpdateOrder,
} from '@/hooks/useOrders'
import { toast } from '@/components/ui/toastStore'
import { cn, customerDisplayName, formatMoney, uuid, vehicleColorFirst } from '@/lib/utils'

/** Tailwind classes per label color — shared by the chips and the label combobox. */
const LABEL_CLASSES: Record<OrderLabelColor, string> = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
}

/** Small solid dot per label color — used as the option `leading` in the combobox. */
const LABEL_DOT: Record<OrderLabelColor, string> = {
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  gray: 'bg-slate-400',
}

/** Lightweight preset palette for the "Labels" combobox. Picking one appends it
 * to the order (via PATCH /orders/:id) so it then shows on the board card. */
const PRESET_LABELS: { text: string; color: OrderLabelColor }[] = [
  { text: 'VIP', color: 'purple' },
  { text: 'Rush', color: 'red' },
  { text: 'Waiting on parts', color: 'orange' },
  { text: 'Approved', color: 'green' },
  { text: 'Insurance', color: 'blue' },
  { text: 'Follow up', color: 'gray' },
]

/** Common paint colors offered in the Color combobox (users can still add new). */
const COLOR_PRESETS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Gold', 'Beige', 'Brown', 'Orange', 'Yellow',
]

export function ServicesEditor({ order }: { order: Order }) {
  const [sendOpen, setSendOpen] = React.useState(false)
  const [payOpen, setPayOpen] = React.useState(false)
  const [sendChannel, setSendChannel] = React.useState<MessageChannel>('sms')

  function openSend(channel: MessageChannel) {
    setSendChannel(channel)
    setSendOpen(true)
  }

  const createService = useCreateService(order.id)
  const updateService = useUpdateService(order.id)
  const deleteService = useDeleteService(order.id)
  const createLineItem = useCreateLineItem(order.id)
  const updateLineItem = useUpdateLineItem(order.id)
  const deleteLineItem = useDeleteLineItem(order.id)
  const convertOrder = useConvertOrder(order.id)

  const nextConversion = order.status === 'estimate' ? 'repair_order' : order.status === 'repair_order' ? 'invoice' : null

  function handleAddService() {
    createService.mutate(
      { title: 'New service', flags: { recommended: false, lumpSum: false, hideLineItemPricing: false, hideFromCustomer: false } },
      {
        onError: (err) => toast.error('Could not add service', err instanceof Error ? err.message : undefined),
      },
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px_240px]">
      {/* COL 1 (MAIN) — Services (top) → Description → Photos (bottom). */}
      <div className="min-w-0 space-y-4">
        <Section
          title="Services"
          right={
            <Button size="sm" variant="outline" onClick={handleAddService} loading={createService.isPending}>
              + Add service
            </Button>
          }
        >
          {(order.services ?? []).length === 0 ? (
            <EmptyState title="No services yet" description="Add a service to start building this estimate." />
          ) : (
            <div className="space-y-3">
              {(order.services ?? []).map((service) => (
                <ServiceAccordionItem
                  key={service.id}
                  service={service}
                  onUpdateService={(body) => updateService.mutate({ serviceId: service.id, body })}
                  onDeleteService={() => deleteService.mutate(service.id)}
                  onAddLineItem={(body) => createLineItem.mutate({ serviceId: service.id, body })}
                  onUpdateLineItem={(itemId, body) => updateLineItem.mutate({ itemId, body })}
                  onDeleteLineItem={(itemId) => deleteLineItem.mutate(itemId)}
                />
              ))}
            </div>
          )}
        </Section>

        <DescriptionBlock order={order} />

        <Section title="Photos">
          <VehiclePhotoCarousel orderId={order.id} vehicleId={order.vehicleId} photos={order.photos ?? []} />
        </Section>
      </div>

      {/* COL 2 — "Details" as one editable field form. */}
      <div>
        <Section title="Details">
          <DetailsForm order={order} />
        </Section>
      </div>

      {/* COL 3 — "Invoice" (totals + actions). */}
      <div>
        <Section title="Invoice">
          <div className="space-y-3">
            <TotalsRail totals={order.totals} bare />
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Button onClick={() => openSend('sms')}>Send</Button>
              {nextConversion && (
                <Button
                  variant="secondary"
                  loading={convertOrder.isPending}
                  onClick={() =>
                    convertOrder.mutate(nextConversion, {
                      onSuccess: () => toast.success('Order converted', `Now a ${nextConversion.replace('_', ' ')}`),
                      onError: (err) => toast.error('Could not convert', err instanceof Error ? err.message : undefined),
                    })
                  }
                >
                  Convert to {nextConversion === 'repair_order' ? 'Repair Order' : 'Invoice'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setPayOpen(true)}>
                Collect Payment{order.balanceDue > 0 ? ` (${formatMoney(order.balanceDue)})` : ''}
              </Button>
              <Button variant="ghost" onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="ghost" onClick={() => openSend('email')}>
                Email to customer
              </Button>
              <Button variant="ghost" onClick={() => openSend('sms')}>
                SMS to customer
              </Button>
            </div>
          </div>
        </Section>
      </div>

      <SendOrderDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        orderId={order.id}
        orderNumber={order.number}
        customerId={order.customerId}
        status={order.status}
        defaultChannel={sendChannel}
      />
      <CollectPaymentModal open={payOpen} onOpenChange={setPayOpen} orderId={order.id} balanceDue={order.balanceDue} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section — a Card with a larger header and a chevron to the LEFT of
// the title that toggles the body (local state, default expanded). Optional
// `right` slot (e.g. the Services "+ Add service" button) sits opposite.
// ---------------------------------------------------------------------------
function Section({
  title,
  right,
  defaultOpen = true,
  children,
}: {
  title: string
  right?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
            aria-hidden="true"
          />
          <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
        </button>
        {right}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Details field form
// ---------------------------------------------------------------------------

/** The "Details" form: one editable field per row. Order fields persist via
 * `PATCH /orders/:id` (assignee/customer/labels/start date/priority/effort);
 * vehicle fields persist via `PATCH /vehicles/:id` (year/make/model/color). The
 * mocks `Object.assign`, so edits reflect on the board immediately. */
function DetailsForm({ order }: { order: Order }) {
  const updateOrder = useUpdateOrder(order.id)
  const updateVehicle = useUpdateVehicle()
  const directory = useVehicleDirectory()
  const customersQuery = useCustomerDirectory()

  const vehicles = directory.data ?? []
  const vehicle = vehicles.find((v) => v.id === order.vehicleId)
  const customers = customersQuery.data?.items ?? []

  const makes = uniqStrings(vehicles.map((v) => v.make))
  const models = uniqStrings(vehicles.map((v) => v.model))
  const colors = uniqStrings([...COLOR_PRESETS, ...vehicles.map((v) => v.color)])
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => String(currentYear + 1 - i))

  function patchOrder(body: Partial<Order>) {
    updateOrder.mutate(body, {
      onError: (err) => toast.error('Could not update order', err instanceof Error ? err.message : undefined),
    })
  }
  function patchVehicle(body: Partial<Vehicle>) {
    updateVehicle.mutate(
      { id: order.vehicleId, body },
      { onError: (err) => toast.error('Could not update vehicle', err instanceof Error ? err.message : undefined) },
    )
  }

  const year = vehicle?.year ? String(vehicle.year) : ''
  const make = vehicle?.make ?? ''
  const model = vehicle?.model ?? ''
  const color = vehicle?.color ?? ''

  return (
    <div className="text-sm">
      {/* 1. Vehicle — display only (derived from the fields below). */}
      <FieldRow label="Vehicle">
        <div className="flex items-center gap-1.5">
          <CarBrandMark make={vehicle?.make} size={16} />
          <span className="font-medium text-foreground">{vehicleColorFirst(vehicle)}</span>
        </div>
      </FieldRow>

      {/* 2. Assignee — multi-select over team members → order.mechanicIds. */}
      <FieldRow label="Assignee">
        <AssigneeField order={order} onChange={(ids) => patchOrder({ mechanicIds: ids })} />
      </FieldRow>

      {/* 3. Customer — single combobox → order.customerId. */}
      <FieldRow label="Customer">
        <CustomerField order={order} customers={customers} onChange={(id) => patchOrder({ customerId: id })} />
      </FieldRow>

      {/* 4. Labels — multi combobox → order.labels. */}
      <FieldRow label="Labels">
        <LabelsField order={order} onChange={(labels) => patchOrder({ labels })} />
      </FieldRow>

      {/* 5. Year (mandatory) → vehicle.year */}
      <FieldRow label="Year" required invalid={!year} hint="Year is required.">
        <SingleCombobox
          value={year}
          options={years.map((y) => ({ value: y, label: y }))}
          onChange={(v) => patchVehicle({ year: v ? Number(v) : undefined })}
          placeholder="Select year"
          invalid={!year}
          ariaLabel="Year"
        />
      </FieldRow>

      {/* 6. Make/Brand (mandatory, +New) → vehicle.make */}
      <FieldRow label="Make/Brand" required invalid={!make} hint="Make is required.">
        <SingleCombobox
          value={make}
          options={makes.map((m) => ({ value: m, label: m }))}
          onChange={(v) => patchVehicle({ make: v })}
          allowNew
          placeholder="Select or add a make"
          invalid={!make}
          ariaLabel="Make"
        />
      </FieldRow>

      {/* 7. Model (mandatory, +New) → vehicle.model */}
      <FieldRow label="Model" required invalid={!model} hint="Model is required.">
        <SingleCombobox
          value={model}
          options={models.map((m) => ({ value: m, label: m }))}
          onChange={(v) => patchVehicle({ model: v })}
          allowNew
          placeholder="Select or add a model"
          invalid={!model}
          ariaLabel="Model"
        />
      </FieldRow>

      {/* 8. Color (mandatory, +New) → vehicle.color */}
      <FieldRow label="Color" required invalid={!color} hint="Color is required.">
        <SingleCombobox
          value={color}
          options={colors.map((c) => ({ value: c, label: c }))}
          onChange={(v) => patchVehicle({ color: v })}
          allowNew
          placeholder="Select or add a color"
          invalid={!color}
          ariaLabel="Color"
        />
      </FieldRow>

      {/* 9. Start date → order.startDate */}
      <FieldRow label="Start date">
        <input
          type="date"
          value={order.startDate ?? ''}
          onChange={(e) => patchOrder({ startDate: e.target.value })}
          aria-label="Start date"
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </FieldRow>

      {/* 10. Priority → order.priority */}
      <FieldRow label="Priority">
        <LevelSelect value={order.priority ?? 'medium'} onChange={(v) => patchOrder({ priority: v })} ariaLabel="Priority" />
      </FieldRow>

      {/* 11. Effort → order.effort */}
      <FieldRow label="Effort">
        <LevelSelect value={order.effort ?? 'low'} onChange={(v) => patchOrder({ effort: v })} ariaLabel="Effort" />
      </FieldRow>
    </div>
  )
}

/** A single Details-form row: a small uppercase-muted label (with an optional
 * required asterisk) above its control. Shows a red hint when a required field
 * is empty. Rows stack with a divider between them. */
function FieldRow({
  label,
  required = false,
  invalid = false,
  hint,
  children,
}: {
  label: string
  required?: boolean
  invalid?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </p>
      {children}
      {required && invalid && <p className="pt-1 text-[11px] text-red-500">{hint ?? 'Required.'}</p>}
    </div>
  )
}

/** Low / Medium / High native dropdown (Priority + Effort). */
function LevelSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: 'low' | 'medium' | 'high'
  onChange: (v: 'low' | 'medium' | 'high') => void
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'low' | 'medium' | 'high')}
      aria-label={ariaLabel}
      className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  )
}

// ---------------------------------------------------------------------------
// Inline comboboxes (reusable "text + list" controls)
// ---------------------------------------------------------------------------

/** Single-select combobox: a text input that filters `options`; picking one sets
 * the value. With `allowNew`, an unmatched query offers a "+ Add …" row that
 * commits the raw text as the value. */
function SingleCombobox({
  value,
  options,
  onChange,
  placeholder,
  allowNew = false,
  invalid = false,
  ariaLabel,
}: {
  value: string
  options: ComboOption[]
  onChange: (value: string) => void
  placeholder?: string
  allowNew?: boolean
  invalid?: boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)
  useOutsideClose(ref, open, () => setOpen(false))

  const selected = options.find((o) => o.value === value)
  const selectedLabel = selected?.label ?? value ?? ''

  const q = query.trim().toLowerCase()
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q))
  const hasExact = options.some((o) => o.label.toLowerCase() === q)
  const showCreate = allowNew && q.length > 0 && !hasExact

  function choose(v: string) {
    onChange(v)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border bg-card px-2',
          invalid ? 'border-red-400' : 'border-input',
          open && 'ring-2 ring-ring',
        )}
      >
        {!open && selected?.leading}
        <input
          value={open ? query : selectedLabel}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => {
            setOpen(true)
            setQuery('')
            e.currentTarget.select()
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-pop animate-fade-in">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted',
                o.value === value && 'font-medium',
              )}
            >
              {o.leading}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(query.trim())}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary-700 hover:bg-muted dark:text-primary-300"
            >
              + Add “{query.trim()}”
            </button>
          )}
          {filtered.length === 0 && !showCreate && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Assignee field — multi combobox over the team roster → order.mechanicIds. */
function AssigneeField({ order, onChange }: { order: Order; onChange: (ids: string[]) => void }) {
  const usersQuery = useUsers()
  const roster = usersQuery.data ?? []
  const nameById = new Map(roster.map((u) => [u.id, u.name]))
  const options: ComboOption[] = roster.map((u) => ({
    value: u.id,
    label: u.name,
    leading: <MechanicAvatar id={u.id} name={u.name} size={20} />,
  }))

  return (
    <MultiCombobox
      values={order.mechanicIds ?? []}
      options={options}
      onChange={onChange}
      placeholder="Assign team members"
      ariaLabel="Assignee"
      renderChip={(id, remove) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-0.5 pr-1.5 text-[11px] font-medium text-foreground">
          <MechanicAvatar id={id} name={nameById.get(id)} size={18} />
          {nameById.get(id) ?? 'Unknown'}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              remove()
            }}
            aria-label="Remove assignee"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    />
  )
}

/** Customer field — single combobox (text + list) over customers → order.customerId. */
function CustomerField({
  order,
  customers,
  onChange,
}: {
  order: Order
  customers: Customer[]
  onChange: (id: string) => void
}) {
  const options: ComboOption[] = customers.map((c) => ({ value: c.id, label: customerDisplayName(c) }))
  return (
    <SingleCombobox
      value={order.customerId}
      options={options}
      onChange={onChange}
      placeholder="Select customer"
      ariaLabel="Customer"
    />
  )
}

/** Labels field — multi combobox over preset palette + this order's labels.
 * Selecting/removing persists order.labels (each label keeps its color; a
 * newly-typed label defaults to gray). */
function LabelsField({ order, onChange }: { order: Order; onChange: (labels: OrderLabel[]) => void }) {
  const labels = order.labels ?? []

  const colorByText = new Map<string, OrderLabelColor>()
  PRESET_LABELS.forEach((p) => colorByText.set(p.text.toLowerCase(), p.color))
  labels.forEach((l) => colorByText.set(l.text.toLowerCase(), l.color))

  // Options = preset palette + any existing labels, de-duplicated by text.
  const seen = new Set<string>()
  const options: ComboOption[] = []
  for (const { text } of [...PRESET_LABELS, ...labels]) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const color = colorByText.get(key) ?? 'gray'
    options.push({
      value: text,
      label: text,
      leading: <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', LABEL_DOT[color])} />,
    })
  }

  const values = labels.map((l) => l.text)

  function handleChange(texts: string[]) {
    const next: OrderLabel[] = texts.map((t) => {
      const existing = labels.find((l) => l.text.toLowerCase() === t.toLowerCase())
      if (existing) return existing
      return { id: uuid(), text: t, color: colorByText.get(t.toLowerCase()) ?? 'gray' }
    })
    onChange(next)
  }

  return (
    <MultiCombobox
      values={values}
      options={options}
      onChange={handleChange}
      allowNew
      placeholder="Add label"
      ariaLabel="Labels"
      renderChip={(text, remove) => {
        const color = colorByText.get(text.toLowerCase()) ?? 'gray'
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
              LABEL_CLASSES[color],
            )}
          >
            {text}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove()
              }}
              aria-label={`Remove ${text}`}
              className="rounded-full hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      }}
    />
  )
}

/** De-duplicate (case-insensitive), drop empties, and sort a list of strings. */
function uniqStrings(list: (string | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const v = (item ?? '').trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** Jira-style editable Description block (main column). Shows the description
 * text or a muted "Add a description…" placeholder; clicking enters edit mode
 * (textarea + Save / Cancel). Saves via PATCH /orders/:id ({ description }). */
function DescriptionBlock({ order }: { order: Order }) {
  const updateOrder = useUpdateOrder(order.id)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(order.description ?? '')

  function save() {
    setEditing(false)
    if ((draft ?? '') !== (order.description ?? '')) {
      updateOrder.mutate(
        { description: draft },
        { onError: (err) => toast.error('Could not update description', err instanceof Error ? err.message : undefined) },
      )
    }
  }

  return (
    <div>
      <h3 className="pb-1.5 text-sm font-semibold">Description</h3>
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            placeholder="Add a description…"
            className="w-full resize-y rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(order.description ?? '')
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(order.description ?? '')
            setEditing(true)
          }}
          title="Click to edit"
          className="block w-full rounded-md border border-transparent px-2.5 py-2 text-left text-sm transition-colors hover:border-border hover:bg-muted/50"
        >
          {order.description ? (
            <span className="whitespace-pre-wrap text-foreground">{order.description}</span>
          ) : (
            <span className="text-muted-foreground">Add a description…</span>
          )}
        </button>
      )}
    </div>
  )
}
