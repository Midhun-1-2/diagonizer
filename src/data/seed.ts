import type { Account, AppNotification, Gender, Invoice, InvoiceItem, LabSettings, LabState, MasterEntry, Patient, PaymentMethod } from '../types'
import { computeTotals, invoiceNumber } from '../utils/billing'
import { daysAgo } from '../utils/format'
import { matchAgeGroups, sampleResult, toResult } from '../utils/results'
import { CATEGORIES, DEFAULT_AGE_GROUPS, DEFAULT_SAMPLE_TYPES, TEST_CATALOGUE } from './tests'

/** Prototype sign-ins, shown on the login screen. They are not real credentials. */
export const DEMO_ACCOUNTS: Account[] = [
  { email: 'owner@nilavu.test', password: 'demo-owner', name: 'Dr. Asha Menon', role: 'owner' },
  { email: 'billing@nilavu.test', password: 'demo-billing', name: 'Rahul Varghese', role: 'billing' },
  { email: 'tech@nilavu.test', password: 'demo-tech', name: 'Fathima Nasar', role: 'technical' },
]

export const DEFAULT_SETTINGS: LabSettings = {
  labName: 'Nilavu Diagnostic Laboratory',
  tagline: 'Pathology · Biochemistry · Microbiology',
  logo: '',
  address: '2nd Floor, Karthika Arcade, MG Road, Thrissur, Kerala 680001',
  phone: '+91 487 200 0000',
  email: 'care@nilavu.test',
  taxEnabled: true,
  taxLabel: 'GST',
  taxRate: 5,
  invoicePrefix: 'NDL',
  currency: 'INR',
  // Deliberately not a real UPI handle, so a scanned sample QR cannot pay anyone.
  upiId: 'nilavu-lab@example',
}

const FIRST: [string, Gender][] = [
  ['Anil', 'Male'], ['Bindu', 'Female'], ['Deepa', 'Female'], ['Faisal', 'Male'], ['Gopika', 'Female'], ['Hari', 'Male'],
  ['Jincy', 'Female'], ['Kiran', 'Male'], ['Lakshmi', 'Female'], ['Manoj', 'Male'], ['Nisha', 'Female'], ['Omana', 'Female'],
  ['Prakash', 'Male'], ['Reshma', 'Female'], ['Sajeev', 'Male'], ['Thomas', 'Male'], ['Usha', 'Female'], ['Vinod', 'Male'],
  ['Arjun', 'Male'], ['Sneha', 'Female'], ['Joseph', 'Male'], ['Meera', 'Female'], ['Shafeeq', 'Male'], ['Divya', 'Female'],
  ['Rajesh', 'Male'], ['Ancy', 'Female'], ['Sunil', 'Male'], ['Parvathy', 'Female'],
]
const LAST = ['Nair', 'Menon', 'Thomas', 'Pillai', 'Kurian', 'Rahman', 'Varma', 'George', 'Warrier', 'Iyer', 'Mathew', 'Das']
const PLACES = ['Poothole', 'Ayyanthole', 'Kuriachira', 'Ollur', 'Mannuthy', 'Punkunnam', 'Viyyur', 'Chiyyaram', 'Koorkenchery', 'Nadathara']

const toEntries = (names: readonly string[], prefix: string): MasterEntry[] => names.map((name, index) => ({ id: `${prefix}${index + 1}`, name }))

