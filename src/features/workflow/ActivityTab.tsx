import * as React from 'react'
import { useOrderActivity, useCreateNote } from '@/hooks/useOrderActivity'
import { Timeline } from '@/components/Timeline'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toastStore'
import type { ActivityVisibility, OrderActivityKind } from '@/types'

const FILTERS: { label: string; kinds: OrderActivityKind[] | null }[] = [
  { label: 'All', kinds: null },
  { label: 'Notes', kinds: ['user_note'] },
  { label: 'System', kinds: ['system_event', 'status_change', 'assignment'] },
  { label: 'Payments', kinds: ['payment'] },
  { label: 'Messages', kinds: ['customer_message', 'internal_message'] },
  { label: 'Authorizations', kinds: ['authorization'] },
]

export function ActivityTab({ orderId }: { orderId: string }) {
  const activityQuery = useOrderActivity(orderId)
  const createNote = useCreateNote(orderId)

  const [filterIdx, setFilterIdx] = React.useState(0)
  const [body, setBody] = React.useState('')
  const [visibility, setVisibility] = React.useState<ActivityVisibility>('internal')
  const [pinned, setPinned] = React.useState(false)

  if (activityQuery.isError) {
    return <ErrorState onRetry={() => activityQuery.refetch()} title="Couldn't load activity" />
  }

  const entries = activityQuery.data ?? []
  const activeFilter = FILTERS[filterIdx]!
  const filtered = activeFilter.kinds ? entries.filter((e) => activeFilter.kinds!.includes(e.kind)) : entries

  function submitNote() {
    if (!body.trim()) return
    const mentions = Array.from(body.matchAll(/@(\w+)/g)).map((m) => m[1]!)
    createNote.mutate(
      { body, visibility, mentions, pinned },
      {
        onSuccess: () => {
          setBody('')
          setPinned(false)
        },
        onError: (err) => toast.error('Could not post note', err instanceof Error ? err.message : undefined),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border border-border bg-card p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note… use @name to mention a teammate"
          rows={3}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={visibility === 'internal'}
                onChange={() => setVisibility('internal')}
              />
              Internal only
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={visibility === 'customer_visible'}
                onChange={() => setVisibility('customer_visible')}
              />
              Customer-visible
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin
            </label>
          </div>
          <Button size="sm" onClick={submitNote} loading={createNote.isPending}>
            Post note
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f, idx) => (
          <button
            key={f.label}
            onClick={() => setFilterIdx(idx)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              idx === filterIdx ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {activityQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <Timeline entries={filtered} />
      )}
    </div>
  )
}
