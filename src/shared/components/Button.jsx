import { memo } from 'react'
import { LoaderCircle } from 'lucide-react'

/**
 * Tombol standar aplikasi. Warna dari token (@theme) — dilarang hardcode palet.
 * variant: primary | secondary | danger | ghost | outline
 * size:    sm | md | lg | icon
 */
const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-surface-alt text-text border border-border hover:bg-border',
  danger: 'bg-danger text-white hover:bg-danger-dark',
  success: 'bg-success text-white hover:bg-success-dark',
  warning: 'bg-warning text-white hover:bg-warning-dark',
  ghost: 'bg-transparent text-text-muted hover:bg-surface-alt hover:text-text',
  outline: 'bg-transparent text-primary border border-primary/30 hover:bg-primary/10',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs leading-none gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm leading-none gap-2 rounded-lg',
  lg: 'h-11 px-6 text-sm leading-none gap-2 rounded-lg',
  icon: 'h-10 w-10 rounded-lg',
}

const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && <LoaderCircle className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  )
})

export default Button
