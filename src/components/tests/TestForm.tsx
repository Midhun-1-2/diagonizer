import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useLab, type TestInput } from '../../data/store'
import type { LabTest } from '../../types'
import { rangeProblem } from '../../utils/results'
import { Button, IconButton } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Field'
import { RangeCell } from './RangeCell'

function makeSchema(takenCodes: string[]) {
  return z.object({
    name: z.string().trim().min(2, 'Enter the test name'),
    code: z
      .string()
      .trim()
      .min(2, 'Enter a short billing code')
      .refine((code) => !takenCodes.includes(code.toUpperCase()), 'Another test already uses this code'),
    category: z.string().min(1, 'Choose a category'),
    sampleType: z.string().min(1, 'Choose a sample type'),
    price: z.number({ error: 'Enter the price' }).min(0, 'Price cannot be negative'),
    tatHours: z.number({ error: 'Enter hours' }).min(1, 'Use at least 1 hour'),
    description: z.string().trim(),
    active: z.boolean(),
    subTests: z.array(
      z
        .object({
          name: z.string().trim().min(1, 'Name the sub-test'),
          unit: z.string().trim(),
          ranges: z.record(z.string(), z.string()).optional(),
          limits: z.record(z.string(), z.object({ min: z.string().optional(), max: z.string().optional() })).optional(),
        })
        .superRefine((subTest, context) => {
          // Shown under the group's boxes, so each message lands on that group's range.
          for (const id of new Set([...Object.keys(subTest.ranges ?? {}), ...Object.keys(subTest.limits ?? {})])) {
            const problem = rangeProblem(subTest.ranges?.[id] ?? '', subTest.limits?.[id])
            if (problem) context.addIssue({ code: 'custom', path: ['ranges', id], message: problem })
          }
        }),
    ),
  })
}

interface TestFormProps {
  formId: string
  test: LabTest | null
  takenCodes: string[]
  onSubmit: (values: TestInput) => void
}

export function TestForm({ formId, test, takenCodes, onSubmit }: TestFormProps) {
  const categories = useLab((state) => state.categories)
  const sampleTypes = useLab((state) => state.sampleTypes)
  const units = useLab((state) => state.units)
  const ageGroups = useLab((state) => state.ageGroups)
  const { register, handleSubmit, control, formState: { errors } } = useForm<TestInput>({
    resolver: zodResolver(makeSchema(takenCodes)),
    defaultValues: test ?? { name: '', code: '', category: categories[0]?.name ?? '', sampleType: sampleTypes[0]?.name ?? '', description: '', active: true, subTests: [{ name: '', unit: '', ranges: {} }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'subTests' })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-6 gap-x-3 gap-y-3.5">
      <Field label="Test name" required error={errors.name?.message} className="col-span-6 sm:col-span-4">
        {(field) => <Input data-autofocus {...field} {...register('name')} />}
      </Field>
      <Field label="Test code" required error={errors.code?.message} className="col-span-6 sm:col-span-2">
        {(field) => <Input className="font-mono uppercase" {...field} {...register('code')} />}
      </Field>
      <Field label="Category" required error={errors.category?.message} className="col-span-6 sm:col-span-3">
        {(field) => (
          <Controller
            control={control}
            name="category"
            render={({ field: input }) => (
              <Select {...field} {...input}>
                {categories.map((category) => (
                  <option key={category.id}>{category.name}</option>
                ))}
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Sample type" required error={errors.sampleType?.message} className="col-span-6 sm:col-span-3">
        {(field) => (
          <Controller
            control={control}
            name="sampleType"
            render={({ field: input }) => (
              <Select {...field} {...input}>
                {sampleTypes.map((type) => (
                  <option key={type.id}>{type.name}</option>
                ))}
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Price" required error={errors.price?.message} className="col-span-3">
        {(field) => <Input type="number" inputMode="decimal" min={0} className="font-mono" {...field} {...register('price', { valueAsNumber: true })} />}
      </Field>
      <Field label="Completion time (hours)" required error={errors.tatHours?.message} className="col-span-3">
        {(field) => <Input type="number" inputMode="numeric" min={1} className="font-mono" {...field} {...register('tatHours', { valueAsNumber: true })} />}
      </Field>
      <Field label="Description" className="col-span-6">
        {(field) => <Textarea rows={2} className="min-h-16" {...field} {...register('description')} />}
      </Field>

      <fieldset className="col-span-6">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Sub-tests</legend>
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="well grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5 rounded-2xl p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
              <div className="max-sm:col-span-2">
                <Input aria-label={`Sub-test ${index + 1} name`} placeholder="Name" aria-invalid={errors.subTests?.[index]?.name ? true : undefined} {...register(`subTests.${index}.name`)} />
                {errors.subTests?.[index]?.name && <p className="mt-0.5 text-xs font-medium text-danger">{errors.subTests[index]?.name?.message}</p>}
              </div>
              <Controller
                control={control}
                name={`subTests.${index}.unit`}
                render={({ field: input }) => (
                  <Select aria-label={`Sub-test ${index + 1} unit`} {...input}>
                    <option value="">No unit</option>
                    {units.map((unit) => (
                      <option key={unit.id}>{unit.name}</option>
                    ))}
                  </Select>
                )}
              />
              <IconButton label={`Remove sub-test ${index + 1}`} onClick={() => remove(index)}>
                <Trash2 size={15} />
              </IconButton>
              {ageGroups.length > 0 && (
                <div className="col-span-full mt-1 grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  {ageGroups.map((group) => (
                    <RangeCell key={group.id} control={control} index={index} group={group} error={errors.subTests?.[index]?.ranges?.[group.id]?.message} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" className="mt-1.5" onClick={() => append({ name: '', unit: '', ranges: {}, limits: {} })}>
          <Plus size={14} aria-hidden /> Add sub-test
        </Button>
      </fieldset>

      <label className="col-span-6 flex min-h-10 cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
        <input type="checkbox" className="size-4 accent-(--accent)" {...register('active')} />
        Active: staff can add this test to bills
      </label>
    </form>
  )
}
