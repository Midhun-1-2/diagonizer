import { useMemo, useState, type CSSProperties, type Ref } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronDown, FlaskConical, Plus } from 'lucide-react'
import { useLab } from '../../data/store'
import { useMoney } from '../../hooks'
import type { AgeGroupEntry, LabTest } from '../../types'
import { formatTat } from '../../utils/format'
import { rangeSummary } from '../../utils/results'
import { orderableTests } from '../../utils/standalone'
import { EmptyState } from '../ui/Common'
import { SearchInput } from '../ui/Field'
import { CapDot, sampleMeta } from '../ui/Tube'

function TestCard({ test, selected, onToggle, index, group }: { test: LabTest; selected: boolean; onToggle: (test: LabTest) => void; index: number; group?: AgeGroupEntry }) {
  const [open, setOpen] = useState(false)
  const money = useMoney()
  const preview = test.subTests.slice(0, 3).map((s) => s.name).join(' · ')
  const extra = test.subTests.length - 3
  return (
    <li className="deal min-w-0" style={{ '--i': Math.min(index, 8) * 0.6 } as CSSProperties}>
      <div
        className={`scan relative h-full rounded-2xl border transition-[border-color,background-color,box-shadow] duration-200 ${
          selected ? 'border-accent bg-accent-soft shadow-[0_3px_0_var(--accent)]' : 'border-line bg-surface shadow-[0_3px_0_var(--line-2)] hover:border-line-2'
        }`}
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: sampleMeta(test.sampleType).cap }} />
        <div className="flex items-start gap-2.5 py-3 pr-2.5 pl-4">
          <button type="button" onClick={() => onToggle(test)} tabIndex={-1} className="min-w-0 flex-1 text-left">
            <span className="block leading-snug font-semibold text-ink">{test.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
              <span className="font-mono">{test.code}</span>
              <span className="inline-flex items-center gap-1">
                <CapDot type={test.sampleType} /> {test.sampleType}
              </span>
              <span>{formatTat(test.tatHours)}</span>
            </span>
            {!open && (
              <span className="mt-1 line-clamp-1 text-xs text-ink-2">
                {preview}
                {extra > 0 && ` +${extra} more`}
              </span>
            )}
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="font-mono text-[13px] font-medium text-ink">{money(test.price)}</span>
            <button
              type="button"
              onClick={() => onToggle(test)}
              aria-pressed={selected}
              aria-label={`${selected ? 'Remove' : 'Add'} ${test.name}`}
              className={`key grid size-9 place-items-center rounded-xl ${selected ? 'key-primary' : ''}`}
            >
              <span key={String(selected)} className="grid place-items-center">
                {selected ? <Check size={16} strokeWidth={2.8} /> : <Plus size={16} />}
              </span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} sub-tests of ${test.name}`}
          className="flex h-8 w-full items-center justify-center gap-1 border-t border-line text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {test.subTests.length} sub-test{test.subTests.length === 1 ? '' : 's'}
          <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: [0.22, 0.8, 0.24, 1] }} className="overflow-hidden">
              <table className="w-full text-xs">
                <caption className="sr-only">Sub-tests of {test.name}</caption>
                <thead>
                  <tr className="border-t border-line text-left text-ink-3">
                    <th scope="col" className="py-1.5 pl-4 font-semibold">Sub-test</th>
                    <th scope="col" className="py-1.5 font-semibold">Unit</th>
                    <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {test.subTests.map((subTest) => (
                    <tr key={subTest.name}>
                      <td className="py-1 pl-4 font-medium text-ink">{subTest.name}</td>
                      <td className="py-1 text-ink-2">{subTest.unit || '–'}</td>
                      <td className="py-1 pr-3 text-right font-mono text-ink-2">{rangeSummary(subTest, group)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  )
}

interface TestPickerProps {
  selectedIds: Set<string>
  onToggle: (test: LabTest) => void
  searchRef?: Ref<HTMLInputElement>
  /** Patient group on the bill, so sub-tests list the ranges that apply to this patient. */
  group?: AgeGroupEntry
}

/** Choose a department key, see its investigations as cards with their sub-tests, or search across everything. */
export function TestPicker({ selectedIds, onToggle, searchRef, group }: TestPickerProps) {
  const tests = useLab((state) => state.tests)
  const categories = useLab((state) => state.categories)
  const [department, setDepartment] = useState<string>(categories[0]?.name ?? '')
  const [query, setQuery] = useState('')

  const active = useMemo(() => orderableTests(tests).filter((t) => t.active), [tests])
  const departments = useMemo(() => {
    const names = [...categories.map((category) => category.name), ...active.map((t) => t.category)]
    return [...new Set(names)].map((name) => ({ name, total: active.filter((t) => t.category === name).length, picked: active.filter((t) => t.category === name && selectedIds.has(t.id)).length }))
  }, [active, categories, selectedIds])

  const term = query.trim().toLowerCase()
  const visible = useMemo(() => {
    if (term) {
      return active.filter((t) => t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term) || t.subTests.some((s) => s.name.toLowerCase().includes(term)))
    }
    return active.filter((t) => t.category === department)
  }, [active, department, term])

  return (
    <div className="slab p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-[15px] font-semibold text-ink">Department and investigations</h2>
        <SearchInput
          ref={searchRef}
          className="w-full sm:w-64"
          label="Search tests by name, code or sub-test"
          value={query}
          onChange={setQuery}
          placeholder="Search test or code"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && term && visible[0]) {
              event.preventDefault()
              if (!selectedIds.has(visible[0].id)) onToggle(visible[0])
              setQuery('')
            }
          }}
        />
      </div>
      <div role="tablist" aria-label="Department" className={`-mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-2.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 ${term ? 'opacity-50' : ''}`}>
        {departments.map((item) => {
          const isActive = !term && item.name === department
          return (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setDepartment(item.name)
                setQuery('')
              }}
              className={`key flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap ${isActive ? 'key-primary' : ''}`}
            >
              {item.name}
              <span className={`font-mono text-[11px] font-medium ${isActive ? 'opacity-85' : 'text-ink-3'}`}>{item.picked > 0 ? `${item.picked}/${item.total}` : item.total}</span>
            </button>
          )
        })}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No matching tests" body="Check the spelling, or search by test code such as HEM001." />
      ) : (
        <ul key={term ? 'search' : department} className="mt-1.5 grid items-start gap-3 xl:grid-cols-2">
          {visible.map((test, index) => (
            <TestCard key={test.id} test={test} index={index} selected={selectedIds.has(test.id)} onToggle={onToggle} group={group} />
          ))}
        </ul>
      )}
    </div>
  )
}
