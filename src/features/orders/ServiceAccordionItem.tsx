import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { LineItem, LineItemType, Service } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { LineItemRow } from '@/features/orders/LineItemRow'
import { AUTH_STATUS_LABEL, AUTH_STATUS_VARIANT } from '@/features/orders/statusDisplay'
import { formatMoney } from '@/lib/utils'

export interface ServiceAccordionItemProps {
  service: Service
  onUpdateService: (body: Partial<Service>) => void
  onDeleteService: () => void
  onAddLineItem: (body: Partial<LineItem>) => void
  onUpdateLineItem: (itemId: string, body: Partial<LineItem>) => void
  onDeleteLineItem: (itemId: string) => void
}

const emptyLine = (): Partial<LineItem> => ({
  type: 'labor',
  name: '',
  quantity: 1,
  hours: 1,
  unitCost: 0,
  unitRetail: 0,
  taxable: true,
})

export function ServiceAccordionItem({
  service,
  onUpdateService,
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
    return sum + (li.type === 'labor' ? (li.hours ?? 0) * qty * (li.unitRetail ?? 0) : qty * (li.unitRetail ?? 0))
  }, 0)

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
          {service.flags.recommended && <Badge variant="warning">Recommended</Badge>}
          {service.flags.lumpSum && <Badge variant="secondary">Lump sum</Badge>}
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
          <div className="mb-2 flex flex-wrap gap-3 text-xs">
            {(
              [
                ['recommended', 'Recommended'],
                ['lumpSum', 'Lump sum'],
                ['hideLineItemPricing', 'Hide line pricing'],
                ['hideFromCustomer', 'Hide from customer'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={service.flags[key]}
                  onChange={(e) => onUpdateService({ flags: { ...service.flags, [key]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
          </div>

          {lineItems.length > 0 && (
            <div className="mb-2 rounded-md border border-border/70">
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
            <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-dashed border-primary-300 bg-primary-50/40 p-2">
              <div className="col-span-2">
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft((d) => ({ ...d, type: v as LineItemType }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['labor', 'part', 'tire', 'subcontract', 'fee', 'discount', 'shop_supplies', 'epa_fee'] as const).map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Input
                className="col-span-4 h-8 text-sm"
                placeholder="Line item name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <Input
                type="number"
                className="col-span-1 h-8 text-sm"
                placeholder="Qty/hrs"
                value={draft.type === 'labor' ? (draft.hours ?? 0) : (draft.quantity ?? 1)}
                onChange={(e) =>
                  setDraft((d) =>
                    d.type === 'labor' ? { ...d, hours: Number(e.target.value) } : { ...d, quantity: Number(e.target.value) },
                  )
                }
              />
              <Input
                type="number"
                className="col-span-2 h-8 text-sm"
                placeholder="Unit price"
                value={draft.unitRetail ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, unitRetail: Number(e.target.value) }))}
              />
              <Input
                type="number"
                className="col-span-2 h-8 text-sm"
                placeholder="Unit cost"
                value={draft.unitCost ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, unitCost: Number(e.target.value) }))}
              />
              <div className="col-span-1 flex justify-end gap-1">
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
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingLine(true)}>
              + Add line item
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
