import * as React from 'react'
import { ArrowRightCircle, Trash2, Plus, Car, User } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { toast } from '@/components/ui/toastStore'
import { useCustomerDirectory } from '@/hooks/useCustomers'
import {
  useBacklogItems,
  useCreateBacklogItem,
  useDeleteBacklogItem,
  useMoveBacklogToBoard,
} from '@/hooks/useBacklog'
import { customerDisplayName, cn } from '@/lib/utils'
import type { BacklogItem } from '@/types'

const NONE = '__none__'

/**
 * Jira-backlog-style list. Users add lightweight work items at the top, and any
 * row can be promoted to the Workflow board (creates an Order in the first
 * column) or deleted. Backlog items are intentionally minimal.
 */
export function BacklogPage() {
  const itemsQuery = useBacklogItems()
  const customersQuery = useCustomerDirectory()
  const createItem = useCreateBacklogItem()
  const moveToBoard = useMoveBacklogToBoard()
  const deleteItem = useDeleteBacklogItem()

  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState<string>(NONE)
  const [vehicle, setVehicle] = React.useState('')
  const [note, setNote] = React.useState('')

  const customers = customersQuery.data?.items ?? []

  function add() {
    if (!title.trim()) return
    const customer = customers.find((c) => c.id === customerId)
    createItem.mutate(
      {
        title: title.trim(),
        customerId: customer?.id,
        customerName: customer ? customerDisplayName(customer) : undefined,
        vehicleName: vehicle.trim() || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('')
          setCustomerId(NONE)
          setVehicle('')
          setNote('')
        },
        onError: (err) => toast.error('Could not add item', err instanceof Error ? err.message : undefined),
      },
    )
  }

  function promote(item: BacklogItem) {
    moveToBoard.mutate(item.id, {
      onSuccess: (order) => toast.success('Moved to board', `Created estimate #${order.number} in the first column.`),
      onError: (err) => toast.error('Could not move to board', err instanceof Error ? err.message : undefined),
    })
  }

  return (
    <div>
      <PageHeader
        title="Backlog"
        description="Capture upcoming work before it hits the board. Add an item, then move it into Workflow when you're ready."
      />

      {/* Quick add row */}
      <div className="mb-4 rounded-lg border border-border bg-card p-3 shadow-card">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_180px_auto]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing? (e.g. Grinding noise on braking)"
            onKeyDown={(e) => e.key === 'Enter' && add()}
            aria-label="Backlog item title"
          />
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger aria-label="Customer">
              <SelectValue placeholder="Customer (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {customerDisplayName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Vehicle (optional)"
            aria-label="Vehicle"
          />
          <Button onClick={add} loading={createItem.isPending} disabled={!title.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="mt-2"
        />
      </div>

      {itemsQuery.isError ? (
        <ErrorState onRetry={() => itemsQuery.refetch()} />
      ) : itemsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (itemsQuery.data ?? []).length === 0 ? (
        <EmptyState title="Backlog is empty" description="Add your first item above to start planning work." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <ul className="divide-y divide-border">
            {(itemsQuery.data ?? []).map((item) => (
              <li key={item.id} className="flex items-start gap-3 p-3 hover:bg-muted/30">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                  <span className="text-xs font-semibold">•</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {item.customerName && (
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {item.customerName}
                      </span>
                    )}
                    {item.vehicleName && (
                      <span className="inline-flex items-center gap-1">
                        <Car className="h-3.5 w-3.5" /> {item.vehicleName}
                      </span>
                    )}
                    {item.note && <span className="italic">{item.note}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => promote(item)}
                    loading={moveToBoard.isPending && moveToBoard.variables === item.id}
                  >
                    <ArrowRightCircle className="h-4 w-4" /> Move to board
                  </Button>
                  <button
                    onClick={() => deleteItem.mutate(item.id)}
                    aria-label={`Delete ${item.title}`}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive',
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
