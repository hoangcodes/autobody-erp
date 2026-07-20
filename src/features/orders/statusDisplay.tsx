import type { AuthorizationStatus, OrderStatus } from '@/types'
import type { BadgeVariant } from '@/components/ui/Badge'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  estimate: 'Estimate',
  repair_order: 'Repair Order',
  invoice: 'Invoice',
}

export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  estimate: 'secondary',
  repair_order: 'info',
  invoice: 'default',
}

export const AUTH_STATUS_LABEL: Record<AuthorizationStatus, string> = {
  pending: 'Auth pending',
  authorized: 'Authorized',
  declined: 'Declined',
}

export const AUTH_STATUS_VARIANT: Record<AuthorizationStatus, BadgeVariant> = {
  pending: 'warning',
  authorized: 'success',
  declined: 'destructive',
}
