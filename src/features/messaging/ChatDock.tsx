import * as React from 'react'
import { Minus, X, Search } from 'lucide-react'
import { useConversations } from '@/hooks/useMessages'
import { useCustomers } from '@/hooks/useCustomers'
import { useUsers } from '@/hooks/useUsers'
import { useVehicles } from '@/hooks/useVehicles'
import { MessageThread } from '@/features/messaging/MessageThread'
import { MessengerGlyph } from '@/features/messaging/MessengerGlyph'
import { Avatar } from '@/components/ui/Avatar'
import { cn, customerDisplayName, vehicleShortLine } from '@/lib/utils'
import { useChatDock, MAX_OPEN_WINDOWS } from '@/features/messaging/chatDockStore'
import type { Conversation } from '@/types'

/**
 * Facebook-style global messaging dock, rendered once from AppShell so it is
 * present on every page:
 *  - a floating round compose launcher (bottom-right) that starts a NEW chat,
 *  - a "New message" compose window with a To: recipient picker,
 *  - docked chat windows stacked horizontally to the left of the launcher.
 *
 * The "Chats" dropdown itself now lives in the top bar (see ChatsDropdown),
 * anchored to the header messenger icon.
 */
export function ChatDock() {
  const { data: conversations } = useConversations()
  const openChats = useChatDock((s) => s.openChats)
  const composeOpen = useChatDock((s) => s.composeOpen)

  const byId = React.useMemo(
    () => new Map((conversations ?? []).map((c) => [c.customerId, c])),
    [conversations],
  )

  // Newest windows render nearest the launcher (right); cap visible, collapse rest.
  const visible = openChats.slice(0, MAX_OPEN_WINDOWS)
  const overflowCount = openChats.length - visible.length

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-40 flex items-end gap-3 p-4">
      {/* New-message compose window opens to the LEFT of existing windows */}
      {composeOpen && <ComposeWindow />}

      {/* Docked windows: newest to the left; oldest stays anchored by the launcher */}
      {visible.map((customerId) => (
        <ChatWindow key={customerId} conversation={byId.get(customerId)} customerId={customerId} />
      ))}

      {overflowCount > 0 && (
        <div className="pointer-events-auto flex h-[46px] items-center self-end rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-pop">
          +{overflowCount} more
        </div>
      )}

      {/* Floating compose launcher */}
      <div className="pointer-events-auto flex flex-col items-end self-end">
        <LauncherButton />
      </div>
    </div>
  )
}

function LauncherButton() {
  const openCompose = useChatDock((s) => s.openCompose)
  return (
    <button
      onClick={openCompose}
      aria-label="New message"
      title="New message"
      className="flex h-14 w-14 items-center justify-center rounded-full shadow-pop transition-transform hover:scale-105 active:scale-95"
    >
      <MessengerGlyph className="h-14 w-14" />
    </button>
  )
}

function ChatWindow({ conversation, customerId }: { conversation?: Conversation; customerId: string }) {
  const minimized = useChatDock((s) => s.minimized[customerId])
  const toggleMinimize = useChatDock((s) => s.toggleMinimize)
  const closeChat = useChatDock((s) => s.closeChat)
  const name = conversation?.customerName ?? 'Customer'
  const { data: vehicles } = useVehicles(customerId)
  const v = vehicles?.[0]
  // year make model · color, e.g. "2019 Honda CR-V · Silver"
  const carText = vehicleShortLine(v)

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-[320px] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-pop',
        minimized ? 'h-[46px]' : 'h-[440px]',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 pb-2.5 pt-2">
        <button
          onClick={() => toggleMinimize(customerId)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Avatar size="sm" name={name} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate pb-0.5 text-sm font-semibold text-foreground">{name}</span>
            {carText && <span className="block truncate text-[13px] text-muted-foreground">{carText}</span>}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => toggleMinimize(customerId)}
            aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => closeChat(customerId)}
            aria-label="Close chat"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!minimized && (
        <div className="min-h-0 flex-1 p-2">
          <MessageThread customerId={customerId} />
        </div>
      )}
    </div>
  )
}

interface ComposeRecipient {
  id: string
  name: string
  kind: 'customer' | 'team'
}

/**
 * "New message" window. Starts with a To: recipient picker that searches BOTH
 * the customer directory AND team members (mechanics / staff) in one combined,
 * de-duplicated list — each result subtly tagged "Customer" or "Team".
 * Selecting a recipient switches the window in place into that conversation —
 * loading its thread + composer (keyed by the recipient's id either way). Until
 * then the composer is shown disabled/empty.
 */
function ComposeWindow() {
  const closeCompose = useChatDock((s) => s.closeCompose)
  const [minimized, setMinimized] = React.useState(false)
  const [recipientId, setRecipientId] = React.useState<string | null>(null)
  const [to, setTo] = React.useState('')
  const { data: customersRes } = useCustomers('')
  const { data: team } = useUsers()

  // Merge customers + team into one de-duplicated recipient list (by id).
  const recipients = React.useMemo<ComposeRecipient[]>(() => {
    const list: ComposeRecipient[] = []
    const seen = new Set<string>()
    for (const c of customersRes?.items ?? []) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      list.push({ id: c.id, name: customerDisplayName(c), kind: 'customer' })
    }
    for (const u of team ?? []) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      list.push({ id: u.id, name: u.name, kind: 'team' })
    }
    return list
  }, [customersRes, team])

  const recipient = recipients.find((r) => r.id === recipientId)
  const q = to.trim().toLowerCase()
  // Don't dump the whole directory: cap the suggestion list, filter as they type.
  const matches = (q ? recipients.filter((r) => r.name.toLowerCase().includes(q)) : recipients).slice(0, 8)

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-[320px] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-pop',
        minimized ? 'h-[46px]' : 'h-[440px]',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <button onClick={() => setMinimized((m) => !m)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {recipient ? (
            <Avatar size="sm" name={recipient.name} />
          ) : (
            <MessengerGlyph className="h-6 w-6" />
          )}
          <span className="truncate text-sm font-semibold text-foreground">
            {recipient ? recipient.name : 'New message'}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMinimized((m) => !m)}
            aria-label={minimized ? 'Expand' : 'Minimize'}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={closeCompose}
            aria-label="Close"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && recipient ? (
        // Recipient chosen -> load the real conversation thread + composer.
        <div className="min-h-0 flex-1 p-2">
          <MessageThread customerId={recipient.id} />
        </div>
      ) : (
        !minimized && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* To: recipient field */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">To:</span>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Search name"
                  aria-label="Recipient"
                  className="h-8 w-full rounded-full border border-input bg-background pl-7 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Suggestions */}
            <div className="min-h-0 flex-1 overflow-y-auto p-1 scrollbar-thin">
              {matches.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No matches.</p>
              ) : (
                matches.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRecipientId(r.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <Avatar size="md" name={r.name} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.name}</span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                        r.kind === 'customer'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300',
                      )}
                    >
                      {r.kind === 'customer' ? 'Customer' : 'Team'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}
