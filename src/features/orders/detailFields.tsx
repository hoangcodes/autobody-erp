import * as React from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import type { Customer, OrderLabel, OrderLabelColor } from '@/types'
import { MechanicAvatar } from '@/components/MechanicAvatar'
import { MultiCombobox, useOutsideClose, type ComboOption } from '@/components/ui/MultiCombobox'
import { CustomerFormDialog } from '@/features/customers/CustomerFormDialog'
import { useUsers } from '@/hooks/useUsers'
import { cn, customerDisplayName, uuid } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Shared "Details" field inputs.
//
// Extracted from ServicesEditor's DetailsForm so BOTH the order-detail modal AND
// the New Job create modal use the SAME field controls (no duplicated combobox
// logic). These inputs are purely value/onChange driven (no order/patch coupling)
// so a create flow can hold LOCAL form state and the detail flow can wire them to
// PATCH mutations.
// ---------------------------------------------------------------------------

/** Tailwind classes per label color — shared by chips and the label combobox. */
export const LABEL_CLASSES: Record<OrderLabelColor, string> = {
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
}

/** Small solid dot per label color — used as the option `leading` in the combobox. */
export const LABEL_DOT: Record<OrderLabelColor, string> = {
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  gray: 'bg-slate-400',
}

/** Lightweight preset palette for the "Labels" combobox. */
export const PRESET_LABELS: { text: string; color: OrderLabelColor }[] = [
  { text: 'VIP', color: 'purple' },
  { text: 'Rush', color: 'red' },
  { text: 'Waiting on parts', color: 'orange' },
  { text: 'Approved', color: 'green' },
  { text: 'Insurance', color: 'blue' },
  { text: 'Follow up', color: 'gray' },
]

/** Common paint colors offered in the Color combobox (users can still add new). */
export const COLOR_PRESETS = [
  'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Gold', 'Beige', 'Brown', 'Orange', 'Yellow',
]

/** De-duplicate (case-insensitive), drop empties, and sort a list of strings. */
export function uniqStrings(list: (string | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const v = (item ?? '').trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/** A single Details-form row: a small uppercase-muted label (with an optional
 * required asterisk) above its control. Shows a red hint when a required field
 * is empty. Rows stack with a divider between them. */
export function FieldRow({
  label,
  required = false,
  invalid = false,
  hint,
  children,
}: {
  label: string
  required?: boolean
  invalid?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <p className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </p>
      {children}
      {required && invalid && <p className="pt-1 text-[11px] text-red-500">{hint ?? 'Required.'}</p>}
    </div>
  )
}

/** Low / Medium / High native dropdown (Priority + Effort). */
export function LevelSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: 'low' | 'medium' | 'high'
  onChange: (v: 'low' | 'medium' | 'high') => void
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'low' | 'medium' | 'high')}
      aria-label={ariaLabel}
      className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
  )
}

/** Single-select combobox: a text input that filters `options`; picking one sets
 * the value. With `allowNew`, an unmatched query offers a "+ Add …" row that
 * commits the raw text as the value. */
