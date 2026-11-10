import { useSyncExternalStore } from 'react'
import type { Account, AgeGroupEntry, AgeUnit, AppNotification, DepartmentEntry, Invoice, InvoiceItem, InvoiceMethod, LabSettings, LabState, LabTest, MasterEntry, Patient, Payment, PaymentMethod, SampleTypeEntry, SplitAmounts, SubTestResult } from '../types'
import { computeTotals, invoiceNumber, PAYMENT_METHODS, statusFor, type TotalsInput } from '../utils/billing'
import { toResult } from '../utils/results'
import { createMasters, createSeed, DEFAULT_SETTINGS } from './seed'
import { moveDefaultRanges } from './tests'

const DATA_KEY = 'meniscus.data.v2'
const SESSION_KEY = 'meniscus.session.v1'

const inOrder = (departments: DepartmentEntry[]) => [...departments].sort((a, b) => a.orderNo - b.orderNo)

function load(): LabState {
  try {
    const saved = localStorage.getItem(DATA_KEY)
    // Older saved data has no master lists, so defaults fill the gap without losing anything else.
    if (saved) {
      const data = { ...createMasters(), ...(JSON.parse(saved) as LabState) }
      // Departments saved before order numbers existed take their current position as the number.
      data.categories = inOrder(data.categories.map((entry, index) => ({ ...entry, orderNo: entry.orderNo ?? index + 1 })))
      return { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings }, tests: moveDefaultRanges(data.tests, data.ageGroups) }
    }
  } catch {
    // Unavailable or damaged storage falls back to fresh sample data.
  }
  return createSeed()
}

let state = load()
const listeners = new Set<() => void>()
let persistTimer: number | undefined

function persist() {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(state))
    } catch {
      // The prototype keeps working in memory when storage is full or blocked.
    }
  }, 150)
}

function setState(update: (current: LabState) => Partial<LabState>) {
  state = { ...state, ...update(state) }
  persist()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Selectors must return stored references; derive lists with useMemo in the component. */
export function useLab<T>(selector: (state: LabState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export const getLab = () => state

function notify(notification: Omit<AppNotification, 'id' | 'at' | 'read'>) {
  const entry: AppNotification = { ...notification, id: `n${Date.now()}`, at: new Date().toISOString(), read: false }
  return [entry, ...state.notifications].slice(0, 30)
}

export type PatientInput = Omit<Patient, 'id' | 'code' | 'registeredAt'>

export function addPatient(input: PatientInput) {
  const sequence = state.sequence.patient + 1
  const now = new Date()
  const patient: Patient = {
    ...input,
    id: `p${sequence}`,
    code: `PT-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`,
    registeredAt: now.toISOString(),
  }
  setState((s) => ({
    patients: [patient, ...s.patients],
    sequence: { ...s.sequence, patient: sequence },
    notifications: notify({ title: 'Patient registered', body: `${patient.name} (${patient.code})`, to: `/patients/${patient.id}` }),
  }))
  return patient
}

export function updatePatient(id: string, input: PatientInput) {
  setState((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...input } : p)) }))
}

export type TestInput = Omit<LabTest, 'id'>

export function saveTest(id: string | null, input: TestInput) {
  setState((s) => ({
    tests: id
      ? s.tests.map((t) => (t.id === id ? { ...t, ...input } : t))
      : [{ ...input, id: `t${Date.now()}` }, ...s.tests],
  }))
}

/** Moves tests to another department. Saved invoices keep the department they were billed under. */
export function moveTests(ids: string[], department: string) {
  const moving = new Set(ids)
  setState((s) => ({ tests: s.tests.map((test) => (moving.has(test.id) ? { ...test, category: department } : test)) }))
}

export function deleteTest(id: string) {
  setState((s) => ({ tests: s.tests.filter((t) => t.id !== id) }))
}

export function toggleTest(id: string) {
  setState((s) => ({ tests: s.tests.map((t) => (t.id === id ? { ...t, active: !t.active } : t)) }))
}

export type MasterKind = 'categories' | 'sampleTypes' | 'units' | 'ageGroups'

export function masterUsage(kind: MasterKind, entry: MasterEntry, tests: LabTest[]) {
  if (kind === 'categories') return tests.filter((test) => test.category === entry.name).length
  if (kind === 'sampleTypes') return tests.filter((test) => test.sampleType === entry.name).length
  if (kind === 'ageGroups') return tests.filter((test) => test.subTests.some((subTest) => subTest.ranges?.[entry.id]?.trim())).length
  return tests.filter((test) => test.subTests.some((subTest) => subTest.unit === entry.name)).length
}

