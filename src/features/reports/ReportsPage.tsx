import * as React from 'react'
import { Download, ChevronRight } from 'lucide-react'
import { useReport } from '@/hooks/useReports'
import { useFinancialStatements, type FinancialGranularity } from '@/hooks/useFinancials'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/EmptyState'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'
import { exportStatementsToXlsx } from '@/lib/exportXlsx'
import { toast } from '@/components/ui/toastStore'
import { cn, formatMoney, formatPercent } from '@/lib/utils'
import type { FinancialLine, FinancialStatement, ReportKpis } from '@/types'

type StatementKey = 'income_statement' | 'balance_sheet'

const KPI_STRIP: { key: keyof ReportKpis; label: string; format: (v: number) => string }[] = [
  { key: 'revenue', label: 'Revenue', format: formatMoney },
  { key: 'grossProfit', label: 'Gross profit', format: formatMoney },
  { key: 'grossMarginPct', label: 'Gross margin', format: (v) => formatPercent(v) },
  { key: 'aro', label: 'ARO', format: formatMoney },
  { key: 'collected', label: 'Collected', format: formatMoney },
  { key: 'outstanding', label: 'Outstanding', format: formatMoney },
]

// ---- period customization (drives the statement columns) -------------------

const GRANULARITIES: { value: FinancialGranularity; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

const PERIOD_OPTIONS: Record<FinancialGranularity, string[]> = {
  year: ['2023', '2024', '2025', '2026'],
  quarter: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'],
  month: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026'],
}

const DEFAULT_PERIODS: Record<FinancialGranularity, string[]> = {
  year: ['2025', '2026'],
  quarter: ['Q1 2026', 'Q2 2026'],
  month: ['Apr 2026', 'May 2026', 'Jun 2026'],
}

/** Whole-dollar amount with parentheses for negatives (SEC-filing style). */
function fmtAmount(n?: number): string {
  if (n == null) return ''
  const s = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n < 0 ? `(${s})` : s
}

export function ReportsPage() {
  const reportQuery = useReport('end_of_day', {})
  const [granularity, setGranularity] = React.useState<FinancialGranularity>('quarter')
  const [periods, setPeriods] = React.useState<string[]>(DEFAULT_PERIODS.quarter)
  const financialsQuery = useFinancialStatements(granularity, periods)
  const [tab, setTab] = React.useState<StatementKey>('income_statement')
  const [drill, setDrill] = React.useState<FinancialLine | null>(null)

  const data = financialsQuery.data
  const active: FinancialStatement | undefined =
    data && (tab === 'income_statement' ? data.incomeStatement : data.balanceSheet)

  function changeGranularity(g: FinancialGranularity) {
    setGranularity(g)
    setPeriods(DEFAULT_PERIODS[g])
  }

  function togglePeriod(p: string) {
    setPeriods((prev) => {
      // keep at least one period selected; keep columns in option order
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
      if (next.length === 0) return prev
      return PERIOD_OPTIONS[granularity].filter((opt) => next.includes(opt))
    })
  }

  function exportActive() {
    if (!active) return
    try {
      exportStatementsToXlsx([active], `${active.title.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
      toast.success('Exported', `${active.title} downloaded as .xlsx`)
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : undefined)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col lg:mx-0">
      <PageHeader
        title="Financial statements"
        description="Income statement and balance sheet by period. Compare periods side by side using the customization bar below; click a line to drill in."
        actions={
          <Button variant="outline" size="sm" onClick={exportActive} disabled={!active}>
            <Download className="h-4 w-4" /> Export .xlsx
          </Button>
        }
      />

      {/* KPI summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-6">
        {KPI_STRIP.map((k) => (
          <div key={String(k.key)} className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
            <p className="text-[11px] font-medium text-muted-foreground">{k.label}</p>
            {reportQuery.isLoading ? (
              <Skeleton className="mt-1 h-5 w-16" />
            ) : (
              <p className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                {k.format(reportQuery.data?.kpis?.[k.key] ?? 0)}
              </p>
            )}
          </div>
        ))}
      </div>

      {financialsQuery.isError ? (
        <ErrorState onRetry={() => financialsQuery.refetch()} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as StatementKey)}>
          <TabsList>
            <TabsTrigger value="income_statement">Income Statement</TabsTrigger>
            <TabsTrigger value="balance_sheet">Balance Sheet</TabsTrigger>
          </TabsList>

          <TabsContent value="income_statement">
            {financialsQuery.isLoading || !data ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <StatementView statement={data.incomeStatement} onDrill={setDrill} />
            )}
          </TabsContent>
          <TabsContent value="balance_sheet">
            {financialsQuery.isLoading || !data ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <StatementView statement={data.balanceSheet} onDrill={setDrill} />
            )}
          </TabsContent>
        </Tabs>
      )}

      <DrillDownModal line={drill} columns={active?.columns ?? []} onClose={() => setDrill(null)} />

      {/* Persistent customization footer — sticks to the bottom of the scrolling
          page; the statements scroll above it. Granularity + multi-period select
          drive the query (and therefore the statement columns). */}
      <div className="sticky bottom-0 z-10 mt-6 border-t border-border bg-muted/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Period</span>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              {GRANULARITIES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => changeGranularity(g.value)}
                  aria-pressed={granularity === g.value}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-semibold transition-colors',
                    granularity === g.value
                      ? 'bg-primary-600 text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PERIOD_OPTIONS[granularity].map((p) => {
              const on = periods.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => togglePeriod(p)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    on
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-border bg-card text-muted-foreground hover:border-primary-400 hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatementView({
  statement,
  onDrill,
}: {
  statement: FinancialStatement
  onDrill: (line: FinancialLine) => void
}) {
  const columns = statement.columns?.length
    ? statement.columns
    : [statement.currentPeriodLabel, statement.priorPeriodLabel].filter(Boolean)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2.5 text-left font-semibold">{statement.title}</th>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2.5 text-right font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statement.lines.map((line) => {
            if (line.kind === 'header') {
              return (
                <tr key={line.id}>
                  <td colSpan={columns.length + 1} className="px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {line.label}
                  </td>
                </tr>
              )
            }

            const clickable = Boolean(line.detail && line.detail.length)
            const isSubtotal = line.kind === 'subtotal'
            const isTotal = line.kind === 'total'
            const indentPad = { paddingLeft: `${16 + (line.indent ?? 0) * 16}px` }
            const values = line.values ?? [line.current, line.prior]

            return (
              <tr
                key={line.id}
                onClick={clickable ? () => onDrill(line) : undefined}
                className={cn(
                  clickable && 'cursor-pointer hover:bg-primary-50/60 dark:hover:bg-primary-500/10',
                  isSubtotal && 'border-t border-border font-semibold',
                  isTotal && 'border-t-2 border-foreground/40 font-bold',
                )}
              >
                <td
                  style={indentPad}
                  className={cn(
                    'py-2 pr-4',
                    !isSubtotal && !isTotal && 'text-foreground',
                    isTotal && 'text-foreground',
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {line.label}
                    {clickable && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                </td>
                {values.map((v, i) => (
                  <td key={i} className={cn('px-4 py-2 text-right', i > 0 && 'text-muted-foreground')}>
                    {fmtAmount(v)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Amounts in USD. Unaudited — mock data for demonstration.
      </p>
    </div>
  )
}

function DrillDownModal({
  line,
  columns,
  onClose,
}: {
  line: FinancialLine | null
  columns: string[]
  onClose: () => void
}) {
  const open = Boolean(line)
  const cols = columns.length ? columns : ['Current', 'Prior']
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{line?.label ?? 'Detail'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {line?.detail && line.detail.length > 0 ? (
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 text-left font-semibold">Item</th>
                  {cols.map((c) => (
                    <th key={c} className="py-2 text-right font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {line.detail.map((d, i) => {
                  const values = d.values ?? [d.current, d.prior]
                  return (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-2">{d.label}</td>
                      {values.map((v, j) => (
                        <td key={j} className={cn('py-2 text-right', j > 0 && 'text-muted-foreground')}>
                          {fmtAmount(v)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  {(line.values ?? [line.current, line.prior]).map((v, j) => (
                    <td key={j} className={cn('py-2 text-right', j > 0 && 'text-muted-foreground')}>
                      {fmtAmount(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No further breakdown available for this line.</p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
