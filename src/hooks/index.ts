import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLab } from '../data/store'
import { money } from '../utils/format'

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    },
    () => window.matchMedia(query).matches,
  )
}

/** Formatter bound to the currency chosen in Settings. */
export function useMoney() {
  const currency = useLab((state) => state.settings.currency)
  return (value: number, fraction = 0) => money(value, currency, fraction)
}

const loaded = new Set<string>()

/** Short skeleton on a page's first visit in a session, so repeat visits are instant. */
export function useFirstLoad(key: string, duration = 320) {
  const [loading, setLoading] = useState(() => !loaded.has(key))
  useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => {
      loaded.add(key)
      setLoading(false)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [key, duration, loading])
  return loading
}

export function usePagination<T>(items: T[], pageSize: number, resetKey: string) {
  const [state, setState] = useState({ page: 1, key: resetKey })
  const page = state.key === resetKey ? state.page : 1
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(page, pages)
  return {
    page: current,
    pages,
    rows: items.slice((current - 1) * pageSize, current * pageSize),
    setPage: (next: number) => setState({ page: next, key: resetKey }),
  }
}
