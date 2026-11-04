import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, ScrollText } from 'lucide-react'
import { useLab } from '../data/store'
import { useFirstLoad, useMoney, usePagination } from '../hooks'
import type { Invoice, InvoiceStatus, PaymentMethod } from '../types'
import { PAYMENT_METHODS } from '../utils/billing'
import { fmtDate, fmtTime, isoDay } from '../utils/format'
import { orderStage, type OrderStage } from '../utils/results'
import { buttonClass, Button } from '../components/ui/Button'
import { EmptyState, PageHero, Pagination, Panel, Tile } from '../components/ui/Common'
import { Input, SearchInput, Select } from '../components/ui/Field'
import { Readout } from '../components/ui/Readout'
import { RowsSkeleton } from '../components/ui/Skeleton'
import { InvoiceStatusPill, StageLabel } from '../components/ui/StatusPill'
import { InvoiceViewer } from '../components/invoices/InvoiceViewer'

const PAGE_SIZE = 12

export default function Invoices() {
  const [params, setParams] = useSearchParams()
  const invoices = useLab((state) => state.invoices)
  const patients = useLab((state) => state.patients)
  const money = useMoney()
  const loading = useFirstLoad('invoices')

  const [query, setQuery] = useState('')
  const [method, setMethod] = useState<PaymentMethod | 'All'>('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const status = (params.get('status') ?? 'All') as InvoiceStatus | 'All'
  const stage = (params.get('stage') ?? 'All') as OrderStage | 'All'
  const openId = params.get('open')

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const names = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (status !== 'All' && invoice.status !== status) return false
      if (stage !== 'All' && orderStage(invoice) !== stage) return false
      if (method !== 'All' && invoice.method !== method && !invoice.payments.some((payment) => payment.method === method)) return false
      const day = isoDay(invoice.date)
      if (from && day < from) return false
      if (to && day > to) return false
      if (!term) return true
      const patient = names.get(invoice.patientId)
      return invoice.number.toLowerCase().includes(term) || patient?.name.toLowerCase().includes(term) || patient?.phone.includes(term)
    })
  }, [invoices, names, query, status, stage, method, from, to])

  const summary = useMemo(
    () => filtered.reduce((sum, invoice) => ({ billed: sum.billed + invoice.total, collected: sum.collected + invoice.paid, due: sum.due + invoice.balance }), { billed: 0, collected: 0, due: 0 }),
    [filtered],
  )

  const { page, pages, rows, setPage } = usePagination(filtered, PAGE_SIZE, `${query}|${status}|${stage}|${method}|${from}|${to}`)
  const open = openId ? (invoices.find((invoice) => invoice.id === openId) ?? null) : null
  const view = (invoice: Invoice) => setParam('open', invoice.id)
  const reset = () => {
    setQuery('')
    setMethod('All')
    setFrom('')
    setTo('')
    setParams({}, { replace: true })
  }
  const filtering = query || status !== 'All' || stage !== 'All' || method !== 'All' || from || to

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero
        title="Invoices"
        subtitle={`${filtered.length} invoices in this view.`}
        actions={
          <span className="md:hidden">
            <Link to="/billing" className={buttonClass('primary')}>
              <Plus size={16} aria-hidden /> New bill
            </Link>
          </span>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tile i={0} className="col-span-2 md:col-span-1" tone="slab-accent">
          <p className="text-xs font-semibold opacity-85">Billed</p>
          <Readout text={money(summary.billed)} className="mt-1.5 block text-[clamp(1.5rem,2.6vw,2.25rem)] leading-none font-medium" />
        </Tile>
        <Tile i={1}>
          <p className="text-xs font-semibold text-ink-2">Collected</p>
          <Readout text={money(summary.collected)} className="mt-1.5 block text-[clamp(1.125rem,2.6vw,2.25rem)] leading-none font-medium text-ink" />
        </Tile>
        <Tile i={2}>
          <p className="text-xs font-semibold text-ink-2">Due</p>
          <Readout text={money(summary.due)} className={`mt-1.5 block text-[clamp(1.125rem,2.6vw,2.25rem)] leading-none font-medium ${summary.due > 0 ? 'text-danger' : 'text-ink'}`} />
        </Tile>
      </div>

      <Panel i={3} bodyClass="">
        <div className="grid grid-cols-2 gap-2 border-b border-line p-4 sm:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_170px_150px_150px_145px_145px]">
          <SearchInput className="col-span-2 sm:col-span-3 xl:col-span-1" label="Search invoices" value={query} onChange={setQuery} placeholder="Invoice, patient or phone" />
          <Select aria-label="Filter by stage" className="col-span-2 sm:col-span-1" value={stage} onChange={(event) => setParam('stage', event.target.value === 'All' ? null : event.target.value)}>
            <option value="All">All stages</option>
            <option>At lab</option>
            <option>Ready to collect</option>
            <option>Completed</option>
          </Select>
          <Select aria-label="Filter by status" value={status} onChange={(event) => setParam('status', event.target.value === 'All' ? null : event.target.value)}>
            <option value="All">All statuses</option>
            <option>Paid</option>
            <option>Partially Paid</option>
            <option>Pending</option>
          </Select>
          <Select aria-label="Filter by payment method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod | 'All')}>
            <option value="All">All methods</option>
            {PAYMENT_METHODS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
          <Input type="date" className="min-w-0 px-2! text-sm!" aria-label="From date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" className="min-w-0 px-2! text-sm!" aria-label="To date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </div>

        {loading ? (
          <div className="px-4">
            <RowsSkeleton rows={10} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No invoices match" body="Widen the date range or clear the filters." action={filtering ? <Button onClick={reset}>Clear filters</Button> : undefined} />
        ) : (
          <>
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Invoice</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Patient</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">Tests</th>
                  <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">Method</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((invoice) => {
                  const patient = names.get(invoice.patientId)
                  return (
                    <tr key={invoice.id} className="lift-row cursor-pointer" onClick={() => view(invoice)}>
                      <td className="px-4" style={{ paddingBlock: 'var(--row-y)' }}>
                        <button type="button" onClick={() => view(invoice)} className="font-mono text-[13px] font-medium text-accent-text hover:underline">
                          {invoice.number}
                        </button>
                        <span className="block text-xs text-ink-3">
                          {fmtDate(invoice.date)}, {fmtTime(invoice.date)}
                        </span>
                      </td>
                      <td className="px-3">
                        <span className="font-semibold text-ink">{patient?.name}</span>
                        <span className="block font-mono text-xs text-ink-3">{patient?.phone}</span>
                      </td>
                      <td className="hidden max-w-56 px-3 xl:table-cell">
                        <span className="line-clamp-1 text-[13px] text-ink-2">{invoice.items.map((item) => item.name).join(', ')}</span>
                      </td>
                      <td className="hidden px-3 text-[13px] text-ink-2 lg:table-cell">{invoice.method}</td>
                      <td className="px-3">
                        <InvoiceStatusPill status={invoice.status} />
                        <StageLabel stage={orderStage(invoice)} />
                      </td>
                      <td className="tnum px-3 text-right font-mono text-[13px] font-medium text-ink">{money(invoice.total)}</td>
                      <td className={`tnum px-4 text-right font-mono text-[13px] ${invoice.balance > 0 ? 'font-medium text-danger' : 'text-ink-3'}`}>{money(invoice.balance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((invoice) => {
                const patient = names.get(invoice.patientId)
                return (
                  <li key={invoice.id}>
                    <button type="button" onClick={() => view(invoice)} className="lift-row w-full px-4 py-3 text-left">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-semibold text-ink">{patient?.name}</span>
                        <span className="font-mono text-sm font-medium text-ink">{money(invoice.total)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-xs text-ink-3">{invoice.number}</span>
                        <InvoiceStatusPill status={invoice.status} />
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-ink-3">
                        {fmtDate(invoice.date)} · {invoice.method}
                        <StageLabel stage={orderStage(invoice)} />
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

      <InvoiceViewer invoice={open} onClose={() => setParam('open', null)} />
    </div>
  )
}
