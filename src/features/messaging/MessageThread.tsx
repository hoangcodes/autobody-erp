import * as React from 'react'
import { useMessageThread, useSendMessage } from '@/hooks/useMessages'
import { MessengerComposer } from '@/features/messaging/MessengerComposer'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { cn, formatDateTime } from '@/lib/utils'
import { toast } from '@/components/ui/toastStore'
import type { MessageChannel } from '@/types'

export interface MessageThreadProps {
  customerId: string
  orderId?: string
  defaultChannel?: MessageChannel
}

/** Quick-insert canned phrases shown above the channel selector. */
const COMMON_PHRASES = [
  'Hello. Your car is ready for pickup. Kindly come anytime during business hours',
  'Hello. Your car is soon to be ready for pickup.',
]

/** Two-way SMS/email thread, reused both in the global Messages center and
 * scoped inline inside an order's detail drawer. */
export function MessageThread({ customerId, orderId, defaultChannel = 'sms' }: MessageThreadProps) {
  const threadQuery = useMessageThread(customerId, orderId)
  const sendMessage = useSendMessage()
  const [channels, setChannels] = React.useState<MessageChannel[]>([defaultChannel])
  const [body, setBody] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  function toggleChannel(ch: MessageChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? (prev.length > 1 ? prev.filter((c) => c !== ch) : prev) : [...prev, ch],
    )
  }

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [threadQuery.data])

  function send(text?: string) {
    const content = (text ?? body).trim()
    if (!content || channels.length === 0) return
    // Send once per selected channel (SMS and/or Email).
    channels.forEach((ch) =>
      sendMessage.mutate(
        { customerId, orderId, channel: ch, body: content },
        { onError: (err) => toast.error('Message failed to send', err instanceof Error ? err.message : undefined) },
      ),
    )
    setBody('')
  }

  if (threadQuery.isError) {
    return <ErrorState onRetry={() => threadQuery.refetch()} title="Couldn't load messages" />
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-1 scrollbar-thin">
        {threadQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-2/3" />
          </div>
        ) : (threadQuery.data ?? []).length === 0 ? (
          <EmptyState title="No messages yet" description="Send the first message to this customer." />
        ) : (
          (threadQuery.data ?? []).map((m) => (
            <div key={m.id} className={cn('flex flex-col', m.direction === 'outbound' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  m.direction === 'outbound' ? 'bg-primary-600 text-white' : 'bg-muted text-foreground',
                )}
              >
                {m.subject && <p className="font-semibold">{m.subject}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {formatDateTime(m.createdAt)}
                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                  {m.channel}
                </Badge>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Common phrases (insert into composer), then SMS/Email selector. */}
      <div className="space-y-1.5 border-t border-border px-2 pt-2">
        <div className="flex flex-wrap gap-1">
          {COMMON_PHRASES.map((phrase, i) => (
            <button
              key={i}
              onClick={() => setBody(phrase)}
              title={phrase}
              className="max-w-full truncate rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium hover:bg-primary-50 dark:hover:bg-primary-950/40"
            >
              {phrase}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(['sms', 'email'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => toggleChannel(ch)}
              aria-pressed={channels.includes(ch)}
              title={`Send via ${ch.toUpperCase()}`}
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase transition-colors',
                channels.includes(ch) ? 'bg-primary-600 text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <MessengerComposer
        compact
        value={body}
        onChange={setBody}
        onSend={() => send()}
        onLike={() => send('👍')}
        sending={sendMessage.isPending}
      />
    </div>
  )
}
