import * as React from 'react'
import { useParts } from '@/hooks/useInventory'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/DataTable'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { formatMoney } from '@/lib/utils'

/** Inventory scaffold: parts list is wired to the backend; Purchase Orders and
 * Returns are structured stubs (full lifecycle is developer.md Phase 3). */
export function InventoryPage() {
  const [search, setSearch] = React.useState('')
  const partsQuery = useParts(search)

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Parts, tires, purchasing and returns."
        actions={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, SKU, MPN…"
            className="w-64"
          />
        }
      />

      <Tabs defaultValue="parts">
        <TabsList>
          <TabsTrigger value="parts">Parts &amp; Tires</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="parts">
          {partsQuery.isError ? (
            <ErrorState onRetry={() => partsQuery.refetch()} />
          ) : (
            <DataTable
              isLoading={partsQuery.isLoading}
              rows={partsQuery.data?.items ?? []}
              rowKey={(p) => p.id}
              emptyTitle="No parts in inventory"
              emptyDescription="Parts added to inventory (and received on POs) will appear here."
              columns={[
                { key: 'name', header: 'Part', render: (p) => <span className="font-medium">{p.name}</span> },
                { key: 'sku', header: 'SKU', render: (p) => p.sku ?? '—' },
                { key: 'cost', header: 'Cost', render: (p) => formatMoney(p.cost) },
                { key: 'retail', header: 'Retail', render: (p) => formatMoney(p.retail) },
                {
                  key: 'qty',
                  header: 'On hand',
                  render: (p) =>
                    p.minQty !== undefined && p.qtyOnHand <= p.minQty ? (
                      <Badge variant="warning">{p.qtyOnHand} · reorder</Badge>
                    ) : (
                      <span>{p.qtyOnHand}</span>
                    ),
                },
              ]}
            />
          )}
        </TabsContent>

        <TabsContent value="purchase-orders">
          <EmptyState
            title="Purchase orders"
            description="TODO (Phase 3): PO lifecycle draft → ordered → received → fulfilled, per-line receiving that updates on-hand counts, and multi-vendor POs per order."
          />
        </TabsContent>

        <TabsContent value="returns">
          <EmptyState
            title="Returns & cores"
            description="TODO (Phase 3): RMA tracking, refund status, and the parallel core-return flow."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
