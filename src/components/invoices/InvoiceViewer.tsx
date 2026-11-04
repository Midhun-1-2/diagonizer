import { useState } from 'react'
import { createPortal } from 'react-dom'
import { m } from 'motion/react'
import { Download, IndianRupee, Lock, Printer } from 'lucide-react'
import { recordPayment, useLab, useSession } from '../../data/store'
import { useToast } from '../../contexts/ToastProvider'
import { useMoney } from '../../hooks'
import type { Invoice, PaymentMethod } from '../../types'
import { PAYMENT_METHODS } from '../../utils/billing'
import { downloadInvoicePdf } from '../../utils/pdf'
import { canRelease, orderStage } from '../../utils/results'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { InvoiceDocument } from './InvoiceDocument'

function PaymentForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState<PaymentMethod>(invoice.method === 'Split' ? 'Cash' : invoice.method)
  const [error, setError] = useState('')
  const toast = useToast()
  const money = useMoney()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) return setError('Enter an amount above zero')
    if (value > invoice.balance) return setError(`Balance is only ${money(invoice.balance, 2)}`)
    recordPayment(invoice.id, value, method)
    toast({ tone: 'success', title: 'Payment recorded', body: `${money(value, 2)} by ${method} on ${invoice.number}` })
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-2 border-t border-line bg-surface-2/60 px-5 py-3">
      <Field label="Amount received" error={error} className="min-w-32 flex-1">
        {(field) => <Input type="number" inputMode="decimal" className="font-mono" value={amount} onChange={(event) => setAmount(event.target.value)} {...field} />}
      </Field>
      <Field label="Method" className="min-w-32 flex-1">
        {(field) => (
          <Select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} {...field}>
            {PAYMENT_METHODS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" variant="primary" className="mt-[23px]">
        Record
      </Button>
    </form>
  )
}

function Stamp({ status }: { status: Invoice['status'] }) {
  const color = status === 'Paid' ? '#146c43' : status === 'Pending' ? '#b3261e' : '#855600'
  return (
    <m.div
      aria-hidden
      initial={{ scale: 1.7, opacity: 0, rotate: -14 }}
      animate={{ scale: 1, opacity: 0.85, rotate: -9 }}
      transition={{ delay: 0.62, duration: 0.2, ease: 'easeIn' }}
      className="pointer-events-none absolute top-1 right-0 border-2 sm:right-auto sm:left-[28%] px-3 py-1 text-lg font-extrabold tracking-[0.12em] uppercase print:hidden"
      style={{ color, borderColor: color }}
    >
      {status}
    </m.div>
  )
}

interface InvoiceViewerProps {
  invoice: Invoice | null
  onClose: () => void
  /** Plays the printer-feed entrance, used right after saving. */
  justSaved?: boolean
  /** Draft preview: not yet saved, so no payment recording. */
  draft?: boolean
  /** Opens with the payment form showing, for collecting a balance. */
  startPaying?: boolean
  footerExtra?: React.ReactNode
}

export function InvoiceViewer({ invoice, onClose, justSaved, draft, startPaying, footerExtra }: InvoiceViewerProps) {
  const patients = useLab((state) => state.patients)
  const settings = useLab((state) => state.settings)
  // Saved invoices are re-read from the store so a recorded payment shows immediately.
  const live = useLab((state) => state.invoices.find((inv) => inv.id === invoice?.id))
  const current = live ?? invoice
  const patient = current ? patients.find((p) => p.id === current.patientId) : undefined
  const session = useSession()
  const [payingOverride, setPaying] = useState<boolean | null>(null)
  const paying = payingOverride ?? Boolean(startPaying)
  const toast = useToast()

  const close = () => {
    setPaying(null)
    onClose()
  }

  const download = async () => {
    if (!current || !patient) return
    await downloadInvoicePdf(current, patient, settings)
    toast({ tone: 'success', title: 'PDF downloaded', body: `${current.number.replaceAll('/', '-')}.pdf` })
  }

  const ready = Boolean(current && patient)
  const handlesMoney = session?.role !== 'technical'
  const released = Boolean(current && !draft && canRelease(current) && handlesMoney)
  const stage = current ? orderStage(current) : 'At lab'
  const lockNote = stage === 'At lab' ? 'Print unlocks after lab results and full payment.' : 'Print unlocks once the full amount is collected.'
  return (
    <>
      <Modal
        open={ready}
        onClose={close}
        size="lg"
        title={draft ? 'Invoice preview' : justSaved ? 'Bill saved and sent to lab' : `Invoice ${current?.number ?? ''}`}
        subtitle={draft ? `Draft number ${current?.number ?? ''}. Nothing is saved until you press Save.` : justSaved ? current?.number : undefined}
        footer={
          <>
            {!draft && handlesMoney && current && current.balance > 0 && (
              <Button onClick={() => setPaying(!paying)} aria-expanded={paying} className="mr-auto">
                <IndianRupee size={15} aria-hidden /> Record payment
              </Button>
            )}
            {released ? (
              <>
                <Button onClick={download}>
                  <Download size={15} aria-hidden /> PDF
                </Button>
                <Button onClick={() => window.print()}>
                  <Printer size={15} aria-hidden /> Print
                </Button>
              </>
            ) : (
              !draft &&
              handlesMoney && (
                <p className="flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-ink-2">
                  <Lock size={14} aria-hidden /> {lockNote}
                </p>
              )
            )}
            {footerExtra}
          </>
        }
      >
        {current && patient && (
          <>
            <div className="-mx-5 -my-4 overflow-hidden bg-surface-2">
              {/* The thin dark line is the printer slot; the sheet feeds out from under it. */}
              {justSaved && <div aria-hidden className="relative z-10 h-1 bg-ink shadow-[0_3px_6px_rgb(0_0_0/0.35)]" />}
              <m.div
                key={current.id}
                initial={justSaved ? { y: '-100%' } : false}
                animate={{ y: 0 }}
                transition={{ duration: 0.66, ease: [0.3, 0.7, 0.2, 1] }}
                className="mx-auto max-w-[720px] sm:my-3 sm:border sm:border-line"
              >
                <InvoiceDocument invoice={current} patient={patient} settings={settings} stamp={!draft ? <Stamp status={current.status} /> : undefined} />
              </m.div>
            </div>
          </>
        )}
        {paying && !draft && handlesMoney && current && current.balance > 0 && (
          <div className="sticky -bottom-4 -mx-5 -mb-4 mt-4">
            <PaymentForm invoice={current} onDone={() => setPaying(false)} />
          </div>
        )}
      </Modal>
      {released && current && patient && createPortal(<InvoiceDocument invoice={current} patient={patient} settings={settings} />, document.getElementById('print-root')!)}
    </>
  )
}
