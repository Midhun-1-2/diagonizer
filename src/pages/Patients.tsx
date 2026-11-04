import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Pencil, ReceiptIndianRupee, UserPlus, UsersRound } from 'lucide-react'
import { addPatient, updatePatient, useLab, useSession, type PatientInput } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { useFirstLoad, useMoney, usePagination } from '../hooks'
import type { Gender, Invoice, Patient } from '../types'
import { ageAndGender, fmtDate } from '../utils/format'
import { buttonClass, Button } from '../components/ui/Button'
import { EmptyState, PageHero, Pagination, Panel, Tile } from '../components/ui/Common'
import { SearchInput, Segmented, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Readout } from '../components/ui/Readout'
import { RowsSkeleton } from '../components/ui/Skeleton'
import { InvoiceStatusPill, ReportStatusPill } from '../components/ui/StatusPill'
import { CapDot } from '../components/ui/Tube'
import { InvoiceViewer } from '../components/invoices/InvoiceViewer'
import { IdCard } from '../components/patients/IdCard'
import { PatientForm } from '../components/patients/PatientForm'

const PAGE_SIZE = 10

function Dossier({ patient, onEdit }: { patient: Patient; onEdit: () => void }) {
  const invoices = useLab((state) => state.invoices)
  const session = useSession()
  const money = useMoney()
  const [tab, setTab] = useState<'bills' | 'tests'>('bills')
  const [open, setOpen] = useState<Invoice | null>(null)

  const own = useMemo(() => invoices.filter((invoice) => invoice.patientId === patient.id), [invoices, patient.id])
  const billed = own.reduce((sum, invoice) => sum + invoice.total, 0)
  const due = own.reduce((sum, invoice) => sum + invoice.balance, 0)
  const tests = useMemo(() => own.flatMap((invoice) => invoice.items.map((item) => ({ ...item, date: invoice.date, invoiceId: invoice.id }))), [own])

  return (
    <article className="space-y-5">
      <Link to="/patients" className={`${buttonClass('stage', 'sm')} lg:hidden`}>
        <ArrowLeft size={15} aria-hidden /> All patients
      </Link>
      <div className="deal">
        <IdCard patient={patient} large>
          <div className="flex gap-2">
            {session?.role !== 'technical' && <button type="button" onClick={onEdit} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[13px] font-semibold transition-colors hover:bg-white/25">
              <Pencil size={14} aria-hidden /> Edit
            </button>}
            {session?.role !== 'technical' && (
              <Link to={`/billing?patient=${patient.id}`} className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-semibold text-[#0b2a20] transition-transform hover:-translate-y-0.5">
                <ReceiptIndianRupee size={15} aria-hidden /> New bill
              </Link>
            )}
          </div>
        </IdCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Visits', String(own.length)],
          ['Total billed', money(billed)],
          ['Outstanding', money(due)],
        ].map(([label, value], index) => (
          <Tile key={label} i={index + 1} className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink-2">{label}</p>
            <Readout text={value} className={`mt-1.5 block text-[clamp(1rem,2vw,1.625rem)] leading-none font-medium ${label === 'Outstanding' && due > 0 ? 'text-danger' : 'text-ink'}`} />
          </Tile>
        ))}
      </div>

      <Panel i={4}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 xl:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-xs text-ink-3">Email</dt>
            <dd className="truncate text-[13px] font-medium text-ink">{patient.email || 'Not given'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Registered</dt>
            <dd className="text-[13px] font-medium text-ink">{fmtDate(patient.registeredAt)}</dd>
          </div>
          <div className="col-span-2 xl:col-span-1">
            <dt className="text-xs text-ink-3">Address</dt>
            <dd className="text-[13px] font-medium text-ink">{patient.address}</dd>
          </div>
        </dl>
      </Panel>

      <Panel i={5}>
        <Segmented
          className="mb-3 flex w-full sm:inline-flex sm:w-auto"
          label="History"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'bills', label: `Bills (${own.length})` },
            { value: 'tests', label: `Tests (${tests.length})` },
          ]}
        />
        {tab === 'bills' ? (
          own.length === 0 ? (
            <EmptyState icon={FileText} title="No bills yet" body="This patient has not been billed. New bills will appear here." />
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {own.map((invoice) => (
                <li key={invoice.id}>
                  <button type="button" onClick={() => setOpen(invoice)} className="lift-row flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-2 py-2.5 text-left">
                    <span className="min-w-40 flex-1">
                      <span className="block font-mono text-[13px] font-medium text-accent-text">{invoice.number}</span>
                      <span className="block text-xs text-ink-3">
                        {fmtDate(invoice.date)} · {invoice.items.length} test{invoice.items.length > 1 ? 's' : ''} · {invoice.method}
                      </span>
                    </span>
                    <InvoiceStatusPill status={invoice.status} />
                    <span className="w-20 text-right font-mono text-[13px] font-medium text-ink">{money(invoice.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : tests.length === 0 ? (
          <EmptyState icon={FileText} title="No tests yet" body="Tests from this patient's bills will appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {tests.map((item) => (
              <li key={`${item.invoiceId}-${item.testId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <CapDot type={item.sampleType} />
                <span className="min-w-40 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{item.name}</span>
                  <span className="block text-xs text-ink-3">
                    {fmtDate(item.date)} · {item.category} · {item.sampleType}
                  </span>
                </span>
                <ReportStatusPill status={item.reportStatus} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <InvoiceViewer invoice={open} onClose={() => setOpen(null)} />
    </article>
  )
}

export default function Patients() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const patients = useLab((state) => state.patients)
  const invoices = useLab((state) => state.invoices)
  const session = useSession()
  const toast = useToast()
  const money = useMoney()
  const loading = useFirstLoad('patients')

  const [query, setQuery] = useState('')
  const [gender, setGender] = useState<Gender | 'All'>('All')
  const [duesOnly, setDuesOnly] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const [creating, setCreating] = useState(() => Boolean(params.get('new')))

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true })
  }, [params, setParams])

  const dues = useMemo(() => {
    const map = new Map<string, number>()
    invoices.forEach((invoice) => {
      if (invoice.balance > 0) map.set(invoice.patientId, (map.get(invoice.patientId) ?? 0) + invoice.balance)
    })
    return map
  }, [invoices])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return patients.filter((p) => {
      if (gender !== 'All' && p.gender !== gender) return false
      if (duesOnly && !dues.has(p.id)) return false
      if (!term) return true
      return p.name.toLowerCase().includes(term) || p.phone.includes(term) || p.code.toLowerCase().includes(term)
    })
  }, [patients, query, gender, duesOnly, dues])

  const { page, pages, rows, setPage } = usePagination(filtered, PAGE_SIZE, `${query}|${gender}|${duesOnly}`)
  const selected = id ? patients.find((p) => p.id === id) : undefined

  const create = (values: PatientInput) => {
    const patient = addPatient(values)
    setCreating(false)
    toast({ tone: 'success', title: 'Patient registered', body: `${patient.name} is ${patient.code}` })
    navigate(`/patients/${patient.id}`)
  }

  const save = (values: PatientInput) => {
    if (!editing) return
    updatePatient(editing.id, values)
    setEditing(null)
    toast({ tone: 'success', title: 'Patient details updated' })
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero
        title="Patients"
        subtitle={`${patients.length} people on file, ${dues.size} with a balance due.`}
        actions={
          session?.role === 'technical' ? undefined : (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <UserPlus size={17} aria-hidden /> Register patient
            </Button>
          )
        }
      />

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className={`deal min-w-0 lg:sticky lg:top-[68px] ${id ? 'max-lg:hidden' : ''}`}>
          <section aria-label="Patient register" className="slab overflow-hidden">
            <div className="space-y-2.5 border-b border-line p-4">
              <h2 className="sr-only">
                Patient register, {filtered.length} shown
              </h2>
              <SearchInput label="Search patients" value={query} onChange={setQuery} placeholder="Name, phone or patient ID" />
              <div className="flex gap-2">
                <Select aria-label="Filter by gender" className="min-w-0 flex-1" value={gender} onChange={(event) => setGender(event.target.value as Gender | 'All')}>
                  <option value="All">All genders</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </Select>
                <label className="well flex h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap text-ink-2">
                  <input type="checkbox" checked={duesOnly} onChange={(event) => setDuesOnly(event.target.checked)} className="size-4 accent-(--accent)" />
                  With dues
                </label>
              </div>
            </div>
            <div className="p-2">
              {loading ? (
                <div className="px-2">
                  <RowsSkeleton rows={8} />
                </div>
              ) : rows.length === 0 ? (
                <EmptyState icon={UsersRound} title="No patients found" body="Try a different name or number, or register them as a new patient." action={session?.role === 'technical' ? undefined : <Button onClick={() => setCreating(true)}>Register patient</Button>} />
              ) : (
                <ul className="space-y-0.5">
                  {rows.map((patient) => {
                    const due = dues.get(patient.id)
                    const active = patient.id === id
                    return (
                      <li key={patient.id}>
                        <Link
                          to={`/patients/${patient.id}`}
                          aria-current={active ? 'true' : undefined}
                          className={`flex items-center gap-3 rounded-xl px-2.5 transition-colors duration-150 ${active ? 'bg-accent text-accent-ink' : 'lift-row text-ink'}`}
                          style={{ paddingBlock: 'var(--row-y)' }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{patient.name}</span>
                            <span className={`block truncate text-xs ${active ? 'opacity-85' : 'text-ink-3'}`}>
                              <span className="font-mono">{patient.phone}</span> · {ageAndGender(patient)}
                            </span>
                          </span>
                          {due ? <span className={`shrink-0 font-mono text-xs font-medium ${active ? '' : 'text-danger'}`}>{money(due)} due</span> : null}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {!loading && (
              <div className="border-t border-line px-4">
                <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />
              </div>
            )}
          </section>
        </div>

        <div className={`min-w-0 ${id ? '' : 'max-lg:hidden'}`}>
          {selected ? (
            <Dossier key={selected.id} patient={selected} onEdit={() => setEditing(selected)} />
          ) : (
            <Panel i={2}>
              <EmptyState icon={UsersRound} title={id ? 'Patient not found' : 'Select a patient'} body="Choose someone from the register to see their details, billing history and previous tests." />
            </Panel>
          )}
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Register patient"
        subtitle="A patient ID is generated when you save."
        footer={
          <>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" form="patient-new" variant="primary">
              Register patient
            </Button>
          </>
        }
      >
        <PatientForm formId="patient-new" onSubmit={create} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit patient"
        subtitle={editing?.code}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="patient-edit" variant="primary">
              Save changes
            </Button>
          </>
        }
      >
        {editing && <PatientForm formId="patient-edit" defaults={editing} onSubmit={save} />}
      </Modal>
    </div>
  )
}
