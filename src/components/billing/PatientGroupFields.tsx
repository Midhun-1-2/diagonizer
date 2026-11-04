import { useLab } from '../../data/store'
import type { Patient } from '../../types'
import { isValidAge, matchAgeGroups } from '../../utils/results'
import { Field, Input, Select } from '../ui/Field'

interface PatientGroupFieldsProps {
  patient: Patient
  age: string
  groupId: string
  showErrors: boolean
  onAge: (age: string) => void
  onGroup: (groupId: string) => void
}

/** Age and patient group for this bill. The group decides which normal ranges the lab sees. */
export function PatientGroupFields({ patient, age, groupId, showErrors, onAge, onGroup }: PatientGroupFieldsProps) {
  const groups = useLab((state) => state.ageGroups)
  const validAge = isValidAge(age)
  const fitting = validAge ? matchAgeGroups({ age: Number(age), gender: patient.gender }, groups)[0] : undefined
  const groupHint = fitting ? (fitting.id === groupId ? 'Picked from age and gender.' : `${fitting.name} fits this age and gender.`) : 'No group fits this age and gender. Choose one.'

  return (
    <div className="slab mt-3 grid gap-x-3 gap-y-3 p-4 sm:grid-cols-[120px_minmax(0,1fr)]">
      <Field label="Age (years)" required error={showErrors && !validAge ? 'Enter age from 0 to 120' : undefined}>
        {(field) => <Input {...field} type="number" inputMode="numeric" min={0} max={120} value={age} onChange={(event) => onAge(event.target.value)} className="font-mono" />}
      </Field>
      <Field label="Patient group" required error={showErrors && !groupId ? 'Choose the patient group' : undefined} hint={groupHint}>
        {(field) => (
          <Select {...field} value={groupId} onChange={(event) => onGroup(event.target.value)}>
            <option value="">Choose group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {`${group.name}, ${group.ageFrom}–${group.ageTo} yrs`}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  )
}
