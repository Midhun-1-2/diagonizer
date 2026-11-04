import { useEffect, useState } from 'react'
import { useTheme } from '../../contexts/ThemeProvider'

const KEY = 'meniscus.preloaded'

function alreadyShown() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/** First load of a session only. It overlays the page, which is already rendering underneath. */
export function Preloader() {
  const { motion } = useTheme()
  const [visible, setVisible] = useState(() => !alreadyShown() && motion !== 'reduced')
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // Shown again next load, which is harmless.
    }
    let frame = 0
    const start = performance.now()
    const tick = (time: number) => {
      const progress = Math.min((time - start) / 1050, 1)
      setPercent(Math.round((1 - (1 - progress) ** 3) * 100))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const done = window.setTimeout(() => setVisible(false), 1700)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(done)
    }
  }, [visible])

  if (!visible) return null
  return (
    <div className="preloader" aria-hidden>
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-40 w-14 overflow-hidden rounded-t-md rounded-b-[28px] border-2 border-white/40">
          <i className="absolute inset-x-0 bottom-0 block h-[88%]" style={{ background: 'var(--stage-glow)' }} />
        </div>
        <p className="font-display text-5xl font-bold tracking-tight tabular-nums">{percent}</p>
        <p className="font-mono text-[11px] tracking-[0.3em] text-on-stage-2 uppercase">Calibrating</p>
      </div>
    </div>
  )
}
