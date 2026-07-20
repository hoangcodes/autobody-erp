import { avatarColorFromString, cn, initials } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Small round mechanic/technician avatar with a deterministic color derived
// from the user id (so a person keeps the same color everywhere). Used on the
// board filter cluster, on cards, and in the order-detail Mechanics section.
// ---------------------------------------------------------------------------

export interface MechanicAvatarProps {
  id: string
  name?: string
  /** Uploaded photo (data-URL or path). When present, replaces the initials. */
  src?: string
  /** Pixel diameter. Default 24. */
  size?: number
  /** Show a selected ring (board filter). */
  selected?: boolean
  /** Dim when another filter is active but this one isn't selected. */
  dimmed?: boolean
  className?: string
  title?: string
}

/** Read-only circular avatar (a `<span>`). Wrap in a `<button>` for interactive
 * uses (e.g. the board filter). */
export function MechanicAvatar({
  id,
  name,
  src,
  size = 24,
  selected = false,
  dimmed = false,
  className,
  title,
}: MechanicAvatarProps) {
  return (
    <span
      title={title ?? name}
      aria-label={name}
      style={{ backgroundColor: avatarColorFromString(id), width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full font-semibold leading-none text-white ring-2 ring-card transition-opacity',
        selected && 'ring-2 ring-primary-600 ring-offset-1 ring-offset-card',
        dimmed && 'opacity-40',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}
