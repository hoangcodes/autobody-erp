import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { LineItem, Service } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LineItemRow } from '@/features/orders/LineItemRow'
import { AUTH_STATUS_LABEL, AUTH_STATUS_VARIANT } from '@/features/orders/statusDisplay'
import { formatMoney } from '@/lib/utils'

export interface ServiceAccordionItemProps {
  service: Service
  onDeleteService: () => void
  onAddLineItem: (body: Partial<LineItem>) => void
  onUpdateLineItem: (itemId: string, body: Partial<LineItem>) => void
  onDeleteLineItem: (itemId: string) => void
}

/** A blank line item. Regular items default to `part` so the Quantity field maps
 * to `quantity` (labor items bill by hours; discounts are added separately). */
const emptyLine = (): Partial<LineItem> => ({
  type: 'part',
  name: '',
  quantity: 1,
  unitCost: 0,
  unitRetail: 0,
  taxable: true,
})

export function ServiceAccordionItem({
  service,
  onDeleteService,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
}: ServiceAccordionItemProps) {
  const [expanded, setExpanded] = React.useState(true)
  const [addingLine, setAddingLine] = React.useState(false)
  const [draft, setDraft] = React.useState<Partial<LineItem>>(emptyLine())

  const lineItems = service.lineItems ?? []
  const serviceTotal = lineItems.reduce((sum, li) => {
    const qty = li.quantity ?? 1
    const amount = li.type === 'labor' ? (li.hours ?? 0) * qty * (li.unitRetail ?? 0) : qty * (li.unitRetail ?? 0)
    return sum + (li.type === 'discount' ? -amount : amount)
  }, 0)

  function addDiscount() {
    onAddLineItem({ type: 'discount', name: 'Discount', quantity: 1, unitCost: 0, unitRetail: 0, taxable: false })
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <span className="text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <span className="text-sm font-semibold">{service.title}</span>
          <Badge variant={AUTH_STATUS_VARIANT[service.authorizationStatus]}>
            {AUTH_STATUS_LABEL[service.authorizationStatus]}
          </Badge>
          {service.deferred && <Badge variant="outline">Deferred</Badge>}
        </button>
        <span className="text-sm font-medium">{formatMoney(serviceTotal)}</span>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDeleteService}>
          Remove
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 pt-2">
          {lineItems.length > 0 && (
            <div className="mb-2 w-full overflow-hidden rounded-md border border-border/70">
              {/* Column header — Item | Quantity | Price | Amount. */}
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6rem_6rem_4.5rem] items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Item</span>
                <span className="text-right">Quantity</span>
                <span className="text-right">Price</span>
                <span className="text-right">Amount</span>
                <span className="sr-only">Actions</span>
              </div>
              {lineItems.map((li) => (
                <LineItemRow
                  key={li.id}
                  item={li}
                  onSave={(body) => onUpdateLineItem(li.id, body)}
                  onDelete={() => onDeleteLineItem(li.id)}
                />
              ))}
            </div>
          )}

          {addingLine ? (
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6rem_auto] items-center gap-2 rounded-md border border-dashed border-primary-300 bg-primary-50/40 p-2 dark:border-primary-500/40 dark:bg-primary-500/5">
              <Input
                className="h-8 text-sm"
                placeholder="Item"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <Input
                type="number"
                className="h-8 text-right text-sm"
                placeholder="Qty"
                aria-label="Quantity"
                value={draft.quantity ?? 1}
                onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) }))}
              />
              <Input
                type="number"
                className="h-8 text-right text-sm"
                placeholder="Price"
                aria-label="Price"
                value={draft.unitRetail ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, unitRetail: Number(e.target.value) }))}
              />
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    if (!draft.name?.trim()) return
                    onAddLineItem(draft)
                    setDraft(emptyLine())
                    setAddingLine(false)
                  }}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setDraft(emptyLine())
                    setAddingLine(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddingLine(true)}>
                + Add line item
              </Button>
              <Button variant="ghost" size="sm" onClick={addDiscount}>
                + Add discount
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
