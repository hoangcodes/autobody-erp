import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { AuditLog } from '@/types'

export interface AuditLogFilter {
  entityType?: string
  entityId?: string
  action?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export function useAuditLogs(filter: AuditLogFilter = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs(filter as Record<string, unknown>),
    queryFn: () => api.list<AuditLog>('/audit-logs', filter as Record<string, string | number | undefined>),
  })
}
