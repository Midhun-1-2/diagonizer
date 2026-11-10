import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Microscope } from 'lucide-react'
import { saveResults, useLab } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { useMediaQuery } from '../hooks'
import type { Invoice, Patient, SubTestResult } from '../types'
import { ageAndGender, fmtDateTime, relativeTime } from '../utils/format'
import { ageRangeLabel, matchAgeGroups, rangeFlag, toResult } from '../utils/results'
import { Button } from '../components/ui/Button'
import { EmptyState, PageHero, Panel } from '../components/ui/Common'
import { Input, Segmented } from '../components/ui/Field'
import { ReportStatusPill } from '../components/ui/StatusPill'
import { CapDot } from '../components/ui/Tube'

type Queue = 'pending' | 'done'

function FlagBadge({ flag }: { flag: 'H' | 'L' | '' }) {
  if (!flag) return <span className="text-xs text-ink-3" aria-hidden>–</span>
  return (
    <span className={`grid size-6 place-items-center rounded-md text-xs font-bold ${flag === 'H' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`} title={flag === 'H' ? 'Above normal range' : 'Below normal range'}>
      {flag}
    </span>
  )
}

function Worksheet({ invoice, patient, onDone, onBack }: { invoice: Invoice; patient?: Patient; onDone: () => void; onBack: () => void }) {
  const tests = useLab((state) => state.tests)
  const ageGroups = useLab((state) => state.ageGroups)
  const toast = useToast()
  // Orders saved before the bill asked for a group fall back to the patient's age and gender.
  const group = invoice.ageGroup ?? (patient ? matchAgeGroups(patient, ageGroups)[0] : undefined)
  const [entries, setEntries] = useState<Record<string, SubTestResult[]>>(() =>
    Object.fromEntries(
      invoice.items.map((item) => [
        item.testId,
        item.results ?? (tests.find((test) => test.id === item.testId)?.subTests ?? []).map((sub) => toResult(sub, group)),
      ]),
    ),
  )

  const update = (testId: string, index: number, patch: Partial<SubTestResult>) => {
    setEntries((current) => ({ ...current, [testId]: current[testId].map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)) }))
  }

  const save = () => {
    const outcome = saveResults(invoice.id, entries)
    if (outcome.complete) {
      toast({ tone: 'success', title: 'Results sent to billing', body: `${invoice.number} is back with billing staff.` })
      onDone()
    } else {
      toast({ tone: 'info', title: 'Results saved', body: `${outcome.remaining} test${outcome.remaining === 1 ? '' : 's'} still need results before this goes to billing.` })
    }
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="key key-stage flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold lg:hidden">
        <ArrowLeft size={15} aria-hidden /> All orders
      </button>
      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-lg font-semibold tracking-[-0.015em] text-ink">{patient?.name ?? 'Patient'}</h2>
          <p className="font-mono text-xs text-ink-3">{invoice.number}</p>
        </div>
        <p className="text-[13px] text-ink-2">
          {patient ? `${ageAndGender(patient)} · ${patient.code} · ` : ''}Billed {fmtDateTime(invoice.date)}
        </p>
        <p className="mt-1 text-[13px] font-semibold text-accent-text">{group ? `Normal ranges for ${group.name} (${ageRangeLabel(group)})` : 'No patient group on this order'}</p>
      </Panel>

      {invoice.items.map((item, itemIndex) => (
        <Panel key={item.testId} i={itemIndex + 1}>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <CapDot type={item.sampleType} />
            <h3 className="min-w-0 flex-1 font-display text-[15px] font-semibold text-ink">{item.name}</h3>
            <span className="font-mono text-xs text-ink-3">
              {item.code} · {item.sampleType}
            </span>
            <ReportStatusPill status={item.reportStatus} />
          </div>
          <div className="mb-1.5 hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_72px_minmax(0,1fr)_32px] gap-2.5 text-xs font-semibold text-ink-3 md:grid">
            <span>Sub-test</span>
            <span>Result</span>
            <span>Unit</span>
            <span>Normal range limit</span>
            <span className="sr-only">Flag</span>
          </div>
          <ul className="divide-y divide-line md:divide-y-0">
            {(entries[item.testId] ?? []).map((row, index) => {
              const flag = rangeFlag(row.value, row.range)
              return (
                <li key={row.name} className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-x-2.5 gap-y-1.5 py-2.5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_72px_minmax(0,1fr)_32px] md:py-1">
                  <span className="text-[13px] font-medium text-ink">{row.name}</span>
                  <span className="md:order-last">
                    <FlagBadge flag={flag} />
                  </span>
                  <Input aria-label={`${row.name} result`} value={row.value} placeholder="Result" onChange={(event) => update(item.testId, index, { value: event.target.value })} className={`col-span-2 font-mono md:col-span-1 ${flag ? 'font-semibold' : ''}`} />
                  <span className="col-span-2 text-xs text-ink-2 md:col-span-1">
                    {row.unit || '–'}
                    <span className="md:hidden"> · Normal range limit</span>
                  </span>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <Input aria-label={`${row.name} normal range limit`} value={row.range} onChange={(event) => update(item.testId, index, { range: event.target.value })} className="font-mono" />
                    <span className="mt-0.5 block truncate text-[11px] text-ink-3">{row.rangeSource ?? (row.range ? 'Saved range' : 'No range set for this group')}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      ))}

      <div className="slab-stage sticky bottom-[84px] z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 md:bottom-4">
        <p className="text-[13px] text-on-stage-2 max-sm:hidden">Saving sends the finished order back to billing.</p>
        <Button variant="primary" onClick={save} className="max-sm:w-full">

          <CheckCheck size={16} aria-hidden /> Save results
        </Button>
      </div>
    </div>
  )
}

/** The technical staff's bench: orders sent from billing, oldest first. */
export default function Results() {
  const invoices = useLab((state) => state.invoices)
  const patients = useLab((state) => state.patients)
  const [params, setParams] = useSearchParams()
  const [queue, setQueue] = useState<Queue>('pending')
  const wide = useMediaQuery('(min-width: 1024px)')

  const names = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const pending = useMemo(() => invoices.filter((invoice) => invoice.items.some((item) => item.reportStatus !== 'Ready')).sort((a, b) => a.date.localeCompare(b.date)), [invoices])
  const done = useMemo(() => invoices.filter((invoice) => invoice.items.every((item) => item.reportStatus === 'Ready')).slice(0, 30), [invoices])
  const list = queue === 'pending' ? pending : done

  const openId = params.get('open')
  const selected = invoices.find((invoice) => invoice.id === openId) ?? (wide ? list[0] : undefined)
  const select = (id: string | null) => setParams(id ? { open: id } : {}, { replace: true })

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero title="Lab Results" subtitle={`${pending.length} order${pending.length === 1 ? '' : 's'} waiting for results.`} />

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className={`deal min-w-0 lg:sticky lg:top-[68px] ${selected && !wide ? 'hidden' : ''}`}>
          <section aria-label="Orders" className="slab overflow-hidden">
            <div className="border-b border-line p-3">
              <Segmented<Queue>
                label="Queue"
                value={queue}
                onChange={(next) => {
                  setQueue(next)
                  select(null)
                }}
                className="flex w-full"
                options={[
                  { value: 'pending', label: `Waiting (${pending.length})` },
                  { value: 'done', label: 'Sent to billing' },
                ]}
              />
            </div>
            {list.length === 0 ? (
              <EmptyState icon={Microscope} title="All results are in" body="New orders appear here as soon as billing staff save them." />
            ) : (
              <ul className="max-h-[70dvh] space-y-0.5 overflow-y-auto p-2 max-lg:max-h-none">
                {list.map((invoice) => {
                  const active = invoice.id === selected?.id
                  return (
                    <li key={invoice.id}>
                      <button type="button" onClick={() => select(invoice.id)} aria-current={active ? 'true' : undefined} className={`w-full rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 ${active ? 'bg-accent text-accent-ink' : 'lift-row text-ink'}`}>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold">{names.get(invoice.patientId)?.name}</span>
                          <span className={`shrink-0 text-xs ${active ? 'opacity-85' : 'text-ink-3'}`}>{relativeTime(invoice.date)}</span>
                        </span>
                        <span className={`mt-0.5 block truncate text-xs ${active ? 'opacity-85' : 'text-ink-3'}`}>{invoice.items.map((item) => item.code).join(' · ')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className={`min-w-0 ${selected || wide ? '' : 'hidden'}`}>
          {selected ? (
            <Worksheet
              key={selected.id}
              invoice={selected}
              patient={names.get(selected.patientId)}
              onBack={() => select(null)}
              onDone={() => {
                const next = pending.find((invoice) => invoice.id !== selected.id)
                select(next && wide ? next.id : null)
              }}
            />
          ) : (
            <Panel>
              <EmptyState icon={Microscope} title="Nothing on the bench" body="Choose an order to enter its results and normal ranges." />
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
