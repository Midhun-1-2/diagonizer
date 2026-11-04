import { useEffect, useRef } from 'react'
import { useTheme } from '../../contexts/ThemeProvider'

const INTERACTIVE = 'a,button,[role="button"],[role="radio"],select,label[for]'

/**
 * A ring trailing the mouse, plus the pull on primary buttons. One delegated listener,
 * no React state, and the loop stops as soon as the ring catches up.
 */
export function Cursor() {
  const { motion } = useTheme()
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ring.current
    if (!el || motion === 'reduced') return
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let x = 0
    let y = 0
    let cx = 0
    let cy = 0
    let frame = 0
    let magnet: HTMLElement | null = null

    const step = () => {
      cx += (x - cx) * 0.22
      cy += (y - cy) * 0.22
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      frame = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(step) : 0
    }
    const releaseMagnet = () => {
      if (!magnet) return
      magnet.style.removeProperty('--mag-x')
      magnet.style.removeProperty('--mag-y')
      magnet = null
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      x = event.clientX
      y = event.clientY
      el.dataset.on = 'true'
      if (!frame) frame = requestAnimationFrame(step)
      const target = event.target as Element
      el.dataset.hot = target.closest?.(INTERACTIVE) ? 'true' : 'false'
      const next = target.closest?.<HTMLElement>('[data-magnetic]') ?? null
      if (next !== magnet) releaseMagnet()
      magnet = next
      if (magnet) {
        const rect = magnet.getBoundingClientRect()
        magnet.style.setProperty('--mag-x', `${(x - rect.left - rect.width / 2) * 0.14}px`)
        magnet.style.setProperty('--mag-y', `${(y - rect.top - rect.height / 2) * 0.22}px`)
      }
    }
    const onLeave = () => {
      el.dataset.on = 'false'
      releaseMagnet()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [motion])

  return <div ref={ring} className="cursor-ring" aria-hidden />
}
