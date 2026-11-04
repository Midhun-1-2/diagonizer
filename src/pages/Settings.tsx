import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImageUp, RotateCcw, Trash2 } from 'lucide-react'
import { resetData, updateSettings, useLab } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { invoiceNumber } from '../utils/billing'
import { Button } from '../components/ui/Button'
import { PageHero, Panel } from '../components/ui/Common'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'

const labSchema = z.object({
  labName: z.string().trim().min(2, 'Enter the laboratory name'),
  tagline: z.string().trim(),
  address: z.string().trim().min(5, 'Enter the full address for invoices'),
  phone: z.string().trim().min(6, 'Enter a contact number'),
  email: z.email('Check the email address'),
})
type LabValues = z.infer<typeof labSchema>

const billingSchema = z.object({
  taxEnabled: z.boolean(),
  taxLabel: z.string().trim().min(1, 'Enter a tax label, such as GST'),
  taxRate: z.number({ error: 'Enter a rate' }).min(0, 'Rate cannot be negative').max(50, 'Rate must be 50% or less'),
  invoicePrefix: z.string().trim().regex(/^[A-Za-z0-9-]{1,8}$/, 'Use up to 8 letters, numbers or hyphens'),
  currency: z.string(),
  upiId: z.union([z.literal(''), z.string().trim().regex(/^[\w.-]+@[\w.-]+$/, 'Use a UPI ID such as name@bank, or leave it empty')]),
})
type BillingValues = z.infer<typeof billingSchema>

const MAX_LOGO_BYTES = 300 * 1024

function Heading({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-[17px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      <p className="mt-0.5 text-[13px] text-ink-2">{note}</p>
    </div>
  )
}

function Block({ i, id, title, note, className = '', children }: { i: number; id: string; title: string; note: string; className?: string; children: ReactNode }) {
  return (
    <Panel i={i} className={`scroll-mt-20 ${className}`}>
      <div id={id}>
        <Heading title={title} note={note} />
        {children}
      </div>
    </Panel>
  )
}

function LabForm() {
  const settings = useLab((state) => state.settings)
  const toast = useToast()
  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<LabValues>({ resolver: zodResolver(labSchema), defaultValues: settings })
  const fileInput = useRef<HTMLInputElement>(null)
  const [logoError, setLogoError] = useState('')

  const pickLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo must be under 300 KB. Try a smaller PNG or SVG.')
      return
    }
    setLogoError('')
    const reader = new FileReader()
    reader.onload = () => {
      updateSettings({ logo: String(reader.result) })
      toast({ tone: 'success', title: 'Logo updated', body: 'It now appears on invoices.' })
    }
    reader.readAsDataURL(file)
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        updateSettings(values)
        reset(values)
        toast({ tone: 'success', title: 'Laboratory details saved' })
      })}
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
    >
      <div className="col-span-2 flex items-center gap-3">
        {settings.logo ? (
          <img src={settings.logo} alt="Laboratory logo" className="size-16 rounded-xl border border-line object-contain" />
        ) : (
          <span className="well grid size-16 place-items-center rounded-xl text-[11px] font-semibold tracking-wider text-ink-3">LOGO</span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              <ImageUp size={14} aria-hidden /> Upload logo
            </Button>
            {settings.logo && (
              <Button size="sm" variant="ghost" onClick={() => updateSettings({ logo: '' })}>
                <Trash2 size={14} aria-hidden /> Remove
              </Button>
            )}
          </div>
          <p className={`mt-1.5 text-xs ${logoError ? 'font-medium text-danger' : 'text-ink-3'}`}>{logoError || 'PNG, JPG or SVG, under 300 KB.'}</p>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={pickLogo} className="hidden" aria-label="Laboratory logo file" />
        </div>
      </div>
      <Field label="Laboratory name" required error={errors.labName?.message} className="col-span-2">
        {(field) => <Input {...field} {...register('labName')} />}
      </Field>
      <Field label="Line under the name" className="col-span-2">
        {(field) => <Input {...field} {...register('tagline')} />}
      </Field>
      <Field label="Address" required error={errors.address?.message} className="col-span-2">
        {(field) => <Textarea rows={2} className="min-h-16" {...field} {...register('address')} />}
      </Field>
      <Field label="Phone" required error={errors.phone?.message} className="max-sm:col-span-2">
        {(field) => <Input type="tel" {...field} {...register('phone')} />}
      </Field>
      <Field label="Email" required error={errors.email?.message} className="max-sm:col-span-2">
        {(field) => <Input type="email" {...field} {...register('email')} />}
      </Field>
      <div className="col-span-2">
        <Button type="submit" variant="primary" disabled={!isDirty}>
          Save laboratory details
        </Button>
      </div>
    </form>
  )
}

