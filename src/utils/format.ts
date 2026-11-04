const formatters = new Map<string, Intl.NumberFormat>()

function moneyFormat(currency: string, fraction: number) {
  const key = `${currency}:${fraction}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    })
    formatters.set(key, formatter)
  }
  return formatter
}

export function money(value: number, currency = 'INR', fraction = 0) {
  return moneyFormat(currency, fraction).format(value)
}

export const count = (value: number) => new Intl.NumberFormat('en-IN').format(value)

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
const longFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

export const fmtDate = (iso: string | Date) => dateFormat.format(new Date(iso))
export const fmtDay = (iso: string | Date) => dayFormat.format(new Date(iso))
export const fmtTime = (iso: string | Date) => timeFormat.format(new Date(iso))
export const fmtLong = (iso: string | Date) => longFormat.format(new Date(iso))
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`

export function startOfDay(date: Date | string = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysAgo(days: number, from: Date = new Date()) {
  const d = startOfDay(from)
  d.setDate(d.getDate() - days)
  return d
}

export function isoDay(date: Date | string) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const isToday = (iso: string) => isoDay(iso) === isoDay(new Date())

export function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return fmtDay(iso)
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

/** "40 yrs, Female", or the age alone when the patient's group does not record a gender. */
export const ageAndGender = (patient: { age: number; gender: string }) => (patient.gender === 'Other' ? `${patient.age} yrs` : `${patient.age} yrs, ${patient.gender}`)

export function formatTat(hours: number) {
  if (hours < 24) return `${hours} hr`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''}`
}
