import * as React from 'react'
import { useAuditLogs } from '@/hooks/useAuditLog'
import { useUsers } from '@/hooks/useUsers'
import { useWorkflowStatuses } from '@/hooks/useWorkflowStatuses'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { AuditLog, Order } from '@/types'

/** Human label for the audit action, shown in the "Context" column. */
const CONTEXT_LABEL: Record<string, string> = {
  create: 'Create',
  update: 'Edit',
  status_change: 'Move',
}

/** Friendly labels for known order fields; everything else is de-camel-cased. */
const FIELD_LABEL: Record<string, string> = {
  workflowStatusId: 'Stage',
  customerId: 'Customer',
  vehicleId: 'Vehicle',
  startDate: 'Start date',
  dueAt: 'Due',
  promisedAt: 'Promised',
  status: 'Order type',
}

function humanizeField(key: string): string {
  if (FIELD_LABEL[key]) return FIELD_LABEL[key]!
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).trim()
}

/** One flattened field-change row derived from an audit entry's before→after. */
interface NoteRow {
  id: string
  at: string
  context: string
  user: string
  role: string
  field: string
  oldValue: string
  newValue: string
}

export function SystemNotesTab({ order }: { order: Order }) {
  const auditQuery = useAuditLogs({ entityType: 'order', entityId: order.id })
  const usersQuery = useUsers()
  const statusesQuery = useWorkflowStatuses()

  const userById = React.useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u])),
    [usersQuery.data],
  )
  const stageById = React.useMemo(
    () => new Map((statusesQuery.data ?? []).map((s) => [s.id, s.name])),
    [statusesQuery.data],
  )

  const formatValue = React.useCallback(
    (key: string, value: unknown): string => {
      if (value === null || value === undefined || value === '') return '—'
      if (key === 'workflowStatusId') return stageById.get(String(value)) ?? String(value)
      if (key === 'startDate') return formatDate(String(value))
      if (key.endsWith('At')) return formatDateTime(String(value))
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    },
    [stageById],
  )

  const rows = React.useMemo<NoteRow[]>(() => {
    const entries = auditQuery.data?.items ?? []
    const out: NoteRow[] = []
    for (const entry of entries as AuditLog[]) {
      const before = (entry.before ?? {}) as Record<string, unknown>
      const after = (entry.after ?? {}) as Record<string, unknown>
      const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      const user = entry.actorId ? userById.get(entry.actorId) : undefined
      const userName = entry.actorType === 'system' ? 'System' : user?.name ?? 'System'
      const role = entry.actorType === 'system' ? 'System' : user?.role ?? '—'
      const context = CONTEXT_LABEL[entry.action] ?? humanizeField(entry.action)
      for (const key of keys) {
        out.push({
          id: `${entry.id}:${key}`,
          at: entry.at,
          context,
          user: userName,
          role,
          field: humanizeField(key),
          oldValue: formatValue(key, before[key]),
          newValue: formatValue(key, after[key]),
        })
      }
    }
    return out
  }, [auditQuery.data, userById, formatValue])

  if (auditQuery.isError) {
    return <ErrorState onRetry={() => auditQuery.refetch()} title="Couldn't load system notes" />
  }

  if (auditQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No system notes yet"
        description="Field-level changes to this order (edits, moves, conversions) will appear here."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-semibold">Date</th>
            <th className="px-3 py-2.5 font-semibold">Context</th>
            <th className="px-3 py-2.5 font-semibold">User</th>
            <th className="px-3 py-2.5 font-semibold">Role</th>
            <th className="px-3 py-2.5 font-semibold">Field</th>
            <th className="px-3 py-2.5 font-semibold">Old Value</th>
            <th className="px-3 py-2.5 font-semibold">New Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0 align-top">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDateTime(r.at)}</td>
              <td className="px-3 py-2 text-foreground">{r.context}</td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{r.user}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{r.role}</td>
              <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">{r.field}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.oldValue}</td>
              <td className="px-3 py-2 text-foreground">{r.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
