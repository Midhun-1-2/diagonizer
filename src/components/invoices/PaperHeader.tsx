import type { LabSettings } from '../../types'

/** The lab's letterhead, shared by printed invoices and lab reports. */
export function PaperHeader({ settings, label, number, date }: { settings: LabSettings; label: string; number: string; date: string }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: 'var(--paper-accent)' }}>
      <div className="flex min-w-0 items-start gap-3">
        {settings.logo ? (
          <img src={settings.logo} alt="" className="size-14 object-contain" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center border border-dashed border-[#a9b0ac] text-[10px] font-semibold tracking-wider text-[#6e7672]">LOGO</span>
        )}
        <div className="min-w-0">
          <p className="text-lg leading-tight font-bold">{settings.labName}</p>
          <p className="text-xs text-[#5a635e]">{settings.tagline}</p>
          <p className="mt-1 max-w-80 text-xs text-[#5a635e]">{settings.address}</p>
          <p className="text-xs text-[#5a635e]">
            {settings.phone} · {settings.email}
          </p>
        </div>
      </div>
      <div className="max-sm:w-full sm:text-right print:text-right">
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--paper-accent)' }}>
          {label}
        </p>
        <p className="mt-0.5 font-mono text-sm font-medium">{number}</p>
        <p className="text-xs text-[#5a635e]">{date}</p>
      </div>
    </header>
  )
}
