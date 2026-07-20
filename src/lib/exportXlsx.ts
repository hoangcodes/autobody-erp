import * as XLSX from 'xlsx'
import type { FinancialStatement } from '@/types'

// ---------------------------------------------------------------------------
// Client-side .xlsx export for financial statements (SheetJS community build).
// Note: the community build writes cell VALUES + number formats + column widths,
// but does NOT write cell styling (bold/borders/fills). We convey structure via
// number formats, indentation, and blank spacer rows. One sheet per statement.
// ---------------------------------------------------------------------------

const CURRENCY_FMT = '#,##0;(#,##0)'

function indentLabel(label: string, indent = 0): string {
  return `${'  '.repeat(indent)}${label}`
}

function statementToSheet(statement: FinancialStatement): XLSX.WorkSheet {
  // Prefer the multi-period columns/values model; fall back to current/prior.
  const columns =
    statement.columns && statement.columns.length
      ? statement.columns
      : [statement.currentPeriodLabel, statement.priorPeriodLabel].filter(Boolean)

  const aoa: (string | number | null)[][] = []
  aoa.push([statement.title])
  aoa.push(['Amounts in USD'])
  aoa.push([])
  aoa.push(['', ...columns])

  for (const line of statement.lines) {
    if (line.kind === 'header') {
      aoa.push([]) // spacer before a section header
      aoa.push([line.label.toUpperCase()])
      continue
    }
    const values = line.values ?? [line.current ?? null, line.prior ?? null]
    aoa.push([indentLabel(line.label, line.indent ?? 0), ...values.map((v) => v ?? null)])
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Column widths: label column + one per period.
  ws['!cols'] = [{ wch: 42 }, ...columns.map(() => ({ wch: 16 }))]

  // Apply currency number format to every numeric (period) column.
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let col = 1; col <= columns.length; col++) {
      const addr = XLSX.utils.encode_cell({ r, c: col })
      const cell = ws[addr]
      if (cell && typeof cell.v === 'number') cell.z = CURRENCY_FMT
    }
  }

  return ws
}

/** Build + download a workbook with one sheet per statement passed in. */
export function exportStatementsToXlsx(statements: FinancialStatement[], filename: string): void {
  const wb = XLSX.utils.book_new()
  for (const s of statements) {
    const sheetName = s.title.slice(0, 31) // Excel sheet-name limit
    XLSX.utils.book_append_sheet(wb, statementToSheet(s), sheetName)
  }
  XLSX.writeFile(wb, filename)
}
