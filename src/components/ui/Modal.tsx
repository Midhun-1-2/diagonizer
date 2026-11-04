import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'motion/react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-4xl' }

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  size?: keyof typeof SIZES
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ open, onClose, title, subtitle, size = 'md', footer, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const body = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>('[data-modal-body] input, [data-modal-body] select')
    ;(body ?? panel.current)?.focus({ preventScroll: true })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
      }
      if (event.key !== 'Tab' || !panel.current) return
      const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex items-end justify-center text-ink sm:items-center sm:p-6" style={{ perspective: 1200 }}>
          <m.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 70, z: -220, rotateX: -24 }}
            animate={{ opacity: 1, y: 0, z: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 30, z: -120, rotateX: 14, transition: { duration: 0.18, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 210, damping: 24, mass: 0.9 }}
            style={{ transformOrigin: '50% 100%' }}
            className={`slab relative flex max-h-[92dvh] w-full flex-col rounded-b-none! outline-none sm:rounded-b-[20px]! ${SIZES[size]}`}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-[17px] font-bold tracking-[-0.01em] text-ink">
                  {title}
                </h2>
                {subtitle && <div className="mt-0.5 text-[13px] text-ink-2">{subtitle}</div>}
              </div>
              <IconButton label="Close dialog" onClick={onClose} className="-mt-1.5 -mr-2">
                <X size={18} />
              </IconButton>
            </header>
            <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>
            {footer && <footer className="flex flex-wrap justify-end gap-2.5 border-t border-line px-5 py-3.5">{footer}</footer>}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
