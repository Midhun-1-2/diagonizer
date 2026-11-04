import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { IconButton } from './Button'

export function SplitWords({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.split(' ').map((word, index) => (
          <span key={`${word}-${index}`} className="word-mask mr-[0.26em] last:mr-0">
            <span className="word" style={{ '--i': start + index } as CSSProperties}>
              {word}
            </span>
          </span>
        ))}
      </span>
    </>
  )
}

interface PageHeroProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

/** Page title printed straight onto the 3D stage, kept short so the work starts high on the screen. */
export function PageHero({ title, subtitle, actions }: PageHeroProps) {
  return (
    <header className="hero-scroll stage-title flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pt-16 pb-5 md:min-h-31 md:pt-14">
      <div className="min-w-0 max-w-3xl">
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.035em] text-on-stage">
          <SplitWords text={title} />
        </h1>
        {subtitle && <div className="mt-1 max-w-2xl text-sm text-on-stage-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">{children}</h2>
      {aside && <div className="text-[13px] text-ink-3">{aside}</div>}
    </div>
  )
}

interface PanelProps {
  i?: number
  title?: ReactNode
  aside?: ReactNode
  className?: string
  bodyClass?: string
  children: ReactNode
}

/** A slab that comes into focus in place. Outer element runs the entry, inner one the scroll fade, so they never fight. */
export function Panel({ i = 0, title, aside, className = '', bodyClass = 'p-4 md:p-5', children }: PanelProps) {
  return (
    <div className={`deal min-w-0 ${className}`} style={{ '--i': i } as CSSProperties}>
      <section className={`slab rise h-full ${bodyClass}`}>
        {title && <SectionTitle aside={aside}>{title}</SectionTitle>}
        {children}
      </section>
    </div>
  )
}

/** Small tile that gets the analyser scan on hover. */
export function Tile({ i = 0, className = '', tone = '', children }: { i?: number; className?: string; tone?: string; children: ReactNode }) {
  return (
    <div className={`deal min-w-0 ${className}`} style={{ '--i': i } as CSSProperties}>
      <div className={`slab rise scan h-full p-4 md:p-5 ${tone}`}>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Icon size={26} className="text-ink-3" strokeWidth={1.5} aria-hidden />
      <p className="mt-3 font-display font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-ink-2">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (page: number) => void }) {
  if (total === 0) return null
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 py-2 text-[13px] text-ink-2">
      <span className="tnum">
        Page {page} of {pages} · {total} records
      </span>
      <span className="flex gap-1">
        <IconButton label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={17} />
        </IconButton>
        <IconButton label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={17} />
        </IconButton>
      </span>
    </nav>
  )
}
