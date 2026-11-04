import { useReducedMotion } from 'motion/react'
import { m } from 'motion/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Point {
  label: string
  value: number
}

const AXIS = { fill: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }

function compact(value: number) {
  if (value >= 100000) return `${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`
  if (value >= 10000) return `${Math.round(value / 1000)}K`
  return value.toLocaleString('en-IN')
}

function ChartTooltip({ active, payload, label, format, name }: { active?: boolean; payload?: { value?: number | string }[]; label?: string | number; format: (value: number) => string; name: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-line bg-surface px-2.5 py-1.5" style={{ boxShadow: 'var(--shadow-sheet)' }}>
      <p className="text-xs text-ink-3">{label}</p>
      <p className="text-[13px] text-ink-2">
        {name} <span className="ml-1 font-mono font-medium text-ink">{format(Number(payload[0].value))}</span>
      </p>
    </div>
  )
}

interface ChartProps {
  data: Point[]
  name: string
  format?: (value: number) => string
  height?: number
  ariaLabel: string
}

const plain = (value: number) => value.toLocaleString('en-IN')

const tickGap = (count: number) => (count > 14 ? 'preserveStartEnd' : 0)

export function TrendArea({ data, name, format = plain, height = 240, ariaLabel }: ChartProps) {
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--line-2)' }} interval={tickGap(data.length)} minTickGap={22} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={46} tickFormatter={compact} />
          <Tooltip content={<ChartTooltip format={format} name={name} />} cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }} isAnimationActive={false} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2, fill: 'var(--accent)' }}
            isAnimationActive={!reduced}
            animationDuration={760}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendLine({ data, name, format = plain, height = 200, ariaLabel }: ChartProps) {
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--line-2)' }} interval={tickGap(data.length)} minTickGap={22} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <Tooltip content={<ChartTooltip format={format} name={name} />} cursor={{ stroke: 'var(--ink-3)', strokeWidth: 1 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2, fill: 'var(--accent)' }} isAnimationActive={!reduced} animationDuration={760} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Columns({ data, name, format = plain, height = 170, ariaLabel }: ChartProps) {
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--line-2)' }} interval={tickGap(data.length)} minTickGap={18} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
          <Tooltip content={<ChartTooltip format={format} name={name} />} cursor={{ fill: 'var(--surface-2)' }} isAnimationActive={false} />
          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduced} animationDuration={620} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface Part {
  name: string
  value: number
  /** CSS variable holding the fixed categorical colour for this entity. */
  color: string
  /** Near-black label for the one light slot in the palette. */
  darkLabel?: boolean
}

/** Tall segmented bar: one whole split into parts, with a legend that doubles as the table view. */
export function SegmentBar({ parts, format = plain }: { parts: Part[]; format?: (value: number) => string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0) || 1
  const summary = parts.map((part) => `${part.name} ${Math.round((part.value / total) * 100)}%`).join(', ')
  return (
    <div>
      <div role="img" aria-label={summary} className="flex h-7 gap-0.5">
        {parts
          .filter((part) => part.value > 0)
          .map((part) => {
            const share = (part.value / total) * 100
            return (
              <m.div
                key={part.name}
                title={`${part.name}: ${format(part.value)} (${share.toFixed(1)}%)`}
                initial={{ flexGrow: 0.001 }}
                animate={{ flexGrow: part.value }}
                transition={{ duration: 0.62, ease: [0.22, 0.8, 0.24, 1] }}
                className="flex min-w-0 basis-0 items-center overflow-hidden rounded-sm px-1.5 text-[11px] font-semibold"
                style={{ background: `var(${part.color})`, color: part.darkLabel ? '#0b0b0b' : '#fff' }}
              >
                {share >= 8 && `${Math.round(share)}%`}
              </m.div>
            )
          })}
      </div>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-8 gap-y-1">
        {parts.map((part) => (
          <li key={part.name} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: `var(${part.color})` }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-2">{part.name}</span>
            <span className="font-mono text-xs text-ink">{format(part.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
