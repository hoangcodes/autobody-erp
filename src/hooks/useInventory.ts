import { useQuery } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Part, Vendor, PurchaseOrder } from '@/types'

export function useParts(search = '') {
  return useQuery({
    queryKey: [...queryKeys.parts, { search }],
    queryFn: () => api.list<Part>('/parts', { search, pageSize: 250 }),
  })
}

export function useVendors() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: async () => (await api.list<Vendor>('/vendors')).items,
  })
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: queryKeys.purchaseOrders,
    queryFn: async () => (await api.list<PurchaseOrder>('/purchase-orders')).items,
  })
}
