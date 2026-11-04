import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'

interface PopoverProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'dialog' }) => ReactNode
  children: (close: () => void) => ReactNode
  width?: string
  label: string
}

/** Anchors to the nearest positioned ancestor on phones (the top pill), and to its trigger from tablet up. */
export function Popover({ trigger, children, width = 'md:w-80', label }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="md:relative">
      {trigger({ onClick: () => setOpen((value) => !value), 'aria-expanded': open, 'aria-haspopup': 'dialog' })}
      <AnimatePresence>
        {open && (
          <m.div
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: -14, rotateX: -32 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -8, rotateX: -16, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{ transformPerspective: 800, transformOrigin: '80% 0' }}
            className={`slab absolute top-full right-0 z-50 mt-2.5 max-h-[calc(100dvh-5rem)] w-[calc(100vw-1.5rem)] overflow-y-auto ${width}`}
          >
            {children(() => setOpen(false))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
