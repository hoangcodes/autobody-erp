import * as React from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { MoreHorizontal, Archive, Pencil } from 'lucide-react'
import type { Customer, Order, Vehicle, WorkflowStatus } from '@/types'
import type { TeamMember } from '@/hooks/useUsers'
import { OrderCard } from '@/features/workflow/OrderCard'
import { cn } from '@/lib/utils'

/**
 * Library-free FLIP reflow for a card list. Tracks each card element's previous
 * bounding rect (keyed by its `data-flip-id`) and, in a layout effect after the
 * card set changes, plays a short translateY animation for every still-present
 * card from its OLD position to its new one — so when a card leaves (or arrives)
 * the others ease into place instead of snapping. Returns a ref to attach to the
 * scroll/list container. `key` is a cheap signature of the current card ids that
 * re-runs the effect only when the set actually changes.
 */
function useFlipReflow(key: string) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const prevRects = React.useRef<Map<string, DOMRect>>(new Map())

  React.useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const els = container.querySelectorAll<HTMLElement>('[data-flip-id]')
    const next = new Map<string, DOMRect>()
    els.forEach((el) => {
      const id = el.dataset.flipId
      if (!id) return
      const rect = el.getBoundingClientRect()
      next.set(id, rect)
      const prev = prevRects.current.get(id)
      if (prev) {
        const dy = prev.top - rect.top
        if (dy) {
          el.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
            { duration: 180, easing: 'ease-out' },
          )
        }
      }
    })
    prevRects.current = next
  }, [key])

  return containerRef
}

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
  /** Total (unfiltered) card count — badge shows "shown/total" when filtering. */
  totalCount?: number
  /** Whether a board filter is narrowing the cards (drives the shown/total badge). */
  filterActive?: boolean
  /** Order id that was just dropped into a column — that card flashes green. */
  justMovedId?: string | null
  /** Called by the flashed card when its green animation ends, so the board can
   * clear `justMovedId` (the animation, not a timer, owns the flash lifetime). */
  onFlashEnd?: (orderId: string) => void
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
  totalCount,
  filterActive = false,
  justMovedId = null,
  onFlashEnd,
}: ColumnProps) {
  // The whole column body is the droppable target — a drop anywhere in it lands
  // the card at the TOP of this column's list (index 0).
  const { setNodeRef, isOver } = useDroppable({ id: status.id, data: { type: 'column', workflowStatusId: status.id } })
  const [menuOpen, setMenuOpen] = React.useState(false)

  // During a drag, every column EXCEPT the card's source column turns its whole
  // body into a blue drop zone with the column name centered, hiding the cards.
  // The SOURCE column keeps its cards visible and shows a not-allowed cursor —
  // dropping a card back on its own column is not a valid move.
  const dragActive = !!activeOrder
  const isSource = activeOrder?.workflowStatusId === status.id
  const showDropZone = dragActive && !isSource

  // Smooth (Jira-like) reflow of the remaining cards when the card set changes
  // (e.g. a card is dragged OUT to another column): the others slide into place.
  const listRef = useFlipReflow(orders.map((o) => o.id).join(','))

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Column always fills the full board height (so every container reaches
        // the bottom, like a full column). The card list scrolls INTERNALLY and
        // "+ Create" stays pinned at the bottom; the page never scrolls. 288px
        // wide; the extra width over the 262px card leaves a scrollbar gutter.
        'flex min-h-full w-[288px] shrink-0 flex-col rounded-xl border border-border bg-muted/40 transition-colors',
        isOver && 'border-primary-400',
        // Dropping a card on its own source column is a no-op — show ⊘.
        isSource && 'cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-xs font-medium uppercase tracking-wide text-foreground">{status.name}</h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-700 px-1.5 text-xs font-semibold tabular-nums text-slate-100 dark:bg-slate-500 dark:text-white">
            {filterActive ? `${orders.length}/${totalCount ?? orders.length}` : orders.length}
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
      {/* Card list. During a drag the blue drop zone is OVERLAID on top of the
          still-mounted cards (not swapped in for them) so the cards reappear
          instantly and smoothly on drop instead of unmounting + remounting
          (which reloaded images and caused the flicker). */}
      <div className="relative flex-1 py-2 pl-1.5 pr-2">
        <div ref={listRef} className="space-y-2">
          {orders.map((order) => (
            <DraggableOrderCard
              key={order.id}
              order={order}
              customer={customersById.get(order.customerId)}
              vehicle={vehiclesById.get(order.vehicleId)}
              usersById={usersById}
              density={density}
              flash={order.id === justMovedId}
              onFlashEnd={() => onFlashEnd?.(order.id)}
              onClick={() => onCardClick(order.id)}
            />
          ))}
          {orders.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">Drop a card here</p>
          )}
        </div>

        {showDropZone && (
          // Opaque blue zone overlaying the (still-mounted) cards — column name
          // centered; stronger blue when hovered.
          <div
            className={cn(
              'absolute inset-1.5 z-10 flex items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              isOverColumn
                ? 'border-primary-500 bg-primary-100 dark:border-primary-400 dark:bg-primary-950'
                : 'border-primary-300 bg-primary-50 dark:border-primary-500/50 dark:bg-primary-950',
            )}
          >
            <span className="select-none text-sm font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
              {status.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * A single board card made draggable via `@dnd-kit/core`'s `useDraggable`. Cards
 * move only BETWEEN columns (no positional reordering), so there is no sortable
 * gap/transform. The presentational `OrderCard` lives inside; its own onClick
 * (open modal) still fires because the 6px activation distance separates a click
 * from a drag. The original slot dims while dragging.
 */
function DraggableOrderCard({
  order,
  customer,
  vehicle,
  usersById,
  density,
  flash,
  onFlashEnd,
  onClick,
}: {
  order: Order
  customer?: Customer
  vehicle?: Vehicle
  usersById: Map<string, TeamMember>
  density: 'standard' | 'condensed'
  flash: boolean
  onFlashEnd?: () => void
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { type: 'card', order },
  })

  return (
    <div
      ref={setNodeRef}
      data-flip-id={order.id}
      {...attributes}
      {...listeners}
      className={cn('touch-none', isDragging && 'opacity-40')}
    >
      <OrderCard
        order={order}
        customer={customer}
        vehicle={vehicle}
        usersById={usersById}
        density={density}
        flash={flash}
        onFlashEnd={onFlashEnd}
        onClick={onClick}
      />
    </div>
  )
}
