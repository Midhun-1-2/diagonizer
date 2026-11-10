import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FlaskConical, ListTree, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { deleteTest, saveTest, toggleTest, useLab, type TestInput } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { useFirstLoad, useMoney, usePagination } from '../hooks'
import type { LabTest } from '../types'
import { formatTat } from '../utils/format'
import { rangeSummary } from '../utils/results'
import { Button, IconButton } from '../components/ui/Button'
import { EmptyState, PageHero, Pagination, Panel } from '../components/ui/Common'
import { SearchInput, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { CapDot, sampleMeta } from '../components/ui/Tube'
import { MasterTabs } from '../components/tests/MasterTabs'
import { TestForm } from '../components/tests/TestForm'

const PAGE_SIZE = 12

function ActiveSwitch({ test }: { test: LabTest }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={test.active}
      aria-label={`${test.name} is ${test.active ? 'active' : 'inactive'}`}
      onClick={() => toggleTest(test.id)}
      className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-ink-2"
    >
      <span className={`well relative h-[22px] w-10 rounded-full p-0! transition-colors duration-200 ${test.active ? 'bg-accent!' : ''}`}>
        <span className={`absolute top-[2px] left-[2px] size-4 rounded-full bg-white shadow-[0_2px_3px_rgb(0_0_0/0.35)] transition-transform duration-250 ease-(--ease-lab) ${test.active ? 'translate-x-[18px]' : ''}`} />
      </span>
      {test.active ? 'Active' : 'Inactive'}
    </button>
  )
}

