import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/DataTable'
import { Badge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/EmptyState'
import { useOrders } from '@/hooks/useOrders'
import { useWorkflowStatuses } from '@/hooks/useWorkflowStatuses'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import { useVehicleDirectory } from '@/hooks/useVehicles'
import { customerDisplayName, formatDate, formatMoney, vehicleDisplayName } from '@/lib/utils'

/**
 * Read-only list of finished work: any order that is invoiced OR sitting in a
 * "Completed"-style workflow column. Clicking a row opens the full order editor.
 */
export function CompletedPage() {
  const ordersQuery = useOrders({ pageSize: 500 })
  const statusesQuery = useWorkflowStatuses()
  const customersQuery = useCustomerDirectory()
  const vehiclesQuery = useVehicleDirectory()
  const navigate = useNavigate()

  const customersById = React.useMemo(
    () => new Map((customersQuery.data?.items ?? []).map((c) => [c.id, c])),
    [customersQuery.data],
  )
  const vehiclesById = React.useMemo(
    () => new Map((vehiclesQuery.data ?? []).map((v) => [v.id, v])),
    [vehiclesQuery.data],
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

  const rows = React.useMemo(() => {
    const all = ordersQuery.data?.items ?? []
    return all
      .filter((o) => o.status === 'invoice' || doneColumnIds.has(o.workflowStatusId))
      .sort((a, b) => +new Date(b.invoicedAt ?? b.lastActivityAt ?? 0) - +new Date(a.invoicedAt ?? a.lastActivityAt ?? 0))
  }, [ordersQuery.data, doneColumnIds])

  return (
    <div>
      <PageHeader
        title="Completed / Invoiced"
        description="Every finished and invoiced order. Click a row to open the full order."
      />

      {ordersQuery.isError ? (
        <ErrorState onRetry={() => ordersQuery.refetch()} />
      ) : (
        <DataTable
          isLoading={ordersQuery.isLoading}
          rows={rows}
          rowKey={(o) => o.id}
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
          emptyTitle="Nothing completed yet"
          emptyDescription="Invoiced and completed orders will appear here."
          columns={[
            { key: 'number', header: '#', render: (o) => <span className="font-medium">#{o.number}</span> },
            { key: 'vehicle', header: 'Vehicle', render: (o) => vehicleDisplayName(vehiclesById.get(o.vehicleId)) },
            { key: 'customer', header: 'Customer', render: (o) => customerDisplayName(customersById.get(o.customerId)) },
            { key: 'tech', header: 'Technician', render: (o) => o.technicianName ?? '—' },
            { key: 'total', header: 'Total', className: 'text-right', headerClassName: 'text-right', render: (o) => formatMoney(o.totals?.total) },
            {
              key: 'balance',
              header: 'Paid / Remaining',
              className: 'text-right',
              headerClassName: 'text-right',
              render: (o) =>
                o.balanceDue > 0.005 ? (
                  <Badge variant="warning">{formatMoney(o.balanceDue)} due</Badge>
                ) : (
                  <Badge variant="success">Paid {formatMoney(o.paidTotal)}</Badge>
                ),
            },
            { key: 'date', header: 'Date', render: (o) => formatDate(o.invoicedAt ?? o.lastActivityAt) },
          ]}
        />
      )}
    </div>
  )
}
