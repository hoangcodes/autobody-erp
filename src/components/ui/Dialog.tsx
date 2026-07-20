import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  size = 'md',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'content' | 'wide' | 'full'
}) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    // Constrained, comfortable reading width (e.g. the order-detail modal).
    content: 'max-w-[840px]',
    // Wide 3-column overview (order-detail modal): main + Details + Totals.
    wide: 'max-w-[1120px]',
    full: 'max-w-[95vw] h-[92vh]',
  }[size]

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full origin-center -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card shadow-pop animate-dialog-in',
          'max-h-[90vh] overflow-y-auto scrollbar-thin',
          sizeClasses,
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-border p-5', className)} {...props} />
  )
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold text-foreground', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 border-t border-border p-4', className)}
      {...props}
    />
  )
}
