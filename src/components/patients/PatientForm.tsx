import type { ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLab, type PatientInput } from '../../data/store'
import type { AgeGroupEntry } from '../../types'
import { ageParts, dobFromParts, isoDate } from '../../utils/age'
import { matchAgeGroups } from '../../utils/results'
import { Field, Input, Select, Textarea } from '../ui/Field'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function makeSchema(groups: AgeGroupEntry[]) {
  return z
    .object({
      name: z.string().trim().min(2, 'Enter the full name as on ID'),
      dob: z.string().optional(),
      age: z.number({ error: 'Enter age in years' }).int('Use whole years').min(0, 'Age cannot be negative').max(120, 'Age must be 120 or less'),
      months: z.string().optional(),
      days: z.string().optional(),
      gender: z.enum(['Male', 'Female', 'Other'], { error: 'Choose the gender' }),
      phone: z.string().regex(/^[6-9]\d{9}$/, 'Use a 10-digit mobile number starting with 6 to 9'),
      email: z.union([z.literal(''), z.email('Check the email address, or leave it empty')]),
      referredBy: z.string().optional(),
      bloodGroup: z.string().optional(),
      country: z.string().trim().optional(),
      location: z.string().trim().optional(),
      address: z.string().trim().min(5, 'Enter house, street and town'),
    })
    .superRefine((values, context) => {
      if (values.dob && values.dob > isoDate(new Date())) context.addIssue({ code: 'custom', path: ['dob'], message: 'Date of birth cannot be in the future' })
      // The gender group is worked out from age and gender, so one has to exist.
      if (matchAgeGroups(values, groups).length === 0) context.addIssue({ code: 'custom', path: ['gender'], message: 'No gender group fits this age and gender. Add one in Age Group Master.' })
    })
}
type PatientValues = z.infer<ReturnType<typeof makeSchema>>

interface PatientFormProps {
  formId: string
  defaults?: Partial<PatientInput>
  phoneLocked?: boolean
  onSubmit: (values: PatientInput) => void
  footer?: ReactNode
}

const clamp = (value: number, max: number) => Math.min(Math.max(Math.trunc(value), 0), max)

