import { Children, isValidElement, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronDown } from 'lucide-react'
import { controlClass } from './Field'

interface SelectProps {
  value: string
  onChange: (event: { target: { value: string; name?: string } }) => void
  onBlur?: () => void
  children: ReactNode
  name?: string
  id?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  ref?: Ref<HTMLButtonElement>
}

const OPTION_HEIGHT = 40
const MAX_HEIGHT = 264

/**
 * Themed replacement for the native select, whose popup list is drawn by the OS and cannot follow the
 * app theme. It takes the same <option> children. The list is portalled so modals and panels cannot clip it.
 */
export function Select({ value, onChange, onBlur, children, name, id, disabled, className = '', ref, ...aria }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<CSSProperties>({})
  const button = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const listId = useId()

  useImperativeHandle(ref, () => button.current as HTMLButtonElement)

  const options = Children.toArray(children)
    .filter((child): child is ReactElement<{ value?: string; children?: ReactNode }> => isValidElement(child))
    .map((child) => {
      const label = Children.toArray(child.props.children).join('')
      return { value: child.props.value ?? label, label }
    })
  const selectedIndex = options.findIndex((option) => option.value === value)
  const shown = selectedIndex >= 0 ? options[selectedIndex].label : value

  const show = () => {
    if (disabled || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const height = Math.min(options.length * OPTION_HEIGHT + 12, MAX_HEIGHT)
    const below = window.innerHeight - rect.bottom - 12
    const above = rect.top - 12
    const up = below < height && above > below
    setPlace({
      position: 'fixed',
      left: rect.left,
      width: Math.max(rect.width, 150),
      maxHeight: Math.min(MAX_HEIGHT, up ? above : below),
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    })
    setActive(Math.max(selectedIndex, 0))
    setOpen(true)
  }

  const choose = (index: number) => {
    const option = options[index]
    if (option && option.value !== value) onChange({ target: { value: option.value, name } })
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!button.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    // The list is fixed to the screen, so moving the page underneath it must close it.
    const onMove = (event: Event) => {
      if (!list.current?.contains(event.target as Node)) setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        show()
      }
      return
    }
    if (key === 'Escape') {
      // Stops here so a surrounding dialog stays open.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    } else if (key === 'Tab') {
      setOpen(false)
    } else if (key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, options.length - 1))
    } else if (key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (key === 'End') {
      event.preventDefault()
      setActive(options.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      choose(active)
    } else if (key.length === 1) {
      const now = Date.now()
      typed.current = { text: now - typed.current.at > 700 ? key : typed.current.text + key, at: now }
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(typed.current.text.toLowerCase()))
      if (match >= 0) setActive(match)
    }
  }

  return (
    <span className={`block min-w-0 ${className}`}>
      <button
        ref={button}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false)
          onBlur?.()
        }}
        className={`${controlClass} flex items-center justify-between gap-2 pr-3 text-left`}
        {...aria}
      >
        <span className="min-w-0 truncate">{shown}</span>
        <ChevronDown size={15} className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <m.ul
              ref={list}
              id={listId}
              role="listbox"
              aria-label={aria['aria-label']}
              initial={{ opacity: 0, y: -8, rotateX: -24 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              style={{ ...place, transformPerspective: 700, transformOrigin: '50% 0' }}
              // Keeps focus on the trigger so the list does not close itself on blur.
              onMouseDown={(event) => event.preventDefault()}
              className="slab z-[75] overflow-y-auto rounded-xl! p-1.5 text-sm"
            >
              {options.map((option, index) => {
                const selected = index === selectedIndex
                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={selected}
                    onClick={() => choose(index)}
                    onPointerMove={() => setActive(index)}
                    className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-100 ${index === active ? 'bg-accent-soft text-ink' : 'text-ink-2'} ${selected ? 'font-semibold text-ink' : ''}`}
                  >
                    <span className="min-w-0">{option.label}</span>
                    {selected && <Check size={15} className="shrink-0 text-accent-text" aria-hidden />}
                  </li>
                )
              })}
            </m.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  )
}
