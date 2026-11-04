import type { DiscountType, Invoice, InvoiceStatus, PaymentMethod, SplitAmounts } from '../types'

export interface TotalsInput {
  lines: { qty: number; price: number }[]
  discountType: DiscountType
  discountValue: number
  taxRate: number
  received: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function statusFor(total: number, paid: number): InvoiceStatus {
  if (total > 0 && paid >= total) return 'Paid'
  return paid > 0 ? 'Partially Paid' : 'Pending'
}

/** Discount applies before tax. Grand total rounds to the rupee, shown as round off. */
export function computeTotals({ lines, discountType, discountValue, taxRate, received }: TotalsInput) {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.qty * line.price, 0))
  const rawDiscount = discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue
  const discountAmount = round2(Math.min(Math.max(rawDiscount || 0, 0), subtotal))
  const taxable = subtotal - discountAmount
  const taxAmount = round2((taxable * taxRate) / 100)
  const exact = taxable + taxAmount
  const total = Math.round(exact)
  const roundOff = round2(total - exact)
  const given = Math.max(received || 0, 0)
  const paid = Math.min(given, total)
  return {
    subtotal,
    discountAmount,
    taxable,
    taxAmount,
    roundOff,
    total,
    paid,
    balance: round2(total - paid),
    change: round2(Math.max(given - total, 0)),
    status: statusFor(total, paid),
  }
}

export const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer']

export const splitTotal = (split: SplitAmounts) => PAYMENT_METHODS.reduce((sum, method) => sum + (split[method] ?? 0), 0)

/** A bill split between two modes: staff type the first amount and the second takes the rest. */
export interface TwoModeSplit {
  first: PaymentMethod | null
  second: PaymentMethod | null
  firstAmount: number
  /** null means "the rest of the bill", so it follows the total until staff type over it. */
  secondAmount: number | null
  /** UPI amount staff confirmed as received. Any other amount needs confirming again. */
  upiPaid: number | null
}

export const EMPTY_SPLIT: TwoModeSplit = { first: null, second: null, firstAmount: 0, secondAmount: null, upiPaid: null }

export function splitAmounts(split: TwoModeSplit, total: number): SplitAmounts {
  const amounts: SplitAmounts = {}
  if (split.first) amounts[split.first] = split.firstAmount
  if (split.second) amounts[split.second] = split.secondAmount ?? Math.max(0, total - split.firstAmount)
  return amounts
}

/** What an invoice counts toward one method: its whole total, or for a split bill what was paid that way. */
export function methodShare(invoice: Invoice, method: PaymentMethod) {
  if (invoice.method === 'Split') return invoice.payments.reduce((sum, payment) => (payment.method === method ? sum + payment.amount : sum), 0)
  return invoice.method === method ? invoice.total : 0
}

/** Payment lines for the invoice: the method, or one line per method on a split bill. */
export function paymentLines(invoice: Invoice, format: (amount: number) => string) {
  if (invoice.method !== 'Split') return [invoice.method]
  return PAYMENT_METHODS.filter((method) => methodShare(invoice, method) > 0).map((method) => `${method} ${format(methodShare(invoice, method))}`)
}

/** Indian financial year label, for example 26-27 from April 2026 to March 2027. */
export function financialYear(date = new Date()) {
  const start = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`
}

export function invoiceNumber(prefix: string, sequence: number, date = new Date()) {
  return `${prefix}/${financialYear(date)}/${String(sequence).padStart(5, '0')}`
}
