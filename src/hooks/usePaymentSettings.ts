import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { PaymentSettings } from '@/types'

export function usePaymentSettings() {
  return useQuery({
    queryKey: queryKeys.paymentSettings,
    queryFn: () => api.get<PaymentSettings>('/settings/payments'),
  })
}

export function useUpdatePaymentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<PaymentSettings>) => api.patch<PaymentSettings>('/settings/payments', body),
    onSuccess: (data) => qc.setQueryData(queryKeys.paymentSettings, data),
  })
}

export function useConnectPayments() {
  return useMutation({
    mutationFn: () => api.post<{ url: string; status: string }>('/settings/payments/connect'),
  })
}

export function usePairReader() {
  return useMutation({
    mutationFn: (readerId: string) => api.post<{ readerId: string; status: string }>('/settings/payments/reader', { readerId }),
  })
}
