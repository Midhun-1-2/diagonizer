import { Suspense, type CSSProperties } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../../data/store'
import { PageSkeleton } from '../ui/Skeleton'
import { Dock, PhoneBar } from './Dock'
import { HOME_FOR_ROLE, NAV_ITEMS, sectionOf } from './nav'
import { Breadcrumbs, TopPill } from './TopPill'

const BARS = [0, 1, 2, 3, 4, 5]

/** Remounts per section so the sweep plays on navigation. CSS only, and it never blocks input. */
function Curtain({ label }: { label: string }) {
  return (
    <div className="curtain" aria-hidden>
      {BARS.map((bar) => (
        <span key={bar} style={{ '--i': bar } as CSSProperties} />
      ))}
      <b>{label}</b>
    </div>
  )
}

export default function AppShell() {
  const session = useSession()
  const { pathname } = useLocation()
  const section = sectionOf(pathname)
  if (!session) return null

  const items = NAV_ITEMS.filter((item) => item.roles.includes(session.role))
  const known = NAV_ITEMS.some((item) => item.path === section)
  if (known && !items.some((item) => item.path === section)) {
    return <Navigate to={HOME_FOR_ROLE[session.role]} replace />
  }

  const label = NAV_ITEMS.find((item) => item.path === section)?.label ?? ''

  return (
    <div className="relative min-h-dvh">
      <Curtain key={section} label={label} />
      <Dock items={items} />
      <TopPill />
      <main className="relative min-w-0 pb-28 md:pb-12 md:pl-[88px]">
        <Breadcrumbs />
        <div key={section}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <PhoneBar items={items} />
    </div>
  )
}
