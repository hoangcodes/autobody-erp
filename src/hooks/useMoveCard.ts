import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dataClient as api, type ListResult } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Order } from '@/types'
import { toast } from '@/components/ui/toastStore'

export interface MoveCardVars {
  orderId: string
  /** Target column. */
  workflowStatusId: string
  /** Insertion slot within the target column (0 = top). */
  index: number
}

/**
 * Moves a card to a new workflow column AND a specific slot within it (Jira-style
 * positional drag-and-drop). Persists via `PATCH /orders/:id/move` (which
 * renumbers `boardPosition`). Applies an optimistic update across every cached
 * `orders` list query — mirroring the server's reorder so the card stays exactly
 * where it was dropped — and rolls back all of them if the request fails.
 */
export function useMoveCard() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ orderId, workflowStatusId, index }: MoveCardVars) =>
      api.patch<Order>(`/orders/${orderId}/move`, { workflowStatusId, index }),

    onMutate: async ({ orderId, workflowStatusId, index }) => {
      await qc.cancelQueries({ queryKey: queryKeys.orders.all })

      const previousLists = qc.getQueriesData<ListResult<Order>>({ queryKey: queryKeys.orders.all })

      for (const [key, data] of previousLists) {
        if (!data?.items) continue
        // Clone the items so we can mutate boardPosition/workflowStatusId freely.
        const items = data.items.map((o) => ({ ...o }))
        const moved = items.find((o) => o.id === orderId)
        if (!moved) {
          qc.setQueryData<ListResult<Order>>(key, { ...data, items })
          continue
        }
        // The card's ORIGINAL column — after the move it may end up empty, which
        // must be a valid (no-op) state, so we compact it too.
        const sourceColumn = moved.workflowStatusId
        moved.workflowStatusId = workflowStatusId
        // Rebuild the target column's order (excluding the moved card), splice the
        // moved card in at `index`, then renumber — same math as the mock server.
        const members = items
          .filter((o) => o.workflowStatusId === workflowStatusId && o.id !== orderId)
          .sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0))
        const clamped = Math.max(0, Math.min(index, members.length))
        members.splice(clamped, 0, moved)
        members.forEach((o, i) => {
          o.boardPosition = i
        })
        // Compact the source column so its positions stay contiguous even when it
        // is now empty (mirrors the server's `renumberColumn(from)`; a 0-length
        // result is a harmless no-op).
        if (sourceColumn !== workflowStatusId) {
          items
            .filter((o) => o.workflowStatusId === sourceColumn)
            .sort((a, b) => (a.boardPosition ?? 0) - (b.boardPosition ?? 0))
            .forEach((o, i) => {
              o.boardPosition = i
            })
        }
        qc.setQueryData<ListResult<Order>>(key, { ...data, items })
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
