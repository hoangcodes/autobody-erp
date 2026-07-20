import * as React from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogClose } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { useSendMessage } from '@/hooks/useMessages'
import { toast } from '@/components/ui/toastStore'
import type { MessageChannel, OrderStatus } from '@/types'

export function SendOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerId,
  status,
  defaultChannel = 'sms',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNumber: number
  customerId: string
  status: OrderStatus
  /** Preselect SMS or Email when the dialog opens. */
  defaultChannel?: MessageChannel
}) {
  const sendMessage = useSendMessage()
  const [channel, setChannel] = React.useState<MessageChannel>(defaultChannel)
  // Re-apply the requested channel each time the dialog is opened.
  React.useEffect(() => {
    if (open) setChannel(defaultChannel)
  }, [open, defaultChannel])
  const docLabel = status === 'invoice' ? 'invoice' : status === 'repair_order' ? 'repair order' : 'estimate'
  const [body, setBody] = React.useState(
    `Hi! Your ${docLabel} #${orderNumber} is ready to review. Reply here with any questions.`,
  )
  const [allowPayment, setAllowPayment] = React.useState(status === 'invoice')
  const [requestAuth, setRequestAuth] = React.useState(status === 'estimate')
  const [requestSignature, setRequestSignature] = React.useState(false)

  function handleSend() {
    sendMessage.mutate(
      { customerId, orderId, channel, body },
      {
        onSuccess: () => {
          toast.success('Sent', `${docLabel[0]!.toUpperCase()}${docLabel.slice(1)} sent to customer.`)
          onOpenChange(false)
        },
        onError: (err) => toast.error('Could not send', err instanceof Error ? err.message : undefined),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Send {docLabel} #{orderNumber}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close"><X className="h-4 w-4" /></Button>
          </DialogClose>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea className="mt-1" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allowPayment} onChange={(e) => setAllowPayment(e.target.checked)} />
              Allow online payment
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={requestAuth} onChange={(e) => setRequestAuth(e.target.checked)} />
              Request authorization
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={requestSignature} onChange={(e) => setRequestSignature(e.target.checked)} />
              Request e-signature
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} loading={sendMessage.isPending}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
