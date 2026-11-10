import type { AgeGroupEntry, AgeUnit, Gender, Invoice, SubTest, SubTestResult } from '../types'

export type OrderStage = 'At lab' | 'Ready to collect' | 'Completed'

/** Where a bill is in its journey: lab first, then back to billing until the balance is cleared. */
export function orderStage(invoice: Invoice): OrderStage {
  if (invoice.items.some((item) => item.reportStatus !== 'Ready')) return 'At lab'
  return invoice.balance > 0 ? 'Ready to collect' : 'Completed'
}

/** Print and download stay locked until results are back and the full amount is collected. */
export const canRelease = (invoice: Invoice) => orderStage(invoice) === 'Completed'

/** When the last test on the order was finished. */
export function reportedAt(invoice: Invoice) {
  const finished = invoice.items.map((item) => item.completedAt).filter((date): date is string => Boolean(date))
  return finished.length > 0 ? finished.reduce((latest, date) => (date > latest ? date : latest)) : undefined
}

export const AGE_UNITS: AgeUnit[] = ['Years', 'Months', 'Days', 'Hours']

const PER_YEAR: Record<AgeUnit, number> = { Years: 1, Months: 12, Days: 365, Hours: 8760 }
const UNIT_SHORT: Record<AgeUnit, string> = { Years: 'yrs', Months: 'months', Days: 'days', Hours: 'hrs' }

export const ageUnitOf = (group: { ageUnit?: AgeUnit }): AgeUnit => group.ageUnit ?? 'Years'

/** A group's limits in years, so groups counted in different units can be compared. */
export function groupYears(group: { ageUnit?: AgeUnit; ageFrom: number; ageTo: number }) {
  const per = PER_YEAR[ageUnitOf(group)]
  return { from: group.ageFrom / per, to: group.ageTo / per }
}

/** "0–12 yrs", "0–28 days". */
export const ageRangeLabel = (group: { ageUnit?: AgeUnit; ageFrom: number; ageTo: number }) => `${group.ageFrom}–${group.ageTo} ${UNIT_SHORT[ageUnitOf(group)]}`

/** Patients are recorded in whole years, so a group counted in smaller units fits only the first year of life. */
export function ageFits(age: number, group: { ageUnit?: AgeUnit; ageFrom: number; ageTo: number }) {
  const { from, to } = groupYears(group)
  return age >= from && age <= to
}

/** Age groups that fit a patient, with gender-specific ones ahead of groups for any gender. */
export function matchAgeGroups(patient: { age: number; gender: Gender }, groups: AgeGroupEntry[]) {
  const fits = groups.filter((group) => ageFits(patient.age, group) && (group.gender === 'Any' || group.gender === patient.gender))
  return [...fits].sort((a, b) => Number(a.gender === 'Any') - Number(b.gender === 'Any'))
}

/** Whole years from 0 to 120, the same limits as the patient form. */
export const isValidAge = (age: string) => /^\d{1,3}$/.test(age.trim()) && Number(age) <= 120

/** Starts a blank result with the normal range the owner set for this patient group. */
export function toResult(subTest: SubTest, group: AgeGroupEntry | undefined, value = ''): SubTestResult {
  const range = group ? (subTest.ranges?.[group.id]?.trim() ?? '') : ''
  return { name: subTest.name, unit: subTest.unit, range, rangeSource: range ? group?.name : undefined, value }
}

/** Range for one group, or a single line for all of them where no group is known yet. */
export function rangeSummary(subTest: SubTest, group?: AgeGroupEntry) {
  if (group) return subTest.ranges?.[group.id]?.trim() || '–'
  const values = [...new Set(Object.values(subTest.ranges ?? {}).map((range) => range.trim()).filter(Boolean))]
  if (values.length === 0) return '–'
  return values.length === 1 ? values[0] : 'Varies by group'
}

/** H or L against a numeric normal range such as "13.0 – 17.0", "< 200" or "> 40". Text ranges get no flag. */
export function rangeFlag(value: string, range: string): 'H' | 'L' | '' {
  const result = Number(value.trim())
  if (value.trim() === '' || Number.isNaN(result)) return ''
  const limits = range.trim().replace(/,/g, '')
  const between = limits.match(/^(\d*\.?\d+)\s*[–-]\s*(\d*\.?\d+)/)
  if (between) {
    if (result < Number(between[1])) return 'L'
    return result > Number(between[2]) ? 'H' : ''
  }
  const below = limits.match(/^<\s*(\d*\.?\d+)/)
  if (below) return result >= Number(below[1]) ? 'H' : ''
  const above = limits.match(/^>\s*(\d*\.?\d+)/)
  if (above) return result <= Number(above[1]) ? 'L' : ''
  return ''
}

/** Plausible sample value for seed data, mostly normal with an occasional abnormal reading. */
export function sampleResult(range: string, random: () => number) {
  const limits = range.trim().replace(/,/g, '')
  const round = (value: number, like: string) => value.toFixed(like.includes('.') ? like.split('.')[1].length : value < 20 ? 1 : 0)
  const abnormal = random() < 0.12
  const between = limits.match(/^(\d*\.?\d+)\s*[–-]\s*(\d*\.?\d+)/)
  if (between) {
    const low = Number(between[1])
    const high = Number(between[2])
    const value = abnormal ? high * (1.05 + random() * 0.2) : low + (high - low) * random()
    return round(value, between[2])
  }
  const below = limits.match(/^<\s*(\d*\.?\d+)/)
  if (below) return round(Number(below[1]) * (abnormal ? 1.05 + random() * 0.4 : 0.4 + random() * 0.55), below[1])
  const above = limits.match(/^>\s*(\d*\.?\d+)/)
  if (above) return round(Number(above[1]) * (abnormal ? 0.6 + random() * 0.35 : 1.05 + random() * 0.5), above[1])
  return range.split('/')[0].trim() || 'Normal'
}
