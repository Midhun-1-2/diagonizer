import type { ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLab, type PatientInput } from '../../data/store'
import type { AgeGroupEntry } from '../../types'
import { matchAgeGroups } from '../../utils/results'
import { Field, Input, Select, Textarea } from '../ui/Field'

function makeSchema(groups: AgeGroupEntry[]) {
  return z
    .object({
      name: z.string().trim().min(2, 'Enter the full name as on ID'),
      age: z.number({ error: 'Enter age in years' }).int('Use whole years').min(0, 'Age cannot be negative').max(120, 'Age must be 120 or less'),
      gender: z.enum(['Male', 'Female', 'Other'], { error: 'Choose the gender' }),
      phone: z.string().regex(/^[6-9]\d{9}$/, 'Use a 10-digit mobile number starting with 6 to 9'),
      email: z.union([z.literal(''), z.email('Check the email address, or leave it empty')]),
      address: z.string().trim().min(5, 'Enter house, street and town'),
    })
    .superRefine((values, context) => {
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

export function PatientForm({ formId, defaults, phoneLocked, onSubmit, footer }: PatientFormProps) {
  const groups = useLab((state) => state.ageGroups)
  const { register, handleSubmit, control, formState: { errors } } = useForm<PatientValues>({
    resolver: zodResolver(makeSchema(groups)),
    defaultValues: { name: '', phone: '', email: '', address: '', ...defaults },
  })
  const age = useWatch({ control, name: 'age' })
  const gender = useWatch({ control, name: 'gender' })
  // Worked out from age and gender, never typed.
  const group = Number.isFinite(age) && gender ? matchAgeGroups({ age, gender }, groups)[0] : undefined

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-6 gap-x-3 gap-y-3.5">
      <Field label="Patient name" required error={errors.name?.message} className="col-span-6">
        {(field) => <Input data-autofocus autoComplete="off" {...field} {...register('name')} />}
      </Field>
      <Field label="Age" required error={errors.age?.message} className="col-span-2">
        {(field) => <Input type="number" inputMode="numeric" min={0} max={120} {...field} {...register('age', { valueAsNumber: true })} />}
      </Field>
      <Field label="Gender" required error={errors.gender?.message} className="col-span-4 sm:col-span-2">
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
      <Field label="Gender group" hint="Automatic" className="col-span-6 sm:col-span-2">
        {(field) => <Input readOnly tabIndex={-1} placeholder="–" value={group?.name ?? ''} className="bg-surface-2 font-semibold" {...field} />}
      </Field>
      <Field label="Phone number" required error={errors.phone?.message} className="col-span-6 sm:col-span-3">
        {(field) => <Input type="tel" inputMode="numeric" maxLength={10} readOnly={phoneLocked} className={`font-mono ${phoneLocked ? 'bg-surface-2' : ''}`} {...field} {...register('phone')} />}
      </Field>
      <Field label="Email" hint="Optional" error={errors.email?.message} className="col-span-6 sm:col-span-3">
        {(field) => <Input type="email" autoComplete="off" {...field} {...register('email')} />}
      </Field>
      <Field label="Address" required error={errors.address?.message} className="col-span-6">
        {(field) => <Textarea rows={2} className="min-h-16" {...field} {...register('address')} />}
      </Field>
      {footer && <div className="col-span-6 flex flex-wrap justify-end gap-2">{footer}</div>}
    </form>
  )
}
