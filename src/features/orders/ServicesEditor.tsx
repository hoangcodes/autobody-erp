import * as React from 'react'
import { ChevronDown, FileText, Paperclip, X } from 'lucide-react'
import type { MessageChannel, Order, OrderAttachment, Vehicle } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { CarBrandMark } from '@/components/CarBrandMark'
import {
  FieldRow,
  LevelSelect,
  SingleCombobox,
  AssigneeInput,
  CustomerInput,
  LabelsInput,
  COLOR_PRESETS,
  uniqStrings,
} from '@/features/orders/detailFields'
import { ServiceAccordionItem } from '@/features/orders/ServiceAccordionItem'
import { VehiclePhotoCarousel } from '@/features/workflow/VehiclePhotoCarousel'
import { TotalsRail } from '@/features/orders/TotalsRail'
import { SendOrderDialog } from '@/features/orders/SendOrderDialog'
import { CollectPaymentModal } from '@/features/checkout/CollectPaymentModal'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useVehicleDirectory, useUpdateVehicle } from '@/hooks/useVehicles'
import {
  useCreateService,
  useDeleteService,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useUpdateOrder,
} from '@/hooks/useOrders'
import { toast } from '@/components/ui/toastStore'
import { cn, customerDisplayName, formatDateTime, formatMoney, uuid, vehicleColorFirst } from '@/lib/utils'

export function ServicesEditor({ order }: { order: Order }) {
  const [sendOpen, setSendOpen] = React.useState(false)
  const [payOpen, setPayOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [sendChannel, setSendChannel] = React.useState<MessageChannel>('sms')

  function openSend(channel: MessageChannel) {
    setSendChannel(channel)
    setSendOpen(true)
  }

  const createService = useCreateService(order.id)
  const deleteService = useDeleteService(order.id)
  const createLineItem = useCreateLineItem(order.id)
  const updateLineItem = useUpdateLineItem(order.id)
  const deleteLineItem = useDeleteLineItem(order.id)

  // Fully paid: no balance remaining AND the invoice actually has a total (so a
  // brand-new $0 order doesn't show "Paid"). Drives the green Invoice badge.
  const isPaid = order.balanceDue <= 0 && order.totals.total > 0

  function handleAddService() {
    createService.mutate(
      { title: 'New service', flags: { recommended: false, lumpSum: false, hideLineItemPricing: false, hideFromCustomer: false } },
      {
        onError: (err) => toast.error('Could not add service', err instanceof Error ? err.message : undefined),
      },
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px_220px]">
      {/* COL 1 (MAIN) — Key Details (Description) → Attachments → Services → Photos. */}
      <div className="min-w-0 space-y-4">
        {/* Key Details — a lightweight collapsible group (NO Card/Section chrome).
         * Collapses ONLY its own content (the Description). Attachments is a
         * separate, sibling collapsible below (not a child), so collapsing Key
         * Details never hides Attachments. */}
        <Collapsible title="Key Details" headingClassName="text-base">
          <DescriptionBlock order={order} />
        </Collapsible>

        <AttachmentsBlock order={order} />

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
                  onDeleteService={() => deleteService.mutate(service.id)}
                  onAddLineItem={(body) => createLineItem.mutate({ serviceId: service.id, body })}
                  onUpdateLineItem={(itemId, body) => updateLineItem.mutate({ itemId, body })}
                  onDeleteLineItem={(itemId) => deleteLineItem.mutate(itemId)}
                />
              ))}
            </div>
          )}
        </Section>

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
        <Section
          title="Invoice"
          right={
            isPaid ? (
              <Badge variant="success">Paid</Badge>
            ) : undefined
          }
        >
          <div className="space-y-3">
            <TotalsRail totals={order.totals} bare />
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {/* Remaining balance line — the amount now lives here, not on the button. */}
              <p className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remaining balance</span>
                <span className="font-semibold text-foreground">
                  {order.balanceDue > 0 ? formatMoney(order.balanceDue) : 'Paid in full'}
                </span>
              </p>
              {/* Most prominent CTA: dark-grey Accept Payment with a same-tone
               * (non-blue) border so it has an edge without a colored outline. */}
              <Button
                onClick={() => setPayOpen(true)}
                className="bg-slate-700 text-white border border-slate-700 hover:bg-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"
              >
                Accept Payment
              </Button>
              {/* Invoice-send actions (primary) — bordered to match the set. */}
              <Button className="border border-primary-700 dark:border-primary-400" onClick={() => openSend('email')}>
                Email Invoice
              </Button>
              <Button className="border border-primary-700 dark:border-primary-400" onClick={() => openSend('sms')}>
                SMS Invoice
              </Button>
              {/* Print — same grey as Preview Print. */}
              <Button
                onClick={() => window.print()}
                className="bg-slate-500 text-white border border-slate-600 hover:bg-slate-600 dark:bg-slate-600 dark:border-slate-500 dark:hover:bg-slate-500"
              >
                Print
              </Button>
              {/* Preview Print — same grey; opens a read-only invoice preview. */}
              <Button
                onClick={() => setPreviewOpen(true)}
                className="bg-slate-500 text-white border border-slate-600 hover:bg-slate-600 dark:bg-slate-600 dark:border-slate-500 dark:hover:bg-slate-500"
              >
                Preview Print
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
      <InvoicePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} order={order} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Left-chevron collapsible — a lightweight header (chevron LEFT of the title)
