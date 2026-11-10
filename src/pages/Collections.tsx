import { useMemo, useState } from 'react'
import { BadgeCheck, HandCoins, IndianRupee, Timer } from 'lucide-react'
import { useLab } from '../data/store'
import { useFirstLoad, useMoney, usePagination } from '../hooks'
import type { Invoice } from '../types'
import { fmtDate, relativeTime } from '../utils/format'
import { orderStage, reportedAt } from '../utils/results'
import { Button } from '../components/ui/Button'
import { EmptyState, PageHero, Pagination, Panel, Tile } from '../components/ui/Common'
import { SearchInput } from '../components/ui/Field'
import { Readout } from '../components/ui/Readout'
import { RowsSkeleton } from '../components/ui/Skeleton'
import { InvoiceViewer } from '../components/invoices/InvoiceViewer'

const PAGE_SIZE = 10

/** Orders whose results are back but whose bill is not settled: billing staff collect here, which releases the report. */
export default function Collections() {
  const invoices = useLab((state) => state.invoices)
  const patients = useLab((state) => state.patients)
  const money = useMoney()
  const loading = useFirstLoad('collections')
  const [query, setQuery] = useState('')
  const [collecting, setCollecting] = useState<Invoice | null>(null)

  const names = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  // Longest waiting first: those patients have been told their results are ready.
  const waiting = useMemo(
    () =>
      invoices
        .filter((invoice) => orderStage(invoice) === 'Ready to collect')
        .map((invoice) => ({ invoice, since: reportedAt(invoice) ?? invoice.date }))
        .sort((a, b) => a.since.localeCompare(b.since)),
    [invoices],
  )
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return waiting
    return waiting.filter(({ invoice }) => {
      const patient = names.get(invoice.patientId)
      return invoice.number.toLowerCase().includes(term) || patient?.name.toLowerCase().includes(term) || patient?.phone.includes(term)
    })
  }, [waiting, names, query])

  const toCollect = waiting.reduce((sum, { invoice }) => sum + invoice.balance, 0)
  const { page, pages, rows, setPage } = usePagination(filtered, PAGE_SIZE, query)

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero title="Collections" subtitle="Results are back. Collect the balance to release the report." />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile i={0} className="col-span-2 md:col-span-1" tone="slab-accent">
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-85">
            <IndianRupee size={13} aria-hidden /> To collect
          </p>
          <Readout text={money(toCollect)} className="mt-1.5 block text-[clamp(1.5rem,2.6vw,2.25rem)] leading-none font-medium" />
        </Tile>
        <Tile i={1}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
            <HandCoins size={13} aria-hidden /> Patients waiting
          </p>
          <Readout text={String(waiting.length)} className="mt-1.5 block text-[clamp(1.125rem,2.6vw,2.25rem)] leading-none font-medium text-ink" />
        </Tile>
        <Tile i={2}>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">
            <Timer size={13} aria-hidden /> Waiting longest
          </p>
          <p className="mt-1.5 truncate text-[clamp(1.125rem,2.6vw,1.75rem)] leading-none font-medium text-ink">{waiting.length > 0 ? relativeTime(waiting[0].since) : '–'}</p>
        </Tile>
      </div>

      <Panel i={3} bodyClass="">
        <div className="border-b border-line p-4">
          <SearchInput label="Search collections" value={query} onChange={setQuery} placeholder="Patient, phone or invoice" />
        </div>

        {loading ? (
          <div className="px-4">
            <RowsSkeleton rows={6} />
          </div>
        ) : rows.length === 0 ? (
          waiting.length === 0 ? (
            <EmptyState icon={BadgeCheck} title="Nothing to collect" body="Every order with results back has been paid in full." />
          ) : (
            <EmptyState icon={HandCoins} title="No match" body="No waiting patient fits that search." action={<Button onClick={() => setQuery('')}>Clear search</Button>} />
          )
        ) : (
          <>
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Patient</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Invoice</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">Tests</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Results in</th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Paid</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Balance</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ invoice, since }) => {
                  const patient = names.get(invoice.patientId)
                  return (
                    <tr key={invoice.id} className="lift-row cursor-pointer" onClick={() => setCollecting(invoice)}>
                      <td className="px-4" style={{ paddingBlock: 'var(--row-y)' }}>
                        <span className="font-semibold text-ink">{patient?.name}</span>
                        <span className="block font-mono text-xs text-ink-3">{patient?.phone}</span>
                      </td>
                      <td className="px-3">
                        <span className="font-mono text-[13px] font-medium text-ink">{invoice.number}</span>
                        <span className="block text-xs text-ink-3">Billed {fmtDate(invoice.date)}</span>
                      </td>
                      <td className="hidden max-w-56 px-3 xl:table-cell">
                        <span className="line-clamp-1 text-[13px] text-ink-2">{invoice.items.map((item) => item.name).join(', ')}</span>
                      </td>
                      <td className="px-3 text-[13px] text-ink-2">{relativeTime(since)}</td>
                      <td className="tnum hidden px-3 text-right font-mono text-[13px] text-ink-2 lg:table-cell">
                        {money(invoice.paid)}
                        <span className="block text-xs text-ink-3">of {money(invoice.total)}</span>
                      </td>
                      <td className="tnum px-3 text-right font-mono text-[15px] font-semibold text-danger">{money(invoice.balance)}</td>
                      <td className="px-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          aria-label={`Collect ${money(invoice.balance)} from ${patient?.name}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setCollecting(invoice)
                          }}
                        >
                          <IndianRupee size={14} aria-hidden /> Collect
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {rows.map(({ invoice, since }) => {
                const patient = names.get(invoice.patientId)
                return (
                  <li key={invoice.id}>
                    <button type="button" onClick={() => setCollecting(invoice)} className="lift-row flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{patient?.name}</span>
                        <span className="block truncate font-mono text-xs text-ink-3">{invoice.number}</span>
                        <span className="block text-xs text-ink-3">Results in {relativeTime(since)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-base font-semibold text-danger">{money(invoice.balance)}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-accent-text">Collect</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        {!loading && (
          <div className="border-t border-line px-4">
            <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />
          </div>
        )}
      </Panel>

      <InvoiceViewer invoice={collecting} startPaying onClose={() => setCollecting(null)} />
    </div>
  )
}
