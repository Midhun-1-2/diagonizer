import { Monitor, Moon, Palette, Sun } from 'lucide-react'
import { THEMES, useTheme, type Mode } from '../../contexts/ThemeProvider'
import { IconButton } from '../ui/Button'
import { Segmented } from '../ui/Field'
import { Popover } from '../ui/Popover'

/** Each swatch is a small vial, filled with the theme's accent over its page colour. */
function Vial({ swatch, active }: { swatch: readonly string[]; active: boolean }) {
  return (
    <svg viewBox="0 0 34 46" className={`h-12 w-9 transition-transform duration-300 ease-(--ease-lab) ${active ? '-translate-y-1 rotate-6' : 'group-hover:-translate-y-1 group-hover:-rotate-6'}`} aria-hidden>
      <rect x="9" y="2" width="16" height="7" rx="1.5" fill="#6b716d" />
      <path d="M10 9h14v28a7 7 0 0 1-14 0z" fill={swatch[2]} stroke="var(--line-2)" />
      <path d="M10.5 24q6.5 4 13 0v13a6.5 6.5 0 0 1-13 0z" fill={swatch[0]} />
      <path d="M10.5 16q6.5 3 13 0v8q-6.5 4-13 0z" fill={swatch[1]} />
    </svg>
  )
}

function ThemeGrid() {
  const { theme, setAppearance } = useTheme()
  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-3 gap-1.5">
      {THEMES.map((option) => {
        const active = option.id === theme
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAppearance({ theme: option.id })}
            className={`group flex flex-col items-center gap-1 rounded-xl border px-1 pt-2 pb-1.5 text-center transition-colors duration-150 ${
              active ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2'
            }`}
          >
            <Vial swatch={option.swatch} active={active} />
            <span className="text-xs leading-tight font-semibold text-ink">{option.name}</span>
          </button>
        )
      })}
    </div>
  )
}

function ModeControl() {
  const { mode, theme, setAppearance } = useTheme()
  const locked = theme === 'midnight'
  return (
    <div>
      <Segmented<Mode>
        label="Appearance"
        value={locked ? 'dark' : mode}
        onChange={(next) => {
          if (!locked) setAppearance({ mode: next })
        }}
        className={`flex w-full ${locked ? 'pointer-events-none opacity-60' : ''}`}
        options={[
          { value: 'light', label: <><Sun size={14} aria-hidden /> Light</> },
          { value: 'dark', label: <><Moon size={14} aria-hidden /> Dark</> },
          { value: 'system', label: <><Monitor size={14} aria-hidden /> System</> },
        ]}
      />
      {locked && <p className="mt-1.5 text-xs text-ink-3">Midnight Professional is always dark.</p>}
    </div>
  )
}

export function ThemeMenu() {
  return (
    <Popover
      label="Theme"
      width="md:w-84"
      trigger={(props) => (
        <IconButton onStage label="Change theme" {...props}>
          <Palette size={18} />
        </IconButton>
      )}
    >
      {() => (
        <div className="space-y-3 p-3.5">
          <p className="px-1 font-display text-sm font-semibold text-ink">Theme</p>
          <ThemeGrid />
          <ModeControl />
        </div>
      )}
    </Popover>
  )
}
