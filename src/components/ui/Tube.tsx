/* eslint-disable react-refresh/only-export-components -- small shared helpers live beside their component. */
import { m } from 'motion/react'
import { getLab } from '../../data/store'
import type { SampleType } from '../../types'

/** Container details from the Sample Type Master. They stay fixed across themes. */
export function sampleMeta(type: SampleType) {
  return getLab().sampleTypes.find((entry) => entry.name === type) ?? { cap: '#9aa5a0', liquid: '#8d1f2a', container: type }
}

export function CapDot({ type }: { type: SampleType }) {
  const meta = sampleMeta(type)
  return (
    <span
      title={`${type}: ${meta.container}`}
      className="inline-block h-2.5 w-2 shrink-0 rounded-t-[2px] rounded-b-[1px] ring-1 ring-black/15"
      style={{ background: meta.cap }}
      aria-hidden
    />
  )
}

/** One vacutainer, drawn in SVG so the fill level can animate on the compositor. */
export function TubeGraphic({ type, delay = 0, className = 'h-23 w-6.5' }: { type: SampleType; delay?: number; className?: string }) {
  const meta = sampleMeta(type)
  return (
    <svg viewBox="0 0 26 92" className={`overflow-visible ${className}`} aria-hidden>
      <defs>
        <clipPath id={`tube-${type.replace(/\s/g, '')}`}>
          <path d="M6 16h14v62a7 7 0 0 1-14 0z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#tube-${type.replace(/\s/g, '')})`}>
        <rect x="6" y="16" width="14" height="70" fill="var(--surface)" />
        <m.rect
          x="6"
          y="34"
          width="14"
          height="52"
          fill={meta.liquid}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: delay + 0.2, ease: [0.22, 0.8, 0.24, 1] }}
          style={{ transformBox: 'fill-box', originY: 1 }}
        />
        <rect x="7.5" y="18" width="2.2" height="60" fill="#fff" opacity="0.28" />
      </g>
      <path d="M6 16h14v62a7 7 0 0 1-14 0z" fill="none" stroke="var(--line-2)" strokeWidth="1" />
      <rect x="4" y="3" width="18" height="14" rx="2" fill={meta.cap} />
      <rect x="4" y="12.5" width="18" height="1.2" fill="#000" opacity="0.14" />
    </svg>
  )
}
