import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center',
        className,
      )}
    >
      {icon && <div className="mb-1 text-muted-foreground">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't reach the server. Please try again in a moment.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      }
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Retry
          </button>
        )
      }
    />
  )
}
