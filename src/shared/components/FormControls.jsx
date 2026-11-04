import { forwardRef } from 'react'

/**
 * Kontrol form tipis di atas class `.input-field` / `.select-field` /
 * `.textarea-field` (src/index.css @layer components) — styling tunggal
 * dari token, tinggal pakai.
 */

const errorCls = error => (error ? '!border-danger focus:!border-danger' : '')

const Input = forwardRef(function Input({ className = '', error, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={`input-field ${errorCls(error)} ${className}`}
      {...props}
    />
  )
})

const Textarea = forwardRef(function Textarea({ className = '', error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={`textarea-field ${errorCls(error)} ${className}`}
      {...props}
    />
  )
})

const Select = forwardRef(function Select({ className = '', error, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={`select-field ${errorCls(error)} ${className}`}
      {...props}
    />
  )
})

/** Label mikro uppercase mengikuti pola fitur suspension. */
const FieldLabel = ({ className = '', children, htmlFor, ...props }) => (
  <label
    htmlFor={htmlFor}
    className={`text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5 flex items-center gap-1.5 ${className}`}
    {...props}
  >
    {children}
  </label>
)

export { Input, Textarea, Select, FieldLabel }
