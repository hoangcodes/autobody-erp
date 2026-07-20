import * as React from 'react'
import {
  MoreHorizontal,
  MessageCircle,
  AtSign,
  DollarSign,
  CalendarCheck,
  Package,
  ClipboardCheck,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useChatDock } from '@/features/messaging/chatDockStore'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { NotificationType } from '@/types'

type NotifFilter = 'all' | 'unread'

/** Per-type row icon + tinted avatar background (light/dark safe). */
const TYPE_META: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  message: { icon: MessageCircle, className: 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' },
  mention: { icon: AtSign, className: 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' },
  appointment: { icon: CalendarCheck, className: 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300' },
  payment: { icon: DollarSign, className: 'bg-success/15 text-success' },
  dvi: { icon: ClipboardCheck, className: 'bg-success/15 text-success' },
  part: { icon: Package, className: 'bg-muted text-muted-foreground' },
  inventory: { icon: AlertTriangle, className: 'bg-warning/15 text-amber-600' },
}

/**
 * Facebook-style Notifications dropdown, anchored under the top-bar bell button
 * (rendered by AppShell inside a relative wrapper). A bounded panel (~360px
 * wide, max-h 480px) with its own scroll, an All/Unread filter, and one row per
 * notification (type icon, bold title, secondary body, relative time, unread
 * dot + tinted background). Mutually exclusive with the Chats dropdown — both
 * open-states live in chatDockStore so only one can be open at a time.
 */
export function NotificationsDropdown() {
  const open = useChatDock((s) => s.notificationsOpen)
  const setOpen = useChatDock((s) => s.setNotificationsOpen)
  const { data: notifications } = useNotifications()
  const [filter, setFilter] = React.useState<NotifFilter>('all')

  if (!open) return null

  const filtered = (notifications ?? []).filter((n) => (filter === 'unread' ? !n.read : true))

  return (
    <>
      {/* Click-away overlay */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />

      <div className="fixed right-4 top-16 bottom-6 z-50 flex w-[368px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-pop animate-slide-up">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-3">
          <h2 className="text-xl font-bold text-foreground">Notifications</h2>
          <button
            aria-label="Notification options"
            title="Options"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex shrink-0 items-center gap-2 px-3 py-2">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-full px-3 py-1 text-sm font-semibold capitalize transition-colors',
                filter === f
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
          {!notifications ? (
            <div className="space-y-1 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
            </p>
          ) : (
            filtered.map((n) => {
              const meta = TYPE_META[n.type]
              const Icon = meta.icon
              return (
                <button
                  key={n.id}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted',
                    !n.read && 'bg-primary-50/70 dark:bg-primary-950/30',
                  )}
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', meta.className)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', !n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground')}>
                      {n.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className={cn('mt-0.5 text-[11px]', !n.read ? 'font-semibold text-primary-600' : 'text-muted-foreground')}>
                      {formatRelativeTime(n.at)}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
