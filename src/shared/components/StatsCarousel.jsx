import { useRef, useState } from 'react'
import { useLanguage } from '@context'

/**
 * StatsCarousel — Horizontally scrollable stats card container on mobile,
 * responsive grid on desktop. Includes dot indicators for mobile.
 *
 * Usage:
 *   <StatsCarousel count={4}>
 *     <StatCard ... />
 *     <StatCard ... />
 *     ...
 *   </StatsCarousel>
 *
 * Props:
 *   children  – stat card elements
 *   count     – total number of cards (for dot indicator)
 *   cols      – desktop grid cols (default 4) — maps to lg:grid-cols-{cols}
 *   className – extra classes on the outer wrapper
 */
export default function StatsCarousel({ children, count, cols = 4, className = '' }) {
    const { dir } = useLanguage()
    const scrollRef = useRef(null)
    const [activeIdx, setActiveIdx] = useState(0)

    const handleScroll = () => {
        const el = scrollRef.current
        if (!el) return
        const cardWidth = el.scrollWidth / count
        const idx = Math.round(Math.abs(el.scrollLeft) / cardWidth)
        setActiveIdx(Math.min(idx, count - 1))
    }

    const colsClass =
        cols === 5 ? 'sm:grid-cols-3 lg:grid-cols-5' :
        cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
        cols === 3 ? 'sm:grid-cols-3 lg:grid-cols-3' :
        cols === 2 ? 'sm:grid-cols-2 lg:grid-cols-2' :
        'sm:grid-cols-2 lg:grid-cols-4'

    return (
        <div className={`relative mb-6 -mx-3 sm:mx-0 ${className}`}>
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={`flex overflow-x-auto scrollbar-hide gap-3 pb-2 snap-x snap-mandatory px-3 sm:px-0 sm:grid ${colsClass} lg:overflow-visible lg:pb-0 lg:snap-none`}
            >
                {children}
            </div>

            {/* Dot Indicators — Mobile Only */}
            <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
                {Array.from({ length: count }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            const el = scrollRef.current
                            if (!el) return
                            const cardWidth = el.scrollWidth / count
                            const scrollMultiplier = dir === 'rtl' ? -1 : 1
                            el.scrollTo({ left: cardWidth * i * scrollMultiplier, behavior: 'smooth' })
                        }}
                        aria-label={`Go to slide ${i + 1}`}
                        className={`rounded-full transition-all duration-300 ${
                            activeIdx === i
                                ? 'w-5 h-1.5 bg-[var(--color-primary)]'
                                : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]/30 hover:bg-[var(--color-text-muted)]/50'
                        }`}
                    />
                ))}
            </div>
        </div>
    )
}
