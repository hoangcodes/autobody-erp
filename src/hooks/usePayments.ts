import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { CollectPaymentResponse, Payment, PaymentMethod } from '@/types'

export function usePayments(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.forOrder(orderId ?? ''),
    queryFn: async () => (await api.list<Payment>('/payments', { orderId })).items,
    enabled: Boolean(orderId),
  })
}

export interface CollectPaymentBody {
  method: PaymentMethod
  amount: number
  isDeposit?: boolean
  amountTendered?: number
  referenceNumber?: string
  surcharge?: number
}

export function useCollectPayment(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CollectPaymentBody) => api.post<CollectPaymentResponse>(`/orders/${orderId}/payments`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.forOrder(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.activity(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
    },
  })
}

export function usePaymentLink(orderId: string) {
  return useMutation({
    mutationFn: (body: { amount: number; isDeposit?: boolean }) =>
      api.post<{ paymentUrl: string }>(`/orders/${orderId}/payment-link`, body),
  })
}

export function useRefundPayment(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, amount }: { paymentId: string; amount?: number }) =>
      api.post<Payment>(`/payments/${paymentId}/refund`, amount !== undefined ? { amount } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payments.forOrder(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.activity(orderId) })
    },
  })
}
