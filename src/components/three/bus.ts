/**
 * Plain module state shared between React and the WebGL loop. Pointer and scroll
 * movement write here instead of into React state, so they never cause a re-render.
 */
export const bus = {
  station: '/',
  pointerX: 0,
  pointerY: 0,
  scroll: 0,
  scrollEased: 0,
  towers: [] as number[],
  towersVersion: 0,
  /** Raised by the frame guard when this GPU cannot keep up: 0 full, then lower resolution, 3 minimal. */
  quality: 0,
  /** Portrait screens: stations sit behind the title, so some keep clear of it. */
  narrow: false,
}

export function setTowers(values: number[]) {
  bus.towers = values
  bus.towersVersion += 1
}

export function setStation(station: string) {
  bus.station = station
}

export type Tier = 'high' | 'low' | 'off'

let cached: Tier | null = null

/** Decides once how much 3D this device gets. Weak or motion-sensitive setups keep the CSS stage only. */
export function deviceTier(): Tier {
  if (cached) return cached
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let webgl: boolean
  try {
    webgl = Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    webgl = false
  }
  if (reduced || !webgl) {
    cached = 'off'
    return cached
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 8
  const coarse = window.matchMedia('(pointer: coarse)').matches
  cached = cores <= 4 || memory <= 4 || coarse ? 'low' : 'high'
  return cached
}
