/**
 * Badge status standar — warna dari token (@theme).
 * variant: primary | success | warning | danger | neutral
 */
const VARIANTS = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-alt text-text-muted',
}

export default function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-4 tabular-nums whitespace-nowrap ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
