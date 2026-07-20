import { cn } from '@/lib/utils'

export interface MessengerGlyphProps {
  className?: string
}

/**
 * "New message" launcher glyph, Facebook-style: a filled brand-blue circle with
 * a white edit (compose) pencil in the center. Rendered as inline SVG so it
 * scales cleanly from `className` (e.g. `h-14 w-14` launcher, `h-6 w-6` header).
 * NOTE: this is an original look-alike, not Meta's trademarked Messenger logo.
 */
export function MessengerGlyph({ className }: MessengerGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-6 w-6', className)} aria-hidden="true" focusable="false">
      {/* Circle (brand blue) */}
      <circle cx="12" cy="12" r="11" className="fill-primary-600" />
      {/* White edit / compose pencil */}
      <path
        fill="#fff"
        d="M7 15.1V17h1.9l5.6-5.6-1.9-1.9L7 15.1zm9.8-5.2c.2-.2.2-.5 0-.7l-1.2-1.2c-.2-.2-.5-.2-.7 0l-.94.94 1.9 1.9.94-.94z"
      />
    </svg>
  )
}
