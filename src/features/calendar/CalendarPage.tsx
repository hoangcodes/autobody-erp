import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i) // 8am–5pm
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Scheduling scaffold: shows the week-grid shell. Appointment CRUD, drop-off/
 * pick-up, reminders and confirmations are developer.md Phase 2. */
export function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Appointments and drop-offs. Booking, reminders and confirmations are scaffolded for a later phase."
      />
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-[60px_repeat(6,1fr)] overflow-hidden rounded-md border border-border text-xs">
            <div className="border-b border-r border-border bg-muted/50 p-2" />
            {DAYS.map((d) => (
              <div key={d} className="border-b border-r border-border bg-muted/50 p-2 text-center font-semibold">
                {d}
              </div>
            ))}
            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="border-b border-r border-border p-2 text-right text-muted-foreground">
                  {h > 12 ? `${h - 12}p` : `${h}a`}
                </div>
                {DAYS.map((d) => (
                  <div key={`${d}-${h}`} className="h-12 border-b border-r border-border hover:bg-primary-50/50" />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <EmptyState
              title="No appointments loaded"
              description="TODO (Phase 2): render appointments from /appointments, group by technician, colour filters, and click-to-create."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
