import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataClient as api, type ListResult } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Order } from '@/types'
import { toast } from '@/components/ui/toastStore'

/**
 * Moves a card to a new workflow column. Applies an optimistic update across
 * every cached `orders` list query so the kanban board feels instant, and
 * rolls back all of them if the request fails.
 */
export function useMoveCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, workflowStatusId }: { orderId: string; workflowStatusId: string }) =>
      api.patch<Order>(`/orders/${orderId}/workflow`, { workflowStatusId }),

    onMutate: async ({ orderId, workflowStatusId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.orders.all })

      const previousLists = qc.getQueriesData<ListResult<Order>>({ queryKey: queryKeys.orders.all })

      for (const [key, data] of previousLists) {
        if (!data) continue
        qc.setQueryData<ListResult<Order>>(key, {
          ...data,
          items: data.items.map((o) => (o.id === orderId ? { ...o, workflowStatusId } : o)),
        })
      }

      const previousDetail = qc.getQueryData<Order>(queryKeys.orders.detail(orderId))
      if (previousDetail) {
        qc.setQueryData<Order>(queryKeys.orders.detail(orderId), { ...previousDetail, workflowStatusId })
      }

      return { previousLists, previousDetail, orderId }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          qc.setQueryData(key, data)
        }
      }
      if (context?.previousDetail) {
        qc.setQueryData(queryKeys.orders.detail(context.orderId), context.previousDetail)
      }
      toast.error('Could not move card', 'The change was rolled back. Please try again.')
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(vars.orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.activity(vars.orderId) })
    },
  })
}
