/* eslint-disable react-refresh/only-export-components -- small shared helpers live beside their component. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: Tone
  title: string
  body?: string
}

const ToastContext = createContext<((toast: Omit<Toast, 'id'>) => void) | null>(null)

const LIFETIME = 4200
const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const TONE_CLASS = { success: 'text-ok', error: 'text-danger', info: 'text-accent-text' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismiss(id), LIFETIME)
    },
    [dismiss],
  )

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-16 z-70 mx-auto flex max-w-96 flex-col gap-2 md:top-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = ICONS[toast.tone]
            return (
              <m.div
                key={toast.id}
                initial={{ opacity: 0, x: 28, rotateY: -14 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: 18, transition: { duration: 0.16 } }}
                transition={{ duration: 0.3, ease: [0.22, 0.8, 0.24, 1] }}
                style={{ transformPerspective: 700, boxShadow: 'var(--shadow-float)' }}
                className="pointer-events-auto relative w-full overflow-hidden rounded-2xl border border-line bg-surface text-ink"
                role="status"
              >
                <div className="flex items-start gap-3 p-3 pr-2">
                  <Icon size={17} className={`mt-0.5 shrink-0 ${TONE_CLASS[toast.tone]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{toast.title}</p>
                    {toast.body && <p className="mt-0.5 text-[13px] text-ink-2">{toast.body}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                    className="grid size-7 shrink-0 place-items-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div
                  className={`toast-drain h-0.5 bg-current ${TONE_CLASS[toast.tone]}`}
                  style={{ animationDuration: `${LIFETIME}ms` }}
                />
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast needs ToastProvider')
  return value
}
