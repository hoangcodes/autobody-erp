import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { MultiCombobox } from '@/components/ui/MultiCombobox'
import { toast } from '@/components/ui/toastStore'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers'
import { ageFromDob, ageRangeFromDob, AGE_RANGES } from '@/lib/utils'
import type { AgeRange, Contact, Customer, Gender, ReferralSource } from '@/types'

const ETHNICITY_OPTIONS = [
  'White',
  'Black or African American',
  'Hispanic or Latino',
  'Asian',
  'Native American or Alaska Native',
  'Native Hawaiian or Pacific Islander',
  'Two or more',
  'Other',
]

// Common languages offered in the "Primary language" multi-select. Users can
// still type and add any language not in this list.
const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Hindi',
  'Arabic',
  'French',
  'Vietnamese',
  'Tagalog',
  'Korean',
  'Russian',
  'Portuguese',
  'German',
  'Japanese',
  'Italian',
  'Polish',
  'Farsi',
  'Urdu',
]

const REFERRAL_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social media' },
  { value: 'repeat_customer', label: 'Repeat customer' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
]

const NONE = '__none__'

function firstOfType(contacts: Contact[] | undefined, type: 'phone' | 'email'): string {
  return contacts?.find((c) => c.type === type)?.value ?? ''
}

export interface CustomerFormDialogProps {
  open: boolean
  onClose: () => void
  /** When provided, the dialog edits this customer; otherwise it creates a new one. */
  customer?: Customer
  /** Fired with the newly-created customer (create mode only) — lets callers
   * select the record they just created (e.g. the Customer combobox). */
  onCreated?: (customer: Customer) => void
}

/** Create/edit form covering identity, contact, and intake demographics.
 * DOB takes priority over the manual age range when present. */
