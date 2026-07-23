import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { WorkItemsTable, type WorkItemColumn } from '@/components/WorkItemsTable'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { MechanicAvatar } from '@/components/MechanicAvatar'
import { ErrorState } from '@/components/ui/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useOrders } from '@/hooks/useOrders'
import { useWorkflowStatuses } from '@/hooks/useWorkflowStatuses'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useUsers } from '@/hooks/useUsers'
import { customerDisplayName, formatDateShort, formatMoney } from '@/lib/utils'
import type { Order } from '@/types'

type StatusKey = 'paid' | 'invoiced' | 'done'

/** Derive the Jira-style status pill for a finished order. */
function statusOf(o: Order): { key: StatusKey; label: string; variant: BadgeVariant } {
  if (o.balanceDue <= 0.005 && o.paidTotal > 0) return { key: 'paid', label: 'Paid', variant: 'success' }
  if (o.status === 'invoice') return { key: 'invoiced', label: 'Invoiced', variant: 'info' }
  return { key: 'done', label: 'Done', variant: 'secondary' }
}

const ALL = '__all__'

/**
 * Read-only list of finished work: any order that is invoiced OR sitting in a
 * "Completed"-style workflow column. Presented as a Jira work-items table.
 * Clicking a row opens the full order editor.
 */
export function CompletedPage() {
  const ordersQuery = useOrders({ pageSize: 500 })
  const statusesQuery = useWorkflowStatuses()
  const customersQuery = useCustomerDirectory()
  const usersQuery = useUsers()
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = React.useState<string>(ALL)

  const customersById = React.useMemo(
    () => new Map((customersQuery.data?.items ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  )
  const usersById = React.useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u.name])),
    [usersQuery.data],
  )

  // Column ids whose name reads as a "done" milestone (Done / Completed / Ready for Pickup).
  const doneColumnIds = React.useMemo(
    () =>
      new Set(
        (statusesQuery.data ?? [])
          .filter((s) => /complete|done|ready for pickup/i.test(s.name))
          .map((s) => s.id),
      ),
    [statusesQuery.data],
  )

  const customerName = React.useCallback(
    (o: Order) => customerDisplayName(customersById.get(o.customerId)),
    [customersById],
  )
  const assigneeName = React.useCallback(
    (o: Order) => {
      const id = o.mechanicIds?.[0]
      return (id ? usersById.get(id) : undefined) ?? o.technicianName ?? ''
    },
    [usersById],
  )

  const rows = React.useMemo(() => {
    const all = ordersQuery.data?.items ?? []
    return all
      .filter((o) => o.status === 'invoice' || doneColumnIds.has(o.workflowStatusId))
      .filter((o) => statusFilter === ALL || statusOf(o).key === statusFilter)
  }, [ordersQuery.data, doneColumnIds, statusFilter])

  const columns: WorkItemColumn<Order>[] = [
    {
      key: 'number',
      header: 'Key',
      sortValue: (o) => o.number,
      render: (o) => <span className="font-medium text-muted-foreground">#{o.number}</span>,
    },
    {
      key: 'summary',
      header: 'Summary',
      sortValue: (o) => o.title ?? '',
      render: (o) => (
        <span className="font-medium text-primary-700 hover:underline dark:text-primary-300">
          {o.title ?? `Order #${o.number}`}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: customerName,
      render: (o) => customerName(o),
    },
    {
      key: 'assignee',
      header: 'Assignee',
      sortValue: (o) => assigneeName(o) || 'zzz',
      render: (o) => {
        const id = o.mechanicIds?.[0]
        const name = assigneeName(o)
        if (!name) return <span className="text-muted-foreground">Unassigned</span>
        return (
          <span className="inline-flex items-center gap-1.5">
            <MechanicAvatar id={id ?? name} name={name} size={20} />
            <span className="truncate">{name}</span>
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (o) => statusOf(o).label,
      render: (o) => {
        const s = statusOf(o)
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (o) => o.totals?.total ?? 0,
      render: (o) => <span className="tabular-nums">{formatMoney(o.totals?.total)}</span>,
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: (o) => +new Date(o.createdAt ?? 0),
      render: (o) => <span className="text-muted-foreground">{formatDateShort(o.createdAt)}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      sortValue: (o) => +new Date(o.updatedAt ?? o.lastActivityAt ?? o.invoicedAt ?? 0),
      render: (o) => (
        <span className="text-muted-foreground">
          {formatDateShort(o.updatedAt ?? o.lastActivityAt ?? o.invoicedAt)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Completed / Invoiced"
        description="Every finished and invoiced order. Click a row to open the full order."
      />

      {ordersQuery.isError ? (
        <ErrorState onRetry={() => ordersQuery.refetch()} />
      ) : (
        <WorkItemsTable
          isLoading={ordersQuery.isLoading}
          rows={rows}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          searchText={(o) =>
            [`#${o.number}`, o.title, customerName(o), assigneeName(o)].filter(Boolean).join(' ')
          }
          searchPlaceholder="Search work…"
          defaultSortKey="updated"
          defaultSortDir="desc"
          itemNoun="work items"
          columns={columns}
          emptyTitle="Nothing completed yet"
          emptyDescription="Invoiced and completed orders will appear here."
          toolbarExtra={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]" aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      )}
    </div>
  )
}
