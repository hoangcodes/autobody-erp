import * as React from 'react'
import { Trash2 } from 'lucide-react'
import type { LineItem } from '@/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/utils'

/** Effective quantity used to compute a line's amount. Labor lines bill by
 * hours × quantity; everything else by quantity. */
function effectiveQty(item: Pick<LineItem, 'type' | 'quantity' | 'hours'>): number {
  const qty = item.quantity ?? 1
  return item.type === 'labor' ? (item.hours ?? 0) * qty : qty
}

/** A single row in the simplified services table: Item · Quantity · Price ·
 * Amount (qty × price, right-aligned). Discount lines render as a reduction. */
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

  const isLabor = item.type === 'labor'
  const isDiscount = item.type === 'discount'
  const qty = effectiveQty(item)
  const price = item.unitRetail ?? 0
  const rawAmount = qty * price
  const amount = isDiscount ? -rawAmount : rawAmount

  if (!editing) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6rem_6rem_4.5rem] items-center gap-2 border-b border-border/70 px-3 py-2 text-sm last:border-0">
        <span className="min-w-0 truncate">
          {item.name || (isDiscount ? 'Discount' : 'Item')}
          {isDiscount && <span className="ml-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">Discount</span>}
        </span>
        <span className="text-right tabular-nums text-muted-foreground">{qty}</span>
        <span className="text-right tabular-nums text-muted-foreground">{formatMoney(price)}</span>
        <span className="text-right font-medium tabular-nums">{formatMoney(amount)}</span>
        <span className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-destructive"
            onClick={onDelete}
            aria-label="Delete line item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_6rem_6rem_4.5rem] items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2 text-sm last:border-0">
      <Input
        className="h-8 text-sm"
        placeholder="Item"
        value={draft.name}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
      />
      <Input
        type="number"
        className="h-8 text-right text-sm"
        aria-label="Quantity"
        value={isLabor ? (draft.hours ?? 0) : (draft.quantity ?? 1)}
        onChange={(e) =>
          setDraft((d) =>
            isLabor ? { ...d, hours: Number(e.target.value) } : { ...d, quantity: Number(e.target.value) },
          )
        }
      />
      <Input
        type="number"
        className="h-8 text-right text-sm"
        aria-label="Price"
        value={draft.unitRetail ?? 0}
        onChange={(e) => setDraft((d) => ({ ...d, unitRetail: Number(e.target.value) }))}
      />
      <span className="text-right font-medium tabular-nums">
        {formatMoney((isDiscount ? -1 : 1) * effectiveQty(draft) * (draft.unitRetail ?? 0))}
      </span>
      <div className="flex justify-end gap-1">
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
