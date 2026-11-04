/* eslint-disable react-refresh/only-export-components -- small shared helpers live beside their component. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

export const THEMES = [
  { id: 'green', name: 'Medical Green', note: 'Green and white', swatch: ['#0f6b4f', '#e2efe9', '#ffffff'] },
  { id: 'blue', name: 'Clinical Blue', note: 'Blue and white', swatch: ['#1c5fa8', '#e2ecf7', '#ffffff'] },
  { id: 'teal', name: 'Teal Care', note: 'Teal and white', swatch: ['#0b6e78', '#dff0f1', '#ffffff'] },
  { id: 'midnight', name: 'Midnight Professional', note: 'Dark navy, soft white', swatch: ['#86b4f5', '#111d33', '#0b1426'] },
  { id: 'emerald', name: 'Soft Emerald', note: 'Emerald, warm white', swatch: ['#04724f', '#e2f1e6', '#faf7f0'] },
  { id: 'mono', name: 'Minimal Monochrome', note: 'Charcoal and white', swatch: ['#232326', '#e9e9e7', '#ffffff'] },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export type Mode = 'light' | 'dark' | 'system'
export type MotionPref = 'full' | 'reduced'
export type Density = 'comfortable' | 'compact'

interface Appearance {
  theme: ThemeId
  mode: Mode
  motion: MotionPref
  density: Density
}

interface ThemeContextValue extends Appearance {
  resolvedMode: 'light' | 'dark'
  setAppearance: (patch: Partial<Appearance>) => void
}

const STORAGE_KEY = 'meniscus.appearance'
const DEFAULTS: Appearance = { theme: 'green', mode: 'light', motion: 'full', density: 'comfortable' }

function readAppearance(): Appearance {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

function resolveMode(appearance: Appearance, dark: boolean): 'light' | 'dark' {
  if (appearance.theme === 'midnight') return 'dark'
  if (appearance.mode === 'system') return dark ? 'dark' : 'light'
  return appearance.mode
}

function apply(appearance: Appearance, dark: boolean) {
  const root = document.documentElement
  root.dataset.theme = appearance.theme
  root.dataset.mode = resolveMode(appearance, dark)
  root.dataset.motion = appearance.motion
  root.dataset.density = appearance.density
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState(readAppearance)
  const [dark, setDark] = useState(systemDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    apply(appearance, dark)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
    } catch {
      // Theme still applies for this visit.
    }
  }, [appearance, dark])

  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    const commit = () =>
      flushSync(() =>
        setState((current) => {
          const next = { ...current, ...patch }
          apply(next, systemDark())
          return next
        }),
      )
    const paletteChange = 'theme' in patch || 'mode' in patch
    const reduced = document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (paletteChange && !reduced && 'startViewTransition' in document) {
      document.startViewTransition(commit)
    } else {
      commit()
    }
  }, [])

  const value = useMemo(
    () => ({ ...appearance, resolvedMode: resolveMode(appearance, dark), setAppearance }),
    [appearance, dark, setAppearance],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme needs ThemeProvider')
  return value
}
