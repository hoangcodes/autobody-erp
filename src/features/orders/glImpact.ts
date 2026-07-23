// ---------------------------------------------------------------------------
// GL Impact (NetSuite-style) derivation for an order.
//
// A single source of truth for turning an order + its workflow column into
// double-entry general-ledger posting lines. Used by BOTH the order modal's
// "GL Impact" tab AND the financial-statements aggregation in the mock API, so
// the reports genuinely mirror what the board shows.
//
// Stage mapping (case-insensitive on the column NAME):
//   - "Done"                         → COLLECTED stage
//   - everything else (To Do, In Progress, Pending, Invoices, Ready for Pickup)
//                                    → BILLED stage
//
// Billed stage:
//   DR Accounts Receivable = revenue
//   CR Revenue             = revenue
//   DR COGS                = cost
//   CR Inventory           = cost
// Collected stage (Done):
//   DR Cash                = revenue
//   CR Accounts Receivable = revenue
//
// Amounts: revenue = order.totals.total (fallback 0); cost = order.totals.cost
// (the running field is `costTotal`; both are read so callers can't trip on it).
// ---------------------------------------------------------------------------

import type { Order, OrderTotals } from '@/types'

export interface GlLine {
  account: string
  /** Whether this line actually posts to the ledger (NetSuite "Posting" column).
   * The double-entry lines in the current mapping all post, so this is `true`;
   * the column + Yes/No indicator exist to mirror NetSuite's GL Impact table and
   * to leave room for future non-posting (memo/statistical) lines. */
  posting: boolean
  debit: number
  credit: number
}

/** True when the order's workflow column is the collected ("Done") stage. */
export function isCollectedStage(columnName: string | null | undefined): boolean {
  return (columnName ?? '').trim().toLowerCase() === 'done'
}

/** Revenue booked for an order (guarded when totals are missing). */
export function orderRevenue(order: Order | null | undefined): number {
  const t = order?.totals as (OrderTotals & { cost?: number }) | undefined
  return Number.isFinite(t?.total) ? (t!.total as number) : 0
}

/** Cost/COGS for an order (guarded; tolerates both `cost` and `costTotal`). */
export function orderCost(order: Order | null | undefined): number {
  const t = order?.totals as (OrderTotals & { cost?: number }) | undefined
  const c = t?.cost ?? t?.costTotal
  return Number.isFinite(c) ? (c as number) : 0
}

/**
 * The double-entry GL posting lines for one order, keyed off its workflow
 * column name. Debits always equal credits. Zero-amount lines are omitted so
 * the modal table stays clean.
 */
export function orderGlLines(
  order: Order | null | undefined,
  columnName: string | null | undefined,
): GlLine[] {
  const revenue = orderRevenue(order)
  const cost = orderCost(order)

  if (isCollectedStage(columnName)) {
    return [
      { account: 'Cash', posting: true, debit: revenue, credit: 0 },
      { account: 'Accounts Receivable', posting: true, debit: 0, credit: revenue },
    ]
  }

  // Billed stage.
  const lines: GlLine[] = [
    { account: 'Accounts Receivable', posting: true, debit: revenue, credit: 0 },
    { account: 'Revenue', posting: true, debit: 0, credit: revenue },
  ]
  if (cost) {
    lines.push({ account: 'COGS', posting: true, debit: cost, credit: 0 })
    lines.push({ account: 'Inventory', posting: true, debit: 0, credit: cost })
  }
  return lines
}

/** Aggregate board GL used to feed the financial statements. */
export interface BoardGlSummary {
  /** Σ revenue over ALL orders (every stage books revenue per the mapping). */
  revenueAll: number
  /** Σ cost over billed-stage (not-yet-Done) orders. */
  costBilled: number
  /** Σ revenue of billed-stage orders → Accounts Receivable. */
  arBilled: number
  /** Σ revenue of Done orders → added to Cash. */
  cashDone: number
  /** Σ cost of billed-stage orders → subtracted from Inventory. */
  invBilled: number
}

/**
 * Roll the per-order GL up across a set of orders. `nameOf` resolves an order's
 * workflow-column NAME (the stage key). Pure + divide-free, so an empty column
 * (or an empty order set) yields all-zero totals with no error.
 */
export function summarizeBoardGl(
  orders: readonly Order[],
  nameOf: (order: Order) => string | null | undefined,
): BoardGlSummary {
  const summary: BoardGlSummary = {
    revenueAll: 0,
    costBilled: 0,
    arBilled: 0,
    cashDone: 0,
    invBilled: 0,
  }
  for (const order of orders ?? []) {
    const revenue = orderRevenue(order)
    const cost = orderCost(order)
    summary.revenueAll += revenue
    if (isCollectedStage(nameOf(order))) {
      summary.cashDone += revenue
    } else {
      summary.arBilled += revenue
      summary.costBilled += cost
      summary.invBilled += cost
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    revenueAll: round(summary.revenueAll),
    costBilled: round(summary.costBilled),
    arBilled: round(summary.arBilled),
    cashDone: round(summary.cashDone),
    invBilled: round(summary.invBilled),
  }
}
