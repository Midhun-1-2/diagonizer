export type Role = 'owner' | 'billing' | 'technical'

export interface Account {
  email: string
  password: string
  name: string
  role: Role
}

export type Gender = 'Male' | 'Female' | 'Other'

export interface Patient {
  id: string
  code: string
  name: string
  age: number
  gender: Gender
  phone: string
  email: string
  address: string
  registeredAt: string
}

/** A name from the Sample Type Master. */
export type SampleType = string

export interface MasterEntry {
  id: string
  name: string
}

/** Departments are listed in order number order wherever they appear. */
export interface DepartmentEntry extends MasterEntry {
  orderNo: number
}

export interface SampleTypeEntry extends MasterEntry {
  container: string
  cap: string
  liquid: string
}

export type AgeUnit = 'Years' | 'Months' | 'Days' | 'Hours'

export interface AgeGroupEntry extends MasterEntry {
  /** What ageFrom and ageTo are counted in. Groups saved before units existed are in years. */
  ageUnit?: AgeUnit
  ageFrom: number
  ageTo: number
  gender: 'Male' | 'Female' | 'Any'
}

export interface SubTest {
  name: string
  unit: string
  /** Normal range per age group, by age group id. */
  ranges?: Record<string, string>
}

export interface LabTest {
  id: string
  code: string
  name: string
  category: string
  sampleType: SampleType
  price: number
  tatHours: number
  description: string
  active: boolean
  subTests: SubTest[]
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer'
/** How a whole invoice was paid. Split means its payments used more than one method. */
export type InvoiceMethod = PaymentMethod | 'Split'
export type SplitAmounts = Partial<Record<PaymentMethod, number>>
export type InvoiceStatus = 'Paid' | 'Partially Paid' | 'Pending'
export type ReportStatus = 'Awaiting sample' | 'In analysis' | 'Ready'
export type DiscountType = 'percent' | 'amount'

export interface SubTestResult {
  name: string
  unit: string
  range: string
  /** Age group the range came from. Left out when that group has no range for this sub-test. */
  rangeSource?: string
  value: string
}

export interface InvoiceItem {
  testId: string
  code: string
  name: string
  category: string
  sampleType: SampleType
  qty: number
  price: number
  reportStatus: ReportStatus
  completedAt?: string
  /** Sub-test results and the normal range the technical staff set for this order. */
  results?: SubTestResult[]
}

export interface Payment {
  date: string
  amount: number
  method: PaymentMethod
}

export interface Invoice {
  id: string
  number: string
  patientId: string
  /** Patient group chosen on the bill. It decides the normal ranges the lab sees. */
  ageGroup?: AgeGroupEntry
  date: string
  items: InvoiceItem[]
  subtotal: number
  discountType: DiscountType
  discountValue: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  roundOff: number
  total: number
  paid: number
  balance: number
  method: InvoiceMethod
  payments: Payment[]
  status: InvoiceStatus
  createdBy: string
}

export interface LabSettings {
  labName: string
  tagline: string
  logo: string
  address: string
  phone: string
  email: string
  taxEnabled: boolean
  taxLabel: string
  taxRate: number
  invoicePrefix: string
  currency: string
  /** Lab's UPI ID, the payee on UPI QR codes. */
  upiId: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  at: string
  read: boolean
  to: string
  /** Who sees it. Everyone when left out. */
  roles?: Role[]
}

export interface LabState {
  patients: Patient[]
  tests: LabTest[]
  categories: DepartmentEntry[]
  sampleTypes: SampleTypeEntry[]
  units: MasterEntry[]
  ageGroups: AgeGroupEntry[]
  invoices: Invoice[]
  settings: LabSettings
  notifications: AppNotification[]
  sequence: { patient: number; invoice: number }
}
