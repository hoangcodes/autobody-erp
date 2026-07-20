# Car photos (drop-in)

Drop **licensed** vehicle photos here to use them as the real thumbnail/hero
image on the workflow board card and in the order photo carousel.

## How it works

For each order, the UI tries images in this order and uses the first that loads:

1. **`/car-photos/<vehicleId>.jpg`** — a file in this folder named after the
   order's `vehicleId` (e.g. `v1.jpg`, `v2.jpg`). This is the drop-in slot.
2. The order's own uploaded `photos[]` (if any).
3. A generated SVG placeholder (a neutral car glyph).

So to give a vehicle a real photo, save it in this folder as
`<vehicleId>.jpg` (matching the vehicle's id). No code changes needed — it is
picked up automatically. If the file is absent, the placeholder shows.

## Notes

- Only `.jpg` is probed for the drop-in slot.
- Do **not** commit copyrighted/unlicensed images. This folder ships empty on
  purpose; add only photos you have the rights to use.
- The drop-in photo is a read-only preview: it is shown first in the carousel
  but is never persisted into the order's `photos[]` and cannot be reordered.
