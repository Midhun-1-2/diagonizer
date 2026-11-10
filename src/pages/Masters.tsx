import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteMaster, masterUsage, saveMaster, useLab, type MasterKind } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import type { AgeGroupEntry, AgeUnit, DepartmentEntry, MasterEntry, SampleTypeEntry } from '../types'
import { AGE_UNITS, ageRangeLabel, ageUnitOf, groupYears } from '../utils/results'
import { Button, IconButton } from '../components/ui/Button'
import { EmptyState, PageHero, Panel } from '../components/ui/Common'
import { Field, Input, SearchInput, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { MasterTabs } from '../components/tests/MasterTabs'

const CONFIG: Record<string, { kind: MasterKind; title: string; singular: string; note: string; placeholder: string }> = {
  categories: { kind: 'categories', title: 'Department Master', singular: 'department', note: 'Departments that tests belong to. The order no. sets the order they are listed in.', placeholder: 'For example, Histopathology' },
  'sample-types': { kind: 'sampleTypes', title: 'Sample Type Master', singular: 'sample type', note: 'Containers and cap colours shown across billing and the lab.', placeholder: 'For example, Heparin Plasma' },
  units: { kind: 'units', title: 'Unit Master', singular: 'unit', note: 'Measurement units offered in each sub-test dropdown.', placeholder: 'For example, mg/dL' },
  'age-groups': { kind: 'ageGroups', title: 'Age Group Master', singular: 'age group', note: 'Age ranges linked to a gender. Each one gets its own normal range box in every test.', placeholder: 'For example, Adult Female' },
}

const CAP_COLORS = ['#7e5bb5', '#d9a521', '#7d8490', '#4fa3d9', '#e7c33d', '#8b5e3c', '#c7cdc9', '#4e9e6b', '#c8443c', '#e87ba4']

interface FormValues {
  name: string
  container: string
  cap: string
  ageUnit: AgeUnit
  ageFrom?: number
  ageTo?: number
  gender: string
  orderNo?: number
}

interface MasterFormProps {
  formId: string
  kind: MasterKind
  entry: MasterEntry | null
  siblings: MasterEntry[]
  onSubmit: (values: FormValues) => void
}

function MasterForm({ formId, kind, entry, siblings, onSubmit }: MasterFormProps) {
  const isSample = kind === 'sampleTypes'
  const isAge = kind === 'ageGroups'
  const isDepartment = kind === 'categories'
  const takenNames = siblings.map((sibling) => sibling.name.toLowerCase())
  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Enter a name')
        .refine((name) => !takenNames.includes(name.toLowerCase()), 'This name already exists'),
      container: isSample ? z.string().trim().min(2, 'Describe the container, such as Green cap, heparin') : z.string(),
      cap: z.string(),
      ageUnit: z.enum(AGE_UNITS),
      ageFrom: z.number({ error: 'Enter the starting age' }).int('Use whole numbers').min(0, 'Age cannot be negative').optional(),
      ageTo: z.number({ error: 'Enter the ending age' }).int('Use whole numbers').optional(),
      gender: z.string(),
      orderNo: z.number({ error: 'Enter the order no.' }).int('Use a whole number').min(1, 'Start from 1').max(999, 'Use 999 or less').optional(),
    })
    .superRefine((values, context) => {
      if (isDepartment && values.orderNo === undefined) context.addIssue({ code: 'custom', path: ['orderNo'], message: 'Enter the order no.' })
      if (!isAge) return
      const from = values.ageFrom ?? 0
      const to = values.ageTo ?? 0
      if (to < from) context.addIssue({ code: 'custom', path: ['ageTo'], message: 'Must not be below the starting age' })
      const mine = groupYears({ ageUnit: values.ageUnit, ageFrom: from, ageTo: to })
      if (mine.to > 150) context.addIssue({ code: 'custom', path: ['ageTo'], message: 'Use 150 years or less' })
      // One patient must match one group, so ranges for the same gender cannot overlap.
      const clash = (siblings as AgeGroupEntry[]).find((other) => (other.gender === 'Any' || values.gender === 'Any' || other.gender === values.gender) && mine.from <= groupYears(other).to && mine.to >= groupYears(other).from)
      if (clash) context.addIssue({ code: 'custom', path: ['ageFrom'], message: `Overlaps ${clash.name} (${ageRangeLabel(clash)})` })
    })
  const sample = entry as SampleTypeEntry | null
  const age = entry as AgeGroupEntry | null
  const department = entry as DepartmentEntry | null
  // A new department goes to the end of the list unless staff pick another number.
  const nextOrderNo = Math.max(0, ...(siblings as DepartmentEntry[]).map((sibling) => sibling.orderNo ?? 0)) + 1
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: entry?.name ?? '', container: sample?.container ?? '', cap: sample?.cap ?? CAP_COLORS[0], ageUnit: age ? ageUnitOf(age) : 'Years', ageFrom: age?.ageFrom, ageTo: age?.ageTo, gender: age?.gender ?? 'Any', orderNo: isDepartment ? (department?.orderNo ?? nextOrderNo) : undefined },
  })
  // The age boxes are labelled in whichever unit is picked.
  const unitWord = (useWatch({ control, name: 'ageUnit' }) ?? 'Years').toLowerCase()
  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
      <Field label="Name" required error={errors.name?.message}>
        {(field) => <Input data-autofocus {...field} {...register('name')} />}
      </Field>
      {isDepartment && (
        <Field label="Order no." required error={errors.orderNo?.message}>
          {(field) => <Input type="number" inputMode="numeric" min={1} className="font-mono" {...field} {...register('orderNo', { valueAsNumber: true })} />}
        </Field>
      )}
      {isAge && (
        <>
          <Field label="Age unit" required error={errors.ageUnit?.message}>
            {(field) => (
              <Controller
                control={control}
                name="ageUnit"
                render={({ field: input }) => (
                  <Select {...field} {...input}>
                    {AGE_UNITS.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </Select>
                )}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Age from (${unitWord})`} required error={errors.ageFrom?.message}>
              {(field) => <Input type="number" inputMode="numeric" min={0} className="font-mono" {...field} {...register('ageFrom', { valueAsNumber: true })} />}
            </Field>
            <Field label={`Age to (${unitWord})`} required error={errors.ageTo?.message}>
              {(field) => <Input type="number" inputMode="numeric" min={0} className="font-mono" {...field} {...register('ageTo', { valueAsNumber: true })} />}
            </Field>
          </div>
          <Field label="Gender" required error={errors.gender?.message}>
            {(field) => (
              <Controller
                control={control}
                name="gender"
                render={({ field: input }) => (
                  <Select {...field} {...input}>
                    <option value="Any">Any gender</option>
                    <option>Male</option>
                    <option>Female</option>
                  </Select>
                )}
              />
            )}
          </Field>
        </>
      )}
      {isSample && (
        <>
          <Field label="Container" required error={errors.container?.message}>
            {(field) => <Input placeholder="For example, Green cap, heparin" {...field} {...register('container')} />}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Cap colour</legend>
            <Controller
              control={control}
              name="cap"
              render={({ field }) => (
                <div role="radiogroup" aria-label="Cap colour" className="flex flex-wrap gap-2">
                  {CAP_COLORS.map((color) => (
                    <button key={color} type="button" role="radio" aria-checked={field.value === color} aria-label={`Cap colour ${color}`} onClick={() => field.onChange(color)} className={`grid size-10 place-items-center rounded-xl ring-1 ring-black/15 transition-transform duration-150 hover:scale-105 ${field.value === color ? 'outline-2 outline-offset-2 outline-accent' : ''}`} style={{ background: color }}>
                      {field.value === color && <Check size={16} strokeWidth={3} className="text-white drop-shadow" aria-hidden />}
                    </button>
                  ))}
                </div>
              )}
            />
          </fieldset>
        </>
      )}
    </form>
  )
}

export default function Masters() {
  const { kind: slug = '' } = useParams()
  const config = CONFIG[slug]
  if (!config) return <Navigate to="/master/tests" replace />
  return <MasterList key={slug} {...config} />
}

function MasterList({ kind, title, singular, note }: (typeof CONFIG)[string]) {
  const entries = useLab((state) => state[kind])
  const tests = useLab((state) => state.tests)
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<{ entry: MasterEntry | null } | null>(null)
  const [deleting, setDeleting] = useState<MasterEntry | null>(null)

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return entries.filter((entry) => !term || entry.name.toLowerCase().includes(term))
  }, [entries, query])

  const siblings = entries.filter((entry) => entry.id !== editor?.entry?.id)

  const submit = (values: FormValues) => {
    const editing = editor?.entry
    saveMaster(kind, editing?.id ?? null, values)
    setEditor(null)
    toast({ tone: 'success', title: editing ? `${title.replace(' Master', '')} updated` : `${title.replace(' Master', '')} added`, body: values.name.trim() })
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero
        title={title}
        subtitle={`${entries.length} entries. ${note}`}
        actions={
          <Button variant="primary" onClick={() => setEditor({ entry: null })}>
            <Plus size={17} aria-hidden /> Add {singular}
          </Button>
        }
      />
      <MasterTabs />

      <Panel bodyClass="" className="mx-auto max-w-3xl">
        <div className="border-b border-line p-4">
          <SearchInput label={`Search ${title}`} value={query} onChange={setQuery} placeholder={`Search ${singular}`} />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing found" body={`Change the search, or add a new ${singular}.`} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((entry) => {
              const used = masterUsage(kind, entry, tests)
              const sample = kind === 'sampleTypes' ? (entry as SampleTypeEntry) : null
              const age = kind === 'ageGroups' ? (entry as AgeGroupEntry) : null
              const department = kind === 'categories' ? (entry as DepartmentEntry) : null
              return (
                <li key={entry.id} className="lift-row flex items-center gap-3 px-4" style={{ paddingBlock: 'var(--row-y)' }}>
                  {department && (
                    <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-lg bg-surface-2 px-1.5 font-mono text-[13px] font-semibold text-ink-2" title="Order no.">
                      <span className="sr-only">Order no. </span>
                      {department.orderNo}
                    </span>
                  )}
                  {sample && <span aria-hidden className="h-6 w-4 shrink-0 rounded-t-[4px] rounded-b-[2px] ring-1 ring-black/15" style={{ background: sample.cap }} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{entry.name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {sample ? `${sample.container} · ` : ''}
                      {age ? `${ageRangeLabel(age)} · ${age.gender === 'Any' ? 'Any gender' : age.gender} · ` : ''}
                      {used} test{used === 1 ? '' : 's'}
                    </span>
                  </span>
                  <IconButton label={`Edit ${entry.name}`} onClick={() => setEditor({ entry })}>
                    <Pencil size={15} />
                  </IconButton>
                  <IconButton label={`Delete ${entry.name}`} onClick={() => setDeleting(entry)} className="hover:bg-danger-soft! hover:text-danger!">
                    <Trash2 size={15} />
                  </IconButton>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        size="sm"
        title={editor?.entry ? `Edit ${editor.entry.name}` : `Add ${singular}`}
        subtitle={editor?.entry ? 'Tests using this name are updated too.' : undefined}
        footer={
          <>
            <Button onClick={() => setEditor(null)}>Cancel</Button>
            <Button type="submit" form="master-form" variant="primary">
              {editor?.entry ? 'Save changes' : `Add ${singular}`}
            </Button>
          </>
        }
      >
        {editor && <MasterForm formId="master-form" kind={kind} entry={editor.entry} siblings={siblings} onSubmit={submit} />}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        title={deleting && masterUsage(kind, deleting, tests) > 0 ? 'This is in use' : `Delete this ${singular}?`}
        footer={
          deleting && masterUsage(kind, deleting, tests) > 0 ? (
            <Button onClick={() => setDeleting(null)}>Close</Button>
          ) : (
            <>
              <Button onClick={() => setDeleting(null)}>Keep it</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (!deleting) return
                  deleteMaster(kind, deleting.id)
                  toast({ tone: 'info', title: 'Deleted', body: deleting.name })
                  setDeleting(null)
                }}
              >
                Delete
              </Button>
            </>
          )
        }
      >
        {deleting && (
          <p className="text-ink-2">
            {masterUsage(kind, deleting, tests) > 0 ? (
              <>
                <strong className="text-ink">{deleting.name}</strong> is used by {masterUsage(kind, deleting, tests)} test{masterUsage(kind, deleting, tests) === 1 ? '' : 's'}. Change those tests in Investigation Management first.
              </>
            ) : (
              <>
                <strong className="text-ink">{deleting.name}</strong> will be removed from the dropdowns.
              </>
            )}
          </p>
        )}
      </Modal>
    </div>
  )
}
