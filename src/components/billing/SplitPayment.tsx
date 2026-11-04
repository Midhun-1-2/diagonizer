import { lazy, Suspense, useState, type ReactNode } from 'react'
import { ArrowLeftRight, Check, QrCode, Smartphone } from 'lucide-react'
import { useLab } from '../../data/store'
import { useMoney } from '../../hooks'
import type { PaymentMethod } from '../../types'
import type { TwoModeSplit } from '../../utils/billing'
import { Button } from '../ui/Button'
import { Input, Segmented } from '../ui/Field'
import { METHOD_ICON } from './methodIcons'

const UpiQr = lazy(() => import('./UpiQr'))

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay']
const UPI_ID = /^[\w.-]+@[\w.-]+$/
const HOW_PAID: Record<PaymentMethod, string> = { Cash: 'Cash handed over', UPI: 'Paid by UPI', Card: 'Paid by card', 'Bank Transfer': 'Paid by bank transfer' }

function AmountInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) {
  const currency = useLab((state) => state.settings.currency)
  return (
    <span className="relative block min-w-0 flex-1">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-ink-3">
        {currency === 'INR' ? '₹' : currency}
      </span>
      <Input id={id} aria-label={label} type="number" inputMode="decimal" min={0} value={value || ''} placeholder="0" onChange={(event) => onChange(Math.max(0, Number(event.target.value)))} className="h-10! bg-surface! pl-9 text-right font-mono" />
    </span>
  )
}

function UpiPanel({ amount, paid, number, onPaid }: { amount: number; paid: boolean; number: string; onPaid: (amount: number | null) => void }) {
  const settings = useLab((state) => state.settings)
  const money = useMoney()
  const [tab, setTab] = useState<'qr' | 'id'>('qr')
  const [customerId, setCustomerId] = useState('')
  const [requested, setRequested] = useState('')
  const [idError, setIdError] = useState(false)

  const params = [`pa=${encodeURIComponent(settings.upiId)}`, `pn=${encodeURIComponent(settings.labName)}`, `am=${amount.toFixed(2)}`, 'cu=INR', `tn=${encodeURIComponent(number)}`].join('&')
  const qrProblem = settings.currency !== 'INR' ? 'UPI QR works with INR only. Change the currency in Settings.' : !settings.upiId ? "Add the lab's UPI ID in Settings to show a QR." : ''

  const status: ReactNode = (
    <div className="mt-2 space-y-2">
      {paid ? (
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ok">
          <Check size={15} aria-hidden /> Payment received
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-ink-2">
          <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-warn" /> Waiting for the customer to pay...
        </p>
      )}
      {paid ? (
        <Button size="sm" onClick={() => onPaid(null)}>
          Undo
        </Button>
      ) : (
        <Button size="sm" variant="primary" onClick={() => onPaid(amount)}>
          <Check size={14} aria-hidden /> Payment received
        </Button>
      )}
    </div>
  )

  return (
    <div className="mt-2.5 border-t border-dashed border-line-2 pt-2.5">
      <Segmented<'qr' | 'id'>
        label="How the customer pays by UPI"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'qr', label: <><QrCode size={14} className="shrink-0" aria-hidden /> Show QR</> },
          { value: 'id', label: <><Smartphone size={14} className="shrink-0" aria-hidden /> Enter UPI ID</> },
        ]}
      />
      {tab === 'qr' ? (
        qrProblem ? (
          <>
            <p className="mt-2.5 text-[13px] font-medium text-ink-2">{qrProblem}</p>
            {status}
          </>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-3">
            <div className="w-36 shrink-0 rounded-xl border-2 border-accent bg-white p-1.5 text-center text-[#1b1f1d]">
              <Suspense fallback={<div className="aspect-square" />}>
                <UpiQr value={`upi://pay?${params}`} />
              </Suspense>
              <p className="mt-0.5 font-mono text-[13px] font-bold">{money(amount, 2)}</p>
            </div>
            <div className="min-w-36 flex-1">
              <p className="font-display text-sm font-semibold text-ink">Scan to pay {money(amount, 2)}</p>
              <p className="mt-0.5 text-xs break-all text-ink-2">
                Pay to <span className="font-semibold text-ink">{settings.upiId}</span>
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {UPI_APPS.map((app) => (
                  <li key={app} className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-2">
                    {app}
                  </li>
                ))}
              </ul>
              {status}
            </div>
          </div>
        )
      ) : (
        <div className="mt-2.5">
          <div className="flex gap-2">
            <Input
              aria-label="Customer UPI ID"
              aria-invalid={idError || undefined}
              placeholder="customer@bank"
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value)
                setIdError(false)
              }}
              className="h-10! min-w-0 flex-1 bg-surface! font-mono"
            />
            <Button
              size="sm"
              className="h-10!"
              onClick={() => {
                const id = customerId.trim()
                setIdError(!UPI_ID.test(id))
                if (UPI_ID.test(id)) setRequested(id)
              }}
            >
              Send request
            </Button>
          </div>
          {idError && <p className="mt-1 text-[13px] font-medium text-danger">Check the UPI ID, for example name@bank</p>}
          {requested && !idError && <p className="mt-1 text-xs text-ink-3">Prototype: no request really goes to {requested}.</p>}
          {status}
        </div>
      )}
    </div>
  )
}

