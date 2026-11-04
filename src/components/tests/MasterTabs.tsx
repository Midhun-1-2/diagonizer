import { NavLink } from 'react-router-dom'
import { MASTER_TABS } from '../layout/nav'

/** Switches between the owner's master lists. */
export function MasterTabs() {
  return (
    <nav aria-label="Master lists" className="slab-stage mb-4 flex gap-1 overflow-x-auto rounded-2xl p-1 [scrollbar-width:none]">
      {MASTER_TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `flex h-10 shrink-0 flex-1 items-center justify-center rounded-xl px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-[#04211a]' : 'text-on-stage-2 hover:bg-white/10 hover:text-on-stage'}`
          }
          style={({ isActive }) => (isActive ? { background: 'var(--stage-glow)' } : undefined)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