/** Starting master lists, drawn from the sample catalogue. */
export function createMasters() {
  const units = [...new Set(TEST_CATALOGUE.flatMap((test) => test.subTests.map((subTest) => subTest.unit)).filter(Boolean))]
  return {
    categories: toEntries(CATEGORIES, 'cat').map((entry, index) => ({ ...entry, orderNo: index + 1 })),
    sampleTypes: DEFAULT_SAMPLE_TYPES,
    units: toEntries(units, 'unit'),
    referrers: [] as MasterEntry[],
    ageGroups: DEFAULT_AGE_GROUPS,
  }
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const COMMON = ['HEM001', 'BIO001', 'BIO005', 'HOR001', 'BIO004', 'CLP001', 'BIO006', 'BIO007', 'HEM002', 'IMM001']

export function createSeed(): LabState {
  const random = rng(20261104)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]
  const now = new Date()
  const settings = DEFAULT_SETTINGS

  const patients: Patient[] = []
  const totalPatients = 68
  for (let i = 0; i < totalPatients; i++) {
    const [first, gender] = pick(FIRST)
    const last = pick(LAST)
    const name = `${first} ${last}`
    const offset = i < 5 ? 0 : Math.floor((1 - i / totalPatients) * 118) + 1
    const registered = daysAgo(offset, now)
    registered.setHours(8 + Math.floor(random() * 9), Math.floor(random() * 60))
    if (registered > now) registered.setTime(now.getTime() - 60000 * (i + 1) * 7)
    patients.push({
      id: `p${i + 1}`,
      code: `PT-${registered.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      name,
      age: 6 + Math.floor(random() * 72),
      gender,
      phone: `9${Math.floor(100000000 + random() * 899999999)}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      address: `${10 + Math.floor(random() * 300)}, ${pick(PLACES)}, Thrissur`,
      registeredAt: registered.toISOString(),
    })
  }
  // A family sharing one phone number, so staff get the picker on lookup.
  patients[1].phone = patients[0].phone
  patients[2].phone = patients[0].phone
  patients.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  const activeTests = TEST_CATALOGUE
  const invoices: Invoice[] = []
  let sequence = 1000

  const addInvoice = (patient: Patient, at: Date, day: number) => {
    const ageGroup = matchAgeGroups(patient, DEFAULT_AGE_GROUPS)[0]
    const seen = new Set<string>()
    const lines = 1 + Math.floor(random() * 3.4)
    const items: InvoiceItem[] = []
    for (let l = 0; l < lines; l++) {
      const commonId = pick(COMMON)
      const test = random() < 0.68 ? activeTests.find((t) => t.id === commonId)! : pick(activeTests)
      if (seen.has(test.id)) continue
      seen.add(test.id)
      const ageHours = (now.getTime() - at.getTime()) / 3600000
      const done = ageHours > test.tatHours && random() < (day <= 2 ? 0.72 : 1)
      items.push({
        testId: test.id,
        code: test.code,
        name: test.name,
        category: test.category,
        sampleType: test.sampleType,
        qty: 1,
        price: test.price,
        reportStatus: done ? 'Ready' : random() > 0.3 ? 'In analysis' : 'Awaiting sample',
        completedAt: done ? new Date(at.getTime() + test.tatHours * 3600000).toISOString() : undefined,
        results: test.subTests.map((subTest) => {
          const row = toResult(subTest, ageGroup)
          return done ? { ...row, value: sampleResult(row.range, random) } : row
        }),
      })
    }
    const discountValue = random() < 0.16 ? pick([5, 10, 15]) : 0
    const method: PaymentMethod = pick(['Cash', 'Cash', 'UPI', 'UPI', 'UPI', 'Card', 'Bank Transfer'])
    const preview = computeTotals({ lines: items, discountType: 'percent', discountValue, taxRate: settings.taxRate, received: 0 })
    const roll = random()
    const outstandingChance = day < 12 ? 0.2 : 0.012
    const received = roll < outstandingChance / 2 ? 0 : roll < outstandingChance ? Math.round(preview.total * 0.5) : preview.total
    const totals = computeTotals({ lines: items, discountType: 'percent', discountValue, taxRate: settings.taxRate, received })
    sequence += 1
    invoices.push({
      id: `inv${sequence}`,
      number: invoiceNumber(settings.invoicePrefix, sequence, at),
      patientId: patient.id,
      ageGroup,
      date: at.toISOString(),
      items,
      subtotal: totals.subtotal,
      discountType: 'percent',
      discountValue,
      discountAmount: totals.discountAmount,
      taxRate: settings.taxRate,
      taxAmount: totals.taxAmount,
      roundOff: totals.roundOff,
      total: totals.total,
      paid: totals.paid,
      balance: totals.balance,
      method,
      payments: totals.paid > 0 ? [{ date: at.toISOString(), amount: totals.paid, method }] : [],
      status: totals.status,
      createdBy: DEMO_ACCOUNTS[1].name,
    })
  }

  for (let day = 119; day >= 0; day--) {
    const date = daysAgo(day, now)
    const weekend = date.getDay() === 0
    const volume = weekend ? 3 + Math.floor(random() * 3) : 7 + Math.floor(random() * 7)
    for (let n = 0; n < volume; n++) {
      const at = new Date(date)
      const lastHour = day === 0 ? Math.max(now.getHours() - 7, 1) : 11
      at.setHours(7 + Math.floor(random() * lastHour), Math.floor(random() * 60))
      if (at > now) at.setTime(now.getTime() - (n + 1) * 240000)
      const eligible = patients.filter((p) => new Date(p.registeredAt) <= at)
      addInvoice(eligible.length > 0 ? pick(eligible) : patients[patients.length - 1], at, day)
    }
  }
  // Everyone who registered was billed that same visit, so no profile starts empty.
  const billed = new Set(invoices.map((invoice) => invoice.patientId))
  patients
    .filter((p) => !billed.has(p.id))
    .forEach((p) => {
      const at = new Date(p.registeredAt)
      addInvoice(p, at, Math.floor((now.getTime() - at.getTime()) / 86400000))
    })
  invoices.sort((a, b) => b.date.localeCompare(a.date))

  const waiting = invoices.flatMap((inv) => inv.items.filter((i) => i.reportStatus !== 'Ready').map(() => inv)).length
  const notifications: AppNotification[] = [
    { id: 'n1', title: 'Reports waiting for release', body: `${waiting} tests are still in the queue.`, at: new Date(now.getTime() - 8 * 60000).toISOString(), read: false, to: '/results', roles: ['owner', 'technical'] },
    { id: 'n2', title: 'Outstanding balance', body: 'Some invoices from this week are not fully settled.', at: new Date(now.getTime() - 55 * 60000).toISOString(), read: false, to: '/collections', roles: ['owner', 'billing'] },
    { id: 'n3', title: 'Reagent check due', body: 'Biochemistry analyser QC is scheduled for today.', at: new Date(now.getTime() - 3.2 * 3600000).toISOString(), read: true, to: '/master/tests', roles: ['owner'] },
  ]

  return {
    patients,
    tests: activeTests,
    ...createMasters(),
    invoices,
    settings,
    notifications,
    sequence: { patient: totalPatients, invoice: sequence },
  }
}
