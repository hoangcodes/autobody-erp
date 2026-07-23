import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useSearchParams } from 'react-router-dom'
import { List, LayoutGrid, Wrench, Plus, Filter, X, Search, Check } from 'lucide-react'
import {
  useWorkflowStatuses,
  useCreateWorkflowStatus,
  useArchiveWorkflowStatus,
  useUpdateWorkflowStatus,
} from '@/hooks/useWorkflowStatuses'
import { useOrders } from '@/hooks/useOrders'
import { useMoveCard } from '@/hooks/useMoveCard'
import { toast } from '@/components/ui/toastStore'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useVehicleDirectory } from '@/hooks/useVehicles'
import { useUsers, type TeamMember } from '@/hooks/useUsers'
import { useProfilePhotos } from '@/features/auth/profilePhotoStore'
import { Column } from '@/features/workflow/Column'
import { OrderCard } from '@/features/workflow/OrderCard'
import { OrderDetailDrawer } from '@/features/workflow/OrderDetailDrawer'
import { NewJobModal } from '@/features/workflow/NewJobModal'
import { MechanicAvatar } from '@/components/MechanicAvatar'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/Dialog'
import { DataTable } from '@/components/DataTable'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState, EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { cn, customerDisplayName, formatMoney, vehicleDisplayName } from '@/lib/utils'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/features/orders/statusDisplay'
import type { Order } from '@/types'

type BoardView = 'board' | 'list' | 'parts'

interface FilterChip {
  id: string
  label: string
  removable: boolean
}

