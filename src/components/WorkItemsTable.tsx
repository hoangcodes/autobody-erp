import * as React from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

export interface WorkItemColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  /** Value used for sorting this column. When omitted the column isn't sortable. */
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  className?: string
  headerClassName?: string
}

export interface WorkItemsTableProps<T> {
  columns: WorkItemColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Text a row is matched against by the toolbar search box. */
  searchText: (row: T) => string
  searchPlaceholder?: string
  /** Extra toolbar controls (e.g. Status / Assignee dropdowns) rendered to the
   * right of the search box. Parent owns their state + filtering of `rows`. */
  toolbarExtra?: React.ReactNode
  defaultSortKey?: string
  defaultSortDir?: 'asc' | 'desc'
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Noun for the count line, e.g. "work items" (default) or "items". */
  itemNoun?: string
  /** Optional per-row trailing action cell (e.g. Backlog "Move to board"). */
  rowActions?: (row: T) => React.ReactNode
  rowActionsHeader?: string
}

/**
 * Jira-style "work items" list: a search + filter toolbar, an "N items" count
 * line, and a compact table with a leading select-all checkbox column, sortable
 * headers (caret on the active column), zebra/hover rows and thin separators.
 * Search + sort + selection are all local; dropdown filters live in the parent.
 */
export function WorkItemsTable<T>({
  columns,
  rows,
  rowKey,
  searchText,
  searchPlaceholder = 'Search…',
  toolbarExtra,
  defaultSortKey,
  defaultSortDir = 'asc',
  onRowClick,
  isLoading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  itemNoun = 'work items',
  rowActions,
  rowActionsHeader = '',
}: WorkItemsTableProps<T>) {
  const [query, setQuery] = React.useState('')
  const [sortKey, setSortKey] = React.useState<string | undefined>(defaultSortKey)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(defaultSortDir)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => searchText(r).toLowerCase().includes(q))
  }, [rows, query, searchText])

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [filtered, columns, sortKey, sortDir])

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const visibleKeys = sorted.map(rowKey)
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k))
  const someSelected = visibleKeys.some((k) => selected.has(k))

  const selectAllRef = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        visibleKeys.forEach((k) => next.delete(k))
      } else {
        visibleKeys.forEach((k) => next.add(k))
      }
      return next
    })
  }

  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const checkboxClass =
    'h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search work items"
            className="h-9 pl-8"
          />
        </div>
        {toolbarExtra}
      </div>

      {/* Count line */}
      <p className="mb-2 text-xs text-muted-foreground">
        {isLoading ? ' ' : `${sorted.length} ${itemNoun}`}
      </p>

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2.5">
                {columns.map((c) => (
                  <Skeleton key={c.key} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-2 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all"
                    className={checkboxClass}
                  />
                </th>
                {columns.map((c) => {
                  const sortable = Boolean(c.sortValue)
                  const active = sortKey === c.key
                  return (
                    <th
                      key={c.key}
                      className={cn(
                        'px-3 py-2 font-semibold',
                        c.align === 'right' && 'text-right',
                        c.headerClassName,
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={cn(
                            'inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground',
                            c.align === 'right' && 'flex-row-reverse',
                            active && 'text-foreground',
                          )}
                        >
                          {c.header}
                          {active &&
                            (sortDir === 'asc' ? (
                              <ChevronUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3 w-3" aria-hidden="true" />
                            ))}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  )
                })}
                {rowActions && (
                  <th className="px-3 py-2 text-right font-semibold">{rowActionsHeader}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const key = rowKey(row)
                const isSelected = selected.has(key)
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border last:border-b-0 odd:bg-muted/20',
                      isSelected && 'bg-primary-50 dark:bg-primary-500/10',
                      onRowClick && 'cursor-pointer hover:bg-muted/50',
                    )}
                  >
                    <td className="w-10 px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        aria-label="Select row"
                        className={checkboxClass}
                      />
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-3 py-2 align-middle',
                          c.align === 'right' && 'text-right',
                          c.className,
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-3 py-2 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