export function PatientForm({ formId, defaults, phoneLocked, onSubmit, footer }: PatientFormProps) {
  const groups = useLab((state) => state.ageGroups)
  const referrers = useLab((state) => state.referrers)
  const start = defaults?.dob ? ageParts(defaults.dob) : null
  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<PatientValues>({
    resolver: zodResolver(makeSchema(groups)),
    defaultValues: { name: '', phone: '', email: '', address: '', country: 'India', ...defaults, months: start ? String(start.months) : '', days: start ? String(start.days) : '' },
  })
  const age = useWatch({ control, name: 'age' })
  const gender = useWatch({ control, name: 'gender' })
  // Worked out from age and gender, never typed.
  const group = Number.isFinite(age) && gender ? matchAgeGroups({ age, gender }, groups)[0] : undefined

  // Date of birth fills years, months and days. Typing any of those works the date of birth back out.
  const fromDob = (dob: string) => {
    const parts = ageParts(dob)
    if (!parts) return
    setValue('age', parts.years, { shouldValidate: true })
    setValue('months', String(parts.months))
    setValue('days', String(parts.days))
  }
  const fromParts = (years: number, months: string, days: string) => {
    if (!Number.isFinite(years) && !months && !days) return
    setValue('dob', dobFromParts(Number.isFinite(years) ? years : 0, Number(months) || 0, Number(days) || 0), { shouldValidate: true })
  }

  const submit = (values: PatientValues) =>
    onSubmit({
      name: values.name,
      age: values.age,
      gender: values.gender,
      phone: values.phone,
      email: values.email,
      address: values.address,
      dob: values.dob || undefined,
      referredBy: values.referredBy || undefined,
      bloodGroup: values.bloodGroup || undefined,
      country: values.country || undefined,
      location: values.location || undefined,
    })

  return (
    <form id={formId} onSubmit={handleSubmit(submit)} noValidate className="grid grid-cols-6 gap-x-3 gap-y-3.5">
      <Field label="Patient name" required error={errors.name?.message} className="col-span-6">
        {(field) => <Input data-autofocus autoComplete="off" {...field} {...register('name')} />}
      </Field>

      <Field label="Date of birth" hint="Optional" error={errors.dob?.message} className="col-span-6 sm:col-span-3">
        {(field) => <Input type="date" max={isoDate(new Date())} {...field} {...register('dob', { onChange: (event) => fromDob(event.target.value) })} />}
      </Field>
      <Field label="Years" required error={errors.age?.message} className="col-span-2 sm:col-span-1">
        {(field) => (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            {...field}
            {...register('age', { valueAsNumber: true, onChange: (event) => fromParts(event.target.value === '' ? Number.NaN : Number(event.target.value), getValues('months') ?? '', getValues('days') ?? '') })}
          />
        )}
      </Field>
      <Field label="Months" className="col-span-2 sm:col-span-1">
        {(field) => (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={11}
            {...field}
            {...register('months', {
              onChange: (event) => {
                const months = event.target.value === '' ? '' : String(clamp(Number(event.target.value), 11))
                setValue('months', months)
                fromParts(getValues('age'), months, getValues('days') ?? '')
              },
            })}
          />
        )}
      </Field>
      <Field label="Days" className="col-span-2 sm:col-span-1">
        {(field) => (
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            {...field}
            {...register('days', {
              onChange: (event) => {
                const days = event.target.value === '' ? '' : String(clamp(Number(event.target.value), 30))
                setValue('days', days)
                fromParts(getValues('age'), getValues('months') ?? '', days)
              },
            })}
          />
        )}
      </Field>

      <Field label="Gender" required error={errors.gender?.message} className="col-span-6 sm:col-span-3">
        {(field) => (
          <Controller
            control={control}
            name="gender"
            render={({ field: input }) => (
              <Select {...field} {...input} value={input.value ?? ''}>
                <option value="">Choose gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Gender group" hint="Automatic" className="col-span-6 sm:col-span-3">
        {(field) => <Input readOnly tabIndex={-1} placeholder="–" value={group?.name ?? ''} className="bg-surface-2 font-semibold" {...field} />}
      </Field>

      <Field label="Phone number" required error={errors.phone?.message} className="col-span-6 sm:col-span-3">
        {(field) => <Input type="tel" inputMode="numeric" maxLength={10} readOnly={phoneLocked} className={`font-mono ${phoneLocked ? 'bg-surface-2' : ''}`} {...field} {...register('phone')} />}
      </Field>
      <Field label="Email" hint="Optional" error={errors.email?.message} className="col-span-6 sm:col-span-3">
        {(field) => <Input type="email" autoComplete="off" {...field} {...register('email')} />}
      </Field>

      <Field label="Referred by" hint="Optional" className="col-span-6 sm:col-span-3">
        {(field) => (
          <Controller
            control={control}
            name="referredBy"
            render={({ field: input }) => (
              <Select {...field} {...input} value={input.value ?? ''}>
                <option value="">None</option>
                {referrers.map((referrer) => (
                  <option key={referrer.id}>{referrer.name}</option>
                ))}
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Blood group" hint="Optional" className="col-span-6 sm:col-span-3">
        {(field) => (
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field: input }) => (
              <Select {...field} {...input} value={input.value ?? ''}>
                <option value="">Not known</option>
                {BLOOD_GROUPS.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            )}
          />
        )}
      </Field>

      <Field label="Country" hint="Optional" className="col-span-6 sm:col-span-3">
        {(field) => <Input autoComplete="off" {...field} {...register('country')} />}
      </Field>
      <Field label="Location" hint="Optional" className="col-span-6 sm:col-span-3">
        {(field) => <Input autoComplete="off" placeholder="Town or area" {...field} {...register('location')} />}
      </Field>

      <Field label="Address" required error={errors.address?.message} className="col-span-6">
        {(field) => <Textarea rows={2} className="min-h-16" {...field} {...register('address')} />}
      </Field>
      {footer && <div className="col-span-6 flex flex-wrap justify-end gap-2">{footer}</div>}
    </form>
  )
}
