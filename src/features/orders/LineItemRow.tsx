import * as React from 'react'
import { Trash2 } from 'lucide-react'
import type { LineItem, LineItemType } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { formatMoney } from '@/lib/utils'

const TYPE_LABEL: Record<LineItemType, string> = {
  labor: 'Labor',
  part: 'Part',
  tire: 'Tire',
  subcontract: 'Subcontract',
  fee: 'Fee',
  discount: 'Discount',
  shop_supplies: 'Shop supplies',
  epa_fee: 'EPA fee',
}

export function LineItemRow({
  item,
  onSave,
  onDelete,
}: {
  item: LineItem
  onSave: (body: Partial<LineItem>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(item)

  const qty = item.quantity ?? 1
  const isLabor = item.type === 'labor'
  const amount = isLabor ? (item.hours ?? 0) * qty * (item.unitRetail ?? 0) : qty * (item.unitRetail ?? 0)

  if (!editing) {
    return (
      <div className="grid grid-cols-12 items-center gap-2 border-b border-border/70 px-2 py-1.5 text-sm last:border-0">
        <span className="col-span-2 text-xs font-medium text-muted-foreground">{TYPE_LABEL[item.type]}</span>
        <span className="col-span-4 truncate">{item.name}</span>
        <span className="col-span-1 text-right text-muted-foreground">{isLabor ? item.hours ?? 0 : qty}</span>
        <span className="col-span-2 text-right text-muted-foreground">{formatMoney(item.unitRetail)}</span>
        <span className="col-span-2 text-right font-medium">{formatMoney(amount)}</span>
        <span className="col-span-1 flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-destructive" onClick={onDelete} aria-label="Delete line item">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b border-border/70 bg-muted/30 px-2 py-2 text-sm last:border-0">
      <div className="col-span-2">
        <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as LineItemType }))}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        className="col-span-4 h-8 text-sm"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <Input
        type="number"
        className="col-span-1 h-8 text-sm"
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
        value={draft.unitRetail ?? 0}
        onChange={(e) => setDraft((d) => ({ ...d, unitRetail: Number(e.target.value) }))}
      />
      <div className="col-span-2 text-right text-xs text-muted-foreground">cost {formatMoney(draft.unitCost)}</div>
      <div className="col-span-1 flex justify-end gap-1">
        <Button
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => {
            onSave(draft)
            setEditing(false)
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
