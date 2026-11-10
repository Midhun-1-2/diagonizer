import { useMemo, useState } from 'react'
import { ArrowRight, CheckCheck, FlaskConical } from 'lucide-react'
import { moveTests, useLab } from '../data/store'
import { useToast } from '../contexts/ToastProvider'
import { useMoney } from '../hooks'
import { Button } from '../components/ui/Button'
import { EmptyState, PageHero, Panel } from '../components/ui/Common'
import { Select, SearchInput } from '../components/ui/Field'
import { MasterTabs } from '../components/tests/MasterTabs'

/** Moves investigations from one department to another, a few at a time or the whole department. */
export default function InvestigationUpdater() {
  const tests = useLab((state) => state.tests)
  const categories = useLab((state) => state.categories)
  const toast = useToast()
  const money = useMoney()

  const [source, setSource] = useState(() => categories.find((category) => tests.some((test) => test.category === category.name))?.name ?? categories[0]?.name ?? '')
  const [target, setTarget] = useState('')
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')

  const countIn = (department: string) => tests.filter((test) => test.category === department).length
  const inSource = useMemo(() => tests.filter((test) => test.category === source), [tests, source])
  const term = query.trim().toLowerCase()
  const shown = useMemo(() => inSource.filter((test) => !term || test.name.toLowerCase().includes(term) || test.code.toLowerCase().includes(term)), [inSource, term])
  const chosen = inSource.filter((test) => picked.has(test.id))
  const allShownPicked = shown.length > 0 && shown.every((test) => picked.has(test.id))
  const targets = categories.filter((category) => category.name !== source)
  const ready = chosen.length > 0 && target !== ''

  const changeSource = (name: string) => {
    setSource(name)
    setPicked(new Set())
    setQuery('')
    if (name === target) setTarget('')
  }

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setPicked((current) => {
      const next = new Set(current)
      for (const test of shown) {
        if (allShownPicked) next.delete(test.id)
        else next.add(test.id)
      }
      return next
    })

  const move = () => {
    if (!ready) return
    moveTests(chosen.map((test) => test.id), target)
    toast({ tone: 'success', title: `${chosen.length} investigation${chosen.length === 1 ? '' : 's'} moved`, body: `${source} to ${target}` })
    setPicked(new Set())
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 md:px-6">
      <PageHero title="Investigation Updater" subtitle="Move investigations from one department to another. Bills already saved keep the department they were billed under." />
      <MasterTabs />

      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel i={0} bodyClass="">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">From</h2>
            <span className="text-[13px] text-ink-3">
              {countIn(source)} in {source || 'this department'}
            </span>
          </div>
          <div className="grid gap-2 border-b border-line px-4 pb-4 sm:grid-cols-2">
            <Select aria-label="Move from department" value={source} onChange={(event) => changeSource(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>{`${category.name} (${countIn(category.name)})`}</option>
              ))}
            </Select>
            <SearchInput label="Search investigations in this department" value={query} onChange={setQuery} placeholder="Search name or code" />
          </div>

          {inSource.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No investigations here" body="Pick another department to move investigations from." />
          ) : shown.length === 0 ? (
            <EmptyState icon={FlaskConical} title="No match" body="Change the search to see this department's investigations." />
          ) : (
            <>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line bg-surface-2/60 px-4 text-[13px] font-semibold text-ink-2">
                <input type="checkbox" className="size-4 accent-(--accent)" checked={allShownPicked} onChange={toggleAll} />
                {term ? `Select all ${shown.length} shown` : `Select all ${shown.length}`}
                <span className="ml-auto font-mono text-xs font-medium text-ink-3">{picked.size} selected</span>
              </label>
              <ul className="max-h-[56dvh] divide-y divide-line overflow-y-auto">
                {shown.map((test) => (
                  <li key={test.id}>
                    <label className={`lift-row flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 ${picked.has(test.id) ? 'bg-accent-soft' : ''}`}>
                      <input type="checkbox" className="size-4 shrink-0 accent-(--accent)" checked={picked.has(test.id)} onChange={() => toggle(test.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{test.name}</span>
                        <span className="block truncate text-xs text-ink-3">
                          <span className="font-mono">{test.code}</span> · {test.sampleType} · {test.subTests.length} sub-test{test.subTests.length === 1 ? '' : 's'}
                          {!test.active && ' · Inactive'}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[13px] text-ink-2">{money(test.price)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel i={1} title="Move to" className="lg:sticky lg:top-[68px]">
          <div className="space-y-4">
            <Select aria-label="Move to department" value={target} onChange={(event) => setTarget(event.target.value)}>
              <option value="">Choose department</option>
              {targets.map((category) => (
                <option key={category.id} value={category.name}>{`${category.name} (${countIn(category.name)})`}</option>
              ))}
            </Select>

            <div className="well rounded-2xl p-3.5">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <span className="min-w-0 truncate">{source || '–'}</span>
                <ArrowRight size={15} className="shrink-0 text-accent-text" aria-hidden />
                <span className={`min-w-0 truncate ${target ? '' : 'text-ink-3'}`}>{target || 'Choose department'}</span>
              </div>
              {chosen.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-3">Tick the investigations to move.</p>
              ) : (
                <>
                  <p className="mt-2 text-[13px] text-ink-2">
                    <strong className="text-ink">{chosen.length}</strong> investigation{chosen.length === 1 ? '' : 's'} selected
                  </p>
                  <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                    {chosen.map((test) => (
                      <li key={test.id} className="rounded-lg bg-surface px-2 py-1 text-xs font-medium text-ink-2 ring-1 ring-line">
                        {test.name}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <Button variant="primary" className="w-full" disabled={!ready} onClick={move}>
              <CheckCheck size={16} aria-hidden /> {chosen.length > 0 ? `Move ${chosen.length} investigation${chosen.length === 1 ? '' : 's'}` : 'Move investigations'}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
