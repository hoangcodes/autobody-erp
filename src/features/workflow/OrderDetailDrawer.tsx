import * as React from 'react'
import { X } from 'lucide-react'
import { useOrder, useUpdateOrder } from '@/hooks/useOrders'
import { useWorkflowStatuses } from '@/hooks/useWorkflowStatuses'
import { orderGlLines } from '@/features/orders/glImpact'
import { toast } from '@/components/ui/toastStore'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { ServicesEditor } from '@/features/orders/ServicesEditor'
import { InspectionsTab } from '@/features/workflow/InspectionsTab'
import { PaymentsTab } from '@/features/workflow/PaymentsTab'
import { ActivityTab } from '@/features/workflow/ActivityTab'
import { SystemNotesTab } from '@/features/workflow/SystemNotesTab'
import { MessageThread } from '@/features/messaging/MessageThread'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/features/orders/statusDisplay'
import { formatMoney } from '@/lib/utils'
import type { Order } from '@/types'

export interface OrderDetailDrawerProps {
  orderId: string
  onClose: () => void
}

/** The priority screen: the kanban card detail. A large, Jira-issue-style modal
 * with a clean title header and tabbed Overview / Inspections / Messages /
 * Payments / Activity, all reusing the same feature components used on the
 * standalone pages. */
export function OrderDetailDrawer({ orderId, onClose }: OrderDetailDrawerProps) {
  const orderQuery = useOrder(orderId)
  const order = orderQuery.data
  const loading = orderQuery.isLoading || !order

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* Fixed height (not max-h) gives the modal a stable frame across tabs and
       * a bounded height for the inner scroll region. `overflow-hidden` +
       * `min-h-0` down the flex chain means only the tab-content region scrolls. */}
      <DialogContent
        size="wide"
        className="flex h-[88vh] min-h-[560px] w-full min-w-0 flex-col overflow-hidden p-0"
      >
        {/* Clean header: inline-editable job title, id, status badge, close ✕. */}
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-72" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <InlineTitle order={order} />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">#{order.number}</span>
                <Badge variant={ORDER_STATUS_VARIANT[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                {order.balanceDue > 0 ? (
                  <Badge variant="warning">{formatMoney(order.balanceDue)} due</Badge>
                ) : (
                  <Badge variant="success">Paid</Badge>
                )}
              </div>
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {orderQuery.isError ? (
            <div className="p-6">
              <ErrorState onRetry={() => orderQuery.refetch()} title="Couldn't load this order" />
            </div>
          ) : loading ? (
            <OverviewSkeleton />
          ) : (
            <Tabs defaultValue="overview" className="flex h-full flex-col">
              <TabsList className="mx-4 mt-3 shrink-0">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="inspections">Inspections</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="gl">GL Impact</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="system">System notes</TabsTrigger>
              </TabsList>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin">
                <TabsContent value="overview">
                  <ServicesEditor order={order} />
                </TabsContent>
                <TabsContent value="inspections">
                  <InspectionsTab />
                </TabsContent>
                <TabsContent value="messages" className="h-[60vh]">
                  <MessageThread customerId={order.customerId} orderId={order.id} />
                </TabsContent>
                <TabsContent value="payments">
                  <PaymentsTab order={order} />
                </TabsContent>
                <TabsContent value="gl">
                  <GlImpactTab order={order} />
                </TabsContent>
                <TabsContent value="activity">
                  <ActivityTab orderId={order.id} />
                </TabsContent>
                <TabsContent value="system">
                  <SystemNotesTab order={order} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Inline click-to-edit job title (Jira-style). Shows the title as text with a
 * subtle hover affordance; clicking swaps to a text input seeded with the
 * current title. Enter or blur saves via `useUpdateOrder({ title })`; Esc
 * cancels. Empty titles fall back to the job number. */
function InlineTitle({ order }: { order: Order }) {
  const updateOrder = useUpdateOrder(order.id)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(order.title ?? '')

  function save() {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== (order.title ?? '')) {
      updateOrder.mutate(
        { title: next },
        { onError: (err) => toast.error('Could not rename job', err instanceof Error ? err.message : undefined) },
      )
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          } else if (e.key === 'Escape') {
            setDraft(order.title ?? '')
            setEditing(false)
          }
        }}
        aria-label="Job title"
        className="w-full rounded-md border border-input bg-card px-2 py-1 text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(order.title ?? '')
        setEditing(true)
      }}
      title="Click to edit"
      className="-mx-1 block max-w-full truncate rounded px-1 text-left text-lg font-semibold text-foreground transition-colors hover:bg-muted"
    >
      {order.title || `#${order.number}`}
    </button>
  )
}

/** NetSuite-style "GL Impact" subtab: a double-entry table (Account | Debit |
 * Credit) derived from the order + its workflow column via the shared
 * `orderGlLines` helper — the same logic the reports aggregate over. Money is
 * right-aligned, a zero cell renders blank, and the bold Totals row proves the
 * debits equal the credits for the posting. */
function GlImpactTab({ order }: { order: Order }) {
  const statusesQuery = useWorkflowStatuses()
  const columnName = React.useMemo(
    () => (statusesQuery.data ?? []).find((s) => s.id === order.workflowStatusId)?.name ?? '',
    [statusesQuery.data, order.workflowStatusId],
  )
  const lines = React.useMemo(() => orderGlLines(order, columnName), [order, columnName])
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  const stage = columnName.trim().toLowerCase() === 'done' ? 'Collected' : 'Billed'

  const cell = (n: number) => (n ? formatMoney(n) : '')

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">GL Impact</h3>
          <p className="text-xs text-muted-foreground">
            Posting derived from the order's workflow stage
            {columnName ? (
              <>
                {' '}
                (<span className="font-medium text-foreground">{columnName}</span>)
              </>
            ) : null}
            .
          </p>
        </div>
        <Badge variant={stage === 'Collected' ? 'success' : 'default'}>{stage}</Badge>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-semibold">Account</th>
              <th className="px-4 py-2.5 text-center font-semibold">Posting</th>
              <th className="px-4 py-2.5 text-right font-semibold">Debit</th>
              <th className="px-4 py-2.5 text-right font-semibold">Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No GL impact for this order yet.
                </td>
              </tr>
            ) : (
              lines.map((line, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-4 py-2 text-foreground">{line.account}</td>
                  <td className="px-4 py-2 text-center">
                    <Badge variant={line.posting ? 'success' : 'secondary'}>{line.posting ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-foreground">{cell(line.debit)}</td>
                  <td className="px-4 py-2 text-right text-foreground">{cell(line.credit)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground/40 font-bold">
              <td className="px-4 py-2.5 text-foreground">Totals</td>
              <td className="px-4 py-2.5" />
              <td className="px-4 py-2.5 text-right text-foreground">{formatMoney(totalDebit)}</td>
              <td className="px-4 py-2.5 text-right text-foreground">{formatMoney(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          Debits must equal credits. Mock accounting model for demonstration.
        </p>
      </div>
    </div>
  )
}

/** First-load placeholder mirroring the tab bar + 3-column overview (main +
 * Details + Totals) so the modal never flashes blank while the query resolves. */
function OverviewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <Skeleton className="mx-4 mt-3 h-9 w-80 shrink-0" />
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px_240px]">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  )
}