function BillingForm() {
  const settings = useLab((state) => state.settings)
  const sequence = useLab((state) => state.sequence.invoice)
  const toast = useToast()
  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<BillingValues>({ resolver: zodResolver(billingSchema), defaultValues: settings })
  const prefix = useWatch({ control, name: 'invoicePrefix' })
  const taxEnabled = useWatch({ control, name: 'taxEnabled' })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        updateSettings(values)
        reset(values)
        toast({ tone: 'success', title: 'Billing settings saved', body: 'New bills will use them. Existing invoices are unchanged.' })
      })}
      className="grid grid-cols-2 gap-x-3 gap-y-3.5"
    >
      <label className="col-span-2 flex min-h-10 cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
        <input type="checkbox" className="size-4 accent-(--accent)" {...register('taxEnabled')} />
        Charge tax on bills
      </label>
      <Field label="Tax label" error={errors.taxLabel?.message}>
        {(field) => <Input disabled={!taxEnabled} {...field} {...register('taxLabel')} />}
      </Field>
      <Field label="Tax rate (%)" error={errors.taxRate?.message}>
        {(field) => <Input type="number" step="0.01" inputMode="decimal" disabled={!taxEnabled} className="font-mono" {...field} {...register('taxRate', { valueAsNumber: true })} />}
      </Field>
      <Field label="Invoice prefix" className="col-span-2 sm:col-span-1" error={errors.invoicePrefix?.message} hint={`Next: ${invoiceNumber(prefix || 'NDL', sequence + 1)}`}>
        {(field) => <Input className="font-mono uppercase" {...field} {...register('invoicePrefix')} />}
      </Field>
      <Field label="Currency" className="col-span-2 sm:col-span-1">
        {(field) => (
          <Controller
            control={control}
            name="currency"
            render={({ field: input }) => (
              <Select {...field} {...input}>
                <option value="INR">INR, Indian Rupee (₹)</option>
                <option value="USD">USD, US Dollar ($)</option>
                <option value="AED">AED, UAE Dirham</option>
                <option value="GBP">GBP, Pound Sterling (£)</option>
                <option value="EUR">EUR, Euro (€)</option>
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Lab UPI ID" className="col-span-2" error={errors.upiId?.message} hint="Customers pay this ID when they scan the UPI QR on a split bill.">
        {(field) => <Input autoComplete="off" className="font-mono" {...field} {...register('upiId')} />}
      </Field>
      <div className="col-span-2">
        <Button type="submit" variant="primary" disabled={!isDirty}>
          Save billing settings
        </Button>
      </div>
    </form>
  )
}

export default function Settings() {
  const toast = useToast()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero title="Settings" subtitle="Details printed on invoices and tax rules." />

      <div className="grid min-w-0 items-start gap-x-3.5 gap-y-5 lg:grid-cols-2">
        <Block i={0} id="lab" title="Laboratory" note="Shown on every printed invoice and PDF.">
          <LabForm />
        </Block>
        <div className="grid min-w-0 gap-y-5">
          <Block i={1} id="billing" title="Tax and invoices" note="Applied to bills created from now on.">
            <BillingForm />
          </Block>
          <Block i={2} id="data" title="Sample data" note="This prototype stores everything in this browser.">
            <p className="mb-3 text-[13px] text-ink-2">Resetting replaces all patients, tests, invoices and settings with fresh sample data.</p>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} aria-hidden /> Reset sample data
            </Button>
          </Block>
        </div>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="Reset all sample data?"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Keep my data</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetData()
                setConfirmReset(false)
                toast({ tone: 'info', title: 'Sample data reset' })
                window.setTimeout(() => window.location.reload(), 400)
              }}
            >
              Reset data
            </Button>
          </>
        }
      >
        <p className="text-ink-2">Patients, invoices and test changes you made in this browser will be lost. This cannot be undone.</p>
      </Modal>
    </div>
  )
}
