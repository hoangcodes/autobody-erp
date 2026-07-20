import * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
}

/** Generic sortable-friendly data table. Columns declare their own render fn so any shape of row works. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              {columns.map((c) => (
                <Skeleton key={c.key} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-3 py-2.5 font-semibold', c.headerClassName)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && 'cursor-pointer hover:bg-muted/40')}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5 align-middle', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
