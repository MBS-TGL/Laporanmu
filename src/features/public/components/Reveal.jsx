import { useRef, useState, useEffect } from 'react'

/**
 * Hook: Scroll Reveal — IntersectionObserver sekali tembak lalu unobserve.
 */
export function useReveal(threshold = 0.15) {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) } },
            { threshold }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [threshold])

    return [ref, visible]
}

/**
 * Wrapper scroll-reveal: fade + slide-up halus saat elemen masuk viewport.
 * Pakai di section/kartu halaman publik dengan `delay` bertingkat untuk efek berurutan.
 */
export default function Reveal({ children, className = '', delay = 0 }) {
    const [ref, visible] = useReveal()
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}s`,
            }}
        >
            {children}
        </div>
    )
}
