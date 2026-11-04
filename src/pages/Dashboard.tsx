import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { ArrowUpRight, BarChart3, FlaskConical, Microscope, ReceiptIndianRupee, UserPlus, type LucideIcon } from 'lucide-react'
import { useLab, useSession } from '../data/store'
import { useMoney } from '../hooks'
import type { Invoice, Role } from '../types'
import { daysAgo, fmtDay, fmtLong, fmtTime, isoDay, isToday, relativeTime } from '../utils/format'
import { Columns, SegmentBar, TrendArea, type Part, type Point } from '../components/charts/Charts'
import { buttonClass } from '../components/ui/Button'
import { EmptyState, PageHero, Panel, Tile } from '../components/ui/Common'
import { Segmented } from '../components/ui/Field'
import { Readout } from '../components/ui/Readout'
import { InvoiceStatusPill, ReportStatusPill } from '../components/ui/StatusPill'
import { CapDot } from '../components/ui/Tube'
import { InvoiceViewer } from '../components/invoices/InvoiceViewer'

type Range = 'today' | '7d' | '30d'
const RANGE_LABEL: Record<Range, string> = { today: 'today', '7d': 'in 7 days', '30d': 'in 30 days' }
const RANGE_DAYS: Record<Range, number> = { today: 0, '7d': 6, '30d': 29 }
const CATEGORY_COLOR = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5', '--series-6', '--series-7']

