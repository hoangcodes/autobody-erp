import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { ReportResponse } from '@/types'

export function useReport(reportKey: string, params: { from?: string; to?: string; dateBasis?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.reports(reportKey, params as Record<string, unknown>),
    queryFn: () => api.get<ReportResponse>(`/reports/${reportKey}`, params),
  })
}
