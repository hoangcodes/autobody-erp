import * as React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Car, Pencil } from 'lucide-react'
import { useCustomer, useCustomerHistory } from '@/hooks/useCustomers'
import { useVehicles } from '@/hooks/useVehicles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { CustomerFormDialog } from '@/features/customers/CustomerFormDialog'
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from '@/features/orders/statusDisplay'
import { ageFromDob, customerDisplayName, formatDate, formatMoney, vehicleDisplayName } from '@/lib/utils'
import type { Order, ReferralSource, Vehicle, VehiclePhoto } from '@/types'

const REFERRAL_LABELS: Record<ReferralSource, string> = {
  google: 'Google',
  referral: 'Referral',
  social_media: 'Social media',
  repeat_customer: 'Repeat customer',
  walk_in: 'Walk-in',
  other: 'Other',
}

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const customerQuery = useCustomer(id)
  const vehiclesQuery = useVehicles(id)
  const historyQuery = useCustomerHistory(id)
  const [editOpen, setEditOpen] = React.useState(false)

  if (customerQuery.isError) return <ErrorState onRetry={() => customerQuery.refetch()} />

  const customer = customerQuery.data
  const orders = historyQuery.data ?? []

  // Prefer an existing order photo for a vehicle; else neutral placeholder.
  function photoForVehicle(vehicleId: string): VehiclePhoto | undefined {
    for (const o of orders) {
      if (o.vehicleId === vehicleId && o.photos && o.photos.length) {
        return [...o.photos].sort((a, b) => a.sortOrder - b.sortOrder)[0]
      }
    }
    return undefined
  }

  const age = ageFromDob(customer?.dob)

  const details: { label: string; value?: React.ReactNode }[] = customer
    ? [
        { label: 'Gender', value: customer.gender ? cap(customer.gender) : undefined },
        {
          label: 'Age',
          value: age != null ? `${age}${/^\d{4}$/.test(customer.dob ?? '') ? ' (approx)' : ''}` : undefined,
        },
        { label: 'Age range', value: customer.ageRange },
        { label: 'Date of birth', value: customer.dob },
        { label: 'Ethnicity', value: customer.ethnicity },
        {
          label: 'Language',
          value: (() => {
            // Prefer the new multi-value field; fall back to the legacy singular.
            const langs = customer.primaryLanguages?.length
              ? customer.primaryLanguages
              : customer.primaryLanguage
                ? [customer.primaryLanguage]
                : []
            const joined = langs.join(', ')
            return joined
              ? `${joined}${customer.speaksEnglish === false ? ' · no English' : ''}`
              : customer.speaksEnglish === false
                ? 'No English'
                : undefined
          })(),
        },
        { label: 'From', value: [customer.city, customer.state].filter(Boolean).join(', ') || undefined },
        { label: 'Heard about us', value: customer.referralSource ? REFERRAL_LABELS[customer.referralSource] : undefined },
        {
          label: 'Driver license',
          value: customer.driverLicenseNumber
            ? `${customer.driverLicenseNumber}${customer.driverLicenseState ? ` (${customer.driverLicenseState})` : ''}`
            : undefined,
        },
        { label: 'DL expiration', value: customer.driverLicenseExp },
      ]
    : []
  const shownDetails = details.filter((d) => d.value)

  return (
    <div className="mx-auto max-w-4xl lg:mx-0">
      <button onClick={() => navigate('/customers')} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </button>

      {/* Compact header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {customerQuery.isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar size="lg" name={customerDisplayName(customer)} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{customerDisplayName(customer)}</h1>
                {(customer?.tags ?? []).map((t) => (
                  <Badge key={t} variant="info">{t}</Badge>
                ))}
                {customer?.taxExempt && <Badge variant="secondary">Tax exempt</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {customer?.type === 'business' ? 'Business account' : 'Individual'}
              </p>
            </div>
          </div>
        )}
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={!customer}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Contact + details */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle>Contact &amp; details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="space-y-0.5 text-sm">
                  {(customer?.contacts ?? []).map((c, i) => (
                    <p key={i} className="flex gap-2">
                      <span className="w-16 shrink-0 text-muted-foreground">{c.label}</span>
                      <span className="font-medium text-foreground">{c.value}</span>
                    </p>
                  ))}
                  {(customer?.contacts ?? []).length === 0 && (
                    <p className="text-muted-foreground">No contact info on file.</p>
                  )}
                </div>
                {shownDetails.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-sm">
                    {shownDetails.map((d) => (
                      <div key={d.label}>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{d.label}</dt>
                        <dd className="font-medium text-foreground">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Vehicles with photo thumbnails */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle>Vehicles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vehiclesQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (vehiclesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles on file.</p>
            ) : (
              (vehiclesQuery.data ?? []).map((v) => (
                <VehicleRow key={v.id} vehicle={v} photo={photoForVehicle(v.id)} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service history */}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle>Service history</CardTitle>
          <Button size="sm" variant="outline" onClick={() => navigate('/workflow?new=estimate')}>
            + New estimate
          </Button>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : orders.length === 0 ? (
            <EmptyState title="No orders yet" description="This customer's estimates and invoices will show up here." />
          ) : (
            <div className="space-y-2">
              {orders.map((o: Order) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-2.5 hover:bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-medium">#{o.number}{o.title ? ` · ${o.title}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(o.invoicedAt ?? o.lastActivityAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatMoney(o.totals?.total)}</span>
                    <Badge variant={ORDER_STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {customer && <CustomerFormDialog open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />}
    </div>
  )
}

function VehicleRow({ vehicle, photo }: { vehicle: Vehicle; photo?: VehiclePhoto }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-2">
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
        {photo ? (
          <img src={photo.url} alt={vehicleDisplayName(vehicle)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Car className="h-5 w-5 opacity-50" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{vehicleDisplayName(vehicle)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : vehicle.vin ? `VIN ${vehicle.vin}` : '—'}
        </p>
      </div>
    </div>
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
