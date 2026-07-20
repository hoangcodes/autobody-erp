import {
  Settings as SettingsIcon,
  StickyNote,
  MessageSquare,
  Mail,
  Shuffle,
  CreditCard,
  CheckCircle2,
  Search as SearchIcon,
  Wrench,
  CalendarDays,
  Package,
  type LucideIcon,
} from 'lucide-react'
import type { OrderActivity, OrderActivityKind } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<OrderActivityKind, string> = {
  system_event: 'System',
  user_note: 'Note',
  internal_message: 'Internal message',
  customer_message: 'Message',
  status_change: 'Status change',
  payment: 'Payment',
  authorization: 'Authorization',
  inspection: 'Inspection',
  assignment: 'Assignment',
  appointment: 'Appointment',
  part_event: 'Parts',
}

const KIND_ICON: Record<OrderActivityKind, LucideIcon> = {
  system_event: SettingsIcon,
  user_note: StickyNote,
  internal_message: MessageSquare,
  customer_message: Mail,
  status_change: Shuffle,
  payment: CreditCard,
  authorization: CheckCircle2,
  inspection: SearchIcon,
  assignment: Wrench,
  appointment: CalendarDays,
  part_event: Package,
}

export function Timeline({ entries }: { entries: OrderActivity[] }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  const sorted = [...entries].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
    return new Date(b.at).getTime() - new Date(a.at).getTime()
  })

  const iconFor = (kind: OrderActivityKind) => {
    const Icon = KIND_ICON[kind]
    return <Icon className="h-4 w-4" />
  }

  return (
    <ol className="relative space-y-0">
      {sorted.map((entry, idx) => (
        <li key={entry.id} className="relative flex gap-3 pb-5">
          {idx !== sorted.length - 1 && (
            <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden="true" />
          )}
          <div
            className={cn(
              'z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm',
              entry.actorType === 'customer'
                ? 'border-primary-200 bg-primary-50'
                : entry.actorType === 'system'
                  ? 'border-border bg-muted'
                  : 'border-primary-200 bg-white',
            )}
            title={KIND_LABEL[entry.kind]}
          >
            {iconFor(entry.kind)}
          </div>
          <div className="min-w-0 flex-1 rounded-md border border-border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{KIND_LABEL[entry.kind]}</Badge>
              {entry.pinned && <Badge variant="warning">Pinned</Badge>}
              {entry.visibility === 'customer_visible' ? (
                <Badge variant="info">Customer-visible</Badge>
              ) : (
                <Badge variant="secondary">Internal</Badge>
              )}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground" title={formatDateTime(entry.at)}>
                {formatRelativeTime(entry.at)}
              </span>
            </div>
            {entry.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{entry.body}</p>}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar size="sm" name={entry.actorType === 'system' ? 'System' : (entry.authorId ?? 'User')} />
              <span>
                {entry.actorType === 'system'
                  ? 'System'
                  : entry.actorType === 'customer'
                    ? 'Customer'
                    : (entry.authorId ?? 'Staff')}
              </span>
              {entry.mentions.length > 0 && <span className="italic">mentioned {entry.mentions.length} teammate(s)</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
