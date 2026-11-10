import { BarChart3, Database, Gauge, HandCoins, Microscope, ReceiptIndianRupee, ScrollText, Settings, UsersRound, type LucideIcon } from 'lucide-react'
import type { Role } from '../../types'

export interface NavItem {
  path: string
  label: string
  crumb?: string
  icon: LucideIcon
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Gauge, roles: ['owner', 'billing', 'technical'] },
  { path: '/patients', label: 'Patients', icon: UsersRound, roles: ['owner', 'billing', 'technical'] },
  { path: '/billing', label: 'Billing', icon: ReceiptIndianRupee, roles: ['owner', 'billing'] },
  { path: '/collections', label: 'Collections', icon: HandCoins, roles: ['owner', 'billing'] },
  { path: '/results', label: 'Lab Results', icon: Microscope, roles: ['owner', 'technical'] },
  { path: '/invoices', label: 'Invoices', icon: ScrollText, roles: ['owner', 'billing'] },
  { path: '/master', label: 'Master', icon: Database, roles: ['owner'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
]

export const MASTER_TABS = [
  { path: '/master/tests', label: 'Test Management' },
  { path: '/master/categories', label: 'Department Master' },
  { path: '/master/sample-types', label: 'Sample Type Master' },
  { path: '/master/units', label: 'Unit Master' },
  { path: '/master/age-groups', label: 'Age Group Master' },
]

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Lab owner',
  billing: 'Billing staff',
  technical: 'Technical staff',
}

export const HOME_FOR_ROLE: Record<Role, string> = {
  owner: '/',
  billing: '/billing',
  technical: '/results',
}

export function sectionOf(pathname: string) {
  return `/${pathname.split('/')[1] ?? ''}`
}