function renameInTest(kind: MasterKind, test: LabTest, from: string, to: string): LabTest {
  if (kind === 'categories') return test.category === from ? { ...test, category: to } : test
  if (kind === 'sampleTypes') return test.sampleType === from ? { ...test, sampleType: to } : test
  // Age group ranges are stored by id, so a new name needs no change in tests.
  if (kind === 'ageGroups') return test
  return { ...test, subTests: test.subTests.map((subTest) => (subTest.unit === from ? { ...subTest, unit: to } : subTest)) }
}

/** Renaming carries through to tests. Saved invoices keep the names they were billed with. */
export function saveMaster(kind: MasterKind, id: string | null, values: { name: string; container?: string; cap?: string; ageUnit?: AgeUnit; ageFrom?: number; ageTo?: number; gender?: string; orderNo?: number }) {
  const name = values.name.trim()
  setState((s) => {
    const list = s[kind] as (MasterEntry | SampleTypeEntry | AgeGroupEntry | DepartmentEntry)[]
    const previous = list.find((entry) => entry.id === id)
    const details =
      kind === 'sampleTypes'
        ? { container: values.container?.trim() ?? '', cap: values.cap ?? '#9aa5a0', liquid: (previous as SampleTypeEntry | undefined)?.liquid ?? '#8d1f2a' }
        : kind === 'ageGroups'
          ? { ageUnit: values.ageUnit ?? 'Years', ageFrom: values.ageFrom ?? 0, ageTo: values.ageTo ?? 120, gender: values.gender ?? 'Any' }
          : kind === 'categories'
            ? { orderNo: values.orderNo ?? list.length + 1 }
            : {}
    const saved = id ? list.map((entry) => (entry.id === id ? { ...entry, name, ...details } : entry)) : [...list, { id: `${kind}-${Date.now()}`, name, ...details }]
    const next = kind === 'categories' ? inOrder(saved as DepartmentEntry[]) : saved
    return {
      [kind]: next,
      tests: previous && previous.name !== name ? s.tests.map((test) => renameInTest(kind, test, previous.name, name)) : s.tests,
    }
  })
}

export function deleteMaster(kind: MasterKind, id: string) {
  setState((s) => ({ [kind]: (s[kind] as MasterEntry[]).filter((entry) => entry.id !== id) }))
}

export const peekInvoiceNumber = () => invoiceNumber(state.settings.invoicePrefix, state.sequence.invoice + 1)

export interface InvoiceDraft extends Omit<TotalsInput, 'lines'> {
  patientId: string
  ageGroup: AgeGroupEntry
  lines: LabTest[]
  quantities: Record<string, number>
  method: InvoiceMethod
  split?: SplitAmounts
  createdBy: string
}

function billPayments(draft: InvoiceDraft, paid: number, date: string): Payment[] {
  if (draft.method !== 'Split') return paid > 0 ? [{ date, amount: paid, method: draft.method }] : []
  // Cash comes last, so anything given over the total is what gets handed back.
  let left = paid
  return [...PAYMENT_METHODS].reverse().flatMap((method) => {
    const amount = Math.min(draft.split?.[method] ?? 0, left)
    left -= amount
    return amount > 0 ? [{ date, amount, method }] : []
  })
}

export function buildInvoice(draft: InvoiceDraft, number: string, id: string): Invoice {
  const items: InvoiceItem[] = draft.lines.map((test) => ({
    testId: test.id,
    code: test.code,
    name: test.name,
    category: test.category,
    sampleType: test.sampleType,
    qty: draft.quantities[test.id] ?? 1,
    price: test.price,
    reportStatus: 'Awaiting sample',
    results: test.subTests.map((subTest) => toResult(subTest, draft.ageGroup)),
  }))
  const totals = computeTotals({ ...draft, lines: items })
  const now = new Date().toISOString()
  const payments = billPayments(draft, totals.paid, now)
  return {
    id,
    number,
    patientId: draft.patientId,
    ageGroup: draft.ageGroup,
    date: now,
    items,
    subtotal: totals.subtotal,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    discountAmount: totals.discountAmount,
    taxRate: draft.taxRate,
    taxAmount: totals.taxAmount,
    roundOff: totals.roundOff,
    total: totals.total,
    paid: totals.paid,
    balance: totals.balance,
    // A split with one amount or none is not really a split.
    method: draft.method !== 'Split' ? draft.method : payments.length > 1 ? 'Split' : (payments[0]?.method ?? 'Cash'),
    payments,
    status: totals.status,
    createdBy: draft.createdBy,
  }
}

