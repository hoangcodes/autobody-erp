import * as React from 'react'
import { Mic, Image as ImageIcon, Sticker, Smile, ThumbsUp, SendHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MessengerComposerProps {
  value: string
  onChange: (value: string) => void
  /** Send the current input value. */
  onSend: () => void
  /** Optional quick reaction when the input is empty (e.g. a 👍 message). */
  onLike?: () => void
  sending?: boolean
  disabled?: boolean
  placeholder?: string
  /** Compact variant tightens spacing for the ~320px docked window. */
  compact?: boolean
}

/**
 * Facebook-Messenger-web-style composer.
 *
 * Idle (empty input):  [voice][photo][sticker][GIF]  ( Aa ...............  🙂 )  👍
 * Typing (has text):   [ + ]                          ( .................  🙂 )  ➤
 *
 * - When text is entered the 4 media buttons collapse into a single round "+"
 *   which opens a popover ABOVE it containing the same 4 buttons.
 * - The trailing Like (ThumbsUp) button is swapped for a Send (paper-plane)
 *   button while typing; Enter also sends.
 * - The 4 media buttons + emoji are visual affordances: photo/sticker/GIF/voice
 *   are intentional no-ops (title="Coming soon"); the emoji button appends a
 *   smiley so it has a small real effect.
 */
export function MessengerComposer({
  value,
  onChange,
  onSend,
  onLike,
  sending,
  disabled,
  placeholder = 'Aa',
  compact,
}: MessengerComposerProps) {
  const [plusOpen, setPlusOpen] = React.useState(false)
  const hasText = value.trim().length > 0

  // Collapsing the cluster into "+" only makes sense once there is text.
  React.useEffect(() => {
    if (!hasText) setPlusOpen(false)
  }, [hasText])

  function handleSend() {
    if (disabled || !hasText) return
    onSend()
  }

  const iconBtn =
    'flex items-center justify-center rounded-full text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-40 dark:hover:bg-primary-950/40'
  const size = compact ? 'h-8 w-8' : 'h-9 w-9'

  const MediaButtons = (
    <>
      <button type="button" title="Voice message (coming soon)" aria-label="Voice message" className={cn(iconBtn, size)} disabled={disabled}>
        <Mic className="h-[18px] w-[18px]" />
      </button>
      <button type="button" title="Photos & videos (coming soon)" aria-label="Add photo" className={cn(iconBtn, size)} disabled={disabled}>
        <ImageIcon className="h-[18px] w-[18px]" />
      </button>
      <button type="button" title="Sticker (coming soon)" aria-label="Add sticker" className={cn(iconBtn, size)} disabled={disabled}>
        <Sticker className="h-[18px] w-[18px]" />
      </button>
      <button type="button" title="Choose a GIF (coming soon)" aria-label="Choose a GIF" className={cn(iconBtn, size)} disabled={disabled}>
        <span className="text-[11px] font-extrabold leading-none tracking-tight">GIF</span>
      </button>
    </>
  )

  return (
    <div className={cn('flex items-end gap-1', compact ? 'px-1.5 py-1.5' : 'px-2 py-2')}>
      {/* Left: media cluster (idle) OR "+" with popover (typing) */}
      <div className="relative flex shrink-0 items-center">
        {hasText ? (
          <>
            <button
              type="button"
              onClick={() => setPlusOpen((o) => !o)}
              aria-label="More actions"
              aria-expanded={plusOpen}
              disabled={disabled}
              className={cn(iconBtn, size, 'animate-fade-in')}
            >
              <Plus className={cn('h-5 w-5 transition-transform', plusOpen && 'rotate-45')} />
            </button>
            {plusOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 z-10 mb-2 flex items-center gap-0.5 rounded-full border border-border bg-popover p-1 shadow-pop animate-slide-up"
              >
                {MediaButtons}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center animate-fade-in">{MediaButtons}</div>
        )}
      </div>

      {/* Middle: rounded pill input with emoji button inside the right edge */}
      <div className="relative flex min-w-0 flex-1 items-center">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Message"
          className={cn(
            'max-h-24 w-full resize-none rounded-2xl border border-input bg-muted/60 py-2 pl-3 pr-9 text-sm leading-tight',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60 scrollbar-thin',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button
          type="button"
          title="Emoji"
          aria-label="Emoji"
          disabled={disabled}
          onClick={() => onChange(value + '🙂')}
          className="absolute right-1 flex h-7 w-7 items-center justify-center rounded-full text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-40 dark:hover:bg-primary-950/40"
        >
          <Smile className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Right: Like (idle) OR Send (typing) */}
      <div className="flex shrink-0 items-center">
        {hasText ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || sending}
            aria-label="Send message"
            className={cn(iconBtn, size, 'animate-fade-in')}
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onLike?.()}
            disabled={disabled || !onLike}
            aria-label="Send a thumbs up"
            className={cn(iconBtn, size, 'animate-fade-in')}
          >
            <ThumbsUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