export function KanbanBoard() {
  const [params, setParams] = useSearchParams()
  const [view, setView] = React.useState<BoardView>('board')
  // Board-local search, independent of the global top-bar search. Seeded from the
  // ?search= param (so the global search can hand off), then fully editable here.
  const [search, setSearch] = React.useState(params.get('search') ?? '')
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(params.get('order'))
  // Create-job modal (opened from the "+ New Job" toolbar button).
  const [newJobOpen, setNewJobOpen] = React.useState(false)
  const [activeOrder, setActiveOrder] = React.useState<Order | null>(null)
  const [overColumnId, setOverColumnId] = React.useState<string | null>(null)
  // The column awaiting archive confirmation (opens the in-app Dialog).
  const [pendingArchive, setPendingArchive] = React.useState<{ id: string; name: string } | null>(null)
  // Mechanic-avatar filter: show only cards that include at least one selected
  // mechanic (empty = no filter). The column being created into (for the footer
  // "+ Create" spinner) is tracked separately.
  const [mechanicFilter, setMechanicFilter] = React.useState<string[]>([])
  // The order that was just dropped into a new column — briefly flashes green.
  const [justMovedId, setJustMovedId] = React.useState<string | null>(null)
  const [chips, setChips] = React.useState<FilterChip[]>([
    { id: 'archived', label: 'Archived: Not Archived', removable: false },
    { id: 'technicians', label: 'Technicians: All', removable: true },
    { id: 'labels', label: 'Labels: All', removable: true },
  ])

  const statusesQuery = useWorkflowStatuses()
  const ordersQuery = useOrders({ pageSize: 500 })
  const customersQuery = useCustomerDirectory()
  const vehiclesQuery = useVehicleDirectory()
  const usersQuery = useUsers()
  const moveCard = useMoveCard()
  const createStatus = useCreateWorkflowStatus()
  const archiveStatus = useArchiveWorkflowStatus()
  const updateStatus = useUpdateWorkflowStatus()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const customersById = React.useMemo(
    () => new Map((customersQuery.data?.items ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  )
  const vehiclesById = React.useMemo(
    () => new Map((vehiclesQuery.data ?? []).map((v) => [v.id, v])),
    [vehiclesQuery.data],
  )
  const users = usersQuery.data ?? []
  const usersById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const filteredOrders = React.useMemo(() => {
    const all = ordersQuery.data?.items ?? []
    const q = search.trim().toLowerCase()
    return all.filter((o) => {
      // Mechanic filter: card must include at least one selected mechanic.
      if (mechanicFilter.length > 0) {
        const ids = o.mechanicIds ?? []
        if (!mechanicFilter.some((m) => ids.includes(m))) return false
      }
      if (!q) return true
      const customer = customersById.get(o.customerId)
      const vehicle = vehiclesById.get(o.vehicleId)
      return (
        String(o.number).includes(q) ||
        (o.title ?? '').toLowerCase().includes(q) ||
        customerDisplayName(customer).toLowerCase().includes(q) ||
        vehicleDisplayName(vehicle).toLowerCase().includes(q)
      )
    })
  }, [ordersQuery.data, search, mechanicFilter, customersById, vehiclesById])

  const statuses = React.useMemo(
    () =>
      (statusesQuery.data ?? [])
        .filter((s) => !s.hidden && !s.archivedAt)
        .sort((a, b) => a.position - b.position),
    [statusesQuery.data],
  )

  // Unfiltered card count per column (for the "shown/total" header badge when a
  // filter is active). `filterActive` = any board filter narrowing the cards.
  const totalByColumn = React.useMemo(() => {
    const m = new Map<string, number>()
    for (const o of ordersQuery.data?.items ?? []) m.set(o.workflowStatusId, (m.get(o.workflowStatusId) ?? 0) + 1)
    return m
  }, [ordersQuery.data])
  const filterActive = mechanicFilter.length > 0 || search.trim().length > 0

  function addColumn() {
    const name = window.prompt('New column name')?.trim()
    if (!name) return
    createStatus.mutate(
      { name, color: '#64748B', rule: 'none' },
      {
        onSuccess: () => toast.success('Column added', `"${name}" added to the board.`),
        onError: (err) => toast.error('Could not add column', err instanceof Error ? err.message : undefined),
      },
    )
  }

  // Open the in-app confirmation Dialog (replaces window.confirm). The actual
  // archive runs in `confirmArchive` once the user confirms.
  function archiveColumn(id: string, name: string) {
    setPendingArchive({ id, name })
  }

  function confirmArchive() {
    if (!pendingArchive) return
    const { id, name } = pendingArchive
    archiveStatus.mutate(id, {
      onSuccess: () => toast.success('Column archived', `"${name}" is hidden from the board.`),
      onError: (err) => toast.error('Could not archive column', err instanceof Error ? err.message : undefined),
    })
    setPendingArchive(null)
  }

  function renameColumn(id: string, current: string) {
    const name = window.prompt('Rename column', current)?.trim()
    if (!name || name === current) return
    updateStatus.mutate(
      { id, body: { name } },
      {
        onSuccess: () => toast.success('Column renamed'),
        onError: (err) => toast.error('Could not rename column', err instanceof Error ? err.message : undefined),
      },
    )
  }

  function toggleMechanic(id: string) {
    setMechanicFilter((cur) => (cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id]))
  }


  // Base per-column grouping. Each column is sorted by the PERSISTED
  // `boardPosition` so cards stay exactly where they were dropped across
  // reloads/refetches (falls back to array order when unset).
  const ordersByColumn = React.useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const status of statuses) map.set(status.id, [])
    for (const order of filteredOrders) {
      const bucket = map.get(order.workflowStatusId)
      if (bucket) bucket.push(order)
      else map.set(order.workflowStatusId, [order])
    }
    for (const [, bucket] of map) {
      bucket.sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0))
    }
    return map
  }, [statuses, filteredOrders])

  // Lookups used by the drag math: the set of column ids and a card→column index
  // so a drop over a card resolves to that card's column.
  const columnIds = React.useMemo(() => new Set(statuses.map((s) => s.id)), [statuses])
  const cardColumn = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const [col, list] of ordersByColumn) for (const o of list) m.set(o.id, col)
    return m
  }, [ordersByColumn])

  // Resolve which column a drag currently points at (the droppable column id, or
  // the column of the card being hovered). Cards move only BETWEEN columns and
  // always land at the TOP, so there is no insertion index to compute.
  function columnOf(id: string | null | undefined): string | null {
    if (id == null) return null
    if (columnIds.has(id)) return id
    return cardColumn.get(id) ?? null
  }

  function openOrder(id: string) {
    setSelectedOrderId(id)
    const next = new URLSearchParams(params)
    next.set('order', id)
    setParams(next, { replace: true })
  }

  function closeOrder() {
    setSelectedOrderId(null)
    const next = new URLSearchParams(params)
    next.delete('order')
    setParams(next, { replace: true })
  }

  function handleDragStart(event: DragStartEvent) {
    const order = (event.active.data.current?.order as Order | undefined) ?? null
    setActiveOrder(order)
    setOverColumnId(order?.workflowStatusId ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumnId(columnOf(event.over ? String(event.over.id) : null))
  }

  function handleDragEnd(event: DragEndEvent) {
    const order = activeOrder
    const targetColumn = columnOf(event.over ? String(event.over.id) : null)
    setActiveOrder(null)
    setOverColumnId(null)
    if (!order || !targetColumn) return
    // Same-column drop is not a valid move — no mutation, no flash.
    if (targetColumn === order.workflowStatusId) return
    // Valid cross-column move: insert at the TOP (index 0) of the target column.
    moveCard.mutate({ orderId: order.id, workflowStatusId: targetColumn, index: 0 })
    // Flash the card green in its new spot to confirm the move landed. We do NOT
    // clear it on a fixed timer (that used to race the optimistic update +
    // onSettled refetch, cutting the CSS animation short or missing it). Instead
    // the flashed card is remounted (via a flash-suffixed key in Column) so the
    // animation always replays from the start when it lands, and the card itself
    // clears `justMovedId` on `onAnimationEnd` — the animation owns its lifetime.
    setJustMovedId(order.id)
  }

  // Clear the green flash once the card's animation actually finishes (fired from
  // OrderCard's onAnimationEnd). Guarded so a stale/superseded id can't wipe a
  // newer flash.
  function handleFlashEnd(orderId: string) {
    setJustMovedId((cur) => (cur === orderId ? null : cur))
  }

  function handleDragCancel() {
    setActiveOrder(null)
    setOverColumnId(null)
  }

  const loading = statusesQuery.isLoading || ordersQuery.isLoading
  // Condensed view was removed; the board always renders at standard density.
  const density = 'standard' as const

  if (statusesQuery.isError || ordersQuery.isError) {
    return (
      <div>
        <h1 className="pb-4 text-xl font-bold tracking-tight">Workflow</h1>
        <ErrorState onRetry={() => { statusesQuery.refetch(); ordersQuery.refetch() }} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* --- Header row --- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Workflow</h1>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            <ViewToggle icon={List} label="List view" active={view === 'list'} onClick={() => setView('list')} />
            <ViewToggle icon={LayoutGrid} label="Board view" active={view === 'board'} onClick={() => setView('board')} />
          </div>
          <Button
            variant={view === 'parts' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setView('parts')}
          >
            <Wrench className="h-4 w-4" /> Parts
          </Button>
        </div>
      </div>

      {/* --- Filter bar --- */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Board-specific search (separate from the global top-bar search) */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this board…"
            aria-label="Search board"
            className="h-8 w-56 rounded-full border border-input bg-card pl-8 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear board search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Thin divider, then the "+ New Job" button (opens the create-job modal). */}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Button size="sm" onClick={() => setNewJobOpen(true)}>
          <Plus className="h-4 w-4" /> New Job
        </Button>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {/* Overlapping (Jira-style) mechanic-avatar cluster — click an avatar to
            toggle it in the board filter; overflow collapses into a "+N" chip
            whose dropdown is a checkbox list of the remaining team members. */}
        {users.length > 0 && (
          <MechanicFilterCluster
            users={users}
            mechanicFilter={mechanicFilter}
            onToggle={toggleMechanic}
            onClear={() => setMechanicFilter([])}
          />
        )}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
          >
            {chip.label}
            {chip.removable && (
              <button
                aria-label={`Clear ${chip.label}`}
                onClick={() => setChips((cs) => cs.filter((c) => c.id !== chip.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <button className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300">
          + Add Filter
        </button>
      </div>

      {/* --- Content --- */}
      <div className="mt-4 min-h-0 flex-1 overflow-auto">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            <DataTable
              isLoading={ordersQuery.isLoading}
              rows={filteredOrders}
              rowKey={(o) => o.id}
              onRowClick={(o) => openOrder(o.id)}
              emptyTitle="No orders match your filters"
              columns={[
                { key: 'number', header: 'RO#', render: (o) => <span className="font-medium">#{o.number}</span> },
                { key: 'title', header: 'Job', render: (o) => o.title ?? '—' },
                { key: 'customer', header: 'Customer', render: (o) => customerDisplayName(customersById.get(o.customerId)) },
                { key: 'vehicle', header: 'Vehicle', render: (o) => vehicleDisplayName(vehiclesById.get(o.vehicleId)) },
                {
                  key: 'status',
                  header: 'Status',
                  render: (o) => <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>,
                },
                { key: 'total', header: 'Total', render: (o) => formatMoney(o.totals?.total) },
                {
                  key: 'balance',
                  header: 'Balance',
                  render: (o) => (o.balanceDue > 0 ? <Badge variant="warning">{formatMoney(o.balanceDue)}</Badge> : <Badge variant="success">Paid</Badge>),
                },
              ]}
            />
          </div>
        ) : view === 'parts' ? (
          <EmptyState
            title="Parts & Tires view"
            description="Group work by parts-ordered / waiting-on-parts / ready status. The full parts workflow lives in Inventory for now."
          />
        ) : loading ? (
          <div className="flex h-full gap-3 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-full w-[288px] shrink-0" />
            ))}
          </div>
        ) : statuses.length === 0 ? (
          <EmptyState
            title="No workflow columns yet"
            description="Set up your board columns in Settings → Workflow to start tracking cars."
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* `items-stretch` (default) makes every column equal-height — they
                all stretch down to match the TALLEST column's content. The board
                area scrolls (on the wrapper) when content exceeds the viewport. */}
            <div className="flex items-stretch gap-3">
              {statuses.map((status) => (
                <Column
                  key={status.id}
                  status={status}
                  orders={ordersByColumn.get(status.id) ?? []}
                  customersById={customersById}
                  vehiclesById={vehiclesById}
                  usersById={usersById}
                  density={density}
                  onCardClick={openOrder}
                  activeOrder={activeOrder}
                  isOverColumn={overColumnId === status.id}
                  onArchive={() => archiveColumn(status.id, status.name)}
                  onRename={() => renameColumn(status.id, status.name)}
                  totalCount={totalByColumn.get(status.id) ?? 0}
                  filterActive={filterActive}
                  justMovedId={justMovedId}
                  onFlashEnd={handleFlashEnd}
                />
              ))}
              {/* + Add column affordance — hidden for now (kept for later). */}
              <button
                onClick={addColumn}
                className="hidden h-11 w-[288px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-sm font-medium text-muted-foreground transition-colors hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                <Plus className="h-4 w-4" /> Add column
              </button>
            </div>
            <DragOverlay dropAnimation={null}>
              {activeOrder && (
                <div className="rotate-2 scale-[1.03] cursor-grabbing shadow-pop">
                  <OrderCard
                    order={activeOrder}
                    customer={customersById.get(activeOrder.customerId)}
                    vehicle={vehiclesById.get(activeOrder.vehicleId)}
                    usersById={usersById}
                    density={density}
                    onClick={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {selectedOrderId && <OrderDetailDrawer orderId={selectedOrderId} onClose={closeOrder} />}

      {/* Create-job modal (opened from the "+ New Job" toolbar button). Cards land
          at the top of the chosen column. */}
      <NewJobModal open={newJobOpen} onOpenChange={setNewJobOpen} columns={statuses} />


      {/* Archive-column confirmation (replaces window.confirm). */}
      <Dialog open={!!pendingArchive} onOpenChange={(open) => !open && setPendingArchive(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Archive column?</DialogTitle>
          </DialogHeader>
          <DialogBody className="text-sm text-muted-foreground">
            {pendingArchive && (
              <p>
                The <span className="font-medium text-foreground">"{pendingArchive.name}"</span> column will be hidden
                from the board. Its cards stay in the system and aren't deleted — you can restore the column later.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingArchive(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmArchive} loading={archiveStatus.isPending}>
              Archive column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ViewToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof List
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        active ? 'bg-primary-600 text-white' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

// Show at most this many avatars inline; the rest collapse into a "+N" chip.
const MAX_VISIBLE_MECHANICS = 4

/**
 * Overlapping team-avatar cluster next to the board search. Avatars stack with a
 * `-ml-2` overlap and a `ring-2 ring-card` so they read as layered; hovering (or
 * focusing) an avatar raises its z-index and lifts it so it's fully visible.
 * Clicking an avatar toggles that member in the board's mechanic filter. Any
 * members past `MAX_VISIBLE_MECHANICS` collapse into a "+N" circle whose
 * dropdown is a checkbox list of those overflow members (toggling the same
 * filter). Closes on outside click.
 */
function MechanicFilterCluster({
  users,
  mechanicFilter,
  onToggle,
  onClear,
}: {
  users: TeamMember[]
  mechanicFilter: string[]
  onToggle: (id: string) => void
  onClear: () => void
}) {
  const photos = useProfilePhotos((s) => s.photos)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const visible = users.slice(0, MAX_VISIBLE_MECHANICS)
  const overflow = users.slice(MAX_VISIBLE_MECHANICS)
  const hasFilter = mechanicFilter.length > 0
  const overflowSelected = overflow.some((u) => mechanicFilter.includes(u.id))

  React.useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {visible.map((u, i) => {
          const selected = mechanicFilter.includes(u.id)
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onToggle(u.id)}
              aria-pressed={selected}
              title={`${u.name}${selected ? ' (filtering)' : ''}`}
              className={cn(
                'relative rounded-full transition-transform hover:z-20 hover:-translate-y-0.5 hover:scale-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                i > 0 && '-ml-2',
              )}
            >
              <MechanicAvatar
                id={u.id}
                name={u.name}
                src={photos[u.id]}
                size={28}
                selected={selected}
                dimmed={hasFilter && !selected}
              />
            </button>
          )
        })}

        {overflow.length > 0 && (
          <div className="relative" ref={wrapRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={`${overflow.length} more team members`}
              title={`${overflow.length} more`}
              className={cn(
                'relative -ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold ring-2 ring-card transition-transform hover:z-20 hover:-translate-y-0.5 hover:scale-110 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                overflowSelected ? 'text-primary-700 dark:text-primary-300' : 'text-muted-foreground',
              )}
            >
              +{overflow.length}
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-pop animate-fade-in">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Team
                  </span>
                  {hasFilter && (
                    <button
                      onClick={onClear}
                      className="text-[11px] font-medium text-primary-700 hover:underline dark:text-primary-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {overflow.map((u) => {
                  const selected = mechanicFilter.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onToggle(u.id)}
                      aria-pressed={selected}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-input',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <MechanicAvatar id={u.id} name={u.name} src={photos[u.id]} size={22} />
                      <span className="truncate text-sm text-foreground">{u.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {hasFilter && (
        <button
          onClick={onClear}
          aria-label="Clear mechanic filter"
          title="Clear mechanic filter"
          className="ml-1 inline-flex h-6 items-center gap-0.5 rounded-full bg-muted px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          Clear <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
