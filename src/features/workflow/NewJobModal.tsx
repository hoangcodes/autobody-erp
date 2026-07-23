import * as React from 'react'
import { X } from 'lucide-react'
import type { OrderLabel, WorkflowStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/Dialog'
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
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useVehicleDirectory, useCreateVehicle } from '@/hooks/useVehicles'
import { useCreateOrder } from '@/hooks/useOrders'
import { toast } from '@/components/ui/toastStore'
import { formatMoney } from '@/lib/utils'

/**
 * Create-a-job modal opened from the board's "+ New Job" toolbar button. Collects
 * the new card's details with LOCAL form state (there's no order yet), then on
 * submit persists a vehicle (POST /vehicles) + an order (POST /orders) into the
 * chosen workflow column so the card lands at the top of that column.
 *
 * The field controls are the SAME ones the order-detail modal uses — imported
 * from `@/features/orders/detailFields` (SingleCombobox / AssigneeInput /
 * CustomerInput / LabelsInput / FieldRow / LevelSelect), so there's a single
 * source of truth for the combobox behaviour and the field-row layout.
 */
export function NewJobModal({
  open,
  onOpenChange,
  columns,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: WorkflowStatus[]
}) {
  const customersQuery = useCustomerDirectory()
  const vehiclesQuery = useVehicleDirectory()
  const createVehicle = useCreateVehicle()
  const createOrder = useCreateOrder()

  const customers = customersQuery.data?.items ?? []
  const vehicles = vehiclesQuery.data ?? []

  const makes = uniqStrings(vehicles.map((v) => v.make))
  const models = uniqStrings(vehicles.map((v) => v.model))
  const colors = uniqStrings([...COLOR_PRESETS, ...vehicles.map((v) => v.color)])
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear + 1 - 1990 + 1 }, (_, i) => String(currentYear + 1 - i))

  const firstColumnId = columns[0]?.id ?? ''

  // Local form state (create-then-persist).
  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState('')
  const [year, setYear] = React.useState('')
  const [make, setMake] = React.useState('')
  const [model, setModel] = React.useState('')
  const [color, setColor] = React.useState('')
  const [mechanicIds, setMechanicIds] = React.useState<string[]>([])
  const [labels, setLabels] = React.useState<OrderLabel[]>([])
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high'>('medium')
  const [effort, setEffort] = React.useState<'low' | 'medium' | 'high'>('low')
  const [description, setDescription] = React.useState('')
  const [workflowStatusId, setWorkflowStatusId] = React.useState(firstColumnId)

  // Reset the form each time the modal opens (and re-seed the default column).
  React.useEffect(() => {
    if (!open) return
    setTitle('')
    setCustomerId('')
    setYear('')
    setMake('')
    setModel('')
    setColor('')
    setMechanicIds([])
    setLabels([])
    setPriority('medium')
    setEffort('low')
    setDescription('')
    setWorkflowStatusId(firstColumnId)
    // firstColumnId is stable across a single open; re-seeding on open is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const saving = createVehicle.isPending || createOrder.isPending
  const canSubmit =
    Boolean(title.trim()) &&
    Boolean(customerId) &&
    Boolean(year) &&
    Boolean(make) &&
    Boolean(model) &&
    Boolean(color) &&
    Boolean(workflowStatusId) &&
    !saving

  async function handleSubmit() {
    if (!canSubmit) return
    try {
      const vehicle = await createVehicle.mutateAsync({
        ownerCustomerId: customerId,
        year: year ? Number(year) : undefined,
        make: make || undefined,
        model: model || undefined,
        color: color || undefined,
      })
      await createOrder.mutateAsync({
        customerId,
        vehicleId: vehicle.id,
        title: title.trim(),
        workflowStatusId,
        mechanicIds,
        labels,
        priority,
        effort,
        description: description.trim(),
      })
      toast.success('Job created', `"${title.trim()}" added to the board.`)
      onOpenChange(false)
    } catch (err) {
      toast.error('Could not create job', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="content">
        <DialogHeader>
          <DialogTitle>Create job</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-1 scrollbar-thin text-sm">
          {/* Title */}
          <FieldRow label="Title" required invalid={!title.trim()} hint="Title is required.">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Front bumper R&R"
              aria-label="Title"
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FieldRow>

          {/* Customer */}
          <FieldRow label="Customer" required invalid={!customerId} hint="Customer is required.">
            <CustomerInput value={customerId} customers={customers} onChange={setCustomerId} />
          </FieldRow>

          {/* Assignee */}
          <FieldRow label="Assignee">
            <AssigneeInput value={mechanicIds} onChange={setMechanicIds} />
          </FieldRow>

          {/* Labels */}
          <FieldRow label="Labels">
            <LabelsInput value={labels} onChange={setLabels} />
          </FieldRow>

          {/* Year */}
          <FieldRow label="Year" required invalid={!year} hint="Year is required.">
            <SingleCombobox
              value={year}
              options={years.map((y) => ({ value: y, label: y }))}
              onChange={setYear}
              placeholder="Select year"
              invalid={!year}
              ariaLabel="Year"
            />
          </FieldRow>

          {/* Make */}
          <FieldRow label="Make/Brand" required invalid={!make} hint="Make is required.">
            <SingleCombobox
              value={make}
              options={makes.map((m) => ({ value: m, label: m }))}
              onChange={setMake}
              allowNew
              placeholder="Select or add a make"
              invalid={!make}
              ariaLabel="Make"
            />
          </FieldRow>

          {/* Model */}
          <FieldRow label="Model" required invalid={!model} hint="Model is required.">
            <SingleCombobox
              value={model}
              options={models.map((m) => ({ value: m, label: m }))}
              onChange={setModel}
              allowNew
              placeholder="Select or add a model"
              invalid={!model}
              ariaLabel="Model"
            />
          </FieldRow>

          {/* Color */}
          <FieldRow label="Color" required invalid={!color} hint="Color is required.">
            <SingleCombobox
              value={color}
              options={colors.map((c) => ({ value: c, label: c }))}
              onChange={setColor}
              allowNew
              placeholder="Select or add a color"
              invalid={!color}
              ariaLabel="Color"
            />
          </FieldRow>

          {/* Priority */}
          <FieldRow label="Priority">
            <LevelSelect value={priority} onChange={setPriority} ariaLabel="Priority" />
          </FieldRow>

          {/* Effort */}
          <FieldRow label="Effort">
            <LevelSelect value={effort} onChange={setEffort} ariaLabel="Effort" />
          </FieldRow>

          {/* Description */}
          <FieldRow label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a description…"
              className="w-full resize-y rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </FieldRow>
        </div>

        {/* Footer: $0 total summary on the left; column selector + submit on the
            bottom-right (a brand-new job always totals $0). */}
        <div className="flex items-end justify-between gap-3 border-t border-border p-4">
          <div className="text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="font-semibold text-foreground">{formatMoney(0)}</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Column</span>
              <select
                value={workflowStatusId}
                onChange={(e) => setWorkflowStatusId(e.target.value)}
                aria-label="Workflow column"
                className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
              Create job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
