import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatMoney, formatPercent } from '@/lib/utils'
import type { OrderTotals } from '@/types'

/** When `bare` is set the totals render without the surrounding Card/header, so
 * a caller can embed them inside another (collapsible) section — e.g. the
 * order-detail "Invoice" section. */
export function TotalsRail({
  totals,
  showStaffCost = true,
  bare = false,
}: {
  totals: OrderTotals | undefined
  showStaffCost?: boolean
  bare?: boolean
}) {
  const t = totals ?? {
    subtotal: 0,
    discountTotal: 0,
    feeTotal: 0,
    taxableSubtotal: 0,
    taxTotal: 0,
    total: 0,
    costTotal: 0,
    grossProfit: 0,
    grossMarginPct: 0,
  }

  const rows: [string, string][] = [
    ['Subtotal', formatMoney(t.subtotal)],
    ['Discounts', t.discountTotal ? `-${formatMoney(t.discountTotal)}` : formatMoney(0)],
    ['Fees', formatMoney(t.feeTotal)],
    ['Tax', formatMoney(t.taxTotal)],
  ]

  const body = (
    <div className="space-y-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
        <span>Total</span>
        <span>{formatMoney(t.total)}</span>
      </div>

      {showStaffCost && (
        <div className="mt-3 space-y-1.5 rounded-md bg-muted/60 p-2.5 text-xs">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground">Staff only</p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cost</span>
            <span className="font-medium">{formatMoney(t.costTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gross profit</span>
            <span className="font-medium">{formatMoney(t.grossProfit)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Margin</span>
            <span className="font-medium">{formatPercent(t.grossMarginPct)}</span>
          </div>
        </div>
      )}
    </div>
  )

  if (bare) return body

  return (
    <Card>
      <CardHeader>
        <CardTitle>Totals</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
