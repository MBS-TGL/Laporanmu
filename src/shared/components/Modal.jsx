import { useEffect, useRef, useState, memo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZE_CLASSES = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    xxl: 'max-w-5xl',
    xxxl: 'max-w-7xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-[98vw]',
}

// Singleton portal manager
const _portalContainers = {}
function getPortalContainer(id) {
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
}

// Scroll lock berbasis counter: aman untuk modal bertumpuk (modal di dalam modal).
// Lock hanya dilepas saat modal terakhir tertutup.
let _lockCount = 0
function lockScroll() {
    if (_lockCount++ === 0) {
        const sbw = window.innerWidth - document.documentElement.clientWidth
        document.body.style.overflow = 'hidden'
        if (sbw > 0) document.body.style.paddingRight = `${sbw}px`
    }
}
function unlockScroll() {
    if (--_lockCount === 0) {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
    }
}

const Modal = memo(function Modal({
    isOpen, onClose, title, children, footer,
    size = 'md', variant = 'centered', mobileVariant = 'centered',
    noPadding = false, contentClassName = "",
    icon, iconBg, iconColor, description,
    closeOnOutsideClick = true,
    maxMobileHeight = '70vh',
    aspectSquare = false
}) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const closeTimer = useRef(null)
    const panelRef = useRef(null)
    const lastFocused = useRef(null)
    const onCloseRef = useRef(onClose)

    // onClose lewat ref: listener Escape tidak perlu dipasang ulang tiap parent re-render
    useEffect(() => { onCloseRef.current = onClose })

    // Mount -> (2 frame) -> visible, supaya transisi masuk mulus
    useEffect(() => {
        if (isOpen) {
            clearTimeout(closeTimer.current)
            setMounted(true)
            let raf2
            const raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => setVisible(true))
            })
            return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
        }
        setVisible(false)
        closeTimer.current = setTimeout(() => setMounted(false), 200) // = durasi exit
        return () => clearTimeout(closeTimer.current)
    }, [isOpen])

    // Focus UX: fokus ke panel saat open, kembalikan ke pemicu saat close
    useEffect(() => {
        if (isOpen) {
            lastFocused.current = document.activeElement
            const raf = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }))
            return () => cancelAnimationFrame(raf)
        }
        if (lastFocused.current?.isConnected) lastFocused.current.focus?.({ preventScroll: true })
        lastFocused.current = null
    }, [isOpen])

    // Body scroll lock
    useEffect(() => {
        if (!isOpen) return
        lockScroll()
        return unlockScroll
    }, [isOpen])

    // Escape key
    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => { if (e.key === 'Escape') onCloseRef.current?.() }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    if (!mounted) return null

    const container = getPortalContainer('portal-modals-system')
    const isBottomSheet = mobileVariant === 'bottom-sheet'

    // Performance-optimized timing
    const sheetEase = visible
        ? 'cubic-bezier(0.2, 0.8, 0.2, 1)'  // Snappy entry
        : 'cubic-bezier(0.3, 0, 1, 1)'      // Accelerating exit (feels faster)
    const duration = visible ? '300ms' : '200ms'

    const node = (
        <div
            className={`fixed inset-0 z-[9999] flex
                ${isBottomSheet ? 'items-end md:items-center justify-center md:p-6' : 'items-center justify-center p-4 md:p-6'}
                ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            style={{
                visibility: visible ? 'visible' : 'hidden',
                transition: `opacity ${duration} ease`,
            }}
            onClick={() => closeOnOutsideClick && onClose?.()}
            role="dialog"
            aria-modal="true"
        >
            {/* Optimized Backdrop (No heavy blur filters to ensure buttery smooth 60fps mobile transitions) */}
            <div className="absolute inset-0 bg-black/45" />

            {/* Modal Panel — 2 div terpisah:
                 - Outer: handle transform/opacity animation (boleh punya willChange/transform)
                 - Inner: handle overflow-hidden untuk clip rounded corner (TIDAK boleh punya transform/contain agar portal picker tidak terurung)
            */}
            <div
                tabIndex={-1}
                ref={panelRef}
                className={`w-full z-10 outline-none ${SIZE_CLASSES[size] || 'max-w-lg'} ${aspectSquare ? 'md:aspect-square md:flex md:flex-col md:max-h-[calc(100vh-4rem)]' : ''}`}
                style={{
                    transform: !visible
                        ? (isBottomSheet ? 'translateY(100%)' : 'scale(0.96) translateY(10px)')
                        : 'translateY(0) scale(1)',
                    opacity: visible ? 1 : 0,
                    transition: `transform ${duration} ${sheetEase}, opacity ${duration} ease`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* max-h mobile lewat CSS variable (bukan maxHeight inline) agar tidak menimpa md:max-h di desktop */}
                <div
                    className={`bg-[var(--color-surface)] shadow-xl w-full relative overflow-hidden flex flex-col border border-[var(--color-border)]/60
                    ${aspectSquare ? 'md:!h-full md:!max-h-full md:flex-1' : ''}
                    ${isBottomSheet
                            ? 'rounded-t-2xl md:rounded-xl max-h-[var(--sheet-max-h)] md:max-h-[calc(100vh-6rem)]'
                            : 'rounded-xl max-h-[calc(100vh-6rem)]'
                        }
                `}
                    style={isBottomSheet ? { '--sheet-max-h': `min(${maxMobileHeight}, calc(100vh - env(safe-area-inset-bottom, 0px)))` } : undefined}
                >
                    {/* Drag Handle for Bottom Sheet */}
                    {isBottomSheet && (
                        <div className="shrink-0 w-12 h-1.5 bg-[var(--color-text-muted)] rounded-full mx-auto mt-4 mb-1 md:hidden opacity-20" />
                    )}

                    {/* Header */}
                    <div className={`shrink-0 flex items-center justify-between px-6 md:px-8 ${isBottomSheet ? 'pt-3 pb-4' : 'py-5'} border-b border-[var(--color-border)]/50 bg-[var(--color-surface)] sticky top-0 z-10`}>
                        <div className="flex items-center gap-3.5 min-w-0">
                            {icon && (
                                <div className={`w-9 h-9 rounded-xl ${iconBg || 'bg-[var(--color-primary)]/10'} flex items-center justify-center shrink-0 ${iconColor || 'text-[var(--color-primary)]'}`}>
                                    {(() => {
                                        const IconComp = icon
                                        return <IconComp className="w-4 h-4" />
                                    })()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-bold font-heading tracking-tight text-[var(--color-text)] leading-tight">
                                    {title}
                                </h3>
                                {description && (
                                    <div className="text-xs font-normal text-[var(--color-text-muted)] leading-relaxed mt-0.5">
                                        {description}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors active:scale-90 flex items-center justify-center shrink-0"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Area */}
                    <div
                        className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${noPadding ? '' : 'px-6 md:px-8 py-6'} ${contentClassName}`}
                        style={{
                            overscrollBehavior: 'contain', // Prevent scroll chaining to background
                            WebkitOverflowScrolling: 'touch' // Smooth inertial scroll on iOS
                        }}
                    >
                        {children}
                    </div>

                    {/* Footer Area */}
                    {footer && (
                        <div className="shrink-0 px-6 md:px-8 py-5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-alt)]/30">
                            {footer}
                        </div>
                    )}
                </div>
            </div>{/* end outer animation wrapper */}
        </div>
    )

    return createPortal(node, container)
})

export default Modal