// that toggles its body. Used for the "Key Details" group and its Description /
// Attachments children. Deliberately NOT the Card `Section` chrome. An optional
// `right` slot sits opposite the title (e.g. Attachments' "Attach files").
// ---------------------------------------------------------------------------
function Collapsible({
  title,
  right,
  defaultOpen = true,
  headingClassName,
  children,
}: {
  title: string
  right?: React.ReactNode
  defaultOpen?: boolean
  headingClassName?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
            aria-hidden="true"
          />
          <h3 className={cn('truncate text-sm font-semibold text-foreground', headingClassName)}>{title}</h3>
        </button>
        {right}
      </div>
      {open && <div className="pt-2">{children}</div>}
    </div>
  )
}

/** Read-only invoice preview (reuses the Dialog + the attachments preview
 * pattern). Renders a clean invoice: shop/brand header, customer + vehicle, the
 * services/line items (quantity/price/amount), and the totals. */
function InvoicePreviewDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
}) {
  const customersQuery = useCustomerDirectory()
  const directory = useVehicleDirectory()
  const customer = (customersQuery.data?.items ?? []).find((c) => c.id === order.customerId)
  const vehicle = (directory.data ?? []).find((v) => v.id === order.vehicleId)

  const rows: { name: string; qty: number; price: number; amount: number }[] = []
  for (const svc of order.services ?? []) {
    for (const li of svc.lineItems ?? []) {
      const qty = li.quantity ?? 1
      const eff = li.type === 'labor' ? (li.hours ?? 0) * qty : qty
      const raw = eff * (li.unitRetail ?? 0)
      rows.push({
        name: li.name || (li.type === 'discount' ? 'Discount' : 'Item'),
        qty: eff,
        price: li.unitRetail ?? 0,
        amount: li.type === 'discount' ? -raw : raw,
      })
    }
  }

  const t = order.totals

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Invoice preview</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto p-6 scrollbar-thin">
          {/* Shop / brand header */}
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-lg font-bold text-foreground">ABS Autobody</p>
              <p className="text-xs text-muted-foreground">128 Market St, Denver, CO</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">Invoice #{order.number}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(order.invoicedAt ?? order.createdAt)}</p>
            </div>
          </div>

          {/* Customer + vehicle */}
          <div className="grid grid-cols-2 gap-4 border-b border-border py-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Bill to</p>
              <p className="font-medium text-foreground">{customerDisplayName(customer)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vehicle</p>
              <p className="font-medium text-foreground">{vehicleColorFirst(vehicle)}</p>
            </div>
          </div>

          {/* Line items */}
          <table className="mt-4 w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left font-semibold">Item</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Price</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No line items.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-2 text-foreground">{r.name}</td>
                    <td className="py-2 text-right text-muted-foreground">{r.qty}</td>
                    <td className="py-2 text-right text-muted-foreground">{formatMoney(r.price)}</td>
                    <td className="py-2 text-right font-medium text-foreground">{formatMoney(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground">{formatMoney(t?.subtotal)}</span>
            </div>
            {t?.discountTotal ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Discounts</span>
                <span className="font-medium text-foreground">-{formatMoney(t.discountTotal)}</span>
              </div>
            ) : null}
            {t?.feeTotal ? (
              <div className="flex justify-between text-muted-foreground">
                <span>Fees</span>
                <span className="font-medium text-foreground">{formatMoney(t.feeTotal)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="font-medium text-foreground">{formatMoney(t?.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(t?.total)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        <AssigneeInput value={order.mechanicIds ?? []} onChange={(ids) => patchOrder({ mechanicIds: ids })} />
      </FieldRow>

      {/* 3. Customer — single combobox → order.customerId. */}
      <FieldRow label="Customer">
        <CustomerInput value={order.customerId} customers={customers} onChange={(id) => patchOrder({ customerId: id })} />
      </FieldRow>

      {/* 4. Labels — multi combobox → order.labels. */}
      <FieldRow label="Labels">
        <LabelsInput value={order.labels ?? []} onChange={(labels) => patchOrder({ labels })} />
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

      {/* 12. Created — read-only. */}
      <FieldRow label="Created">
        <span className="text-foreground">{formatDateTime(order.createdAt)}</span>
      </FieldRow>

      {/* 13. Updated — read-only (bumped on every edit). */}
      <FieldRow label="Updated">
        <span className="text-foreground">{formatDateTime(order.updatedAt)}</span>
      </FieldRow>
    </div>
  )
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

  // Description is a plain label + inline-editable content (NO collapse chevron).
  return (
    <div>
      <h3 className="pb-2 text-sm font-semibold text-foreground">Description</h3>
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

/** Human-readable file size, e.g. 2048 -> "2 KB". */
function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const size = bytes / Math.pow(1024, i)
  return `${size >= 10 || i === 0 ? Math.round(size) : size.toFixed(1)} ${units[i]}`
}

/** Jira-style Attachments area (main column, inside the "Key details" group).
 * "Attach files" opens a hidden multi-file picker; each file is read via
 * FileReader into a data URL and persisted on the order (PATCH /orders/:id
 * { attachments }). Images render as thumbnails, others as a file-icon tile.
 * Clicking a tile opens a preview lightbox; each tile has an (x) to remove. */
function AttachmentsBlock({ order }: { order: Order }) {
  const updateOrder = useUpdateOrder(order.id)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<OrderAttachment | null>(null)
  const attachments = order.attachments ?? []

  function persist(next: OrderAttachment[]) {
    updateOrder.mutate(
      { attachments: next },
      { onError: (err) => toast.error('Could not update attachments', err instanceof Error ? err.message : undefined) },
    )
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const readers = Array.from(files).map(
      (file) =>
        new Promise<OrderAttachment>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            resolve({ id: uuid(), name: file.name, type: file.type, url: String(reader.result), size: file.size })
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        }),
    )
    Promise.all(readers)
      .then((added) => persist([...attachments, ...added]))
      .catch(() => toast.error('Could not read file'))
  }

  function remove(id: string) {
    persist(attachments.filter((a) => a.id !== id))
  }

  return (
    <Collapsible
      title="Attachments"
      right={
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} loading={updateOrder.isPending}>
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Attach files
        </Button>
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {attachments.length === 0 ? (
        <p className="px-0.5 text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
          {attachments.map((att) => {
            const isImage = att.type.startsWith('image/')
            return (
              <div
                key={att.id}
                className="group relative overflow-hidden rounded-md border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setPreview(att)}
                  title={att.name}
                  className="block w-full text-left"
                >
                  {isImage ? (
                    <img src={att.url} alt={att.name} className="h-20 w-full object-cover" />
                  ) : (
                    <div className="flex h-20 items-center justify-center bg-muted">
                      <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="px-2 py-1">
                    <p className="truncate text-xs font-medium text-foreground">{att.name}</p>
                    {att.size ? <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p> : null}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => remove(att.id)}
                  aria-label={`Remove ${att.name}`}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-slate-900/80 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <AttachmentPreviewDialog attachment={preview} onClose={() => setPreview(null)} />
    </Collapsible>
  )
}

/** Lightbox preview for an attachment. Images render large; non-images show
 * name/type/size with a note that inline preview isn't available plus an
 * open/download link (the url is a data URL). Closes on overlay click / X. */
function AttachmentPreviewDialog({
  attachment,
  onClose,
}: {
  attachment: OrderAttachment | null
  onClose: () => void
}) {
  const isImage = attachment?.type.startsWith('image/') ?? false
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="truncate">{attachment?.name ?? 'Attachment'}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="p-5">
          {attachment && isImage ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="mx-auto max-h-[70vh] w-auto rounded-md object-contain"
            />
          ) : attachment ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FileText className="h-14 w-14 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {attachment.type || 'Unknown type'}
                  {attachment.size ? ` · ${formatBytes(attachment.size)}` : ''}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Preview isn’t available for this file type.</p>
              <a
                href={attachment.url}
                download={attachment.name}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary-700 underline-offset-4 hover:underline dark:text-primary-300"
              >
                Open / download
              </a>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
