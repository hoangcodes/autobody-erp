import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Customer, Order } from '@/types'

export function useCustomers(search = '') {
  return useQuery({
    queryKey: queryKeys.customers.list({ search }),
    queryFn: () => api.list<Customer>('/customers', { search }),
  })
}

/** Full customer directory (unfiltered, larger page) — used where the UI
 * needs to resolve customer display info for a set of orders in bulk. */
export function useCustomerDirectory() {
  return useQuery({
    queryKey: queryKeys.customers.list({ directory: true }),
    queryFn: () => api.list<Customer>('/customers', { pageSize: 250 }),
  })
}

export function useCustomer(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId ?? ''),
    queryFn: () => api.get<Customer>(`/customers/${customerId}`),
    enabled: Boolean(customerId),
  })
}

export function useCustomerHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.history(customerId ?? ''),
    queryFn: async () => (await api.list<Order>(`/customers/${customerId}/history`)).items,
    enabled: Boolean(customerId),
  })
}

export function useCustomerDeferred(customerId: string | undefined) {
  return useQuery({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deferred service rows are a lightweight derived shape not modeled 1:1 as an entity
    queryKey: queryKeys.customers.deferred(customerId ?? ''),
    queryFn: async () => (await api.list<any>(`/customers/${customerId}/deferred`)).items,
    enabled: Boolean(customerId),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Customer>) => api.post<Customer>('/customers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.customers.all }),
  })
}

export function useUpdateCustomer(customerId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Customer>) => api.patch<Customer>(`/customers/${customerId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.customers.all })
      qc.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) })
    },
  })
}
