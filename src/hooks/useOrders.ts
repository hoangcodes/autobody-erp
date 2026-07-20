import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dataClient as api, type ListResult } from '@/lib/dataClient'
import { queryKeys } from '@/lib/queryClient'
import type { Order, OrderStatus, OrderTotals, Service, LineItem, Authorization } from '@/types'

export interface OrdersFilter {
  status?: OrderStatus
  workflowStatusId?: string
  customerId?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useOrders(filter: OrdersFilter = {}) {
  return useQuery({
    queryKey: queryKeys.orders.list(filter as Record<string, unknown>),
    queryFn: () => api.list<Order>('/orders', filter as Record<string, string | number | undefined>),
    placeholderData: (prev) => prev as ListResult<Order> | undefined,
  })
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    queryFn: () => api.get<Order>(`/orders/${orderId}`),
    enabled: Boolean(orderId),
  })
}

export function useOrderTotals(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.totals(orderId ?? ''),
    queryFn: () => api.get<OrderTotals>(`/orders/${orderId}/totals`),
    enabled: Boolean(orderId),
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { customerId: string; vehicleId: string } & Record<string, unknown>) =>
      api.post<Order>('/orders', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
  })
}

export function useUpdateOrder(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Order>) => api.patch<Order>(`/orders/${orderId}`, body),
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.orders.detail(orderId), order)
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
    },
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.del(`/orders/${orderId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.orders.all }),
  })
}

export function useConvertOrder(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (to: 'repair_order' | 'invoice') => api.post<Order>(`/orders/${orderId}/convert`, { to }),
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.orders.detail(orderId), order)
      qc.invalidateQueries({ queryKey: queryKeys.orders.all })
      qc.invalidateQueries({ queryKey: queryKeys.orders.activity(orderId) })
    },
  })
}

// ---- Services ----------------------------------------------------------

export function useCreateService(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Service>) => api.post<Service>(`/orders/${orderId}/services`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

export function useUpdateService(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, body }: { serviceId: string; body: Partial<Service> }) =>
      api.patch<Service>(`/orders/${orderId}/services/${serviceId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

export function useDeleteService(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (serviceId: string) => api.del(`/orders/${orderId}/services/${serviceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

// ---- Line items ----------------------------------------------------------

export function useCreateLineItem(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, body }: { serviceId: string; body: Partial<LineItem> }) =>
      api.post<LineItem>(`/orders/${orderId}/services/${serviceId}/line-items`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

export function useUpdateLineItem(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: Partial<LineItem> }) =>
      api.patch<LineItem>(`/orders/${orderId}/line-items/${itemId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

export function useDeleteLineItem(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.del(`/orders/${orderId}/line-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.totals(orderId) })
    },
  })
}

// ---- Authorizations ----------------------------------------------------

export function useOrderAuthorizations(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.authorizations(orderId ?? ''),
    queryFn: async () => (await api.list<Authorization>(`/orders/${orderId}/authorizations`)).items,
    enabled: Boolean(orderId),
  })
}

export function useCreateAuthorization(orderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Authorization>) => api.post<Authorization>(`/orders/${orderId}/authorizations`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.authorizations(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) })
      qc.invalidateQueries({ queryKey: queryKeys.orders.activity(orderId) })
    },
  })
}
