import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ScrollText } from 'lucide-react'
import { buildInvoice, createInvoice, peekInvoiceNumber, updatePatient, useLab, useSession, type InvoiceDraft } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { useMoney } from '../hooks'
import type { Invoice, LabTest, Patient } from '../types'
import { computeTotals, EMPTY_SPLIT, invoiceNumber, splitAmounts, splitTotal } from '../utils/billing'
import { isValidAge, matchAgeGroups } from '../utils/results'
import { buttonClass, Button } from '../components/ui/Button'
import { PageHero } from '../components/ui/Common'
import { Readout } from '../components/ui/Readout'
import { InvoiceSheet, type SheetValues } from '../components/billing/InvoiceSheet'
import { PatientGroupFields } from '../components/billing/PatientGroupFields'
import { PatientLookup } from '../components/billing/PatientLookup'
import { TestPicker } from '../components/billing/TestPicker'
import { InvoiceViewer } from '../components/invoices/InvoiceViewer'

type Step = 'patient' | 'tests' | 'payment'
const STEPS: { id: Step; label: string }[] = [
  { id: 'patient', label: 'Patient' },
  { id: 'tests', label: 'Tests' },
  { id: 'payment', label: 'Payment' },
]

// Payment is optional at this point: the balance is collected when results come back.
const FRESH_SHEET: SheetValues = { discountType: 'percent', discountValue: 0, method: 'Cash', received: 0, split: EMPTY_SPLIT }

