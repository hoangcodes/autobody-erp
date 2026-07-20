import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/utils'

export interface AvatarProps {
  name?: string
  src?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function Avatar({ name, src, className, size = 'md' }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-800',
        sizeClasses[size],
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name ?? ''} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={300}>{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
