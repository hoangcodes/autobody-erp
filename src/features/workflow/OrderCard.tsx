import * as React from 'react'
import { Car, User, Pencil, Flame, Gauge } from 'lucide-react'
import type { Customer, Order, OrderLabelColor, Vehicle } from '@/types'
import type { TeamMember } from '@/hooks/useUsers'
import { MechanicAvatar } from '@/components/MechanicAvatar'
import { CarBrandMark } from '@/components/CarBrandMark'
import { cn, formatMoney, vehicleColorFirst } from '@/lib/utils'

export interface OrderCardProps {
  order: Order
  customer?: Customer
  vehicle?: Vehicle
  density: 'standard' | 'condensed'
  onClick: () => void
  /** Roster for resolving assigned mechanic names/colors on the card. */
  usersById?: Map<string, TeamMember>
  /** Briefly flash green (just dropped into this column). */
  flash?: boolean
  /** Fired when the green flash animation finishes so the parent can clear the
   * flash state (the animation owns its own lifetime — no racing timer). */
  onFlashEnd?: () => void
}

const LABEL_CLASSES: Record<OrderLabelColor, string> = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
}

export function OrderCard({ order, vehicle, density, onClick, usersById, flash, onFlashEnd }: OrderCardProps) {
  // Title without the leading "#<number>" — the id now lives in the footer. Fall
  // back to the job number when a card has no title.
  const title = order.title || `#${order.number}`
  const technician = order.technicianName
  const total = order.totals?.total ?? 0
  const paid = order.paidTotal ?? 0
  const remaining = order.balanceDue ?? 0
  const mainPhoto = [...(order.photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  const mechanicIds = order.mechanicIds ?? []

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onAnimationEnd={(e) => {
        // Only react to OUR flash keyframe (ignore any other animations that may
        // bubble), then hand the lifetime back to the board to clear the flash.
        if (flash && e.animationName.includes('flash-green')) onFlashEnd?.()
      }}
      className={cn(
        // Strict 262px width so cards sit cleanly inside the column.
        'group w-[262px] cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-pop',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        flash && 'animate-flash-green',
      )}
    >
      {/* Car photo (Jira-style): rendered ONLY when the order actually has a photo
          entry. Cards with no photo show no thumbnail box at all — the card starts
          at the title. When present, the thumbnail still prefers a licensed drop-in
          photo (/car-photos/<vehicleId>.jpg) over the order's own photo. Inset with
          a small gap (p-2 wrapper) so the card border reads as distinct.
          NOTE: drop-in photos are only honored for orders that have a photos[]
          entry; a bare drop-in without a photos[] entry won't surface a thumbnail. */}
      {mainPhoto && (
        <div className="p-2 pb-0">
          <div className="h-28 w-full overflow-hidden rounded-lg bg-muted">
            <CarThumb
              vehicleId={order.vehicleId}
              fallbackUrl={mainPhoto.url}
              alt={vehicleColorFirst(vehicle)}
            />
          </div>
        </div>
      )}

      {/* Details area — content-height (Jira-style: cards grow with content). */}
      <div className={cn('flex flex-col', density === 'condensed' ? 'p-2.5' : 'px-3 pb-3 pt-2')}>
        {/* Title + edit (pencil) button at the end of the header — opens the
            order modal (same as clicking the card). Stops propagation so the
            card's own onClick doesn't also fire (double-open). */}
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {title}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            aria-label="Edit job"
            title="Edit job"
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        {/* Label chips (added via the order modal now — no inline add button) */}
        {(order.labels?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 overflow-hidden">
            {(order.labels ?? []).map((label) => (
              <span
                key={label.id}
                className={cn('rounded-sm px-2 py-0.5 text-[11px] font-medium leading-none', LABEL_CLASSES[label.color])}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}

        {/* Vehicle — color, year, make, model (e.g. "Black 2013 BMW M5"), with the
            per-make brand mark (Car icon when the make is unknown). */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CarBrandMark make={vehicle?.make} size={16} />
          <span className="truncate">{vehicleColorFirst(vehicle)}</span>
        </div>

        {/* Technician (lead) */}
        {technician && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{technician}</span>
          </div>
        )}

        {/* Footer: LEFT is a vertical stack — mechanic avatars ROW on top, then a
            row with the effort icon + #id below it. Total pinned to the RIGHT. */}
        <div className="mt-2 flex items-end justify-between gap-2 border-t border-border pt-2">
          <div className="flex min-w-0 flex-col gap-1">
            {mechanicIds.length > 0 && <MechanicStack mechanicIds={mechanicIds} usersById={usersById} />}
            <div className="flex items-center gap-1.5">
              <EffortIcon effort={order.effort} />
              <span className="text-[11px] font-medium text-muted-foreground">#{order.number}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-foreground">{formatMoney(total)}</p>
            {remaining > 0.005 ? (
              <p className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                Remaining {formatMoney(remaining)}
              </p>
            ) : paid > 0 ? (
              <p className="text-[11px] font-semibold text-green-600 dark:text-green-400">Paid {formatMoney(paid)}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Card thumbnail that walks a list of candidate image URLs, advancing to the
 * next on error. Order: the licensed drop-in `/car-photos/<vehicleId>.jpg`, then
 * the order's own photo, then (when all fail/absent) the neutral Car glyph. */
function CarThumb({
  vehicleId,
  fallbackUrl,
  alt,
}: {
  vehicleId?: string
  fallbackUrl?: string
  alt: string
}) {
  const candidates = React.useMemo(() => {
    const list: string[] = []
    if (vehicleId) list.push(`/car-photos/${vehicleId}.jpg`)
    if (fallbackUrl) list.push(fallbackUrl)
    return list
  }, [vehicleId, fallbackUrl])

  // Start at the first candidate that hasn't already 404'd in a previous mount,
  // so re-mounting a card (e.g. after a drag-drop) doesn't re-request the known-
  // missing drop-in photo and flicker before falling back.
  const firstUsable = (list: string[]) => {
    const i = list.findIndex((c) => !FAILED_IMG_SRC.has(c))
    return i === -1 ? list.length : i
  }
  const [idx, setIdx] = React.useState(() => firstUsable(candidates))
  React.useEffect(() => setIdx(firstUsable(candidates)), [candidates])

  const src = candidates[idx]
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
        <Car className="h-7 w-7 opacity-50" aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => {
        FAILED_IMG_SRC.add(src)
        setIdx((i) => {
          let n = i + 1
          while (n < candidates.length && FAILED_IMG_SRC.has(candidates[n] as string)) n++
          return n
        })
      }}
      className="h-full w-full rounded-lg object-cover"
    />
  )
}

// Module-level cache of image srcs that already failed to load (e.g. the missing
// `/car-photos/<id>.jpg` drop-in). Persists across card mounts so a remount goes
// straight to the working source instead of re-attempting the 404.
const FAILED_IMG_SRC = new Set<string>()

/** Overlapping mechanic avatars (up to 3). Any extra assignees collapse into a
 * "+N" circle whose CLICK opens a small dropdown listing the remaining people
 * (name + avatar). Clicks are stopped from bubbling so they never open the card
 * modal or start a drag; the dropdown closes on outside click. */
function MechanicStack({
  mechanicIds,
  usersById,
}: {
  mechanicIds: string[]
  usersById?: Map<string, TeamMember>
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const visible = mechanicIds.slice(0, 3)
  const overflow = mechanicIds.slice(3)

  React.useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Keep pointer-down/click from reaching the draggable card behind the avatars.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div className="flex -space-x-1.5" onPointerDown={stop} onClick={stop}>
      {visible.map((id) => (
        <MechanicAvatar key={id} id={id} name={usersById?.get(id)?.name} size={24} />
      ))}
      {overflow.length > 0 && (
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((o) => !o)
            }}
            aria-expanded={open}
            aria-label={`${overflow.length} more assigned`}
            title={`${overflow.length} more`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card transition-colors hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            +{overflow.length}
          </button>
          {open && (
            <div className="absolute bottom-full left-0 z-40 mb-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-pop animate-fade-in">
              {overflow.map((id) => (
                <div key={id} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <MechanicAvatar id={id} name={usersById?.get(id)?.name} size={22} />
                  <span className="truncate text-sm text-foreground">{usersById?.get(id)?.name ?? 'Unknown'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Small colored pill signalling job effort: `low` → green Gauge ("Low
 * effort"); `medium` → amber Gauge ("Medium effort"); `high` → red Flame ("High
 * effort"). Kept tiny so the footer stays tidy on the 262px card. */
function EffortIcon({ effort }: { effort?: 'low' | 'medium' | 'high' }) {
  const level = effort ?? 'low'
  const Icon = level === 'high' ? Flame : Gauge
  const label = level === 'high' ? 'High effort' : level === 'medium' ? 'Medium effort' : 'Low effort'
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        level === 'high' && 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
        level === 'medium' && 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
        level === 'low' && 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300',
      )}
    >
      <Icon className="h-3 w-3" />
    </span>
  )
}
