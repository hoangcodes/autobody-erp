import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Reusable "text + list" multi-select combobox. Selected values render as
// removable chips that stack to the LEFT of a text input (shared, wrapped row);
// the input filters `options` (already-selected ones are hidden). With
// `allowNew` an unmatched query offers a "+ Add …" row that commits the raw
// text. Extracted from the order ServicesEditor so the customer form + any other
// field can reuse the same pattern.
// ---------------------------------------------------------------------------

export interface ComboOption {
  value: string
  label: string
  /** Small node rendered before the label (e.g. an avatar or color dot). */
  leading?: React.ReactNode
}

/** Close `open` when a mousedown lands outside `ref`. */
export function useOutsideClose(ref: React.RefObject<HTMLElement>, open: boolean, close: () => void) {
  React.useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, ref, close])
}

export function MultiCombobox({
  values,
  options,
  onChange,
  placeholder,
  allowNew = false,
  ariaLabel,
  renderChip,
}: {
  values: string[]
  options: ComboOption[]
  onChange: (values: string[]) => void
  placeholder?: string
  allowNew?: boolean
  ariaLabel?: string
  renderChip?: (value: string, remove: () => void) => React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const ref = React.useRef<HTMLDivElement>(null)
  useOutsideClose(ref, open, () => setOpen(false))

  const q = query.trim().toLowerCase()
  const available = options.filter((o) => !values.includes(o.value) && o.label.toLowerCase().includes(q))
  const hasExact =
    options.some((o) => o.label.toLowerCase() === q) || values.some((v) => v.toLowerCase() === q)
  const showCreate = allowNew && q.length > 0 && !hasExact

  function add(v: string) {
    if (!values.includes(v)) onChange([...values, v])
    setQuery('')
  }
  function remove(v: string) {
    onChange(values.filter((x) => x !== v))
  }
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-card px-1.5 py-1',
          open && 'ring-2 ring-ring',
        )}
      >
        {values.map((v) =>
          renderChip ? (
            <React.Fragment key={v}>{renderChip(v, () => remove(v))}</React.Fragment>
          ) : (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {labelFor(v)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  remove(v)
                }}
                aria-label={`Remove ${labelFor(v)}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ),
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && showCreate) {
              e.preventDefault()
              add(query.trim())
            } else if (e.key === 'Backspace' && query.length === 0 && values.length > 0) {
              remove(values[values.length - 1]!)
            }
          }}
          placeholder={values.length === 0 ? placeholder : ''}
          aria-label={ariaLabel}
          className="min-w-[3rem] flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      {open && (available.length > 0 || showCreate) && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-pop animate-fade-in">
          {available.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(o.value)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              {o.leading}
              <span className="truncate">{o.label}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(query.trim())}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm font-medium text-primary-700 hover:bg-muted dark:text-primary-300"
            >
              + Add “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  )
}
