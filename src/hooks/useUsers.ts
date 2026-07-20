import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'

/** A team member (service writer / technician) usable as a mechanic. Mirrors the
 * lightweight `MOCK_USERS` shape; maps to `User` on the backend. */
export interface TeamMember {
  id: string
  name: string
}

/** The mechanic / team roster. Reused for the board mechanic-avatar filter, the
 * card avatars, and the order-detail "Mechanics" section. */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => (await api.list<TeamMember>('/users', { pageSize: 100 })).items,
  })
}
