import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class lists, resolving conflicts (last wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/** Format a number of dollars (not cents) as USD currency, e.g. 1234.5 -> "$1,234.50". */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '$0.00'
  return moneyFormatter.format(value)
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return dateFormatter.format(d)
}

/** Compact Jira-style date, e.g. "17/Jul/26". Used by the work-items lists. */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = String(d.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return dateTimeFormatter.format(d)
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return timeFormatter.format(d)
}

/** Human relative time, e.g. "3m ago", "2h ago", "5d ago". Falls back to a date. */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(d)
}

export function isOverdue(value: string | null | undefined): boolean {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

/** Initials from a full name or a customer's first/last, e.g. "Jane Doe" -> "JD". */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Deterministic, theme-safe avatar background color derived from a seed string
 * (e.g. a user id). Same seed always maps to the same color, so a mechanic keeps
 * a stable color across the board, cards, and detail view.
 *
 * Palette is a family of DISTINCT navy / blue / light-blue / purple tones (plus
 * a teal and a steel for variety). Every entry is mid/dark enough that WHITE
 * initials stay legible on top — these are used as avatar/monogram backgrounds
 * with white text. The sky blue uses a slightly deeper shade (sky-600) so white
 * initials keep contrast. */
const AVATAR_PALETTE = [
  '#1E3A8A', // navy (blue-900)
  '#2563EB', // blue (blue-600)
  '#0284C7', // sky / light blue (sky-600 — deep enough for white text)
  '#4F46E5', // indigo (indigo-600)
  '#7C3AED', // purple (violet-600)
  '#5B21B6', // dark purple (violet-800)
  '#0D9488', // teal (teal-600)
  '#334155', // steel (slate-700)
] as const

export function avatarColorFromString(seed: string | null | undefined): string {
  if (!seed) return AVATAR_PALETTE[0]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]!
}

export function customerDisplayName(c: { type: string; firstName?: string; lastName?: string; companyName?: string } | null | undefined): string {
  if (!c) return 'Unknown customer'
  if (c.type === 'business' && c.companyName) return c.companyName
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
  return name || c.companyName || 'Unnamed customer'
}

export function vehicleDisplayName(v: { year?: number; make?: string; model?: string } | null | undefined): string {
  if (!v) return 'No vehicle'
  return [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unspecified vehicle'
}

/** Vehicle line in "color year make model" order, e.g. "Black 2013 BMW M5".
 * Used on the workflow card and the order-detail sidebar. */
export function vehicleColorFirst(
  v: { year?: number; make?: string; model?: string; color?: string } | null | undefined,
): string {
  if (!v) return 'No vehicle'
  return [v.color, v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unspecified vehicle'
}

/** Compact vehicle subtitle for chat headers/rows: "2019 Honda CR-V · Silver".
 * Returns '' when there is nothing to show. */
export function vehicleShortLine(
  v: { year?: number; make?: string; model?: string; color?: string } | null | undefined,
): string {
  if (!v) return ''
  const base = [v.year, v.make, v.model].filter(Boolean).join(' ')
  if (!base) return ''
  return v.color ? `${base} · ${v.color}` : base
}

// ---- age / DOB helpers ------------------------------------------------------

export type AgeRangeValue = '<18' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+'

export const AGE_RANGES: AgeRangeValue[] = ['<18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+']

/** Parse a DOB that is either a full date ('YYYY-MM-DD') or a year-only ('YYYY')
 * string and return an approximate age in years, or null if unparseable. For a
 * year-only DOB the age is approximate (calendar-year difference). */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null
  const trimmed = dob.trim()
  const now = new Date()
  // year-only
  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed)
    const age = now.getFullYear() - year
    return age >= 0 && age < 130 ? age : null
  }
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return null
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}

/** Map an age (years) to its bracket. */
export function ageRangeForAge(age: number | null | undefined): AgeRangeValue | undefined {
  if (age == null) return undefined
  if (age < 18) return '<18'
  if (age <= 24) return '18-24'
  if (age <= 34) return '25-34'
  if (age <= 44) return '35-44'
  if (age <= 54) return '45-54'
  if (age <= 64) return '55-64'
  return '65+'
}

/** Convenience: derive an age bracket straight from a DOB string. */
export function ageRangeFromDob(dob: string | null | undefined): AgeRangeValue | undefined {
  return ageRangeForAge(ageFromDob(dob))
}

/** Generate a v4-ish UUID for Idempotency-Key headers (not cryptographically audited, fine for client idempotency tokens). */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
