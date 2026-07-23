import * as React from 'react'
import { X, Wallet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useCollectPayment, usePaymentLink } from '@/hooks/usePayments'
import { toast } from '@/components/ui/toastStore'
import { formatMoney } from '@/lib/utils'
import type { Payment, PaymentMethod } from '@/types'

export interface CollectPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  balanceDue: number
  isDepositOnly?: boolean
}

interface TenderRecord {
  method: PaymentMethod
  amount: number
  detail?: string
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  card_present: 'Debit',
  card_online: 'Credit',
  apple_pay: 'Apple Pay',
  ach: 'ACH',
  bnpl: 'BNPL',
  other: 'Other',
}

export function CollectPaymentModal({ open, onOpenChange, orderId, balanceDue, isDepositOnly }: CollectPaymentModalProps) {
  const collectPayment = useCollectPayment(orderId)
  const paymentLink = usePaymentLink(orderId)

  const [remaining, setRemaining] = React.useState(balanceDue)
  const [tenders, setTenders] = React.useState<TenderRecord[]>([])
  const [tab, setTab] = React.useState('cash')
  const [amount, setAmount] = React.useState(String(balanceDue.toFixed(2)))
  const [amountTendered, setAmountTendered] = React.useState('')
  const [refNumber, setRefNumber] = React.useState('')
  const [cardMode, setCardMode] = React.useState<'reader' | 'link'>('reader')
  const [lastSimulated, setLastSimulated] = React.useState(false)
  const [lastPaymentUrl, setLastPaymentUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setRemaining(balanceDue)
      setTenders([])
      setAmount(String(balanceDue.toFixed(2)))
      setLastSimulated(false)
      setLastPaymentUrl(null)
    }
  }, [open, balanceDue])

  const changeDue = tab === 'cash' ? Math.max(0, Number(amountTendered || 0) - Number(amount || 0)) : 0

  function submitTender(method: PaymentMethod) {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    collectPayment.mutate(
      {
        method,
        amount: amt,
        isDeposit: isDepositOnly,
        amountTendered: method === 'cash' ? Number(amountTendered || amt) : undefined,
        referenceNumber: method === 'check' ? refNumber : undefined,
      },
      {
        onSuccess: (res: { payment: Payment; simulated?: boolean; paymentUrl?: string }) => {
          setTenders((t) => [...t, { method, amount: amt, detail: res.payment.referenceNumber }])
          setRemaining((r) => Math.max(0, r - amt))
          setLastSimulated(Boolean(res.simulated))
          setLastPaymentUrl(res.paymentUrl ?? null)
          setAmount(String(Math.max(0, remaining - amt).toFixed(2)))
          setAmountTendered('')
          setRefNumber('')
          toast.success(`${METHOD_LABEL[method]} payment recorded`, formatMoney(amt))
        },
        onError: (err) => toast.error('Payment failed', err instanceof Error ? err.message : undefined),
      },
    )
  }

  function sendPaymentLink() {
    paymentLink.mutate(
      { amount: Number(amount) || remaining, isDeposit: isDepositOnly },
      {
        onSuccess: (res) => {
          setLastPaymentUrl(res.paymentUrl)
          toast.success('Payment link sent', 'The customer can now pay from their phone.')
        },
        onError: (err) => toast.error('Could not send link', err instanceof Error ? err.message : undefined),
      },
    )
  }

  const done = remaining <= 0.005

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isDepositOnly ? 'Collect deposit' : 'Collect payment'}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close"><X className="h-4 w-4" /></Button>
          </DialogClose>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center justify-between rounded-md bg-muted/60 p-3">
            <span className="text-sm text-muted-foreground">Balance remaining</span>
            <span className="text-lg font-semibold">{formatMoney(remaining)}</span>
          </div>

          {tenders.length > 0 && (
            <div className="space-y-1 rounded-md border border-border p-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tenders taken</p>
              {tenders.map((t, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{METHOD_LABEL[t.method]}{t.detail ? ` · ${t.detail}` : ''}</span>
                  <span className="font-medium">{formatMoney(t.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {done ? (
            <div className="rounded-md border border-success/40 bg-success/10 p-4 text-center">
              <p className="text-sm font-semibold text-success">Balance paid in full</p>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="cash">Cash</TabsTrigger>
                <TabsTrigger value="check">Check</TabsTrigger>
                <TabsTrigger value="card_present">Debit</TabsTrigger>
                <TabsTrigger value="card_online">Credit</TabsTrigger>
                <TabsTrigger value="apple_pay">
                  <Wallet className="h-3.5 w-3.5" />
                  Apple Pay
                </TabsTrigger>
                <TabsTrigger value="ach">ACH</TabsTrigger>
                <TabsTrigger value="bnpl">BNPL</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Amount tendered">
                  <Input type="number" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} />
                </Field>
                <p className="text-sm text-muted-foreground">Change due: <span className="font-semibold text-foreground">{formatMoney(changeDue)}</span></p>
                <Button onClick={() => submitTender('cash')} loading={collectPayment.isPending}>
                  Record cash payment
                </Button>
              </TabsContent>

              <TabsContent value="check" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Check / reference number">
                  <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} />
                </Field>
                <Button onClick={() => submitTender('check')} loading={collectPayment.isPending}>
                  Record check payment
                </Button>
              </TabsContent>

              <TabsContent value="card_present" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Sends the amount to the paired Stripe Terminal reader. Card data never touches our servers.
                </p>
                <Button onClick={() => submitTender('card_present')} loading={collectPayment.isPending}>
                  Charge card reader
                </Button>
              </TabsContent>

              <TabsContent value="card_online" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <div className="flex gap-2 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={cardMode === 'reader'} onChange={() => setCardMode('reader')} />
                    In-person reader
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={cardMode === 'link'} onChange={() => setCardMode('link')} />
                    Text-to-pay link
                  </label>
                </div>
                {cardMode === 'reader' ? (
                  <Button onClick={() => submitTender('card_online')} loading={collectPayment.isPending}>
                    Charge card
                  </Button>
                ) : (
                  <Button onClick={sendPaymentLink} loading={paymentLink.isPending}>
                    Send payment link
                  </Button>
                )}
                {lastPaymentUrl && (
                  <p className="break-all rounded-md bg-muted p-2 text-xs">
                    Payment link: <span className="font-mono">{lastPaymentUrl}</span>
                  </p>
                )}
              </TabsContent>

              <TabsContent value="apple_pay" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Processed as an online wallet card payment. Card data never touches our servers.
                </p>
                <Button onClick={() => submitTender('apple_pay')} loading={collectPayment.isPending}>
                  <Wallet className="h-4 w-4" />
                  Pay with Apple Pay
                </Button>
              </TabsContent>

              <TabsContent value="ach" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Button onClick={() => submitTender('ach')} loading={collectPayment.isPending}>
                  Charge bank account
                </Button>
              </TabsContent>

              <TabsContent value="bnpl" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <p className="text-xs text-muted-foreground">Shop is paid in full immediately; customer repays the financier over time.</p>
                <Button onClick={() => submitTender('bnpl')} loading={collectPayment.isPending}>
                  Send BNPL application
                </Button>
              </TabsContent>

              <TabsContent value="other" className="space-y-3">
                <Field label="Amount">
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Button onClick={() => submitTender('other')} loading={collectPayment.isPending}>
                  Record payment
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {lastSimulated && (
            <Badge variant="warning">Simulated — no live payment processor connected in this environment</Badge>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {done ? 'Done' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
