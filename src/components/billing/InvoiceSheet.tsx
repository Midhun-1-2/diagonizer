import { lazy, Suspense, useMemo } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Eye, Minus, Plus, X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeProvider'
import { useLab } from '../../data/store'
import { useMoney } from '../../hooks'
import type { DiscountType, InvoiceMethod, LabTest, SampleType } from '../../types'
import { computeTotals, PAYMENT_METHODS, splitAmounts, splitTotal, type TwoModeSplit } from '../../utils/billing'
import { deviceTier } from '../three/bus'
import { Button } from '../ui/Button'
import { Input, Segmented } from '../ui/Field'
import { Readout } from '../ui/Readout'
import { InvoiceStatusPill } from '../ui/StatusPill'
import { sampleMeta } from '../ui/Tube'
import { METHOD_ICON } from './methodIcons'
import { SplitPayment } from './SplitPayment'
import { TubeRack } from './TubeRack'

const RackCanvas = lazy(() => import('../three/RackCanvas'))

const METHOD_KEYS: InvoiceMethod[] = [...PAYMENT_METHODS, 'Split']

export interface SheetValues {
  discountType: DiscountType
  discountValue: number
  method: InvoiceMethod
  /** null means "collect the full total", so the amount follows the bill until staff type over it. */
  received: number | null
  /** Used when the method is Split. */
  split: TwoModeSplit
}

interface InvoiceSheetProps {
  number: string
  lines: LabTest[]
  quantities: Record<string, number>
  values: SheetValues
  onChange: (patch: Partial<SheetValues>) => void
  onQuantity: (id: string, qty: number) => void
  onRemove: (test: LabTest) => void
  onPreview: () => void
  onSave: () => void
}

function SumRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-0.5 text-[13px]">
      <dt className={muted ? 'text-ink-3' : 'text-ink-2'}>{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </div>
  )
}

/** Real 3D rack in a small window onto the lab. Tubes drop in as tests are added. */
function RackWindow({ lines }: { lines: LabTest[] }) {
  const { motion } = useTheme()
  const samples = useMemo(() => [...new Set(lines.map((line) => line.sampleType))].slice(0, 6) as SampleType[], [lines])
  if (motion === 'reduced' || deviceTier() === 'off') return <TubeRack lines={lines} />
  return (
    <div className="m-3 mb-0 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(160deg, var(--stage-2), var(--stage-1))', boxShadow: 'inset 0 2px 8px rgb(0 0 0 / 0.5)' }}>
      <div className="h-36">
        <Suspense fallback={null}>
          <RackCanvas samples={samples} />
        </Suspense>
      </div>
      <p className="truncate px-3 pb-2 text-xs text-on-stage-2">
        {samples.length === 0 ? 'Add tests and their tubes drop in here.' : samples.map((type) => sampleMeta(type).container).join(' · ')}
      </p>
    </div>
  )
}

