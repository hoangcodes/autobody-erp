import * as React from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  usePaymentSettings,
  useUpdatePaymentSettings,
  useConnectPayments,
  usePairReader,
} from '@/hooks/usePaymentSettings'
import { toast } from '@/components/ui/toastStore'

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Configure payments, workflow, roles and integrations." />
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <PaymentsSetup />
        </TabsContent>
        <TabsContent value="workflow">
          <EmptyState
            title="Workflow columns"
            description="TODO: manage kanban columns, ordering, per-column conversion/archival rules. Backend CRUD is live at /workflow-statuses."
          />
        </TabsContent>
        <TabsContent value="roles">
          <EmptyState
            title="Roles & permissions"
            description="TODO: role editor. Permissions are role-level only (never per-user); editing a shared role forks a custom role."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const CONNECT_STATUS: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  not_started: { label: 'Not connected', variant: 'secondary' },
  pending: { label: 'Onboarding in progress', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
}

function PaymentsSetup() {
  const settingsQuery = usePaymentSettings()
  const updateSettings = useUpdatePaymentSettings()
  const connect = useConnectPayments()
  const pairReader = usePairReader()
  const [readerId, setReaderId] = React.useState('')

  const settings = settingsQuery.data
  const status = settings?.connectStatus ?? 'not_started'

  function handleConnect() {
    connect.mutate(undefined, {
      onSuccess: (res) => {
        toast.success('Stripe Connect link generated', res.url)
        settingsQuery.refetch()
      },
      onError: (err) => toast.error('Could not start onboarding', err instanceof Error ? err.message : undefined),
    })
  }

  function handlePairReader() {
    if (!readerId.trim()) return
    pairReader.mutate(readerId.trim(), {
      onSuccess: () => {
        toast.success('Reader paired')
        setReaderId('')
        settingsQuery.refetch()
      },
      onError: (err) => toast.error('Could not pair reader', err instanceof Error ? err.message : undefined),
    })
  }

  function toggleSurcharge(enabled: boolean) {
    updateSettings.mutate(
      { surchargeEnabled: enabled },
      { onError: (err) => toast.error('Update failed', err instanceof Error ? err.message : undefined) },
    )
  }

  if (settingsQuery.isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="grid max-w-3xl grid-cols-1 gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Merchant account (Stripe Connect)</CardTitle>
            <CardDescription>Onboard once to accept cards in-person and online.</CardDescription>
          </div>
          <Badge variant={CONNECT_STATUS[status]!.variant}>{CONNECT_STATUS[status]!.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Start onboarding to create your Stripe Connect account.</li>
            <li>Complete Stripe's hosted identity/bank verification.</li>
            <li>Pair a card reader for in-person (Terminal) payments.</li>
          </ol>
          <Button onClick={handleConnect} loading={connect.isPending} disabled={status === 'active'}>
            {status === 'not_started' ? 'Start onboarding' : status === 'pending' ? 'Resume onboarding' : 'Connected'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card reader (Stripe Terminal)</CardTitle>
          <CardDescription>Register a WisePOS-class reader for card-present payments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {settings?.readerId ? (
            <p className="text-sm">
              Paired reader: <span className="font-mono">{settings.readerId}</span>
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Reader registration code / ID</Label>
                <Input value={readerId} onChange={(e) => setReaderId(e.target.value)} placeholder="tmr_xxx" className="mt-1" />
              </div>
              <Button onClick={handlePairReader} loading={pairReader.isPending}>
                Pair reader
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Surcharging</CardTitle>
          <CardDescription>Credit-card surcharges only (never debit, ACH or BNPL). Enforced server-side.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings?.surchargeEnabled ?? false}
              onChange={(e) => toggleSurcharge(e.target.checked)}
            />
            Enable credit-card surcharge ({settings?.surchargePct ?? 0}%)
          </label>
        </CardContent>
      </Card>
    </div>
  )
}