interface SplitPaymentProps {
  split: TwoModeSplit
  total: number
  number: string
  onChange: (patch: Partial<TwoModeSplit>) => void
}

/** The two modes staff tapped: type the first amount, the second is filled with the rest of the bill. */
export function SplitPayment({ split, total, number, onChange }: SplitPaymentProps) {
  const money = useMoney()
  const { first, second, firstAmount } = split
  const rest = Math.max(0, total - firstAmount)
  const secondAmount = split.secondAmount ?? rest
  const half = Math.ceil(total / 2)

  const upiPanel = (method: PaymentMethod, amount: number) => method === 'UPI' && amount > 0 && <UpiPanel amount={amount} paid={split.upiPaid === amount} number={number} onPaid={(upiPaid) => onChange({ upiPaid })} />

  if (!first) return <p className="mt-2.5 rounded-xl border border-dashed border-line-2 px-3 py-3 text-center text-[13px] text-ink-3">Tap the first mode above.</p>

  const FirstIcon = METHOD_ICON[first]
  const SecondIcon = second ? METHOD_ICON[second] : null

  return (
    <div className="mt-2.5 space-y-2">
      <div className="rounded-xl border border-accent bg-accent-soft p-2.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink">
            <FirstIcon size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">1. {first}</p>
            <p className="text-xs text-ink-2">{HOW_PAID[first]}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {[100, 500].map((step) => (
            <Button key={step} size="sm" className="h-10! px-2!" onClick={() => onChange({ firstAmount: firstAmount + step })}>
              +{step}
            </Button>
          ))}
          <AmountInput id="bill-split-first" label={`${first} amount`} value={firstAmount} onChange={(value) => onChange({ firstAmount: value })} />
        </div>
        {upiPanel(first, firstAmount)}
      </div>

      {second && SecondIcon ? (
        <div className="rounded-xl border border-dashed border-warn bg-warn-soft p-2.5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-warn text-surface">
              <SecondIcon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">2. {second}</p>
              <p className="text-xs text-ink-2">{split.secondAmount === null ? 'Rest of the bill, filled for you' : HOW_PAID[second]}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {split.secondAmount !== null && (
              <Button size="sm" className="h-10! px-2!" onClick={() => onChange({ secondAmount: null })}>
                Rest
              </Button>
            )}
            <AmountInput id="bill-split-second" label={`${second} amount`} value={secondAmount} onChange={(value) => onChange({ secondAmount: value })} />
          </div>
          {upiPanel(second, secondAmount)}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line-2 px-3 py-3 text-center text-[13px] text-ink-3">Tap a second mode above.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink-2">{first} amount</span>
          <Button size="sm" disabled={total <= 0} onClick={() => onChange({ firstAmount: half, secondAmount: null })}>
            Half · {money(half)}
          </Button>
        </div>
        <Button size="sm" variant="ghost" disabled={!second} onClick={() => onChange({ first: second, second: first, firstAmount: secondAmount, secondAmount: null })}>
          <ArrowLeftRight size={14} aria-hidden /> Swap
        </Button>
      </div>
    </div>
  )
}
