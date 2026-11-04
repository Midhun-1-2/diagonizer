import { useMemo, useState, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { AlertTriangle, Phone, UserPlus, X } from 'lucide-react'
import { addPatient, useLab, type PatientInput } from '../../data/store'
import { useToast } from '../../contexts/ToastProvider'
import { useMoney } from '../../hooks'
import type { Patient } from '../../types'
import { ageAndGender, fmtDate } from '../../utils/format'
import { Button } from '../ui/Button'
import { controlClass } from '../ui/Field'
import { IdCard } from '../patients/IdCard'
import { PatientForm } from '../patients/PatientForm'

const slide = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.3, ease: [0.22, 0.8, 0.24, 1] as const },
}

function PatientRow({ patient, onPick }: { patient: Patient; onPick: (patient: Patient) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onPick(patient)} className="lift-row flex min-h-13 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left">
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{patient.name}</span>
          <span className="block truncate text-[13px] text-ink-2">{ageAndGender(patient)}</span>
        </span>
        <span className="shrink-0 text-right font-mono text-xs text-ink-3">
          <span className="block">{patient.phone}</span>
          <span className="block">{patient.code}</span>
        </span>
      </button>
    </li>
  )
}

interface PatientLookupProps {
  patient: Patient | null
  onSelect: (patient: Patient | null) => void
  inputRef?: Ref<HTMLInputElement>
  error?: boolean
}

/** Phone number first. Known number fetches the patient, unknown number opens registration in place. */
export function PatientLookup({ patient, onSelect, inputRef, error }: PatientLookupProps) {
  const patients = useLab((state) => state.patients)
  const invoices = useLab((state) => state.invoices)
  const money = useMoney()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [manualAdd, setManualAdd] = useState(false)

  const term = query.trim().toLowerCase()
  const isPhone = /^\d+$/.test(term)
  const exact = useMemo(() => (isPhone && term.length === 10 ? patients.filter((p) => p.phone === term) : []), [patients, isPhone, term])
  const suggestions = useMemo(() => {
    if (term.length < 3 || (isPhone && term.length === 10)) return []
    return patients.filter((p) => p.phone.includes(term) || p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)).slice(0, 5)
  }, [patients, term, isPhone])

  const unknownNumber = isPhone && term.length === 10 && exact.length === 0
  const showForm = !patient && (unknownNumber || manualAdd)

  const history = useMemo(() => {
    if (!patient) return null
    const own = invoices.filter((invoice) => invoice.patientId === patient.id)
    return { due: own.reduce((sum, invoice) => sum + invoice.balance, 0), last: own[0]?.date }
  }, [patient, invoices])

  const pick = (next: Patient) => {
    onSelect(next)
    setQuery('')
    setManualAdd(false)
  }

  const change = (value: string) => {
    setQuery(value)
    const digits = value.trim()
    if (/^\d{10}$/.test(digits)) {
      const found = patients.filter((p) => p.phone === digits)
      if (found.length === 1) pick(found[0])
    }
  }

  const register = (values: PatientInput) => {
    const created = addPatient(values)
    toast({ tone: 'success', title: 'Patient registered', body: `${created.name} is ${created.code}` })
    pick(created)
  }

  if (patient) {
    return (
      <m.div initial={{ opacity: 0, rotateX: -50, y: -18 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }} style={{ transformPerspective: 900, transformOrigin: '50% 0' }}>
        <IdCard patient={patient}>
          <button type="button" onClick={() => onSelect(null)} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[13px] font-semibold transition-colors hover:bg-white/25">
            <X size={14} aria-hidden /> Change
          </button>
        </IdCard>
        <p className="mt-2.5 px-1 text-[13px] text-on-stage-2">Last visit: {history?.last ? fmtDate(history.last) : 'First visit'}</p>
        {history && history.due > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 px-1 text-[13px] font-semibold text-on-stage">
            <AlertTriangle size={14} aria-hidden /> {money(history.due)} due from earlier invoices.
            <Link to={`/patients/${patient.id}`} className="underline underline-offset-2">
              View history
            </Link>
          </p>
        )}
      </m.div>
    )
  }

  return (
    <div className="slab p-4 md:p-5">
      <label htmlFor="bill-phone" className="mb-2 block font-display text-[15px] font-semibold text-ink">
        Who is this bill for?
      </label>
      <div className="flex gap-2">
        <span className="relative block min-w-0 flex-1">
          <Phone size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            id="bill-phone"
            ref={inputRef}
            value={query}
            onChange={(event) => change(event.target.value)}
            autoFocus
            aria-invalid={error || undefined}
            inputMode="tel"
            autoComplete="off"
            placeholder="Patient phone number"
            className={`${controlClass} h-14! rounded-2xl! pl-11 font-mono text-[18px]! placeholder:font-sans placeholder:text-[15px]`}
          />
        </span>
        <Button size="lg" onClick={() => setManualAdd((value) => !value)} aria-expanded={manualAdd} aria-label="New patient" className="h-14! max-sm:w-14 max-sm:px-0">
          <UserPlus size={17} aria-hidden /> <span className="max-sm:hidden">New patient</span>
        </Button>
      </div>
      <p className={`mt-2 text-[13px] ${error ? 'font-semibold text-danger' : 'text-ink-3'}`}>
        {error ? 'Find or register the patient before saving the bill.' : 'Enter 10 digits to fetch the patient. Names and patient IDs work too.'}
      </p>

      <AnimatePresence initial={false}>
        {exact.length > 1 && (
          <m.div key="family" {...slide} className="overflow-hidden">
            <p className="mt-3 mb-1 text-[13px] font-semibold text-ink">{exact.length} patients share this number. Who is visiting?</p>
            <ul className="-mx-1">
              {exact.map((p) => (
                <PatientRow key={p.id} patient={p} onPick={pick} />
              ))}
            </ul>
          </m.div>
        )}
        {suggestions.length > 0 && !manualAdd && (
          <m.div key="suggest" {...slide} className="overflow-hidden">
            <ul className="-mx-1 mt-2">
              {suggestions.map((p) => (
                <PatientRow key={p.id} patient={p} onPick={pick} />
              ))}
            </ul>
          </m.div>
        )}
        {showForm && (
          <m.div key="form" {...slide} className="overflow-hidden">
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-3 font-semibold text-ink">
                {unknownNumber ? (
                  <>
                    No patient on <span className="font-mono text-[13px]">{term}</span>. Add their details to continue.
                  </>
                ) : (
                  'Register a new patient'
                )}
              </p>
              <PatientForm
                key={term}
                formId="billing-patient"
                defaults={{ phone: unknownNumber ? term : '' }}
                phoneLocked={unknownNumber}
                onSubmit={register}
                footer={
                  <Button type="submit" variant="primary">
                    Save and continue to bill
                  </Button>
                }
              />
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
