import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { MoreHorizontal, DollarSign, Archive, Pencil, Plus } from 'lucide-react'
import type { Customer, Order, Vehicle, WorkflowStatus } from '@/types'
import type { TeamMember } from '@/hooks/useUsers'
import { OrderCard } from '@/features/workflow/OrderCard'
import { cn } from '@/lib/utils'

export interface ColumnProps {
  status: WorkflowStatus
  orders: Order[]
  customersById: Map<string, Customer>
  vehiclesById: Map<string, Vehicle>
  usersById: Map<string, TeamMember>
  density: 'standard' | 'condensed'
  onCardClick: (orderId: string) => void
  /** The card currently being dragged (from the board), or null. */
  activeOrder?: Order | null
  /** True when the drag is hovering this column (drop target). */
  isOverColumn?: boolean
  /** Archive this column (soft-delete). */
  onArchive?: () => void
  /** Rename this column. */
  onRename?: () => void
  /** Create a new job/card in THIS column with the given title. */
  onCreateCard?: (title: string) => void
  /** True while a create-card request is in flight. */
  creating?: boolean
}

export function Column({
  status,
  orders,
  customersById,
  vehiclesById,
  usersById,
  density,
  onCardClick,
  activeOrder = null,
  isOverColumn = false,
  onArchive,
  onRename,
  onCreateCard,
  creating = false,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id, data: { workflowStatusId: status.id } })
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState('')

  // Show the dashed landing slot when a card is dragged over this column and it
  // isn't already the card's home column (no point showing "lands here" in place).
  const showPlaceholder = isOverColumn && !!activeOrder && activeOrder.workflowStatusId !== status.id

  // A column tied to a payment/pickup milestone gets a small green $ accent.
  const showMoneyAccent = /pickup|ready|invoice/i.test(status.name) || status.rule === 'archive_paid'

  function submitDraft() {
    const title = draft.trim()
    if (!title) {
      setAdding(false)
      return
    }
    onCreateCard?.(title)
    setDraft('')
    setAdding(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Column FITS ITS CONTENT (the "+ Create" footer sits right below the
        // last card) but caps at the available board height via `max-h-full` —
        // once it hits the cap the card list scrolls INTERNALLY and "+ Create"
        // stays pinned at the bottom, so the page never scrolls. 288px wide; the
        // extra width over the 262px card leaves room for a scrollbar gutter.
        'flex max-h-full w-[288px] shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors',
        isOver && 'border-primary-400 bg-primary-50/60 dark:bg-primary-500/10',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {showMoneyAccent ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400">
              <DollarSign className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: status.color || '#2b54d9' }}
              aria-hidden="true"
            />
          )}
          <h3 className="truncate text-sm font-semibold leading-none text-foreground">{status.name}</h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-card px-1.5 text-xs font-semibold text-muted-foreground">
            {orders.length}
          </span>
        </div>
        <div className="relative">
          <button
            aria-label={`${status.name} column menu`}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-border bg-popover p-1 text-sm shadow-pop animate-fade-in"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onRename?.()
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename column
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onArchive?.()
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-destructive hover:bg-muted"
              >
                <Archive className="h-3.5 w-3.5" /> Archive column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card list — scrolls vertically. Small left gap (pl-1.5) with the right
          scrollbar gutter kept (pr-2 + stable gutter) so the card sits close to
          the left edge while the scrollbar never overlaps the card's right edge. */}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2 pl-1.5 pr-2 scrollbar-thin"
        style={{ scrollbarGutter: 'stable' }}
      >
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            customer={customersById.get(order.customerId)}
            vehicle={vehiclesById.get(order.vehicleId)}
            usersById={usersById}
            density={density}
            onClick={() => onCardClick(order.id)}
          />
        ))}
        {/* Jira-style dashed landing slot at the drop position. */}
        {showPlaceholder && (
          <div
            aria-hidden="true"
            className="mx-auto w-[262px] rounded-lg border-2 border-dashed border-primary-400 bg-primary-50/60 dark:border-primary-500/60 dark:bg-primary-500/10"
            style={{ height: density === 'condensed' ? 88 : 120 }}
          />
        )}
        {orders.length === 0 && !showPlaceholder && (
          <p className="p-4 text-center text-xs text-muted-foreground">Drop a card here</p>
        )}
      </div>

      {/* "+ Create" footer — pinned to the bottom of the column (Jira-style). */}
      <div className="shrink-0 border-t border-border p-1.5">
        {adding ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitDraft()
                } else if (e.key === 'Escape') {
                  setAdding(false)
                  setDraft('')
                }
              }}
              placeholder="Enter a title for this job…"
              rows={2}
              className="w-full resize-none rounded-md border border-input bg-card px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={submitDraft}
                disabled={creating}
                className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                Add job
              </button>
              <button
                onClick={() => {
                  setAdding(false)
                  setDraft('')
                }}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        )}
      </div>
    </div>
  )
}
