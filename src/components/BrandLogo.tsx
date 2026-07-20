import * as React from 'react'
import { cn } from '@/lib/utils'
// The real (white) logo asset. Provided by the user; will be served from the
// backend in the future. Imported so Vite fingerprints/bundles it.
import logoUrl from '@/assets/image.png'

// ---------------------------------------------------------------------------
// ABS Autobody brand lockup.
//
// REAL LOGO: drop the white PNG at `public/abs-autobody-logo.png` and it is
// served from the site root and used automatically (see public/README.md). If
// the file is absent the <img> onError fires and we fall back to the inline
// white vector placeholder emblem below — so the UI always renders.
//
// Because the mark is WHITE, it is invisible on a light surface, so the emblem
// is wrapped in a DARK rounded badge in LIGHT mode. In DARK mode the badge
// background is dropped (transparent) so the white mark blends into the dark
// top bar as intended.
// ---------------------------------------------------------------------------

/** The real white logo asset (src/assets/image.png). */
const LOGO_SRC = logoUrl

/** Display name of the tenant company. Exported so other UI can reuse it. */
export const BRAND_NAME = 'ABS Autobody'

export interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  // Try the real asset first; if it 404s (not dropped in yet) fall back to the
  // inline placeholder emblem below.
  const [imgFailed, setImgFailed] = React.useState(false)

  return (
    <div className={cn('flex items-center gap-2', className)} title={BRAND_NAME}>
      {/* Dark badge in light mode so a WHITE logo/mark is visible; no background
          in dark mode (blends with the dark top bar). A wide (non-square) logo is
          allowed to show fully via w-auto + max-width. */}
      <span className="flex h-14 w-auto shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-900 px-3 dark:bg-transparent dark:px-0">
        {!imgFailed ? (
          <img
            src={LOGO_SRC}
            alt={BRAND_NAME}
            className="h-11 w-auto max-w-[200px] object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
        /* PLACEHOLDER white emblem — used until the real PNG is added. */
        <svg viewBox="0 0 32 32" className="h-11 w-11" aria-hidden="true" focusable="false">
          {/* White car silhouette + bold "ABS" stroke */}
          <path
            d="M5 21 L5 18 Q5 16.5 6.5 16.2 L10 15.6 Q12.4 11.5 16.5 11.5 L21 11.5 Q24.5 11.6 26.5 15.4 L27.5 15.8 Q28 16 28 16.8 L28 21 Z"
            fill="#ffffff"
          />
          <circle cx="11" cy="21.5" r="2.6" fill="#ffffff" />
          <circle cx="23" cy="21.5" r="2.6" fill="#ffffff" />
          <circle cx="11" cy="21.5" r="1" fill="#0f172a" />
          <circle cx="23" cy="21.5" r="1" fill="#0f172a" />
          <text x="16" y="9" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="7" fontWeight="800" fill="#ffffff">
            ABS
          </text>
        </svg>
        )}
      </span>
      {/* Wordmark removed: the location name in the top bar already reads
          "ABS Autobody", so the text next to the mark was a duplicate. */}
    </div>
  )
}
