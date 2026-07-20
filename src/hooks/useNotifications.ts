import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { AppNotification } from '@/types'

/** Bell-menu notifications feed (newest first). Mirrors useConversations. */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => (await api.list<AppNotification>('/notifications')).items,
    refetchInterval: 30_000,
  })
}
