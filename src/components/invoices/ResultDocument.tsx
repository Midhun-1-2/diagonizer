import type { Invoice, LabSettings, Patient } from '../../types'
import { ageAndGender, fmtDateTime } from '../../utils/format'
import { rangeFlag, reportedAt } from '../../utils/results'
import { PaperHeader } from './PaperHeader'

/** The lab report handed to the patient. Like the invoice, it stays black on white in every theme. */
export function ResultDocument({ invoice, patient, settings }: { invoice: Invoice; patient: Patient; settings: LabSettings }) {
  const reported = reportedAt(invoice)
  const group = invoice.ageGroup
  return (
    <article className="relative bg-white p-5 text-[13px] leading-snug text-[#1b1f1d] sm:p-8 print:p-0" style={{ colorScheme: 'light' }}>
      <PaperHeader settings={settings} label="Laboratory report" number={invoice.number} date={fmtDateTime(invoice.date)} />

      <section className="grid gap-4 py-4 xs:grid-cols-2 print:grid-cols-2">
        <div>
          <p className="mb-0.5 text-[11px] font-bold tracking-wider text-[#6e7672] uppercase">Patient</p>
          <p className="text-sm font-bold">{patient.name}</p>
          <p>{ageAndGender(patient)}</p>
          <p className="font-mono text-xs">
            {patient.code} · {patient.phone}
          </p>
        </div>
        <div className="xs:text-right print:text-right">
          <p className="mb-0.5 text-[11px] font-bold tracking-wider text-[#6e7672] uppercase">Report</p>
          <p className="text-xs">Billed {fmtDateTime(invoice.date)}</p>
          {reported && <p className="text-xs">Reported {fmtDateTime(reported)}</p>}
          {group && (
            <p className="text-xs">
              Normal ranges for {group.name} ({group.ageFrom}–{group.ageTo} yrs)
            </p>
          )}
        </div>
      </section>

      {invoice.items.map((item) => (
        <div key={item.testId} className="mt-3 break-inside-avoid first:mt-0">
          <p className="font-semibold">{item.name}</p>
          <table className="mt-1 w-full table-fixed border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-[#1b1f1d] text-[10px] font-bold tracking-wider uppercase">
                <th scope="col" className="w-[38%] py-1 pr-2">Sub-test</th>
                <th scope="col" className="w-[20%] py-1 pr-2">Result</th>
                <th scope="col" className="w-[17%] py-1 pr-2">Unit</th>
                <th scope="col" className="w-[25%] py-1 text-right">Normal range</th>
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
                    <td className="py-1 text-right font-mono text-[#5a635e]">{row.range || '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 break-inside-avoid">
        <p className="max-w-72 text-[11px] text-[#6e7672]">H is above the normal range. L is below it.</p>
        <div className="w-44 text-center">
          <div className="border-t border-[#1b1f1d] pt-1 text-xs font-semibold">Authorized signature</div>
        </div>
      </footer>
    </article>
  )
}
