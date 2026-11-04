import type { Invoice, LabSettings, Patient } from '../types'
import { paymentLines } from './billing'
import { ageAndGender, fmtDateTime } from './format'
import { rangeFlag } from './results'

/** jsPDF is imported on demand so it never weighs on the initial load. */
export async function downloadInvoicePdf(invoice: Invoice, patient: Patient, settings: LabSettings) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--paper-accent').trim() || '#0f6b4f'
  // The built-in PDF fonts have no rupee glyph, so amounts print the ISO code: "INR 1,250.00".
  const number = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const format = (value: number) => `${settings.currency} ${number.format(value)}`

  const left = 44
  const right = 551
  let y = 52

  const ink = () => doc.setTextColor('#1b1f1d')
  const muted = () => doc.setTextColor('#5a635e')

  if (settings.logo) {
    try {
      doc.addImage(settings.logo, left, y - 12, 44, 44)
    } catch {
      // Logo format jsPDF cannot read: the invoice still prints without it.
    }
  } else {
    doc.setDrawColor('#a9b0ac')
    doc.setLineDashPattern([2, 2], 0)
    doc.rect(left, y - 12, 44, 44)
    doc.setLineDashPattern([], 0)
    muted()
    doc.setFontSize(7)
    doc.text('LOGO', left + 22, y + 12, { align: 'center' })
  }

  const textLeft = left + 54
  ink()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(settings.labName, textLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  muted()
  doc.text(settings.tagline.replaceAll('·', '-'), textLeft, y + 12)
  doc.text(doc.splitTextToSize(settings.address, 280), textLeft, y + 23)
  doc.text(`${settings.phone}  |  ${settings.email}`, textLeft, y + 45)

  doc.setTextColor(accent)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(invoice.taxRate > 0 ? 'TAX INVOICE' : 'INVOICE', right, y, { align: 'right' })
  ink()
  doc.setFont('courier', 'bold')
  doc.setFontSize(10)
  doc.text(invoice.number, right, y + 14, { align: 'right' })
  muted()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(fmtDateTime(invoice.date), right, y + 26, { align: 'right' })

  y += 58
  doc.setDrawColor(accent)
  doc.setLineWidth(1.5)
  doc.line(left, y, right, y)

  y += 20
  muted()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('BILLED TO', left, y)
  doc.text('PATIENT', right, y, { align: 'right' })
  y += 13
  ink()
  doc.setFontSize(11)
  doc.text(patient.name, left, y)
  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.text(patient.code, right, y, { align: 'right' })
  y += 13
  doc.setFont('helvetica', 'normal')
  doc.text(ageAndGender(patient), left, y)
  doc.setFont('courier', 'normal')
  doc.text(patient.phone, right, y, { align: 'right' })
  y += 12
  doc.setFont('helvetica', 'normal')
  muted()
  doc.setFontSize(8.5)
  doc.text(doc.splitTextToSize(patient.address, 300), left, y)
  if (patient.email) doc.text(patient.email, right, y, { align: 'right' })

  const qtyX = 350
  const priceX = 450
  const header = () => {
    ink()
    doc.setDrawColor('#1b1f1d')
    doc.setLineWidth(0.8)
    doc.line(left, y, right, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('TEST', left, y + 12)
    doc.text('QTY', qtyX, y + 12, { align: 'center' })
    doc.text('UNIT PRICE', priceX, y + 12, { align: 'right' })
    doc.text('AMOUNT', right, y + 12, { align: 'right' })
    doc.line(left, y + 18, right, y + 18)
    y += 32
  }

  y += 24
  header()
  for (const item of invoice.items) {
    if (y > 700) {
      doc.addPage()
      y = 52
      header()
    }
    ink()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(item.name, left, y)
    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    doc.text(String(item.qty), qtyX, y, { align: 'center' })
    doc.text(number.format(item.price), priceX, y, { align: 'right' })
    doc.text(number.format(item.price * item.qty), right, y, { align: 'right' })
    muted()
    doc.setFontSize(7.5)
    doc.text(`${item.code}  ${item.sampleType}`, left, y + 10)
    doc.setDrawColor('#dfe3e0')
    doc.setLineWidth(0.5)
    doc.line(left, y + 16, right, y + 16)
    y += 30
  }

  if (y > 610) {
    doc.addPage()
    y = 60
  }
  y += 6
  const startY = y
  const totalRow = (label: string, value: string, strong = false) => {
    ink()
    doc.setFont('helvetica', strong ? 'bold' : 'normal')
    doc.setFontSize(strong ? 11 : 9)
    doc.text(label, 340, y)
    doc.setFont('courier', strong ? 'bold' : 'normal')
    doc.text(value, right, y, { align: 'right' })
    y += strong ? 17 : 14
  }
  totalRow('Subtotal', format(invoice.subtotal))
  if (invoice.discountAmount > 0) totalRow(invoice.discountType === 'percent' ? `Discount (${invoice.discountValue}%)` : 'Discount', `- ${format(invoice.discountAmount)}`)
  if (invoice.taxRate > 0) totalRow(`${settings.taxLabel} (${invoice.taxRate}%)`, format(invoice.taxAmount))
  if (invoice.roundOff !== 0) totalRow('Round off', format(invoice.roundOff))
  doc.setDrawColor('#1b1f1d')
  doc.setLineWidth(0.8)
  doc.line(340, y - 8, right, y - 8)
  y += 4
  totalRow('Total', format(invoice.total), true)
  totalRow('Amount paid', format(invoice.paid))
  totalRow('Balance due', format(invoice.balance), invoice.balance > 0)

  muted()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('PAYMENT', left, startY)
  ink()
  doc.setFontSize(10)
  const lines = paymentLines(invoice, format)
  lines.forEach((line, index) => doc.text(line, left, startY + 14 + index * 14))
  const statusY = startY + 14 + lines.length * 14
  doc.text(invoice.status, left, statusY)
  muted()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`Billed by ${invoice.createdBy}`, left, statusY + 14)

  y += 56
  doc.setDrawColor('#1b1f1d')
  doc.line(right - 130, y, right, y)
  ink()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Authorized signature', right - 65, y + 12, { align: 'center' })
  muted()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Please bring this invoice when collecting printed reports.', left, y + 12)

  if (invoice.items.some((item) => item.results?.some((row) => row.value.trim()))) {
    doc.addPage()
    y = 52
    doc.setTextColor(accent)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('LABORATORY REPORT', left, y)
    muted()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`${patient.name}  |  ${patient.code}  |  ${invoice.number}`, left, y + 14)
    y += 36
    for (const item of invoice.items) {
      if (y > 720) {
        doc.addPage()
        y = 52
      }
      ink()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(item.name, left, y)
      y += 14
      doc.setFontSize(7.5)
      doc.text('SUB-TEST', left, y)
      doc.text('RESULT', 260, y)
      doc.text('UNIT', 360, y)
      doc.text('NORMAL RANGE', right, y, { align: 'right' })
      doc.setDrawColor('#1b1f1d')
      doc.setLineWidth(0.6)
      doc.line(left, y + 4, right, y + 4)
      y += 15
      for (const row of item.results ?? []) {
        if (y > 780) {
          doc.addPage()
          y = 52
        }
        const flag = rangeFlag(row.value, row.range)
        ink()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(row.name, left, y)
        doc.setFont('courier', flag ? 'bold' : 'normal')
        doc.text(`${row.value || '-'} ${flag}`, 260, y)
        muted()
        doc.setFont('helvetica', 'normal')
        doc.text(row.unit.replace('µ', 'u') || '-', 360, y)
        doc.setFont('courier', 'normal')
        doc.text(row.range.replace('–', '-').replace('⁴', '^4'), right, y, { align: 'right' })
        y += 14
      }
      y += 10
    }
  }

  doc.save(`${invoice.number.replaceAll('/', '-')}.pdf`)
}
