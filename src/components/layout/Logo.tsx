/** The mark is a tube seen side on; the curved liquid line is the meniscus the product is named after. */
export function LogoMark({ className = 'size-7', onStage }: { className?: string; onStage?: boolean }) {
  const line = onStage ? 'var(--on-stage)' : 'var(--ink)'
  const tick = onStage ? 'var(--on-stage-2)' : 'var(--ink-3)'
  const fill = onStage ? 'var(--stage-glow)' : 'var(--accent)'
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <path d="M9 2.5h10M10.5 2.5v18.2a3.5 3.5 0 0 0 7 0V2.5" fill="none" stroke={line} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.5 11.5q3.5 3.4 7 0v9.2a3.5 3.5 0 0 1-7 0z" fill={fill} />
      <path d="M20.5 7h3M20.5 11.5h2M20.5 16h3" stroke={tick} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ onStage }: { onStage?: boolean }) {
  return <span className={`font-display text-[17px] font-bold tracking-[-0.03em] ${onStage ? 'text-on-stage' : 'text-ink'}`}>Meniscus</span>
}