const QUICK_ACTIONS: { to: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { to: '/billing', label: 'New bill', icon: ReceiptIndianRupee, roles: ['owner', 'billing'] },
  { to: '/results', label: 'Enter results', icon: Microscope, roles: ['owner', 'technical'] },
  { to: '/patients?new=1', label: 'Register patient', icon: UserPlus, roles: ['owner', 'billing'] },
  { to: '/master/tests?new=1', label: 'Add test', icon: FlaskConical, roles: ['owner'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner'] },
]

function MiniStat({ i, label, value, note, className = '' }: { i: number; label: string; value: string; note: string; className?: string }) {
  return (
    <Tile i={i} className={className}>
      <p className="truncate text-xs font-semibold text-ink-2">{label}</p>
      <Readout text={value} className="mt-2 block text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none font-medium tracking-tight text-ink" />
      <p className="mt-2 truncate text-xs text-ink-3">{note}</p>
    </Tile>
  )
}

export default function Dashboard() {
  const patients = useLab((state) => state.patients)
  const invoices = useLab((state) => state.invoices)
  const masterCategories = useLab((state) => state.categories)
  const session = useSession()
  const money = useMoney()
  const [range, setRange] = useState<Range>('today')
  const [open, setOpen] = useState<Invoice | null>(null)

  const names = useMemo(() => new Map(patients.map((p) => [p.id, p.name])), [patients])
  const from = useMemo(() => daysAgo(RANGE_DAYS[range]), [range])
  const scoped = useMemo(() => invoices.filter((invoice) => new Date(invoice.date) >= from), [invoices, from])

  const stats = useMemo(() => {
    const registered = patients.filter((p) => new Date(p.registeredAt) >= from).length
    const completed = invoices.reduce((sum, invoice) => sum + invoice.items.filter((item) => item.completedAt && new Date(item.completedAt) >= from).length, 0)
    const pending = invoices.reduce((sum, invoice) => sum + invoice.items.filter((item) => item.reportStatus !== 'Ready').length, 0)
    const billing = scoped.reduce((sum, invoice) => sum + invoice.total, 0)
    const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balance, 0)
    const dueCount = invoices.filter((invoice) => invoice.balance > 0).length
    return { registered, completed, pending, billing, outstanding, dueCount }
  }, [patients, invoices, scoped, from])

  const revenue = useMemo<Point[]>(() => {
    if (range === 'today') {
      // Hours that have not happened yet stay off the axis, so the line does not imply zero billing.
      const lastHour = Math.max(new Date().getHours(), 9)
      const hours = Array.from({ length: Math.min(lastHour, 18) - 6 }, (_, index) => index + 7)
      const today = scoped.filter((invoice) => isToday(invoice.date))
      return hours.map((hour) => ({
        label: `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}`,
        value: today.filter((invoice) => new Date(invoice.date).getHours() === hour).reduce((sum, invoice) => sum + invoice.total, 0),
      }))
    }
    const totals = new Map<string, number>()
    scoped.forEach((invoice) => {
      const key = isoDay(invoice.date)
      totals.set(key, (totals.get(key) ?? 0) + invoice.total)
    })
    return Array.from({ length: RANGE_DAYS[range] + 1 }, (_, index) => {
      const day = daysAgo(RANGE_DAYS[range] - index)
      return { label: fmtDay(day), value: totals.get(isoDay(day)) ?? 0 }
    })
  }, [scoped, range])

  const registrations = useMemo<Point[]>(() => {
    const window = range === '30d' ? 30 : 14
    const totals = new Map<string, number>()
    patients.forEach((p) => {
      const key = isoDay(p.registeredAt)
      totals.set(key, (totals.get(key) ?? 0) + 1)
    })
    return Array.from({ length: window }, (_, index) => {
      const day = daysAgo(window - 1 - index)
      return { label: fmtDay(day), value: totals.get(isoDay(day)) ?? 0 }
    })
  }, [patients, range])

  const categories = useMemo<Part[]>(() => {
    const totals = new Map<string, number>()
    scoped.forEach((invoice) => invoice.items.forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + item.qty)))
    // Seven colours are available, so a longer master list folds its tail into Other.
    const names = masterCategories.map((category) => category.name)
    const named = names.length > 7 ? names.slice(0, 6) : names
    const parts: Part[] = named.map((name, index) => ({ name, value: totals.get(name) ?? 0, color: CATEGORY_COLOR[index], darkLabel: index === 3 }))
    const other = [...totals.entries()].filter(([name]) => !named.includes(name)).reduce((sum, [, value]) => sum + value, 0)
    if (other > 0) parts.push({ name: 'Other', value: other, color: CATEGORY_COLOR[6] })
    return parts
  }, [scoped, masterCategories])

  const queue = useMemo(
    () =>
      invoices
        .flatMap((invoice) => invoice.items.filter((item) => item.reportStatus !== 'Ready').map((item) => ({ item, invoice })))
        .sort((a, b) => a.invoice.date.localeCompare(b.invoice.date)),
    [invoices],
  )

  const ticker = invoices.slice(0, 10).map((invoice) => `${names.get(invoice.patientId) ?? 'Patient'} · ${invoice.items[0]?.code} · ${money(invoice.total)}`)
  const peak = Math.max(...revenue.map((point) => point.value), 1)
  const actions = QUICK_ACTIONS.filter((action) => session && action.roles.includes(session.role))
  const canSeeBills = session?.role !== 'technical'

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero
        title={`${stats.pending === 1 ? '1 report' : `${stats.pending} reports`} on the bench`}
        subtitle={fmtLong(new Date())}
        actions={
          <Segmented<Range>
            onStage
            label="Dashboard period"
            value={range}
            onChange={setRange}
            className="max-sm:w-full"
            options={[
              { value: 'today', label: 'Today' },
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
            ]}
          />
        }
      />

      <div className="marquee mb-5 font-mono text-xs text-on-stage-2" aria-hidden>
        <div>
          {[...ticker, ...ticker].map((entry, index) => (
            <span key={index} className="flex items-center gap-6 pr-6 whitespace-nowrap">
              {entry}
              <span className="size-1 rounded-full" style={{ background: 'var(--stage-glow)' }} />
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 md:grid-cols-6 lg:grid-cols-12">
        {/* Hero figure with a skyline of the same period's billing. */}
        <Tile i={0} className="col-span-2 md:col-span-6 lg:col-span-4 lg:row-span-2" tone="slab-accent flex flex-col justify-between">
          <div>
            <p className="text-[13px] font-semibold opacity-85">Total billing {RANGE_LABEL[range]}</p>
            <Readout text={money(stats.billing)} className="mt-3 block text-[clamp(2.25rem,4.4vw,4rem)] leading-none font-medium tracking-tight" />
          </div>
          <div className="mt-6 flex h-16 items-end gap-1 lg:h-24" aria-hidden>
            {revenue.slice(-24).map((point, index) => (
              <span key={index} className="min-w-0 flex-1 origin-bottom rounded-t-[3px] bg-white/70 transition-[height] duration-700 ease-(--ease-lab)" style={{ height: `${6 + (point.value / peak) * 94}%` }} />
            ))}
          </div>
        </Tile>
        <MiniStat i={1} className="md:col-span-3 lg:col-span-2" label="Total patients" value={patients.length.toLocaleString('en-IN')} note="All time" />
        <MiniStat i={2} className="md:col-span-3 lg:col-span-2" label="Registrations" value={String(stats.registered)} note={RANGE_LABEL[range]} />
        <MiniStat i={3} className="md:col-span-3 lg:col-span-2" label="Completed tests" value={String(stats.completed)} note={RANGE_LABEL[range]} />
        <MiniStat i={4} className="md:col-span-3 lg:col-span-2" label="Pending reports" value={String(stats.pending)} note="In queue now" />
        <MiniStat i={5} className="col-span-2 md:col-span-3 lg:col-span-4" label="Outstanding payments" value={money(stats.outstanding)} note={`Across ${stats.dueCount} invoices`} />
        <Panel i={6} className="col-span-2 md:col-span-3 lg:col-span-4" bodyClass="p-3">
          <h2 className="sr-only">Quick actions</h2>
          <ul className="grid h-full grid-cols-2 gap-2 [&>li:nth-child(5)]:col-span-2">
            {actions.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="key group flex h-full min-h-14 items-center gap-2 rounded-xl px-3 py-2 text-[13px] leading-tight font-semibold">
                  <Icon size={17} className="shrink-0 text-accent-text" aria-hidden />
                  <span className="min-w-0 flex-1">{label}</span>
                  <ArrowUpRight size={14} className="shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel i={7} className="col-span-2 md:col-span-6 lg:col-span-8" title="Revenue overview" aside={<span className="font-mono text-xs">{money(stats.billing)}</span>}>
          <TrendArea key={range} data={revenue} name="Billed" format={(value) => money(value)} height={280} ariaLabel={`Revenue ${RANGE_LABEL[range]}, total ${money(stats.billing)}`} />
        </Panel>

        <Panel i={8} className="col-span-2 md:col-span-6 lg:col-span-4" title="Pending test reports" aside={`${queue.length} waiting`}>
          {queue.length === 0 ? (
            <EmptyState icon={FlaskConical} title="Bench is clear" body="Every report has been released." />
          ) : (
            <ul className="divide-y divide-line">
              <AnimatePresence initial={false}>
                {queue.slice(0, 5).map(({ item, invoice }) => (
                  <m.li
                    key={`${invoice.id}-${item.testId}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, x: 40, rotateY: 30 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 py-2.5">
                      <CapDot type={item.sampleType} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                        <p className="truncate text-xs text-ink-3">
                          {names.get(invoice.patientId)} · {relativeTime(invoice.date)}
                        </p>
                        <ReportStatusPill status={item.reportStatus} />
                      </div>
                      {session?.role !== 'billing' && (
                        <Link to={`/results?open=${invoice.id}`} className={buttonClass('secondary', 'sm')}>
                          Enter results
                        </Link>
                      )}
                    </div>
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <Panel i={9} className="col-span-2 md:col-span-6 lg:col-span-7" title="Recent billing activity" aside={canSeeBills ? <Link to="/invoices" className="-my-2 inline-block py-2 font-semibold text-accent-text hover:underline">All invoices</Link> : undefined}>
          <ul className="-mx-2 space-y-0.5">
            {invoices.slice(0, 6).map((invoice) => (
              <li key={invoice.id}>
                <button type="button" onClick={() => setOpen(invoice)} className="lift-row flex w-full flex-wrap items-center gap-x-4 gap-y-0.5 rounded-xl px-2 py-2 text-left">
                  <span className="min-w-36 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{names.get(invoice.patientId)}</span>
                    <span className="block truncate font-mono text-xs text-ink-3">
                      {invoice.number} · {isToday(invoice.date) ? fmtTime(invoice.date) : fmtDay(invoice.date)}
                    </span>
                  </span>
                  <InvoiceStatusPill status={invoice.status} />
                  <span className="w-20 text-right font-mono text-[13px] font-medium text-ink">{money(invoice.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel i={10} className="col-span-2 md:col-span-6 lg:col-span-5" title="Daily registrations" aside={`Last ${registrations.length} days`}>
          <Columns data={registrations} name="Registered" height={200} ariaLabel={`Patient registrations per day, last ${registrations.length} days`} />
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {patients.slice(0, 4).map((patient) => (
              <li key={patient.id}>
                <Link to={`/patients/${patient.id}`} className="key inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold">
                  {patient.name}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel i={11} className="col-span-2 md:col-span-6 lg:col-span-12" title="Test category distribution" aside={RANGE_LABEL[range]}>
          <SegmentBar key={range} parts={categories} format={(value) => `${value} tests`} />
        </Panel>
      </div>

      <InvoiceViewer invoice={open} onClose={() => setOpen(null)} />
    </div>
  )
}
