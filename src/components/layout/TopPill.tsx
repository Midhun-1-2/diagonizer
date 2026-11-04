import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Bell, ChevronRight, LogOut, Plus, Settings as SettingsIcon } from 'lucide-react'
import { markNotificationRead, markNotificationsRead, setSession, useLab, useSession } from '../../data/store'
import { useToast } from '../../contexts/ToastProvider'
import { initials, relativeTime } from '../../utils/format'
import { buttonClass, IconButton } from '../ui/Button'
import { Popover } from '../ui/Popover'
import { LogoMark } from './Logo'
import { MASTER_TABS, NAV_ITEMS, ROLE_LABEL, sectionOf } from './nav'
import { ThemeMenu } from './ThemePicker'

/** Printed on the stage at the top of each page, so it scrolls away with the hero. */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const { id } = useParams()
  const patients = useLab((state) => state.patients)
  const section = NAV_ITEMS.find((item) => item.path === sectionOf(pathname))
  const patient = id ? patients.find((p) => p.id === id) : undefined
  const leaf = patient?.name ?? MASTER_TABS.find((tab) => tab.path === pathname)?.label
  return (
    <div className="absolute top-3.5 left-3 z-10 flex items-center gap-2 text-[13px] md:top-5 md:left-[100px]">
      <Link to="/" className="md:hidden" aria-label="Meniscus home">
        <LogoMark className="size-8" onStage />
      </Link>
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 md:flex">
        <span className="text-on-stage-2">Lab</span>
        <ChevronRight size={13} className="text-on-stage-2" aria-hidden />
        {leaf ? (
          <>
            <Link to={section?.path ?? '/'} className="py-2 font-medium text-on-stage-2 hover:text-on-stage">
              {section?.label}
            </Link>
            <ChevronRight size={13} className="text-on-stage-2" aria-hidden />
            <span aria-current="page" className="font-semibold text-on-stage">
              {leaf}
            </span>
          </>
        ) : (
          <span aria-current="page" className="font-semibold text-on-stage">
            {section?.label ?? 'Not found'}
          </span>
        )}
      </nav>
    </div>
  )
}

function NotificationMenu() {
  const all = useLab((state) => state.notifications)
  const session = useSession()
  const navigate = useNavigate()
  const notifications = all.filter((n) => !n.roles || (session && n.roles.includes(session.role)))
  const unread = notifications.filter((n) => !n.read).length
  return (
    <Popover
      label="Notifications"
      width="md:w-96"
      trigger={(props) => (
        <IconButton onStage label={unread ? `Notifications, ${unread} unread` : 'Notifications'} {...props}>
          <Bell size={18} />
          {unread > 0 && <span className="absolute top-2 right-2 size-2 rounded-full ring-2 ring-[var(--dock)]" style={{ background: 'var(--stage-glow)' }} aria-hidden />}
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink">Notifications</p>
            <button type="button" disabled={unread === 0} onClick={markNotificationsRead} className="text-[13px] font-semibold text-accent-text hover:underline disabled:text-ink-3 disabled:no-underline">
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => {
                    markNotificationRead(notification.id)
                    navigate(notification.to)
                    close()
                  }}
                  className="flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-surface-2"
                >
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${notification.read ? 'bg-transparent' : 'bg-accent'}`} aria-hidden />
                  <span className="min-w-0">
                    <span className={`block text-[13px] text-ink ${notification.read ? 'font-medium' : 'font-bold'}`}>{notification.title}</span>
                    <span className="block text-[13px] text-ink-2">{notification.body}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">{relativeTime(notification.at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Popover>
  )
}

function ProfileMenu() {
  const session = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  if (!session) return null
  return (
    <Popover
      label="Profile"
      width="md:w-64"
      trigger={(props) => (
        <button
          type="button"
          aria-label={`Profile menu for ${session.name}`}
          className="grid size-10 place-items-center rounded-full text-xs font-bold text-[#04211a] transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{ background: 'var(--stage-glow)' }}
          {...props}
        >
          {initials(session.name)}
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="border-b border-line px-4 py-3.5">
            <p className="font-display font-semibold text-ink">{session.name}</p>
            <p className="text-[13px] text-ink-2">{ROLE_LABEL[session.role]}</p>
            <p className="truncate text-[13px] text-ink-3">{session.email}</p>
          </div>
          <div className="p-2">
            {session.role === 'owner' && (
              <Link to="/settings" onClick={close} className="flex h-11 items-center gap-2.5 rounded-xl px-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                <SettingsIcon size={16} aria-hidden /> Settings
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setSession(null)
                toast({ tone: 'info', title: 'Signed out' })
                navigate('/login')
              }}
              className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut size={16} aria-hidden /> Sign out
            </button>
          </div>
        </>
      )}
    </Popover>
  )
}

export function TopPill() {
  const session = useSession()
  const { pathname } = useLocation()
  const canBill = session?.role !== 'technical'
  return (
    <div className="slab-stage fixed top-2.5 right-3 z-40 flex items-center gap-0.5 rounded-full p-1 md:top-3 md:right-5 print:hidden">
      {canBill && pathname !== '/billing' && (
        <span className="mr-1 hidden md:block">
          <Link to="/billing" className={`${buttonClass('primary', 'sm')} rounded-full!`}>
            <Plus size={15} aria-hidden /> New bill
          </Link>
        </span>
      )}
      <ThemeMenu />
      <NotificationMenu />
      <ProfileMenu />
    </div>
  )
}
