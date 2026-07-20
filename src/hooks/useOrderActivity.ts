import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { OrderActivity } from '@/types'

export function useOrderActivity(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.activity(orderId ?? ''),
    queryFn: async () => (await api.list<OrderActivity>(`/orders/${orderId}/activity`)).items,
    enabled: Boolean(orderId),
  })
}

export interface CreateNoteBody {
  body: string
  visibility: 'internal' | 'customer_visible'
  mentions?: string[]
  pinned?: boolean
}

export function useCreateNote(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateNoteBody) => api.post<OrderActivity>(`/orders/${orderId}/activity/notes`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.activity(orderId) }),
  })
}