/** The live bill, a slab that stays in view while tests are picked. */
export function InvoiceSheet({ number, lines, quantities, values, onChange, onQuantity, onRemove, onPreview, onSave }: InvoiceSheetProps) {
  const settings = useLab((state) => state.settings)
  const money = useMoney()
  const taxRate = settings.taxEnabled ? settings.taxRate : 0
  const priced = lines.map((line) => ({ qty: quantities[line.id] ?? 1, price: line.price }))
  const full = computeTotals({ lines: priced, discountType: values.discountType, discountValue: values.discountValue, taxRate, received: 0 })
  const received = values.method === 'Split' ? splitTotal(splitAmounts(values.split, full.total)) : (values.received ?? full.total)
  const totals = computeTotals({ lines: priced, discountType: values.discountType, discountValue: values.discountValue, taxRate, received })
  const { split } = values
  const splitting = values.method === 'Split'

  // While splitting, tapping a mode fills slot 1 then slot 2. Tapping a chosen mode takes it back out.
  const tapMethod = (method: InvoiceMethod) => {
    const patchSplit = (patch: Partial<TwoModeSplit>) => onChange({ split: { ...split, ...patch } })
    if (values.method === 'Split') {
      if (method === 'Split') onChange({ method: split.first ?? 'Cash' })
      else if (method === split.first) patchSplit({ first: split.second, second: null, firstAmount: 0, secondAmount: null })
      else if (method === split.second) patchSplit({ second: null, secondAmount: null })
      else if (!split.first) patchSplit({ first: method })
      else patchSplit({ second: method, secondAmount: null })
    } else if (method === 'Split') {
      onChange({ method, split: split.first ? split : { ...split, first: values.method } })
    } else {
      onChange({ method })
    }
  }

  return (
    <section aria-label="Current bill" className="slab">
      <header className="flex items-baseline justify-between gap-3 px-4 pt-3.5">
        <h2 className="font-display text-[15px] font-semibold text-ink">New bill</h2>
        <span className="font-mono text-xs text-ink-3">{number}</span>
      </header>

      <RackWindow lines={lines} />

      <div className="mt-2">
        {lines.length === 0 ? (
          <p className="px-4 py-4 text-center text-[13px] text-ink-3">No tests on this bill yet. Pick a department and add investigations.</p>
        ) : (
          <ul className="max-h-[22dvh] overflow-y-auto px-4 max-lg:max-h-none">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const qty = quantities[line.id] ?? 1
                return (
                  <m.li
                    key={line.id}
                    initial={{ height: 0, opacity: 0, rotateX: -60 }}
                    animate={{ height: 'auto', opacity: 1, rotateX: 0 }}
                    exit={{ height: 0, opacity: 0, x: 30 }}
                    transition={{ duration: 0.28, ease: [0.22, 0.8, 0.24, 1] }}
                    style={{ transformOrigin: '50% 0', transformPerspective: 600 }}
                    className="overflow-hidden border-b border-line last:border-0"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                      <div className="min-w-0 flex-1 max-xs:basis-full">
                        <p className="truncate text-[13px] font-semibold text-ink">{line.name}</p>
                        <p className="font-mono text-xs text-ink-3">{money(line.price)} each</p>
                      </div>
                      <div className="well flex items-center rounded-lg" role="group" aria-label={`Quantity of ${line.name}`}>
                        <button type="button" disabled={qty <= 1} onClick={() => onQuantity(line.id, qty - 1)} aria-label="Decrease quantity" className="grid size-8 place-items-center text-ink-2 disabled:opacity-30">
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center font-mono text-xs text-ink">{qty}</span>
                        <button type="button" disabled={qty >= 9} onClick={() => onQuantity(line.id, qty + 1)} aria-label="Increase quantity" className="grid size-8 place-items-center text-ink-2 disabled:opacity-30">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="w-16 text-right font-mono text-[13px] font-medium text-ink max-xs:ml-auto">{money(line.price * qty)}</span>
                      <button type="button" onClick={() => onRemove(line)} aria-label={`Remove ${line.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-danger-soft hover:text-danger">
                        <X size={14} />
                      </button>
                    </div>
                  </m.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <label htmlFor="bill-discount" className="mr-auto text-[13px] text-ink-2">
            Discount
          </label>
          <Segmented<DiscountType>
            label="Discount type"
            value={values.discountType}
            onChange={(discountType) => onChange({ discountType, discountValue: 0 })}
            options={[
              { value: 'percent', label: '%' },
              { value: 'amount', label: settings.currency === 'INR' ? '₹' : settings.currency },
            ]}
            className="p-0.5! [&_button]:h-7! [&_button]:px-2.5"
          />
          <Input
            id="bill-discount"
            type="number"
            inputMode="decimal"
            min={0}
            value={values.discountValue || ''}
            placeholder="0"
            onChange={(event) => onChange({ discountValue: Math.max(0, Number(event.target.value)) })}
            className="h-9! w-20 text-right font-mono text-[13px]!"
          />
        </div>
        <dl className="mt-2">
          <SumRow label="Subtotal" value={money(totals.subtotal, 2)} />
          {totals.discountAmount > 0 && <SumRow label="Discount" value={`- ${money(totals.discountAmount, 2)}`} />}
          {taxRate > 0 && <SumRow label={`${settings.taxLabel} ${taxRate}%`} value={money(totals.taxAmount, 2)} />}
          {totals.roundOff !== 0 && <SumRow label="Round off" value={money(totals.roundOff, 2)} muted />}
        </dl>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-3.5 py-2.5">
          <span className="font-display font-semibold text-ink">Grand total</span>
          <Readout text={money(totals.total)} className="text-[30px] leading-none font-medium tracking-tight text-ink" />
        </div>
      </div>

      <div className="border-t border-line px-4 py-3">
        {splitting && (
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="text-[11px] font-bold tracking-wider text-ink-2 uppercase">Split between two modes</p>
            <p className="text-xs text-ink-3">Tap two: type the 1st, the 2nd gets the rest</p>
          </div>
        )}
        <div role={splitting ? 'group' : 'radiogroup'} aria-label="Payment method" className="grid grid-cols-5 gap-1.5">
          {METHOD_KEYS.map((method) => {
            const Icon = METHOD_ICON[method]
            const active = values.method === method
            const slot = !splitting ? 0 : method === split.first ? 1 : method === split.second ? 2 : 0
            const state = splitting ? { 'aria-pressed': active || slot > 0 } : { role: 'radio', 'aria-checked': active }
            return (
              <button
                key={method}
                type="button"
                {...state}
                onClick={() => tapMethod(method)}
                className={`key flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold ${active ? 'key-primary' : ''} ${slot === 1 ? 'border-accent! bg-accent-soft! bg-none! text-accent-text!' : ''} ${slot === 2 ? 'border-warn! bg-warn-soft! bg-none! text-warn!' : ''}`}
              >
                {slot > 0 && (
                  <span aria-label={`Mode ${slot}`} className={`absolute top-0.5 left-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold ${slot === 1 ? 'bg-accent text-accent-ink' : 'bg-warn text-surface'}`}>
                    {slot}
                  </span>
                )}
                <Icon size={16} aria-hidden />
                {method === 'Bank Transfer' ? 'Bank' : method}
              </button>
            )
          })}
        </div>
        {splitting ? (
          <SplitPayment split={split} total={totals.total} number={number} onChange={(patch) => onChange({ split: { ...split, ...patch } })} />
        ) : (
          <div className="mt-3 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="bill-received" className="mb-1 block text-[13px] text-ink-2">
                Advance received now
              </label>
              <Input
                id="bill-received"
                type="number"
                inputMode="decimal"
                min={0}
                value={values.received ?? totals.total}
                onChange={(event) => onChange({ received: Math.max(0, Number(event.target.value)) })}
                className="h-10! text-right font-mono"
              />
            </div>
            <Button size="sm" className="h-10!" onClick={() => onChange({ received: null })}>
              Full
            </Button>
            <Button size="sm" className="h-10!" onClick={() => onChange({ received: 0 })}>
              None
            </Button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
          {lines.length > 0 ? <InvoiceStatusPill status={totals.status} /> : <span />}
          {totals.change > 0 ? (
            <span className="font-semibold text-ink">
              Return <span className="font-mono">{money(totals.change, 2)}</span>
            </span>
          ) : (
            <span className="text-ink-2">
              Balance due <span className={`font-mono font-medium ${totals.balance > 0 ? 'text-danger' : 'text-ink'}`}>{money(totals.balance, 2)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="sticky bottom-[84px] z-10 flex gap-2.5 rounded-b-[20px] border-t border-line bg-surface px-4 py-3 md:bottom-0">
        <Button onClick={onPreview} disabled={lines.length === 0} className="max-lg:flex-1">
          <Eye size={15} aria-hidden /> Preview
        </Button>
        <Button variant="primary" onClick={onSave} className="flex-1">
          Save and send to lab
          <kbd className="ml-1 rounded bg-black/20 px-1 font-mono text-[10px] font-medium max-lg:hidden">Ctrl+↵</kbd>
        </Button>
      </div>
    </section>
  )
}
