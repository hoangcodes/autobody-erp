import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/** Centralized query keys — keep every feature's cache keys here so
 * invalidation stays consistent across the app. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  users: {
    all: ['users'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (params: Record<string, unknown>) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    totals: (id: string) => ['orders', 'totals', id] as const,
    activity: (id: string) => ['orders', 'activity', id] as const,
    authorizations: (id: string) => ['orders', 'authorizations', id] as const,
  },
  workflowStatuses: {
    all: ['workflow-statuses'] as const,
  },
  backlog: {
    all: ['backlog-items'] as const,
  },
  financials: ['financial-statements'] as const,
  customers: {
    all: ['customers'] as const,
    list: (params: Record<string, unknown>) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    history: (id: string) => ['customers', 'history', id] as const,
    deferred: (id: string) => ['customers', 'deferred', id] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    list: (ownerCustomerId?: string) => ['vehicles', 'list', ownerCustomerId ?? null] as const,
  },
  messages: {
    conversations: ['messages', 'conversations'] as const,
    thread: (customerId?: string, orderId?: string) =>
      ['messages', 'thread', customerId ?? null, orderId ?? null] as const,
    templates: ['message-templates'] as const,
  },
  notifications: ['notifications'] as const,
  payments: {
    forOrder: (orderId: string) => ['payments', 'order', orderId] as const,
  },
  paymentSettings: ['settings', 'payments'] as const,
  auditLogs: (params: Record<string, unknown>) => ['audit-logs', params] as const,
  reports: (reportKey: string, params: Record<string, unknown>) =>
    ['reports', reportKey, params] as const,
  parts: ['parts'] as const,
  vendors: ['vendors'] as const,
  purchaseOrders: ['purchase-orders'] as const,
  returns: ['returns'] as const,
  cannedServices: ['canned-services'] as const,
  laborRates: ['labor-rates'] as const,
  laborMatrices: ['labor-matrices'] as const,
  pricingMatrices: ['pricing-matrices'] as const,
}