export function createInvoice(draft: InvoiceDraft) {
  const sequence = state.sequence.invoice + 1
  const invoice = buildInvoice(draft, invoiceNumber(state.settings.invoicePrefix, sequence), `inv${sequence}`)
  setState((s) => ({
    invoices: [invoice, ...s.invoices],
    sequence: { ...s.sequence, invoice: sequence },
    notifications: notify({ title: `New order ${invoice.number}`, body: `${invoice.items.length} test${invoice.items.length > 1 ? 's' : ''} waiting for results`, to: `/results?open=${invoice.id}`, roles: ['owner', 'technical'] }),
  }))
  return invoice
}

export function recordPayment(id: string, amount: number, method: PaymentMethod) {
  setState((s) => ({
    invoices: s.invoices.map((inv) => {
      if (inv.id !== id) return inv
      const applied = Math.min(amount, inv.balance)
      const paid = inv.paid + applied
      const payments = [...inv.payments, { date: new Date().toISOString(), amount: applied, method }]
      return {
        ...inv,
        paid,
        balance: Math.round((inv.total - paid) * 100) / 100,
        status: statusFor(inv.total, paid),
        method: new Set(payments.map((payment) => payment.method)).size > 1 ? 'Split' : method,
        payments,
      }
    }),
  }))
}

/**
 * Technical staff save ranges and results. A test is ready once every sub-test has a value,
 * and the order returns to billing when all its tests are ready.
 */
export function saveResults(invoiceId: string, entries: Record<string, SubTestResult[]>) {
  const invoice = state.invoices.find((inv) => inv.id === invoiceId)
  if (!invoice) return { complete: false, remaining: 0 }
  const wasComplete = invoice.items.every((item) => item.reportStatus === 'Ready')
  const now = new Date().toISOString()
  const items: InvoiceItem[] = invoice.items.map((item) => {
    const results = entries[item.testId] ?? item.results ?? []
    const filled = results.filter((row) => row.value.trim()).length
    const done = filled === results.length
    return { ...item, results, reportStatus: done ? 'Ready' : filled > 0 ? 'In analysis' : 'Awaiting sample', completedAt: done ? (item.completedAt ?? now) : undefined }
  })
  const remaining = items.filter((item) => item.reportStatus !== 'Ready').length
  const complete = remaining === 0
  const patient = state.patients.find((p) => p.id === invoice.patientId)
  setState((s) => ({
    invoices: s.invoices.map((inv) => (inv.id === invoiceId ? { ...inv, items } : inv)),
    notifications:
      complete && !wasComplete
        ? notify({ title: `Results ready for ${patient?.name ?? 'patient'}`, body: invoice.balance > 0 ? `Collect the balance on ${invoice.number}` : `${invoice.number} is ready to print`, to: `/invoices?open=${invoice.id}`, roles: ['owner', 'billing'] })
        : s.notifications,
  }))
  return { complete, remaining }
}

export function updateSettings(patch: Partial<LabSettings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch } }))
}

export function markNotificationsRead() {
  setState((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
}

export function markNotificationRead(id: string) {
  setState((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
}

export function resetData() {
  state = createSeed()
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(state))
  } catch {
    // Same in-memory fallback as persist().
  }
  listeners.forEach((listener) => listener())
}

/* Session lives apart from lab data, so resetting sample data keeps the user signed in. */
export type Session = Pick<Account, 'email' | 'name' | 'role'>

function loadSession(): Session | null {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    return saved ? (JSON.parse(saved) as Session) : null
  } catch {
    return null
  }
}

let session = loadSession()
const sessionListeners = new Set<() => void>()

export function useSession() {
  return useSyncExternalStore(
    (listener) => {
      sessionListeners.add(listener)
      return () => sessionListeners.delete(listener)
    },
    () => session,
  )
}

export function setSession(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Session stays in memory only.
  }
  sessionListeners.forEach((listener) => listener())
}
