import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'

export { Select } from './Select'

export const controlClass =
  'well h-11 w-full rounded-xl px-3.5 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-ink-3 disabled:opacity-60 aria-invalid:border-danger max-lg:text-base'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

export function Field({ label, error, hint, required, className = '', children }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-[13px] text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function Input({ className = '', ref, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={`${controlClass} ${className}`} {...props} />
}

export function Textarea({ className = '', ref, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={`${controlClass} h-auto min-h-20 py-2.5 ${className}`} {...props} />
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>['onKeyDown']
  ref?: Ref<HTMLInputElement>
}

export function SearchInput({ value, onChange, placeholder, label, className = '', onKeyDown, ref }: SearchInputProps) {
  return (
    <span className={`relative block ${className}`}>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${controlClass} pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:bg-line hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </span>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  label: string
  className?: string
  onStage?: boolean
}

export function Segmented<T extends string>({ value, options, onChange, label, className = '', onStage }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex gap-1 rounded-2xl p-1 ${onStage ? 'slab-stage' : 'well'} ${className}`}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ${
              active
                ? 'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_2px_0_var(--accent-deep)]'
                : onStage
                  ? 'text-on-stage-2 hover:bg-white/10 hover:text-on-stage'
                  : 'text-ink-2 hover:bg-line hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
