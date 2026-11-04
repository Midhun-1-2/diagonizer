import type { ReactNode } from 'react'
import type { Patient } from '../../types'
import { ageAndGender, fmtDate, initials } from '../../utils/format'

/** A patient is shown as a physical lab ID card, scanned on hover. */
export function IdCard({ patient, children, large }: { patient: Patient; children?: ReactNode; large?: boolean }) {
  return (
    <div className="slab slab-accent scan p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`grid shrink-0 place-items-center rounded-2xl bg-white/20 font-display font-bold ${large ? 'size-16 text-xl' : 'size-12 text-sm'}`} aria-hidden>
          {initials(patient.name)}
        </span>
        <div className="min-w-40 flex-1">
          <p className="font-mono text-[10.5px] tracking-[0.2em] uppercase opacity-80">{patient.code}</p>
          <p className={`font-display leading-tight font-bold tracking-[-0.02em] ${large ? 'text-[clamp(1.5rem,3vw,2.25rem)]' : 'text-lg'}`}>{patient.name}</p>
          <p className="text-[13px] opacity-90">
            {ageAndGender(patient)} · <span className="font-mono text-xs">{patient.phone}</span>
          </p>
        </div>
        <div className="hidden text-right sm:block" aria-hidden>
          <span className="block h-7 w-24 opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 4px, currentColor 4px 5px, transparent 5px 9px)' }} />
          <span className="mt-1 block font-mono text-[10px] opacity-75">Since {fmtDate(patient.registeredAt)}</span>
        </div>
        {children}
      </div>
    </div>
  )
}
