import { useMemo, useRef, type PointerEvent } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { LabTest, SampleType } from '../../types'
import { sampleMeta, TubeGraphic } from '../ui/Tube'

/** The rack answers the phlebotomist's question as tests are added: what do I need to draw? */
export function TubeRack({ lines }: { lines: LabTest[] }) {
  const stage = useRef<HTMLDivElement>(null)
  const samples = useMemo(() => {
    const found = new Map<SampleType, number>()
    lines.forEach((line) => found.set(line.sampleType, (found.get(line.sampleType) ?? 0) + 1))
    return [...found.entries()]
  }, [lines])

  // Tilt is written straight to CSS variables so pointer movement never re-renders React.
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !stage.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    stage.current.style.transform = `rotateX(${8 - y * 10}deg) rotateY(${x * 14}deg)`
  }
  const rest = () => {
    if (stage.current) stage.current.style.transform = 'rotateX(8deg)'
  }

  return (
    <div onPointerMove={tilt} onPointerLeave={rest} className="px-4 pt-2 pb-1" style={{ perspective: 620 }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold text-ink">Samples to collect</p>
        <p className="font-mono text-xs text-ink-3">{samples.length} of 6 slots</p>
      </div>
      <div ref={stage} className="relative mt-1 h-19 transition-transform duration-200 ease-out" style={{ transform: 'rotateX(8deg)', transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}>
        {/* Empty sockets on the rack's top rail. */}
        <div aria-hidden className="absolute inset-x-0 bottom-3.5 flex justify-around px-2">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="h-1.5 w-[18px] rounded-[50%] bg-line" />
          ))}
        </div>
        <ul className="absolute inset-x-0 bottom-3 flex justify-around px-2">
          <AnimatePresence initial={false} mode="popLayout">
            {samples.slice(0, 6).map(([type, tests]) => (
              <m.li
                key={type}
                title={`${sampleMeta(type).container}: ${tests} test${tests > 1 ? 's' : ''}`}
                initial={{ y: -46, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0, transition: { duration: 0.16 } }}
                transition={{ duration: 0.34, ease: [0.22, 0.9, 0.3, 1] }}
                className="w-[18px]"
              >
                <TubeGraphic type={type} className="h-16 w-[18px]" />
              </m.li>
            ))}
          </AnimatePresence>
          {Array.from({ length: Math.max(0, 6 - samples.length) }, (_, index) => (
            <li key={`gap-${index}`} aria-hidden className="w-[18px]" />
          ))}
        </ul>
        {/* Front rail of the rack hides the tube bases. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-4 rounded-sm border border-line-2 bg-surface-2" style={{ transform: 'translateZ(10px)' }} />
      </div>
      <p className="mt-1.5 truncate text-xs text-ink-2">
        {samples.length === 0 ? 'Add tests and their tubes appear here.' : samples.map(([type]) => sampleMeta(type).container).join(' · ')}
      </p>
    </div>
  )
}
