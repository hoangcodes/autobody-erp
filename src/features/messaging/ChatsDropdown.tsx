import * as React from 'react'
import { Search, SquarePen, MoreHorizontal } from 'lucide-react'
import { useConversations } from '@/hooks/useMessages'
import { useVehicleDirectory } from '@/hooks/useVehicles'
import { useChatDock } from '@/features/messaging/chatDockStore'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatRelativeTime, vehicleShortLine } from '@/lib/utils'
import type { Vehicle } from '@/types'

type ChatFilter = 'all' | 'unread'

/**
 * Facebook-Messenger-web-style "Chats" dropdown. Anchored under the top-bar
 * messenger icon (rendered by AppShell inside a relative wrapper). Tall panel
 * (~360px) that stretches to nearly the full viewport height with its own
 * scrolling conversation list, a "Search Messenger" field, and All/Unread
 * filter pills. Clicking a row opens a docked chat window and closes the panel.
 */
export function ChatsDropdown() {
  const open = useChatDock((s) => s.dropdownOpen)
  const setOpen = useChatDock((s) => s.setDropdownOpen)
  const openChat = useChatDock((s) => s.openChat)
  const openCompose = useChatDock((s) => s.openCompose)
  const { data: conversations } = useConversations()
  const { data: allVehicles } = useVehicleDirectory()
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<ChatFilter>('all')

  // Resolve one vehicle per customer once (first vehicle wins) so each row can
  // show a "year make model · color" subtitle without a hook-per-row.
  const vehicleByCustomer = React.useMemo(() => {
    const map = new Map<string, Vehicle>()
    for (const v of allVehicles ?? []) {
      if (!map.has(v.ownerCustomerId)) map.set(v.ownerCustomerId, v)
    }
    return map
  }, [allVehicles])

  if (!open) return null

  const filtered = (conversations ?? [])
    .filter((c) => (filter === 'unread' ? c.unreadCount > 0 : true))
    .filter((c) =>
      !search.trim() ? true : c.customerName.toLowerCase().includes(search.trim().toLowerCase()),
    )

  return (
    <>
      {/* Click-away overlay */}
      <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />

      <div className="fixed right-4 top-16 bottom-6 z-50 flex w-[368px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-pop animate-slide-up">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-3">
          <h2 className="text-xl font-bold text-foreground">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={openCompose}
              aria-label="New message"
              title="New message"
              className="flex h-8 w-8 items-center justify-center rounded-full text-primary-600 transition-colors hover:bg-primary-50 dark:hover:bg-primary-950/40"
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </button>
            <button
              aria-label="More options"
              title="More options"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <MoreHorizontal className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Messenger"
              aria-label="Search Messenger"
              className="h-9 w-full rounded-full border border-transparent bg-muted pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-input focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
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

        {/* Conversation list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
          {!conversations ? (
            <div className="space-y-1 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filter === 'unread' ? 'No unread messages.' : 'No conversations found.'}
            </p>
          ) : (
            filtered.map((c) => {
              const unread = c.unreadCount > 0
              // Decorative "online" dot (deterministic per customer id).
              const online = c.customerId.charCodeAt(c.customerId.length - 1) % 2 === 0
              const carLine = vehicleShortLine(vehicleByCustomer.get(c.customerId))
              return (
                <button
                  key={c.customerId}
                  onClick={() => openChat(c.customerId)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="relative shrink-0">
                    <Avatar size="lg" name={c.customerName} />
                    {online && (
                      <span className="absolute -bottom-0 -right-0 h-3 w-3 rounded-full bg-success ring-2 ring-card" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('truncate text-sm', unread ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
                        {c.customerName}
                      </p>
                      {c.lastMessageAt && (
                        <span className={cn('shrink-0 text-[11px]', unread ? 'font-semibold text-primary-600' : 'text-muted-foreground')}>
                          {formatRelativeTime(c.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {carLine && (
                      <p className="truncate text-[11px] text-muted-foreground">{carLine}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className={cn('truncate text-xs', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                        {c.lastMessage}
                      </p>
                      {unread && <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
