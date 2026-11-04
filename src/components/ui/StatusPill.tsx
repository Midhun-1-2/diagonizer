import type { InvoiceStatus, ReportStatus } from '../../types'
import type { OrderStage } from '../../utils/results'

const INVOICE_TONE: Record<InvoiceStatus, string> = {
  Paid: 'bg-ok-soft text-ok',
  'Partially Paid': 'bg-warn-soft text-warn',
  Pending: 'bg-danger-soft text-danger',
}

function Check() {
  return (
    <svg viewBox="0 0 12 12" className="draw-check size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6.5 5 9l4.5-5.5" />
    </svg>
  )
}

function Half() {
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 6a4.5 4.5 0 0 0 9 0z" fill="currentColor" />
    </svg>
  )
}

function Dot() {
  return <span className="pulse-ring mx-0.5 size-1.5 rounded-full bg-current" aria-hidden />
}

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${INVOICE_TONE[status]}`}>
      {status === 'Paid' ? <Check /> : status === 'Partially Paid' ? <Half /> : <Dot />}
      {status}
    </span>
  )
}

const STAGE_TONE: Record<OrderStage, string> = {
  'At lab': 'text-accent-text',
  'Ready to collect': 'text-warn',
  Completed: 'text-ink-3',
}

export function StageLabel({ stage }: { stage: OrderStage }) {
  return <span className={`block text-xs font-semibold whitespace-nowrap ${STAGE_TONE[stage]}`}>{stage}</span>
}

export function ReportStatusPill({ status }: { status: ReportStatus }) {
  const tone = status === 'Ready' ? 'text-ok' : status === 'In analysis' ? 'text-accent-text' : 'text-warn'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${tone}`}>
      {status === 'Ready' ? <Check /> : <Dot />}
      {status}
    </span>
  )
}
