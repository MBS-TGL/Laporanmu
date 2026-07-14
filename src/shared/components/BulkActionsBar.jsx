import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useLanguage } from '@context'

/**
 * BulkActionsBar - A reusable, floating action bar for bulk operations.
 * Centered automatically relative to the active content area (accounting for sidebar width).
 * 
 * Props:
 * @param {number} selectedCount - Number of selected items (bar only shows if > 0)
 * @param {function} onClear - Callback when the close/clear button is clicked
 * @param {string} title - Title text (e.g. "Selected Items")
 * @param {string} subtitle - Subtitle text (e.g. "Bulk Action")
 * @param {ReactNode} children - Buttons / actions to display inside the bar
 */
export default function BulkActionsBar({
  selectedCount,
  onClear,
  title = 'Terpilih',
  subtitle = 'Aksi Massal',
  children,
}) {
  const { dir } = useLanguage()
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (selectedCount <= 0) return null

  return createPortal(
    <div
      className="fixed -translate-x-1/2 z-[250] w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
      style={{
        left: isMobile
          ? '50%'
          : dir === 'rtl'
            ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
            : 'calc(50vw + (var(--sidebar-width, 0px) / 2))',
        bottom: isMobile
          ? 'max(80px, calc(12px + env(safe-area-inset-bottom)))'
          : '16px'
      }}
    >
      <div className="relative">
        <div className="relative bg-[#0f172a]/90 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-2 py-2 flex items-center justify-between gap-2 text-white overflow-hidden">
          {/* Animated scanline */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

          {/* Count Indicator */}
          <div className="flex items-center gap-3 pl-2 rtl:pl-0 rtl:pr-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-black text-[14px] shadow-lg shadow-[var(--color-primary)]/30 shrink-0">
              {selectedCount}
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{title}</p>
              <p className="text-[11px] font-bold leading-none mt-0.5">{subtitle}</p>
            </div>
          </div>

          {/* Left Divider */}
          <div className="w-px h-6 bg-white/10 mx-1.5 hidden sm:block shrink-0" />

          {/* Actions Area */}
          <div className="flex items-center gap-1.5 flex-1 justify-center max-sm:[&_span]:hidden max-sm:[&_button]:w-9 max-sm:[&_button]:h-9 max-sm:[&_button]:px-0 max-sm:[&_button]:rounded-xl">
            {children}
          </div>

          {/* Close Button */}
          <div className="flex items-center pr-1 rtl:pr-0 rtl:pl-1 shrink-0">
            <div className="w-px h-6 bg-white/10 mx-1.5 hidden sm:block" />
            <button
              onClick={onClear}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center translate-x-0 active:scale-90"
              title={dir === 'rtl' ? 'إلغاء وإغلاق' : 'Batal & Tutup'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
