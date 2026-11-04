import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeProvider'
import { bus, deviceTier, setStation } from './bus'

const Stage = lazy(() => import('./Stage'))

function sectionOf(pathname: string) {
  return `/${pathname.split('/')[1] ?? ''}`
}

/** Always-mounted backdrop. The WebGL bundle only loads after the page is idle, so it never delays first paint. */
export function StageHost() {
  const { pathname } = useLocation()
  const { motion } = useTheme()
  const [ready, setReady] = useState(false)
  const tier = motion === 'reduced' ? 'off' : deviceTier()

  useEffect(() => {
    setStation(sectionOf(pathname))
    bus.scroll = window.scrollY
  }, [pathname])

  useEffect(() => {
    if (tier === 'off') return
    const start = () => setReady(true)
    // Safari has no requestIdleCallback, whatever the DOM types claim.
    const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined
    if (idle) {
      const id = idle(start, { timeout: 900 })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(start, 400)
    return () => window.clearTimeout(timer)
  }, [tier])

  return (
    <>
      <div className="stage-bg" aria-hidden />
      {ready && tier !== 'off' && (
        <Suspense fallback={null}>
          <Stage tier={tier} />
        </Suspense>
      )}
    </>
  )
}
