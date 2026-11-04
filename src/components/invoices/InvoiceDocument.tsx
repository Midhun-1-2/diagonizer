import type { ReactNode } from 'react'
import type { Invoice, LabSettings, Patient } from '../../types'
import { paymentLines } from '../../utils/billing'
import { ageAndGender, fmtDateTime, money } from '../../utils/format'
import { rangeFlag } from '../../utils/results'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 py-0.5 ${strong ? 'text-[15px] font-bold' : ''}`}>
      <dt className={strong ? '' : 'text-[#5a635e]'}>{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}

interface InvoiceDocumentProps {
  invoice: Invoice
  patient: Patient
  settings: LabSettings
  stamp?: ReactNode
}

/** Printed paper stays black on white in every theme; only the rule colour follows the lab's accent. */
export function InvoiceDocument({ invoice, patient, settings, stamp }: InvoiceDocumentProps) {
  const format = (value: number) => money(value, settings.currency, 2)
  const discountLabel = invoice.discountType === 'percent' ? `Discount (${invoice.discountValue}%)` : 'Discount'
  return (
    <article className="relative bg-white p-5 text-[13px] leading-snug text-[#1b1f1d] sm:p-8 print:p-0" style={{ colorScheme: 'light' }}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: 'var(--paper-accent)' }}>
        <div className="flex min-w-0 items-start gap-3">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="size-14 object-contain" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center border border-dashed border-[#a9b0ac] text-[10px] font-semibold tracking-wider text-[#6e7672]">LOGO</span>
          )}
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold">{settings.labName}</p>
            <p className="text-xs text-[#5a635e]">{settings.tagline}</p>
            <p className="mt-1 max-w-80 text-xs text-[#5a635e]">{settings.address}</p>
            <p className="text-xs text-[#5a635e]">
              {settings.phone} · {settings.email}
            </p>
          </div>
        </div>
        <div className="max-sm:w-full sm:text-right print:text-right">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--paper-accent)' }}>
            {invoice.taxRate > 0 ? 'Tax invoice' : 'Invoice'}
          </p>
          <p className="mt-0.5 font-mono text-sm font-medium">{invoice.number}</p>
          <p className="text-xs text-[#5a635e]">{fmtDateTime(invoice.date)}</p>
        </div>
      </header>

      <section className="grid gap-4 py-4 xs:grid-cols-2 print:grid-cols-2">
        <div>
          <p className="mb-0.5 text-[11px] font-bold tracking-wider text-[#6e7672] uppercase">Billed to</p>
          <p className="text-sm font-bold">{patient.name}</p>
          <p>{ageAndGender(patient)}</p>
          <p className="text-[#5a635e]">{patient.address}</p>
        </div>
        <div className="xs:text-right print:text-right">
          <p className="mb-0.5 text-[11px] font-bold tracking-wider text-[#6e7672] uppercase">Patient</p>
          <p className="font-mono text-xs">{patient.code}</p>
          <p className="font-mono text-xs">{patient.phone}</p>
          {patient.email && <p className="break-all text-xs text-[#5a635e]">{patient.email}</p>}
        </div>
      </section>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-[#1b1f1d] text-[11px] font-bold tracking-wider uppercase">
            <th scope="col" className="py-1.5 pr-2">Test</th>
            <th scope="col" className="w-10 py-1.5 text-center">Qty</th>
            <th scope="col" className="hidden w-24 py-1.5 text-right sm:table-cell print:table-cell">Unit price</th>
            <th scope="col" className="w-22 py-1.5 text-right sm:w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.testId} className="border-b border-[#dfe3e0] align-top break-inside-avoid">
              <td className="py-1.5 pr-2">
                <span className="font-semibold">{item.name}</span>
                <span className="block font-mono text-[11px] text-[#6e7672]">
                  {item.code} · {item.sampleType}
                </span>
                <span className="block font-mono text-[11px] text-[#6e7672] sm:hidden print:hidden">{format(item.price)} each</span>
              </td>
              <td className="py-1.5 text-center font-mono">{item.qty}</td>
              <td className="hidden py-1.5 text-right font-mono sm:table-cell print:table-cell">{format(item.price)}</td>
              <td className="py-1.5 text-right font-mono">{format(item.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="relative mt-3 flex flex-wrap items-start justify-between gap-6 break-inside-avoid">
        {stamp}
        <dl className="text-[13px]">
          <dt className="text-[11px] font-bold tracking-wider text-[#6e7672] uppercase">Payment</dt>
          {paymentLines(invoice, format).map((line) => (
            <dd key={line} className="mt-0.5 font-semibold">
              {line}
            </dd>
          ))}
          <dd className="font-semibold">{invoice.status}</dd>
          <dd className="mt-1 text-xs text-[#5a635e]">Billed by {invoice.createdBy}</dd>
        </dl>
        <dl className="ml-auto w-full max-w-68">
          <Row label="Subtotal" value={format(invoice.subtotal)} />
          {invoice.discountAmount > 0 && <Row label={discountLabel} value={`- ${format(invoice.discountAmount)}`} />}
          {invoice.taxRate > 0 && <Row label={`${settings.taxLabel} (${invoice.taxRate}%)`} value={format(invoice.taxAmount)} />}
          {invoice.roundOff !== 0 && <Row label="Round off" value={format(invoice.roundOff)} />}
          <div className="my-1 border-t border-[#1b1f1d]" />
          <Row label="Total" value={format(invoice.total)} strong />
          <Row label="Amount paid" value={format(invoice.paid)} />
          <Row label="Balance due" value={format(invoice.balance)} strong={invoice.balance > 0} />
        </dl>
      </section>

      <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 break-inside-avoid">
        <p className="max-w-72 text-[11px] text-[#6e7672]">Please bring this invoice when collecting printed reports.</p>
        <div className="w-44 text-center">
          <div className="border-t border-[#1b1f1d] pt-1 text-xs font-semibold">Authorized signature</div>
        </div>
      </footer>

      {invoice.items.some((item) => item.results?.some((row) => row.value.trim())) && (
        <section className="mt-8 border-t-2 pt-4 print:break-before-page" style={{ borderColor: 'var(--paper-accent)' }}>
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--paper-accent)' }}>
            Laboratory report
          </p>
          {invoice.items.map((item) => (
            <div key={item.testId} className="mt-3 break-inside-avoid">
              <p className="font-semibold">{item.name}</p>
              <table className="mt-1 w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-[#1b1f1d] text-[10px] font-bold tracking-wider uppercase">
                    <th scope="col" className="py-1 pr-2">Sub-test</th>
                    <th scope="col" className="py-1 pr-2">Result</th>
                    <th scope="col" className="py-1 pr-2">Unit</th>
                    <th scope="col" className="py-1 text-right">Normal range</th>
                  </tr>
                </thead>
                <tbody>
                  {(item.results ?? []).map((row) => {
                    const flag = rangeFlag(row.value, row.range)
                    return (
                      <tr key={row.name} className="border-b border-[#dfe3e0]">
                        <td className="py-1 pr-2">{row.name}</td>
                        <td className={`py-1 pr-2 font-mono ${flag ? 'font-bold' : ''}`}>
                          {row.value || '–'} {flag}
                        </td>
                        <td className="py-1 pr-2 text-[#5a635e]">{row.unit || '–'}</td>
                        <td className="py-1 text-right font-mono text-[#5a635e]">{row.range}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}
    </article>
  )
}