export function CustomerFormDialog({ open, onClose, customer, onCreated }: CustomerFormDialogProps) {
  const isEdit = Boolean(customer)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer(customer?.id ?? '')

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [gender, setGender] = React.useState<string>(NONE)
  const [dob, setDob] = React.useState('')
  const [ageRange, setAgeRange] = React.useState<string>(NONE)
  const [ethnicity, setEthnicity] = React.useState<string>(NONE)
  const [primaryLanguages, setPrimaryLanguages] = React.useState<string[]>([])
  const [speaksEnglish, setSpeaksEnglish] = React.useState(true)
  const [dlNumber, setDlNumber] = React.useState('')
  const [dlState, setDlState] = React.useState('')
  const [dlExp, setDlExp] = React.useState('')
  const [city, setCity] = React.useState('')
  const [state, setState] = React.useState('')
  const [referralSource, setReferralSource] = React.useState<string>(NONE)

  // Hydrate form when the dialog opens (or the target customer changes).
  React.useEffect(() => {
    if (!open) return
    setFirstName(customer?.firstName ?? '')
    setLastName(customer?.lastName ?? '')
    setPhone(firstOfType(customer?.contacts, 'phone'))
    setEmail(firstOfType(customer?.contacts, 'email'))
    setGender(customer?.gender ?? NONE)
    setDob(customer?.dob ?? '')
    setAgeRange(customer?.ageRange ?? NONE)
    setEthnicity(customer?.ethnicity ?? NONE)
    // Back-compat: prefer the new `primaryLanguages[]`; otherwise seed from the
    // legacy singular `primaryLanguage` so existing rows migrate cleanly.
    setPrimaryLanguages(
      customer?.primaryLanguages ?? (customer?.primaryLanguage ? [customer.primaryLanguage] : []),
    )
    setSpeaksEnglish(customer?.speaksEnglish ?? true)
    setDlNumber(customer?.driverLicenseNumber ?? '')
    setDlState(customer?.driverLicenseState ?? '')
    setDlExp(customer?.driverLicenseExp ?? '')
    setCity(customer?.city ?? '')
    setState(customer?.state ?? '')
    setReferralSource(customer?.referralSource ?? NONE)
  }, [open, customer])

  // DOB drives age + age range when present.
  const derivedAge = ageFromDob(dob)
  const derivedRange = ageRangeFromDob(dob)
  const effectiveRange = derivedRange ?? (ageRange === NONE ? undefined : (ageRange as AgeRange))

  function submit() {
    const contacts: Contact[] = []
    if (phone.trim()) contacts.push({ label: 'mobile', type: 'phone', value: phone.trim() })
    if (email.trim()) contacts.push({ label: 'primary', type: 'email', value: email.trim() })

    const body: Partial<Customer> = {
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      contacts,
      gender: gender === NONE ? undefined : (gender as Gender),
      dob: dob.trim() || undefined,
      ageRange: effectiveRange,
      ethnicity: ethnicity === NONE ? undefined : ethnicity,
      // Store the multi-select as `primaryLanguages`; mirror the first into the
      // legacy `primaryLanguage` so older readers keep working.
      primaryLanguages: primaryLanguages.length ? primaryLanguages : undefined,
      primaryLanguage: primaryLanguages[0],
      speaksEnglish,
      driverLicenseNumber: dlNumber.trim() || undefined,
      driverLicenseState: dlState.trim() || undefined,
      driverLicenseExp: dlExp.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      referralSource: referralSource === NONE ? undefined : (referralSource as ReferralSource),
    }

    if (isEdit) {
      updateCustomer.mutate(body, {
        onSuccess: () => {
          toast.success('Customer updated')
          onClose()
        },
        onError: (err) => toast.error('Could not update customer', err instanceof Error ? err.message : undefined),
      })
    } else {
      createCustomer.mutate(
        { type: 'individual', preferredContactMethod: 'sms', taxExempt: false, tags: [], ...body },
        {
          onSuccess: (created) => {
            toast.success('Customer created')
            onCreated?.(created)
            onClose()
          },
          onError: (err) => toast.error('Could not create customer', err instanceof Error ? err.message : undefined),
        },
      )
    }
  }

  const pending = createCustomer.isPending || updateCustomer.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {/* Identity */}
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="State">
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. CO" />
              </Field>
            </div>
          </Section>

          {/* Demographics */}
          <Section title="Demographics">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gender">
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unspecified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth (full date or year)">
                <Input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="YYYY-MM-DD or 1985"
                />
              </Field>
              <Field label="Age range">
                <Select value={derivedRange ?? ageRange} onValueChange={setAgeRange} disabled={Boolean(derivedRange)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unspecified</SelectItem>
                    {AGE_RANGES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {derivedRange
                    ? `Auto-set from DOB (age ${derivedAge}). Clear DOB to set manually.`
                    : 'Set manually when DOB is unknown.'}
                </p>
              </Field>
              <Field label="Ethnicity">
                <Select value={ethnicity} onValueChange={setEthnicity}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unspecified</SelectItem>
                    {ETHNICITY_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary language">
                <MultiCombobox
                  values={primaryLanguages}
                  options={LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))}
                  onChange={setPrimaryLanguages}
                  allowNew
                  placeholder="e.g. English"
                  ariaLabel="Primary language"
                />
              </Field>
              <Field label="Speaks English">
                <label className="mt-1.5 flex h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={speaksEnglish}
                    onChange={(e) => setSpeaksEnglish(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary-600"
                  />
                  <span>{speaksEnglish ? 'Yes' : 'No'}</span>
                </label>
              </Field>
            </div>
          </Section>

          {/* Driver license + referral */}
          <Section title="Driver license & source">
            <div className="grid grid-cols-2 gap-3">
              <Field label="DL number">
                <Input value={dlNumber} onChange={(e) => setDlNumber(e.target.value)} />
              </Field>
              <Field label="Issuing state">
                <Input value={dlState} onChange={(e) => setDlState(e.target.value)} placeholder="e.g. CO" />
              </Field>
              <Field label="DL expiration">
                <Input value={dlExp} onChange={(e) => setDlExp(e.target.value)} placeholder="YYYY-MM-DD" />
              </Field>
              <Field label="How did they hear about us?">
                <Select value={referralSource} onValueChange={setReferralSource}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unspecified</SelectItem>
                    {REFERRAL_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={pending}>{isEdit ? 'Save changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
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
