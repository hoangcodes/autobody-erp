import * as React from 'react'
import { Car } from 'lucide-react'
import { avatarColorFromString, cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Small per-make brand marker. Load order:
//   1. Known make → try a licensed logo image at `/car-logos/<slug>.png`
//      (slug = make lowercased with non-alphanumerics collapsed to '-', e.g.
//      "Mercedes-Benz" → "mercedes-benz"). Drop files into `public/car-logos/`
//      and they are used automatically — see public/car-logos/README.md.
//   2. If that image errors (file not present), fall back to a monogram badge
//      (≤3 chars → whole make uppercased, e.g. "BMW"; longer → first two
//      letters, e.g. "Toyota" → "TO") tinted with a deterministic color.
//   3. Empty/unknown make → the lucide `Car` icon (the app's default glyph).
//
// No real automaker logos are bundled here — the monogram is an unlicensed,
// always-available default.
// ---------------------------------------------------------------------------

export interface CarBrandMarkProps {
  make?: string
  /** Pixel size (height / min-width of the badge, or icon size). Default 16. */
  size?: number
  className?: string
}

function slugify(make: string): string {
  return make
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CarBrandMark({ make, size = 16, className }: CarBrandMarkProps) {
  const trimmed = (make ?? '').trim()
  const [imgError, setImgError] = React.useState(false)

  // Reset the error state whenever the make changes so a new make re-attempts
  // its logo instead of inheriting a previous failure.
  React.useEffect(() => {
    setImgError(false)
  }, [trimmed])

  // Unknown make → default Car icon (matches the photo-placeholder fallback).
  if (!trimmed) {
    return (
      <Car
        style={{ width: size, height: size }}
        className={cn('shrink-0 text-muted-foreground', className)}
        aria-hidden="true"
      />
    )
  }

  // Known make → try the licensed logo image first.
  if (!imgError) {
    return (
      <img
        src={`/car-logos/${slugify(trimmed)}.png`}
        alt={trimmed}
        title={trimmed}
        style={{ height: size, width: size }}
        className={cn('shrink-0 rounded object-contain', className)}
        onError={() => setImgError(true)}
      />
    )
  }

  // Image missing → monogram badge fallback.
  const monogram = trimmed.length <= 3 ? trimmed.toUpperCase() : trimmed.slice(0, 2).toUpperCase()

  return (
    <span
      title={trimmed}
      aria-label={trimmed}
      style={{
        backgroundColor: avatarColorFromString(trimmed),
        height: size,
        minWidth: size,
        fontSize: Math.max(8, Math.round(size * 0.48)),
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded px-1 font-bold uppercase leading-none tracking-tight text-white',
        className,
      )}
    >
      {monogram}
    </span>
  )
}
