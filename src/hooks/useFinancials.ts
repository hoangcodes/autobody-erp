import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { FinancialStatementsResponse } from '@/types'

export type FinancialGranularity = 'month' | 'quarter' | 'year'

/** Mock financial statements (income statement + balance sheet) read-model.
 * The `granularity` + selected `periods` drive one statement column per period,
 * and are part of the query key so changing the footer selection refetches. */
export function useFinancialStatements(
  granularity: FinancialGranularity = 'quarter',
  periods: string[] = [],
) {
  const periodsKey = periods.join(',')
  return useQuery({
    queryKey: [...queryKeys.financials, granularity, periodsKey],
    queryFn: () =>
      api.get<FinancialStatementsResponse>('/financial-statements', {
        granularity,
        periods: periodsKey,
      }),
  })
}