export function SingleCombobox({
  value,
  options,
  onChange,
  placeholder,
  allowNew = false,
  invalid = false,
  ariaLabel,
}: {
  value: string
  options: ComboOption[]
  onChange: (value: string) => void
  placeholder?: string
  allowNew?: boolean
  invalid?: boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)
  useOutsideClose(ref, open, () => setOpen(false))

  const selected = options.find((o) => o.value === value)
  const selectedLabel = selected?.label ?? value ?? ''

  const q = query.trim().toLowerCase()
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q))
  const hasExact = options.some((o) => o.label.toLowerCase() === q)
  const showCreate = allowNew && q.length > 0 && !hasExact

  function choose(v: string) {
    onChange(v)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md border bg-card px-2',
          invalid ? 'border-red-400' : 'border-input',
          open && 'ring-2 ring-ring',
        )}
      >
        {!open && selected?.leading}
        <input
          value={open ? query : selectedLabel}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={(e) => {
            setOpen(true)
            setQuery('')
            e.currentTarget.select()
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-pop animate-fade-in">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted',
                o.value === value && 'font-medium',
              )}
            >
              {o.leading}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(query.trim())}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary-700 hover:bg-muted dark:text-primary-300"
            >
              + Add “{query.trim()}”
            </button>
          )}
          {filtered.length === 0 && !showCreate && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Assignee input — multi combobox over the team roster → a list of user ids. */
export function AssigneeInput({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const usersQuery = useUsers()
  const roster = usersQuery.data ?? []
  const nameById = new Map(roster.map((u) => [u.id, u.name]))
  const options: ComboOption[] = roster.map((u) => ({
    value: u.id,
    label: u.name,
    leading: <MechanicAvatar id={u.id} name={u.name} size={20} />,
  }))

  return (
    <MultiCombobox
      values={value}
      options={options}
      onChange={onChange}
      placeholder="Assign team members"
      ariaLabel="Assignee"
      renderChip={(id, remove) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-0.5 pr-1.5 text-[11px] font-medium text-foreground">
          <MechanicAvatar id={id} name={nameById.get(id)} size={18} />
          {nameById.get(id) ?? 'Unknown'}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              remove()
            }}
            aria-label="Remove assignee"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    />
  )
}

/** Sentinel option value for the pinned "+ New Customer" entry. */
const NEW_CUSTOMER = '__new_customer__'

/** Customer input — single combobox (text + list) over customers → a customer id.
 * A pinned "+ New Customer" entry sits at the TOP of the list; selecting it opens
 * the shared CustomerFormDialog in create mode, and on successful create the new
 * customer is selected in the field. Used by both the order-detail modal and the
 * New Job modal (a single source of truth). */
export function CustomerInput({
  value,
  customers,
  onChange,
}: {
  value: string
  customers: Customer[]
  onChange: (id: string) => void
}) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const options: ComboOption[] = [
    {
      value: NEW_CUSTOMER,
      label: '+ New Customer',
      leading: <Plus className="h-3.5 w-3.5 text-primary-700 dark:text-primary-300" aria-hidden="true" />,
    },
    ...customers.map((c) => ({ value: c.id, label: customerDisplayName(c) })),
  ]
  return (
    <>
      <SingleCombobox
        value={value}
        options={options}
        onChange={(id) => (id === NEW_CUSTOMER ? setCreateOpen(true) : onChange(id))}
        placeholder="Select customer"
        ariaLabel="Customer"
      />
      <CustomerFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => onChange(c.id)}
      />
    </>
  )
}

/** Labels input — multi combobox over the preset palette + the current labels.
 * Selecting/removing yields the next OrderLabel[] (each keeps its color; a
 * newly-typed label defaults to gray). */
export function LabelsInput({ value, onChange }: { value: OrderLabel[]; onChange: (labels: OrderLabel[]) => void }) {
  const labels = value

  const colorByText = new Map<string, OrderLabelColor>()
  PRESET_LABELS.forEach((p) => colorByText.set(p.text.toLowerCase(), p.color))
  labels.forEach((l) => colorByText.set(l.text.toLowerCase(), l.color))

  // Options = preset palette + any existing labels, de-duplicated by text.
  const seen = new Set<string>()
  const options: ComboOption[] = []
  for (const { text } of [...PRESET_LABELS, ...labels]) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const color = colorByText.get(key) ?? 'gray'
    options.push({
      value: text,
      label: text,
      leading: <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', LABEL_DOT[color])} />,
    })
  }

  const values = labels.map((l) => l.text)

  function handleChange(texts: string[]) {
    const next: OrderLabel[] = texts.map((t) => {
      const existing = labels.find((l) => l.text.toLowerCase() === t.toLowerCase())
      if (existing) return existing
      return { id: uuid(), text: t, color: colorByText.get(t.toLowerCase()) ?? 'gray' }
    })
    onChange(next)
  }

  return (
    <MultiCombobox
      values={values}
      options={options}
      onChange={handleChange}
      allowNew
      placeholder="Add label"
      ariaLabel="Labels"
      renderChip={(text, remove) => {
        const color = colorByText.get(text.toLowerCase()) ?? 'gray'
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
              LABEL_CLASSES[color],
            )}
          >
            {text}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                remove()
              }}
              aria-label={`Remove ${text}`}
              className="rounded-full hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )
      }}
    />
  )
}
