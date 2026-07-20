import * as React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Car, GripVertical } from 'lucide-react'
import type { VehiclePhoto } from '@/types'
import { useUpdateOrder } from '@/hooks/useOrders'
import { cn } from '@/lib/utils'

const DROPIN_ID = '__dropin__'

/**
 * Large main image + drag-to-reorder thumbnail strip. Reordering rewrites
 * `sortOrder` and persists to the (mock) store via PATCH /orders/:id, so the
 * board card thumbnail (photo with the lowest sortOrder) updates too.
 *
 * Photo preference (matches the board card): a licensed drop-in photo at
 * `/car-photos/<vehicleId>.jpg` is shown FIRST when present; then the order's
 * own `photos[]`; then the "No photos yet" placeholder. The drop-in is a
 * read-only preview — it is not draggable and is never persisted into the
 * order's `photos[]`.
 */
export function VehiclePhotoCarousel({
  orderId,
  vehicleId,
  photos,
}: {
  orderId: string
  vehicleId?: string
  photos: VehiclePhoto[]
}) {
  const updateOrder = useUpdateOrder(orderId)
  const sorted = React.useMemo(
    () => [...(photos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [photos],
  )

  const [items, setItems] = React.useState<VehiclePhoto[]>(sorted)
  const [dropinFailed, setDropinFailed] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const dropinUrl = vehicleId ? `/car-photos/${vehicleId}.jpg` : null
  const dropin: VehiclePhoto | null =
    dropinUrl && !dropinFailed ? { id: DROPIN_ID, url: dropinUrl, sortOrder: -1 } : null

  // Reset the drop-in attempt whenever the target vehicle changes.
  React.useEffect(() => {
    setDropinFailed(false)
  }, [dropinUrl])

  // Keep the reorderable list in sync when the underlying data changes.
  React.useEffect(() => {
    setItems(sorted)
  }, [sorted])

  // Full display list = drop-in preview (if any) + the order's own photos.
  const displayPhotos = React.useMemo(
    () => (dropin ? [dropin, ...items] : items),
    [dropin, items],
  )

  // Ensure the selection points at something that still exists; default to the
  // first display photo (the drop-in when present).
  React.useEffect(() => {
    setSelectedId((prev) =>
      prev && displayPhotos.some((p) => p.id === prev) ? prev : displayPhotos[0]?.id ?? null,
    )
  }, [displayPhotos])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const selected = displayPhotos.find((p) => p.id === selectedId) ?? displayPhotos[0]

  if (displayPhotos.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
        <div className="flex flex-col items-center gap-1">
          <Car className="h-8 w-8 opacity-50" aria-hidden="true" />
          <span className="text-xs">No photos yet</span>
        </div>
      </div>
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((p) => p.id === active.id)
    const newIndex = items.findIndex((p) => p.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(items, oldIndex, newIndex).map((p, i) => ({ ...p, sortOrder: i }))
    setItems(reordered)
    updateOrder.mutate({ photos: reordered })
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {selected && (
          <img
            src={selected.url}
            alt="Vehicle photo"
            className="h-full w-full object-cover"
            draggable={false}
            onError={() => {
              if (selected.id === DROPIN_ID) setDropinFailed(true)
            }}
          />
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {/* Non-draggable drop-in preview thumbnail (first). */}
          {dropin && (
            <button
              type="button"
              onClick={() => setSelectedId(dropin.id)}
              aria-label="Show drop-in photo"
              className={cn(
                'relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-muted',
                dropin.id === (selected?.id ?? null) ? 'border-primary-500' : 'border-transparent',
              )}
            >
              <img
                src={dropin.url}
                alt="Vehicle thumbnail"
                className="h-full w-full object-cover"
                draggable={false}
                onError={() => setDropinFailed(true)}
              />
            </button>
          )}
          <SortableContext items={items.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
            {items.map((photo) => (
              <Thumb
                key={photo.id}
                photo={photo}
                selected={photo.id === (selected?.id ?? null)}
                onSelect={() => setSelectedId(photo.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      <p className="text-[11px] text-muted-foreground">Drag thumbnails to reorder. The first photo is the card thumbnail.</p>
    </div>
  )
}

function Thumb({
  photo,
  selected,
  onSelect,
}: {
  photo: VehiclePhoto
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 bg-muted',
        selected ? 'border-primary-500' : 'border-transparent',
        isDragging && 'opacity-60 shadow-pop',
      )}
    >
      <button type="button" onClick={onSelect} className="block h-full w-full" aria-label="Show photo">
        <img src={photo.url} alt="Vehicle thumbnail" className="h-full w-full object-cover" draggable={false} />
      </button>
      <span
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-grab touch-none items-center justify-center rounded bg-slate-900/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
    </div>
  )
}
