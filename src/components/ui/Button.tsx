/* eslint-disable react-refresh/only-export-components -- small shared helpers live beside their component. */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'stage'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'key key-primary',
  secondary: 'key',
  ghost: 'text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink',
  danger: 'key key-danger',
  stage: 'key key-stage',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-[10px] px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-13 gap-2 rounded-2xl px-6 text-[15px]',
}

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md') =>
  `inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]}`

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', className = '', type = 'button', children, ...props }: ButtonProps) {
  return (
    <button type={type} data-magnetic={variant === 'primary' ? '' : undefined} className={`${buttonClass(variant, size)} ${className}`} {...props}>
      {children}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  onStage?: boolean
  children: ReactNode
}

export function IconButton({ label, onStage, className = '', type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`relative grid size-10 shrink-0 place-items-center rounded-xl transition-[background-color,color,transform] duration-150 active:scale-90 disabled:opacity-40 ${
        onStage ? 'text-on-stage-2 hover:bg-white/10 hover:text-on-stage' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
