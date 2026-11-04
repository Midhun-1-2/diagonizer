import { useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Table2, TrendingUp } from 'lucide-react'
import { useLab } from '../data/store'
import { useMoney } from '../hooks'
import type { PaymentMethod } from '../types'
import { methodShare, PAYMENT_METHODS } from '../utils/billing'
import { daysAgo, fmtDay, isoDay, startOfDay } from '../utils/format'
import { SegmentBar, TrendArea, TrendLine, type Part, type Point } from '../components/charts/Charts'
import { setTowers } from '../components/three/bus'
import { Button } from '../components/ui/Button'
import { EmptyState, PageHero, Panel, Tile } from '../components/ui/Common'
import { Input, Segmented } from '../components/ui/Field'
import { Readout } from '../components/ui/Readout'

type Preset = '7' | '30' | '90' | 'custom'
type Grain = 'daily' | 'weekly' | 'monthly'

const METHOD_PARTS: { name: PaymentMethod; color: string; darkLabel?: boolean }[] = [
  { name: 'Cash', color: '--series-1' },
  { name: 'UPI', color: '--series-2' },
  { name: 'Card', color: '--series-3' },
  { name: 'Bank Transfer', color: '--series-4', darkLabel: true },
]

function weekStart(date: Date) {
  const d = startOfDay(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function bucket(from: Date, to: Date, grain: Grain, entries: { date: string; value: number }[]): Point[] {
  const totals = new Map<string, number>()
  const keyFor = (date: Date) => (grain === 'daily' ? isoDay(date) : grain === 'weekly' ? isoDay(weekStart(date)) : isoDay(date).slice(0, 7))
  entries.forEach((entry) => {
    const key = keyFor(new Date(entry.date))
    totals.set(key, (totals.get(key) ?? 0) + entry.value)
  })
  const points: Point[] = []
  const cursor = grain === 'weekly' ? weekStart(from) : startOfDay(from)
  if (grain === 'monthly') cursor.setDate(1)
  while (cursor <= to) {
    const label = grain === 'monthly' ? cursor.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : fmtDay(cursor)
    points.push({ label, value: totals.get(keyFor(cursor)) ?? 0 })
    if (grain === 'daily') cursor.setDate(cursor.getDate() + 1)
    else if (grain === 'weekly') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
  }
  return points
}

function Figure({ i, label, value, note }: { i: number; label: string; value: string; note?: string }) {
  return (
    <Tile i={i}>
      <p className="truncate text-xs font-semibold text-ink-2">{label}</p>
      <Readout text={value} className="mt-1.5 block text-[clamp(1.0625rem,1.65vw,1.625rem)] leading-none font-medium tracking-tight text-ink" />
      {note && <p className="mt-1.5 truncate text-xs text-ink-3">{note}</p>}
    </Tile>
  )
}

export default function Reports() {
  const invoices = useLab((state) => state.invoices)
  const patients = useLab((state) => state.patients)
  const money = useMoney()

  const [preset, setPreset] = useState<Preset>('30')
  const [customFrom, setCustomFrom] = useState(isoDay(daysAgo(13)))
  const [customTo, setCustomTo] = useState(isoDay(new Date()))
  const [grain, setGrain] = useState<Grain>('daily')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | null>(null)
  const [showTable, setShowTable] = useState(false)

  // The towers in the 3D scene behind this page are the last twelve weeks of real billing.
  useEffect(() => {
    const end = new Date()
    const start = daysAgo(7 * 11)
    setTowers(bucket(start, end, 'weekly', invoices.map((invoice) => ({ date: invoice.date, value: invoice.total }))).map((point) => point.value))
  }, [invoices])

  const { from, to } = useMemo(() => {
    if (preset === 'custom') {
      return { from: new Date(`${customFrom}T00:00:00`), to: new Date(`${customTo}T23:59:59`) }
    }
    const end = new Date()
    end.setHours(23, 59, 59)
    return { from: daysAgo(Number(preset) - 1), to: end }
  }, [preset, customFrom, customTo])

  const scoped = useMemo(() => invoices.filter((invoice) => new Date(invoice.date) >= from && new Date(invoice.date) <= to), [invoices, from, to])

  const fixed = useMemo(() => {
    const sumFrom = (start: Date) => invoices.filter((invoice) => new Date(invoice.date) >= start).reduce((sum, invoice) => sum + invoice.total, 0)
    return { daily: sumFrom(startOfDay()), weekly: sumFrom(daysAgo(6)), monthly: sumFrom(daysAgo(29)) }
  }, [invoices])

  const summary = useMemo(() => {
    const paid = scoped.filter((invoice) => invoice.status === 'Paid').length
    const pendingAmount = scoped.reduce((sum, invoice) => sum + invoice.balance, 0)
    const pendingCount = scoped.filter((invoice) => invoice.balance > 0).length
    return { total: scoped.length, paid, pendingAmount, pendingCount }
  }, [scoped])

  const revenue = useMemo(() => {
    return bucket(from, to, grain, scoped.map((invoice) => ({ date: invoice.date, value: methodFilter ? methodShare(invoice, methodFilter) : invoice.total })))
  }, [scoped, methodFilter, from, to, grain])

  const revenueTotal = revenue.reduce((sum, point) => sum + point.value, 0)

  const registrations = useMemo(() => {
    const within = patients.filter((p) => new Date(p.registeredAt) >= from && new Date(p.registeredAt) <= to)
    return bucket(from, to, grain, within.map((p) => ({ date: p.registeredAt, value: 1 })))
  }, [patients, from, to, grain])

  const topTests = useMemo(() => {
    const totals = new Map<string, number>()
    scoped.forEach((invoice) => invoice.items.forEach((item) => totals.set(item.name, (totals.get(item.name) ?? 0) + item.qty)))
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [scoped])
  const topMax = topTests[0]?.[1] ?? 1

  const methods = useMemo<Part[]>(() => {
    return METHOD_PARTS.map((part) => ({ ...part, value: scoped.reduce((sum, invoice) => sum + methodShare(invoice, part.name), 0) }))
  }, [scoped])

  const empty = scoped.length === 0
  const filterKey = `${from.getTime()}-${to.getTime()}-${grain}-${methodFilter ?? 'all'}`

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero title="Reports" subtitle="The towers behind this page are the last twelve weeks of billing." />

      {/* One filter row scopes every chart on the page. */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Segmented<Preset>
          onStage
          label="Date range"
          value={preset}
          onChange={setPreset}
          className="max-sm:w-full"
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {preset === 'custom' && (
          <span className="slab flex flex-wrap items-center gap-2 rounded-2xl! p-1.5 max-sm:w-full">
            <Input type="date" aria-label="From date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="w-38 px-2! text-sm! max-sm:w-auto max-sm:flex-1" />
            <span className="text-ink-3">to</span>
            <Input type="date" aria-label="To date" value={customTo} min={customFrom} onChange={(event) => setCustomTo(event.target.value)} className="w-38 px-2! text-sm! max-sm:w-auto max-sm:flex-1" />
          </span>
        )}
        <span className="flex-1" />
        <Segmented<Grain>
          onStage
          label="Group by"
          value={grain}
          onChange={setGrain}
          className="max-sm:w-full"
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
        <Figure i={0} label="Daily revenue" value={money(fixed.daily)} note="Today" />
        <Figure i={1} label="Weekly revenue" value={money(fixed.weekly)} note="Last 7 days" />
        <Figure i={2} label="Monthly revenue" value={money(fixed.monthly)} note="Last 30 days" />
        <Figure i={3} label="Total invoices" value={String(summary.total)} note="Selected period" />
        <Figure i={4} label="Paid invoices" value={String(summary.paid)} note={summary.total ? `${Math.round((summary.paid / summary.total) * 100)}% of invoices` : 'Selected period'} />
        <Figure i={5} label="Pending payments" value={money(summary.pendingAmount)} note={`${summary.pendingCount} invoices`} />
      </div>

      {empty ? (
        <Panel>
          <EmptyState icon={TrendingUp} title="No invoices in this period" body="Choose a wider date range to see revenue and volumes." />
        </Panel>
      ) : (
        <div className="grid min-w-0 gap-x-3.5 gap-y-5 md:grid-cols-12">
          <Panel i={6} className="md:col-span-12">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-semibold text-ink">
                Revenue {methodFilter && <span className="font-medium text-ink-2">by {methodFilter}</span>} <span className="ml-1 font-mono text-xs font-normal text-ink-3">{money(revenueTotal)}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant={methodFilter === null ? 'secondary' : 'ghost'} onClick={() => setMethodFilter(null)} aria-pressed={methodFilter === null}>
                  All
                </Button>
                {PAYMENT_METHODS.map((method) => (
                  <Button key={method} size="sm" variant={methodFilter === method ? 'secondary' : 'ghost'} aria-pressed={methodFilter === method} onClick={() => setMethodFilter(methodFilter === method ? null : method)}>
                    {method}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" aria-pressed={showTable} onClick={() => setShowTable((value) => !value)}>
                  <Table2 size={14} aria-hidden /> {showTable ? 'Chart' : 'Table'}
                </Button>
              </div>
            </div>
            {showTable ? (
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-xs text-ink-3">
                      <th scope="col" className="px-2 py-2 font-semibold">Period</th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {revenue.map((point) => (
                      <tr key={point.label}>
                        <td className="px-2 py-1.5 text-ink-2">{point.label}</td>
                        <td className="tnum px-2 py-1.5 text-right font-mono text-ink">{money(point.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <TrendArea key={filterKey} data={revenue} name="Revenue" format={(value) => money(value)} height={300} ariaLabel={`Revenue ${grain}, total ${money(revenueTotal)}`} />
            )}
          </Panel>

          <Panel i={7} className="md:col-span-7" title="Most requested tests" aside="Requests in period">
            <ol key={filterKey} className="space-y-2">
              {topTests.map(([name, value], index) => (
                <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)_auto]">
                  <span className="truncate text-[13px] font-medium text-ink">{name}</span>
                  <span className="relative col-span-2 row-start-2 h-3.5 sm:col-span-1 sm:row-start-auto" aria-hidden>
                    <m.span
                      className="absolute inset-y-0 left-0 w-full origin-left rounded-r-md"
                      style={{ background: 'linear-gradient(to bottom, var(--accent-hover), var(--accent))', boxShadow: '0 2px 0 var(--accent-deep)' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: value / topMax }}
                      transition={{ duration: 0.7, delay: index * 0.045, ease: [0.22, 0.8, 0.24, 1] }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs text-ink">{value}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel i={8} className="md:col-span-5" title="Payment methods" aside="Billed amount">
            <SegmentBar key={filterKey} parts={methods} format={(value) => money(value)} />
          </Panel>

          <Panel i={9} className="md:col-span-12" title="Patient registration trend" aside={`${registrations.reduce((sum, point) => sum + point.value, 0)} registered`}>
            <TrendLine key={filterKey} data={registrations} name="Registered" ariaLabel="Patient registrations over the selected period" />
          </Panel>
        </div>
      )}
    </div>
  )
}
