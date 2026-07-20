import { useParams } from 'react-router-dom'
import { useOrder } from '@/hooks/useOrders'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { ServicesEditor } from '@/features/orders/ServicesEditor'
import { ORDER_STATUS_LABEL } from '@/features/orders/statusDisplay'

/** Standalone order editor page — same Overview editor used inside the kanban
 * card detail drawer, reachable directly at /orders/:id. */
export function OrderEditor() {
  const { id } = useParams<{ id: string }>()
  const orderQuery = useOrder(id)

  if (orderQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState onRetry={() => orderQuery.refetch()} title="Couldn't load this order" />
  }

  const order = orderQuery.data

  return (
    <div>
      <PageHeader title={`#${order.number} — ${ORDER_STATUS_LABEL[order.status]}`} />
      <ServicesEditor order={order} />
    </div>
  )
}
