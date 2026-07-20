import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { List, LayoutGrid } from 'lucide-react'
import { useCustomers } from '@/hooks/useCustomers'
import { DataTable } from '@/components/DataTable'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { CustomerFormDialog } from '@/features/customers/CustomerFormDialog'
import { cn, customerDisplayName } from '@/lib/utils'
import type { Customer } from '@/types'

type CustomerView = 'list' | 'grid'

export function CustomersListPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = React.useState('')
  const [view, setView] = React.useState<CustomerView>('list')
  const [createOpen, setCreateOpen] = React.useState(params.get('new') === 'customer')
  const navigate = useNavigate()
  const customersQuery = useCustomers(search)

  const customers = customersQuery.data?.items ?? []

  function closeCreate() {
    setCreateOpen(false)
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <div className="pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who&apos;s brought a vehicle through your shop.
        </p>
      </div>

      {/* Left-aligned header row: search + New Customer + view toggle. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, email…"
          className="w-64"
        />
        <Button onClick={() => setCreateOpen(true)}>+ New customer</Button>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <ViewToggle icon={List} label="List view" active={view === 'list'} onClick={() => setView('list')} />
          <ViewToggle icon={LayoutGrid} label="Grid view" active={view === 'grid'} onClick={() => setView('grid')} />
        </div>
      </div>

      {customersQuery.isError ? (
        <ErrorState onRetry={() => customersQuery.refetch()} />
      ) : view === 'grid' ? (
        <CustomerGrid
          isLoading={customersQuery.isLoading}
          customers={customers}
          onOpen={(c) => navigate(`/customers/${c.id}`)}
        />
      ) : (
        <DataTable
          isLoading={customersQuery.isLoading}
          rows={customers}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyTitle="No customers yet"
          emptyDescription="Add your first customer to start writing estimates."
          columns={[
            { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{customerDisplayName(c)}</span> },
            {
              key: 'type',
              header: 'Type',
              render: (c) => <Badge variant="secondary">{c.type}</Badge>,
            },
            {
              key: 'contact',
              header: 'Contact',
              render: (c) => c.contacts?.[0]?.value ?? '—',
            },
            {
              key: 'location',
              header: 'From',
              render: (c) => [c.city, c.state].filter(Boolean).join(', ') || '—',
            },
            {
              key: 'flags',
              header: '',
              render: (c) => (c.taxExempt ? <Badge variant="info">Tax exempt</Badge> : null),
            },
          ]}
        />
      )}

      <CustomerFormDialog open={createOpen} onClose={closeCreate} />
    </div>
  )
}

/** Small icon toggle mirroring the Workflow board's List/Board switch. */
function ViewToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof List
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        active ? 'bg-primary-600 text-white' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

/** Widget/grid view: customers as cards in a responsive grid. */
function CustomerGrid({
  isLoading,
  customers,
  onOpen,
}: {
  isLoading?: boolean
  customers: Customer[]
  onOpen: (c: Customer) => void
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        title="No customers yet"
        description="Add your first customer to start writing estimates."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {customers.map((c) => {
        const name = customerDisplayName(c)
        const contact = c.contacts?.[0]?.value
        const from = [c.city, c.state].filter(Boolean).join(', ')
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(c)}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-card transition-shadow hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <Avatar size="lg" name={name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">{c.type}</p>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <p className="truncate text-muted-foreground">{contact ?? 'No contact on file'}</p>
              {from && <p className="truncate text-muted-foreground">{from}</p>}
            </div>

            {((c.tags?.length ?? 0) > 0 || c.taxExempt) && (
              <div className="flex flex-wrap items-center gap-1">
                {(c.tags ?? []).map((t) => (
                  <Badge key={t} variant="info">
                    {t}
                  </Badge>
                ))}
                {c.taxExempt && <Badge variant="secondary">Tax exempt</Badge>}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
