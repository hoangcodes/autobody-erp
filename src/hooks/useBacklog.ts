import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { BacklogItem, Order } from '@/types'

export function useBacklogItems() {
  return useQuery({
    queryKey: queryKeys.backlog.all,
    queryFn: async () => (await api.list<BacklogItem>('/backlog-items')).items,
  })
}

export function useCreateBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<BacklogItem>) => api.post<BacklogItem>('/backlog-items', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.backlog.all }),
  })
}

export function useDeleteBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/backlog-items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.backlog.all }),
  })
}

/** Promote a backlog item onto the workflow board (creates an Order in the
 * first column and removes the backlog row). */
export function useMoveBacklogToBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Order>(`/backlog-items/${id}/move-to-board`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.backlog.all })
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
    },
  })
}
