const pad = (value: number) => String(value).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD, which is what a date box holds. */
export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Whole years, months and days from a date of birth up to today. Empty when the date is blank or in the future. */
export function ageParts(dob: string, now = new Date()) {
  const born = new Date(`${dob}T00:00:00`)
  if (!dob || Number.isNaN(born.getTime()) || born > now) return null
  let years = now.getFullYear() - born.getFullYear()
  let months = now.getMonth() - born.getMonth()
  let days = now.getDate() - born.getDate()
  if (days < 0) {
    months -= 1
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

/** The date of birth that makes someone exactly this many years, months and days old today. */
export function dobFromParts(years: number, months: number, days: number, now = new Date()) {
  const start = new Date(now.getFullYear() - years, now.getMonth() - months, 1)
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  start.setDate(Math.min(now.getDate(), lastDay))
  start.setDate(start.getDate() - days)
  return isoDate(start)
}
