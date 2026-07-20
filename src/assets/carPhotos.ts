// ---------------------------------------------------------------------------
// Lightweight, OFFLINE demo vehicle photos. Each "photo" is an inline SVG
// data-URI (a colored gradient with a simple car silhouette + caption) so the
// app never depends on an external image host. This is display/demo data only;
// the shape (`{ id, url, sortOrder }`) maps cleanly to a future
// `vehicle_photos` / `media` table.
// ---------------------------------------------------------------------------

function svgDataUri(svg: string): string {
  // encodeURIComponent keeps it valid inline and avoids base64 bloat.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`
}

// A simple side-profile car silhouette drawn in a 320x180 viewBox.
const CAR_BODY =
  'M28 118 L28 100 Q28 93 37 91 L74 87 Q92 62 128 60 L196 60 Q228 62 248 88 L286 93 Q296 95 296 105 L296 118 Z'

/**
 * Build a single demo photo data-URI.
 * @param hue   base hue (0-360) — different per vehicle for variety
 * @param label short caption, e.g. "2013 BMW M5"
 * @param angle sub-caption, e.g. "Front 3/4"
 */
export function carPhoto(hue: number, label: string, angle: string): string {
  const h2 = (hue + 28) % 360
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 62% 52%)"/>
      <stop offset="100%" stop-color="hsl(${h2} 58% 34%)"/>
    </linearGradient>
  </defs>
  <rect width="320" height="180" fill="url(#g)"/>
  <g fill="hsl(${hue} 40% 96%)" opacity="0.92">
    <path d="${CAR_BODY}"/>
    <circle cx="96" cy="120" r="18" fill="hsl(${hue} 30% 22%)"/>
    <circle cx="96" cy="120" r="8" fill="hsl(${hue} 20% 88%)"/>
    <circle cx="232" cy="120" r="18" fill="hsl(${hue} 30% 22%)"/>
    <circle cx="232" cy="120" r="8" fill="hsl(${hue} 20% 88%)"/>
  </g>
  <text x="16" y="30" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="700" fill="#ffffff">${label}</text>
  <text x="16" y="168" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#ffffff" opacity="0.85">${angle}</text>
</svg>`
  return svgDataUri(svg)
}

const ANGLES = ['Front 3/4', 'Driver side', 'Rear 3/4', 'Odometer', 'Damage detail']

/** Build N demo photos for a vehicle, each with an incrementing sortOrder. */
export function buildPhotos(
  vehicleKey: string,
  hue: number,
  label: string,
  count: number,
): { id: string; url: string; sortOrder: number }[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `ph_${vehicleKey}_${i + 1}`,
    url: carPhoto((hue + i * 18) % 360, label, ANGLES[i % ANGLES.length]!),
    sortOrder: i,
  }))
}
