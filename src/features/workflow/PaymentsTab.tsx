import * as React from 'react'
import type { Order } from '@/types'
import { usePayments, useRefundPayment } from '@/hooks/usePayments'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { CollectPaymentModal } from '@/features/checkout/CollectPaymentModal'
import { formatDateTime, formatMoney } from '@/lib/utils'
import { toast } from '@/components/ui/toastStore'

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  card_present: 'Debit card',
  card_online: 'Credit card',
  apple_pay: 'Apple Pay',
  ach: 'ACH',
  bnpl: 'BNPL',
  other: 'Other',
}

export function PaymentsTab({ order }: { order: Order }) {
  const [payOpen, setPayOpen] = React.useState(false)
  const paymentsQuery = usePayments(order.id)
  const refund = useRefundPayment(order.id)

  if (paymentsQuery.isError) {
    return <ErrorState onRetry={() => paymentsQuery.refetch()} title="Couldn't load payments" />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Balance due</p>
            <p className="text-xl font-semibold">{formatMoney(order.balanceDue)}</p>
          </div>
          <Button onClick={() => setPayOpen(true)}>Collect Payment</Button>
        </CardContent>
      </Card>

      {paymentsQuery.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (paymentsQuery.data ?? []).length === 0 ? (
        <EmptyState title="No payments yet" description="Payments collected on this order will show up here." />
      ) : (
        <div className="space-y-2">
          {(paymentsQuery.data ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium">
                  {METHOD_LABEL[p.method] ?? p.method} {p.isDeposit && <Badge variant="info">Deposit</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{formatMoney(p.amount)}</span>
                <Badge variant={p.status === 'succeeded' ? 'success' : p.status === 'failed' ? 'destructive' : 'secondary'}>
                  {p.status}
                </Badge>
                {p.status === 'succeeded' && !p.refundedAmount && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    loading={refund.isPending}
                    onClick={() =>
                      refund.mutate(
                        { paymentId: p.id },
                        {
                          onSuccess: () => toast.success('Refund issued'),
                          onError: (err) => toast.error('Refund failed', err instanceof Error ? err.message : undefined),
                        },
                      )
                    }
                  >
                    Refund
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CollectPaymentModal open={payOpen} onOpenChange={setPayOpen} orderId={order.id} balanceDue={order.balanceDue} />
    </div>
  )
}
