import * as React from 'react'
import { ArrowRightCircle, Trash2, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { WorkItemsTable, type WorkItemColumn } from '@/components/WorkItemsTable'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { ErrorState } from '@/components/ui/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
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
import { customerDisplayName, formatDateShort } from '@/lib/utils'
import type { BacklogItem } from '@/types'

const NONE = '__none__'

/** "BL-12" style key derived from the item id (digits only). */
function backlogKey(item: BacklogItem): string {
  const n = item.id.replace(/\D/g, '')
  return `BL-${n || item.id}`
}

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

  // Create-item modal (opened from the "+ New Job" button next to the search bar).
  const [createOpen, setCreateOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [customerId, setCustomerId] = React.useState<string>(NONE)
  const [vehicle, setVehicle] = React.useState('')
  const [note, setNote] = React.useState('')

  const customers = customersQuery.data?.items ?? []

  function openCreate() {
    setTitle('')
    setCustomerId(NONE)
    setVehicle('')
    setNote('')
    setCreateOpen(true)
  }

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
          setCreateOpen(false)
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

  const columns: WorkItemColumn<BacklogItem>[] = [
    {
      key: 'key',
      header: 'Key',
      sortValue: (i) => Number(i.id.replace(/\D/g, '')) || 0,
      render: (i) => <span className="font-medium text-muted-foreground">{backlogKey(i)}</span>,
    },
    {
      key: 'summary',
      header: 'Summary',
      sortValue: (i) => i.title,
      render: (i) => (
        <span className="font-medium text-primary-700 hover:underline dark:text-primary-300">{i.title}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: (i) => i.customerName ?? '',
      render: (i) =>
        i.customerName ? i.customerName : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortValue: (i) => i.vehicleName ?? '',
      render: (i) =>
        i.vehicleName ? i.vehicleName : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'note',
      header: 'Note',
      render: (i) =>
        i.note ? (
          <span className="italic text-muted-foreground">{i.note}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'created',
      header: 'Created',
      sortValue: (i) => +new Date(i.createdAt),
      render: (i) => <span className="text-muted-foreground">{formatDateShort(i.createdAt)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Backlog"
        description="Capture upcoming work before it hits the board. Add an item, then move it into Workflow when you're ready."
      />

      {itemsQuery.isError ? (
        <ErrorState onRetry={() => itemsQuery.refetch()} />
      ) : (
        <WorkItemsTable
          isLoading={itemsQuery.isLoading}
          rows={itemsQuery.data ?? []}
          rowKey={(i) => i.id}
          searchText={(i) => [backlogKey(i), i.title, i.customerName, i.vehicleName, i.note].filter(Boolean).join(' ')}
          searchPlaceholder="Search backlog…"
          toolbarExtra={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Job
            </Button>
          }
          defaultSortKey="created"
          defaultSortDir="desc"
          itemNoun="items"
          columns={columns}
          emptyTitle="Backlog is empty"
          emptyDescription="Add your first item above to start planning work."
          rowActionsHeader="Actions"
          rowActions={(item) => (
            <div className="flex items-center justify-end gap-1">
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
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        />
      )}
    </div>
  )
}
