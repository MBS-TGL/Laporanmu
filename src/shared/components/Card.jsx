/**
 * Kartu standar — memakai class `.card` dari src/index.css (token-based:
 * surface + border + shadow tipis). Flat, tanpa gradient/glow.
 */
export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  )
}