/** Each test is a card that physically turns over to show its sub-tests. */
function TestCard({ test, index, onEdit, onDelete }: { test: LabTest; index: number; onEdit: () => void; onDelete: () => void }) {
  const [flipped, setFlipped] = useState(false)
  const money = useMoney()
  return (
    <li className="deal min-w-0" style={{ '--i': Math.min(index, 9) } as CSSProperties}>
      <div className="flip h-[236px]" data-flipped={flipped}>
        <div className="flip-inner">
          <div className={`flip-face flip-front slab flex flex-col overflow-hidden p-4 ${test.active ? '' : 'opacity-70'}`}>
            <span aria-hidden className="absolute top-0 right-6 h-5 w-12 rounded-b-lg" style={{ background: sampleMeta(test.sampleType).cap }} />
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">{test.code}</p>
            <h3 className="mt-1 line-clamp-2 pr-14 font-display text-[16px] leading-snug font-semibold tracking-[-0.015em] text-ink">{test.name}</h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
              <span>{test.category}</span>
              <span className="inline-flex items-center gap-1">
                <CapDot type={test.sampleType} /> {test.sampleType}
              </span>
              <span>{formatTat(test.tatHours)}</span>
            </p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-2">
              <p className="font-mono text-[22px] leading-none font-medium tracking-tight text-ink">{money(test.price)}</p>
              <ActiveSwitch test={test} />
            </div>
            <div className="mt-2.5 flex items-center gap-1 border-t border-line pt-2">
              <Button size="sm" className="mr-auto" onClick={() => setFlipped(true)} aria-label={`Show sub-tests of ${test.name}`}>
                <ListTree size={14} aria-hidden /> {test.subTests.length} sub-test{test.subTests.length === 1 ? '' : 's'}
              </Button>
              <IconButton label={`Edit ${test.name}`} onClick={onEdit}>
                <Pencil size={15} />
              </IconButton>
              <IconButton label={`Delete ${test.name}`} onClick={onDelete} className="hover:bg-danger-soft! hover:text-danger!">
                <Trash2 size={15} />
              </IconButton>
            </div>
          </div>
          <div className="flip-face flip-back slab slab-accent flex flex-col overflow-hidden p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-display text-sm font-semibold">{test.name}</p>
              <button type="button" onClick={() => setFlipped(false)} aria-label={`Turn back ${test.name}`} className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 transition-colors hover:bg-white/25">
                <Undo2 size={15} />
              </button>
            </div>
            <ul className="mt-2 min-h-0 flex-1 divide-y divide-white/20 overflow-y-auto pr-1 text-xs [scrollbar-color:rgb(255_255_255/0.4)_transparent]">
              {test.subTests.map((subTest) => (
                <li key={subTest.name} className="flex items-baseline justify-between gap-3 py-1">
                  <span className="font-medium">{subTest.name}</span>
                  <span className="text-right font-mono opacity-85">
                    {rangeSummary(subTest)} {subTest.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </li>
  )
}

export default function Tests() {
  const tests = useLab((state) => state.tests)
  const categories = useLab((state) => state.categories)
  const toast = useToast()
  const loading = useFirstLoad('tests')
  const [params, setParams] = useSearchParams()

  const [department, setDepartment] = useState('All')
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<{ test: LabTest | null } | null>(() => (params.get('new') ? { test: null } : null))
  const [deleting, setDeleting] = useState<LabTest | null>(null)

  useEffect(() => {
    if (params.get('new')) setParams({}, { replace: true })
  }, [params, setParams])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    tests.forEach((test) => map.set(test.category, (map.get(test.category) ?? 0) + 1))
    return map
  }, [tests])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tests.filter((test) => {
      if (department !== 'All' && test.category !== department) return false
      if (status === 'Active' && !test.active) return false
      if (status === 'Inactive' && test.active) return false
      if (!term) return true
      return test.name.toLowerCase().includes(term) || test.code.toLowerCase().includes(term)
    })
  }, [tests, department, status, query])

  const { page, pages, rows, setPage } = usePagination(filtered, PAGE_SIZE, `${department}|${status}|${query}`)

  const submit = (values: TestInput) => {
    const editing = editor?.test
    saveTest(editing?.id ?? null, { ...values, code: values.code.toUpperCase() })
    setEditor(null)
    toast({ tone: 'success', title: editing ? 'Test updated' : 'Test added', body: values.name })
  }

  const takenCodes = useMemo(() => tests.filter((test) => test.id !== editor?.test?.id).map((test) => test.code), [tests, editor])
  const departments = ['All', ...categories.map((category) => category.name)]

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero
        title="Investigation Management"
        subtitle={`${tests.length} investigations across ${counts.size} departments.`}
        actions={
          <Button variant="primary" onClick={() => setEditor({ test: null })}>
            <Plus size={17} aria-hidden /> Add test
          </Button>
        }
      />

      <MasterTabs />

      {/* Departments and search share one row where the width allows, and wrap where it does not. */}
      <Panel i={0} className="mb-4" bodyClass="p-3">
        <div className="flex flex-col gap-x-3 gap-y-2 md:flex-row md:flex-wrap md:items-center">
          <div role="tablist" aria-label="Department" className="-mx-3 flex gap-2 overflow-x-auto px-3 pt-0.5 pb-1.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-1">
            {departments.map((name) => {
              const active = name === department
              return (
                <button key={name} type="button" role="tab" aria-selected={active} onClick={() => setDepartment(name)} className={`key flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap ${active ? 'key-primary' : ''}`}>
                  {name}
                  <span className={`font-mono text-[11px] ${active ? 'opacity-85' : 'text-ink-3'}`}>{name === 'All' ? tests.length : (counts.get(name) ?? 0)}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2 sm:grid-cols-[minmax(0,1fr)_132px] md:min-w-80 md:flex-1">
            <SearchInput label="Search tests" value={query} onChange={setQuery} placeholder="Test name or code" />
            <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="All">All</option>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
        </div>
      </Panel>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="slab h-[236px] p-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-3 h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState icon={FlaskConical} title="No tests here" body="Change the department or search, or add a new investigation." action={<Button onClick={() => setEditor({ test: null })}>Add test</Button>} />
        </Panel>
      ) : (
        <ul key={`${department}-${page}`} className="grid gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((test, index) => (
            <TestCard key={test.id} test={test} index={index} onEdit={() => setEditor({ test })} onDelete={() => setDeleting(test)} />
          ))}
        </ul>
      )}
      {!loading && rows.length > 0 && (
        <div className="slab-stage mt-5 rounded-2xl px-4 [&_nav]:text-on-stage-2 [&_button]:text-on-stage [&_button:hover]:bg-white/10">
          <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />
        </div>
      )}

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        size="xl"
        title={editor?.test ? `Edit ${editor.test.name}` : 'Add test'}
        footer={
          <>
            <Button onClick={() => setEditor(null)}>Cancel</Button>
            <Button type="submit" form="test-form" variant="primary">
              {editor?.test ? 'Save changes' : 'Add test'}
            </Button>
          </>
        }
      >
        {editor && <TestForm formId="test-form" test={editor.test} takenCodes={takenCodes} onSubmit={submit} />}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        size="sm"
        title="Delete this test?"
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Keep test</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleting) return
                deleteTest(deleting.id)
                toast({ tone: 'info', title: 'Test deleted', body: deleting.name })
                setDeleting(null)
              }}
            >
              Delete test
            </Button>
          </>
        }
      >
        <p className="text-ink-2">
          <strong className="text-ink">{deleting?.name}</strong> will leave the catalogue. Existing invoices keep their copy of it. To hide it from billing only, mark it inactive instead.
        </p>
      </Modal>
    </div>
  )
}
