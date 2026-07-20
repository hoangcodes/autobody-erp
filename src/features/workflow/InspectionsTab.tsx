import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

/** Structured stub — full DVI (photos/video, item statuses, send-to-customer)
 * is scoped for a later phase per developer.md Phase 2. */
export function InspectionsTab() {
  return (
    <EmptyState
      title="No inspections on this order"
      description="Digital vehicle inspections (multi-point, check-in, pre-purchase) will attach here with per-item pass/needs-attention/failed status, photos, and one-click send to the customer."
      action={
        <Button variant="outline" size="sm" disabled>
          Start inspection (coming soon)
        </Button>
      }
    />
  )
}
