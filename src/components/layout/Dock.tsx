import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { m } from 'motion/react'
import { MoreHorizontal } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { LogoMark } from './Logo'
import { sectionOf, type NavItem } from './nav'

const ITEM = 52
const PRIORITY = ['/billing', '/results', '/', '/patients', '/collections', '/invoices', '/master', '/reports', '/settings']

/** Floating dock on tablet and up: icons magnify under the pointer and a capsule of liquid marks the section. */
export function Dock({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()
  const active = items.findIndex((item) => item.path === sectionOf(pathname))
  return (
    <aside className="slab-stage fixed top-1/2 left-3 z-40 hidden w-[64px] -translate-y-1/2 flex-col items-center rounded-[22px] py-3 md:flex print:hidden [scrollbar-width:none] [@media(max-height:560px)]:max-h-[calc(100dvh-1rem)] [@media(max-height:560px)]:overflow-y-auto">
      <Link to="/" aria-label="Meniscus home" className="mb-2 grid size-11 place-items-center transition-transform duration-300 hover:rotate-12">
        <LogoMark className="size-8" onStage />
      </Link>
      <nav aria-label="Main" className="relative">
        {active >= 0 && (
          <m.span
            aria-hidden
            className="absolute top-1 left-1 size-11 rounded-2xl"
            style={{ background: 'linear-gradient(to bottom, var(--stage-glow), color-mix(in srgb, var(--stage-glow) 62%, #000))', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.5), 0 3px 0 color-mix(in srgb, var(--stage-glow) 40%, #000), 0 0 22px color-mix(in srgb, var(--stage-glow) 45%, transparent)' }}
            initial={false}
            animate={{ y: active * ITEM }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          />
        )}
        <ul>
          {items.map((item, index) => {
            const Icon = item.icon
            const isActive = index === active
            return (
              <li key={item.path} className="dock-item group relative" style={{ height: ITEM }}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  aria-label={item.label}
                  className={`relative grid size-[52px] place-items-center rounded-2xl transition-colors duration-200 ${isActive ? 'text-[#04211a]' : 'text-on-stage-2 hover:text-on-stage'}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden />
                </NavLink>
                <span className="slab-stage pointer-events-none absolute top-1/2 left-[62px] -translate-y-1/2 -translate-x-2 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap opacity-0 transition-[opacity,translate] duration-150 group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden>
                  {item.label}
                </span>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

/** Phones get a floating thumb bar: four priority sections, the rest behind More. */
export function PhoneBar({ items }: { items: NavItem[] }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const section = sectionOf(pathname)
  const sorted = [...items].sort((a, b) => PRIORITY.indexOf(a.path) - PRIORITY.indexOf(b.path))
  const needsMore = sorted.length > 5
  const primary = needsMore ? sorted.slice(0, 4) : sorted
  const overflow = needsMore ? sorted.slice(4) : []
  const columns = primary.length + (needsMore ? 1 : 0)
  const inOverflow = overflow.some((item) => item.path === section)
  const activeIndex = inOverflow ? primary.length : primary.findIndex((item) => item.path === section)

  return (
    <>
      <nav aria-label="Main" className="slab-stage fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-[22px] md:hidden print:hidden">
        <div className="relative p-1">
          {activeIndex >= 0 && (
            <m.span
              aria-hidden
              className="absolute inset-y-1 left-1 rounded-2xl"
              style={{ width: `calc((100% - 0.5rem) / ${columns})`, background: 'var(--stage-glow)', boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.5), 0 2px 0 color-mix(in srgb, var(--stage-glow) 40%, #000)' }}
              initial={false}
              animate={{ x: `${activeIndex * 100}%` }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            />
          )}
          <ul className="relative grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {primary.map((item, index) => {
              const Icon = item.icon
              const active = index === activeIndex
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={`flex h-13 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors duration-200 ${active ? 'text-[#04211a]' : 'text-on-stage-2'}`}
                  >
                    <Icon size={19} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {item.path === '/' ? 'Home' : item.path === '/results' ? 'Results' : item.path === '/collections' ? 'Collect' : item.label}
                  </NavLink>
                </li>
              )
            })}
            {needsMore && (
              <li>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className={`flex h-13 w-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold ${inOverflow ? 'text-[#04211a]' : 'text-on-stage-2'}`}
                >
                  <MoreHorizontal size={19} aria-hidden />
                  More
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="-mx-2 -my-1">
          {overflow.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <NavLink to={item.path} onClick={() => setMoreOpen(false)} className="flex h-13 items-center gap-3 rounded-xl px-2 font-semibold text-ink hover:bg-surface-2">
                  <Icon size={19} className="text-accent-text" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </Modal>
    </>
  )
}
