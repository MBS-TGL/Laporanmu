/**
 * Basic Skeleton Pulse component
 * 
 * @param {string} className - Tailwind classes for size and shape
 */
export default function Skeleton({ className = "" }) {
    return (
        <div className={`bg-[var(--color-border)] animate-pulse ${className}`} />
    )
}

/**
 * Skeleton loading untuk table
 * Digunakan untuk better UX saat loading data
 * 
 * @param {number} rows - Jumlah baris skeleton (default: 5)
 * @param {number} cols - Jumlah kolom skeleton (default: 5)
 */
export function TableSkeleton({ rows = 5, cols = 5 }) {
    return (
        <div className="glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    {/* Header Skeleton */}
                    <thead>
                        <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-6 py-4">
                                    <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-20" />
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Body Skeleton */}
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {Array.from({ length: rows }).map((_, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-[var(--color-surface-alt)]/30">
                                {Array.from({ length: cols }).map((_, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4">
                                        <div
                                            className="h-4 bg-[var(--color-border)] rounded animate-pulse"
                                            style={{
                                                width: colIdx === 0 ? '180px' : colIdx === cols - 1 ? '80px' : '120px'
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/**
 * Skeleton loading untuk card layout (mobile)
 * 
 * @param {number} count - Jumlah card skeleton (default: 3)
 */
export function CardSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="glass rounded-2xl p-4 border border-[var(--color-border)]">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-border)] animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[var(--color-border)] rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-1/2" />
                        </div>
                    </div>

                    {/* Content skeleton */}
                    <div className="space-y-2 mb-3">
                        <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-full" />
                        <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-5/6" />
                    </div>

                    {/* Actions skeleton */}
                    <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                        <div className="flex-1 h-9 bg-[var(--color-border)] rounded-lg animate-pulse" />
                        <div className="flex-1 h-9 bg-[var(--color-border)] rounded-lg animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton loading untuk mobile list view (accordion rows)
 * 
 * @param {number} count - Jumlah row skeleton (default: 7)
 */
export function MobileListSkeleton({ count = 7 }) {
    return (
        <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] divide-y divide-[var(--color-border)]/40 overflow-hidden shadow-sm">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-3 min-h-[50px]">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-border)] animate-pulse shrink-0" />
                    {/* Name + info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div
                            className="h-3.5 bg-[var(--color-border)] rounded-md animate-pulse"
                            style={{ width: `${55 + (idx * 7) % 35}%`, animationDelay: `${idx * 80}ms` }}
                        />
                        <div
                            className="h-2.5 bg-[var(--color-border)]/60 rounded animate-pulse"
                            style={{ width: `${35 + (idx * 11) % 25}%`, animationDelay: `${idx * 80 + 40}ms` }}
                        />
                    </div>
                    {/* Points badge */}
                    <div className="w-7 h-5 rounded-md bg-[var(--color-border)]/50 animate-pulse shrink-0" style={{ animationDelay: `${idx * 60}ms` }} />
                    {/* Chevron */}
                    <div className="w-3 h-3 rounded-full bg-[var(--color-border)]/40 animate-pulse shrink-0" />
                </div>
            ))}
        </div>
    )
}

/**
 * Skeleton loading untuk mobile card view
 * 
 * @param {number} count - Jumlah card skeleton (default: 3)
 */
export function MobileCardSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    {/* Top section - avatar + name */}
                    <div className="p-4 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-border)] animate-pulse shrink-0" style={{ animationDelay: `${idx * 100}ms` }} />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[var(--color-border)] rounded-md animate-pulse" style={{ width: `${60 + (idx * 13) % 30}%`, animationDelay: `${idx * 100 + 50}ms` }} />
                            <div className="h-3 bg-[var(--color-border)]/60 rounded animate-pulse w-2/3" style={{ animationDelay: `${idx * 100 + 80}ms` }} />
                        </div>
                    </div>
                    {/* Info row */}
                    <div className="px-4 pb-2 flex items-center gap-4">
                        <div className="h-3 bg-[var(--color-border)]/50 rounded animate-pulse w-24" style={{ animationDelay: `${idx * 80}ms` }} />
                        <div className="h-3 bg-[var(--color-border)]/50 rounded animate-pulse w-16" style={{ animationDelay: `${idx * 80 + 30}ms` }} />
                    </div>
                    {/* Action bar */}
                    <div className="px-4 pb-3 pt-2 border-t border-[var(--color-border)]/30 flex gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex-1 h-8 bg-[var(--color-border)]/40 rounded-lg animate-pulse" style={{ animationDelay: `${i * 60 + idx * 80}ms` }} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}