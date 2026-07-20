import * as React from 'react'
import { useConversations } from '@/hooks/useMessages'
import { PageHeader } from '@/components/PageHeader'
import { MessageThread } from '@/features/messaging/MessageThread'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

export function MessagesPage() {
  const conversationsQuery = useConversations()
  const [selected, setSelected] = React.useState<string | null>(null)

  const conversations = conversationsQuery.data ?? []
  const activeId = selected ?? conversations[0]?.customerId ?? null

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Messages" description="Two-way SMS and email with your customers." />

      {conversationsQuery.isError ? (
        <ErrorState onRetry={() => conversationsQuery.refetch()} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[300px_1fr] gap-4">
          <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card scrollbar-thin">
            {conversationsQuery.isLoading ? (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState title="No conversations" description="Send an estimate or invoice to start a thread." />
            ) : (
              conversations.map((c) => (
                <button
                  key={c.customerId}
                  onClick={() => setSelected(c.customerId)}
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-border p-3 text-left hover:bg-muted/40',
                    activeId === c.customerId && 'bg-primary-50',
                  )}
                >
                  <Avatar size="sm" name={c.customerName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.customerName}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.lastMessage}</p>
                  </div>
                  {c.unreadCount > 0 && <Badge variant="default">{c.unreadCount}</Badge>}
                </button>
              ))
            )}
          </div>

          <div className="min-h-0 rounded-lg border border-border bg-card p-3">
            {activeId ? (
              <MessageThread customerId={activeId} />
            ) : (
              <EmptyState title="Select a conversation" description="Pick a thread on the left to read and reply." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
