import { useState } from 'react'
import { Controller, type Control } from 'react-hook-form'
import type { TestInput } from '../../data/store'
import type { AgeGroupEntry } from '../../types'
import { ageRangeLabel, composeRange, parseRange } from '../../utils/results'
import { Input } from '../ui/Field'

const boxClass = 'h-9! min-w-0 bg-surface! px-2! font-mono text-[13px]!'

/** Digits and one decimal point only, so a typo cannot reach the result sheet. */
const cleanNumber = (text: string) => (text.match(/^\d*\.?\d*/)?.[0] ?? '')

/** From and To boxes over the stored range text. Text ranges such as "Normal" stay until a number is typed. */
function RangeBoxes({ value, onChange, label }: { value: string; onChange: (range: string) => void; label: string }) {
  const start = parseRange(value)
  const [from, setFrom] = useState(start.from)
  const [to, setTo] = useState(start.to)
  const [text, setText] = useState(start.text)

  const change = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom)
    setTo(nextTo)
    setText('')
    onChange(composeRange(nextFrom, nextTo))
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        <Input aria-label={`${label} range from`} inputMode="decimal" placeholder="From" value={from} onChange={(event) => change(cleanNumber(event.target.value), to)} className={boxClass} />
        <Input aria-label={`${label} range to`} inputMode="decimal" placeholder="To" value={to} onChange={(event) => change(from, cleanNumber(event.target.value))} className={boxClass} />
      </div>
      {text && (
        <span className="mt-0.5 block truncate text-[11px] text-ink-3" title={text}>
          Now: {text}
        </span>
      )}
    </>
  )
}

interface RangeCellProps {
  control: Control<TestInput>
  index: number
  group: AgeGroupEntry
  error?: string
}

/** One age group's normal range, with the lowest and highest result technical staff may enter below it. */
export function RangeCell({ control, index, group, error }: RangeCellProps) {
  const label = `Sub-test ${index + 1} ${group.name}`
  return (
    <div className="min-w-0">
      <span className="block truncate text-xs font-semibold text-ink-2" title={group.name}>
        {group.name}
      </span>
      <span className="block truncate text-[11px] text-ink-3">
        {ageRangeLabel(group)}, {group.gender === 'Any' ? 'any' : group.gender}
      </span>
      <span className="mt-1 block text-[11px] font-semibold text-ink-3">Range</span>
      <Controller control={control} name={`subTests.${index}.ranges.${group.id}`} defaultValue="" render={({ field }) => <RangeBoxes value={field.value ?? ''} onChange={field.onChange} label={label} />} />
      <span className="mt-1.5 block text-[11px] font-semibold text-ink-3">Result limit</span>
      <div className="grid grid-cols-2 gap-1">
        {(['min', 'max'] as const).map((side) => (
          <Controller
            key={side}
            control={control}
            name={`subTests.${index}.limits.${group.id}.${side}`}
            defaultValue=""
            render={({ field }) => <Input aria-label={`${label} ${side === 'min' ? 'minimum' : 'maximum'} result`} inputMode="decimal" placeholder={side === 'min' ? 'Min' : 'Max'} value={field.value ?? ''} onChange={(event) => field.onChange(cleanNumber(event.target.value))} onBlur={field.onBlur} className={boxClass} />}
          />
        ))}
      </div>
      {error && <p className="mt-0.5 text-[11px] leading-tight font-medium text-danger">{error}</p>}
    </div>
  )
}
