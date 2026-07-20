import * as React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary-600 text-white',
  secondary: 'bg-muted text-foreground',
  outline: 'border border-border text-foreground bg-transparent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-amber-600',
  destructive: 'bg-destructive/15 text-destructive',
  info: 'bg-primary-100 text-primary-800',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