export default function Billing() {
  const [params] = useSearchParams()
  const patients = useLab((state) => state.patients)
  const settings = useLab((state) => state.settings)
  const ageGroups = useLab((state) => state.ageGroups)
  const lastInvoice = useLab((state) => state.sequence.invoice)
  const session = useSession()
  const toast = useToast()
  const money = useMoney()

  const [patient, setPatient] = useState<Patient | null>(() => patients.find((p) => p.id === params.get('patient')) ?? null)
  const [age, setAge] = useState(() => (patient ? String(patient.age) : ''))
  const [groupId, setGroupId] = useState(() => (patient ? (matchAgeGroups(patient, ageGroups)[0]?.id ?? '') : ''))
  const [groupError, setGroupError] = useState(false)
  const [lines, setLines] = useState<LabTest[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [sheet, setSheet] = useState<SheetValues>(FRESH_SHEET)
  const [step, setStep] = useState<Step>('patient')
  const [saved, setSaved] = useState<Invoice | null>(null)
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [patientError, setPatientError] = useState(false)
  const phoneRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedIds = useMemo(() => new Set(lines.map((line) => line.id)), [lines])
  const taxRate = settings.taxEnabled ? settings.taxRate : 0
  const priced = lines.map((line) => ({ qty: quantities[line.id] ?? 1, price: line.price }))
  const grand = computeTotals({ lines: priced, discountType: sheet.discountType, discountValue: sheet.discountValue, taxRate, received: 0 }).total
  const splitParts = splitAmounts(sheet.split, grand)

  const toggle = (test: LabTest) => {
    setLines((current) => (current.some((line) => line.id === test.id) ? current.filter((line) => line.id !== test.id) : [test, ...current]))
  }

  const selectPatient = (next: Patient | null) => {
    setPatient(next)
    setPatientError(false)
    setGroupError(false)
    setAge(next ? String(next.age) : '')
    setGroupId(next ? (matchAgeGroups(next, ageGroups)[0]?.id ?? '') : '')
    // Phones stay on this step so staff see the age and patient group before moving on.
    setStep('patient')
    // On desktop the test search is the next thing staff type into.
    if (next && window.matchMedia('(min-width: 1024px)').matches) window.setTimeout(() => searchRef.current?.focus(), 60)
  }

  const changeAge = (value: string) => {
    setAge(value)
    if (patient && isValidAge(value)) setGroupId(matchAgeGroups({ age: Number(value), gender: patient.gender }, ageGroups)[0]?.id ?? '')
  }

  const ageGroup = ageGroups.find((group) => group.id === groupId)

  const draft = (): InvoiceDraft | null => {
    if (!patient || !ageGroup || !isValidAge(age)) return null
    return {
      patientId: patient.id,
      ageGroup,
      lines,
      quantities,
      discountType: sheet.discountType,
      discountValue: sheet.discountValue,
      taxRate,
      received: sheet.method === 'Split' ? splitTotal(splitParts) : (sheet.received ?? grand),
      method: sheet.method,
      split: splitParts,
      createdBy: session?.name ?? 'Staff',
    }
  }

  const flagGroup = () => {
    setGroupError(true)
    setStep('patient')
    toast({ tone: 'error', title: 'Age and patient group are required', body: 'Fill both before continuing.' })
  }

  // The age given on the bill becomes the patient's current age.
  const keepAge = () => {
    if (patient && Number(age) !== patient.age) updatePatient(patient.id, { ...patient, age: Number(age) })
  }

  const save = () => {
    if (!patient) {
      setPatientError(true)
      setStep('patient')
      phoneRef.current?.focus()
      toast({ tone: 'error', title: 'No patient on this bill', body: 'Enter their phone number first.' })
      return
    }
    const current = draft()
    if (!current) {
      flagGroup()
      return
    }
    if (lines.length === 0) {
      setStep('tests')
      searchRef.current?.focus()
      toast({ tone: 'error', title: 'No tests on this bill', body: 'Add at least one investigation.' })
      return
    }
    if (sheet.method === 'Split' && (splitParts.UPI ?? 0) > 0 && sheet.split.upiPaid !== splitParts.UPI) {
      setStep('payment')
      toast({ tone: 'error', title: 'UPI payment not confirmed', body: 'Tap Payment received once the customer has paid.' })
      return
    }
    keepAge()
    setSaved(createInvoice(current))
    setPatient(null)
    setAge('')
    setGroupId('')
    setGroupError(false)
    setLines([])
    setQuantities({})
    setSheet(FRESH_SHEET)
    setStep('patient')
  }

  const showPreview = () => {
    if (!patient) {
      setPatientError(true)
      setStep('patient')
      toast({ tone: 'info', title: 'Find the patient to preview the invoice' })
      return
    }
    const current = draft()
    if (!current) {
      flagGroup()
      return
    }
    keepAge()
    setPreview(buildInvoice(current, peekInvoiceNumber(), 'draft'))
  }

  // Keeps the keyboard shortcut pointed at the latest save without re-subscribing every render.
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const stepIndex = STEPS.findIndex((item) => item.id === step)
  const hide = (panel: Step) => (step === panel ? '' : 'max-lg:hidden')

  return (
    <div className={`mx-auto max-w-[1500px] px-3 md:px-6 ${step === 'payment' ? '' : 'max-lg:pb-20'}`}>
      <PageHero
        title="New bill"
        actions={
          <Link to="/invoices" className={buttonClass('stage', 'sm')}>
            <ScrollText size={15} aria-hidden /> Previous invoices
          </Link>
        }
      />

      {/* Phones and portrait tablets work through one panel at a time; desktop keeps everything on one screen. */}
      <ol className="slab-stage mb-4 grid grid-cols-3 gap-1 rounded-2xl p-1 lg:hidden">
        {STEPS.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setStep(item.id)}
              aria-current={item.id === step ? 'step' : undefined}
              className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition-colors ${item.id === step ? 'text-[#04211a]' : index < stepIndex ? 'text-on-stage' : 'text-on-stage-2'}`}
              style={item.id === step ? { background: 'var(--stage-glow)' } : undefined}
            >
              <span className="font-mono text-xs">{index + 1}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_372px] xl:grid-cols-[minmax(0,1fr)_408px]">
        <div className={`deal min-w-0 space-y-5 ${step === 'payment' ? 'max-lg:hidden' : ''}`}>
          <section aria-label="Patient" className={hide('patient')}>
            <PatientLookup patient={patient} onSelect={selectPatient} inputRef={phoneRef} error={patientError} />
            {patient && <PatientGroupFields patient={patient} age={age} groupId={groupId} showErrors={groupError} onAge={changeAge} onGroup={setGroupId} />}
          </section>
          <section aria-label="Tests" className={hide('tests')}>
            <TestPicker selectedIds={selectedIds} onToggle={toggle} searchRef={searchRef} group={ageGroup} />
          </section>
        </div>
        <div className={`deal min-w-0 max-lg:mx-auto max-lg:w-full max-lg:max-w-xl lg:sticky lg:top-[68px] lg:max-h-[calc(100dvh-80px)] lg:overflow-y-auto lg:pb-2 [scrollbar-width:none] ${hide('payment')}`} style={{ '--i': 2 } as React.CSSProperties}>
          <InvoiceSheet
            number={invoiceNumber(settings.invoicePrefix, lastInvoice + 1)}
            lines={lines}
            quantities={quantities}
            values={sheet}
            onChange={(patch) => setSheet((current) => ({ ...current, ...patch }))}
            onQuantity={(id, qty) => setQuantities((current) => ({ ...current, [id]: qty }))}
            onRemove={toggle}
            onPreview={showPreview}
            onSave={save}
          />
        </div>
      </div>

      {/* Running total and next step, floating above the thumb bar. */}
      {step !== 'payment' && (
        <div className="slab-stage fixed inset-x-3 bottom-[84px] z-30 flex items-center justify-between gap-3 rounded-2xl px-4 py-2 md:right-5 md:bottom-4 md:left-[100px] lg:hidden">
          <div>
            <p className="text-xs text-on-stage-2">
              {lines.length} test{lines.length === 1 ? '' : 's'}
            </p>
            <Readout text={money(grand)} className="text-lg leading-none font-medium text-on-stage" />
          </div>
          <Button variant="primary" onClick={() => setStep(step === 'patient' ? 'tests' : 'payment')}>
            {step === 'patient' ? 'Tests' : 'Payment'} <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      )}

      <InvoiceViewer invoice={preview} draft onClose={() => setPreview(null)} />
      <InvoiceViewer
        invoice={saved}
        justSaved
        onClose={() => setSaved(null)}
        footerExtra={
          <Button
            variant="primary"
            onClick={() => {
              setSaved(null)
              window.setTimeout(() => phoneRef.current?.focus(), 60)
            }}
          >
            New bill
          </Button>
        }
      />
    </div>
  )
}
