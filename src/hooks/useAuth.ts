import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { AuthMeResponse } from '@/types'
import { useAuthStore } from '@/features/auth/authStore'

export function useAuth() {
  const setMe = useAuthStore((s) => s.setMe)
  const currentLocationId = useAuthStore((s) => s.currentLocationId)

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api.get<AuthMeResponse>('/auth/me'),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  useEffect(() => {
    if (query.data) setMe(query.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  return { ...query, currentLocationId }
}
