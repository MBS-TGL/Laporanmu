import React from 'react'
import { useCountUp } from '@hooks/useCountUp'
import { useLanguage } from '@context'

// Polymorphic Icon Renderer for Lucide components
const renderIcon = (icon, className = '') => {
    if (!icon) return null;

    // Treat as Lucide React or standard React functional component
    const IconComp = icon;
    return <IconComp className={className} />;
};

export function StatCard({ 
    icon, 
    label, 
    value, 
    subValue,
    suffix,
    trend, 
    trendUp, 
    loading = false,
    borderColor,      // Tailwind color name, e.g. 'indigo-500' or 'primary'
    iconBg, 
    color = 'primary',
    isActive = false, // shows colored ring + border to indicate selected state
    progressValue,    // 0-100, renders a thin fill bar at the bottom of card
    progressMax = 100,
    className = '',
    valueClassName = 'text-2xl text-text',
    onClick,
    title
}) {
    const { tNum } = useLanguage()

    // Color map: border uses `border-t-2 border-t-*` for visible top accent.
    // Semua dari token — alias lama (indigo/emerald/amber/rose/sky) dipetakan.
    const colorMap = {
        primary: { borderTop: 'border-t-primary', dotBg: 'bg-primary', bg: 'bg-primary/10 text-primary' },
        indigo:  { borderTop: 'border-t-primary', dotBg: 'bg-primary', bg: 'bg-primary/10 text-primary' },
        emerald: { borderTop: 'border-t-success', dotBg: 'bg-success', bg: 'bg-success/10 text-success' },
        amber:   { borderTop: 'border-t-warning', dotBg: 'bg-warning', bg: 'bg-warning/10 text-warning' },
        rose:    { borderTop: 'border-t-danger',  dotBg: 'bg-danger',  bg: 'bg-danger/10 text-danger' },
        sky:     { borderTop: 'border-t-primary', dotBg: 'bg-primary', bg: 'bg-primary/10 text-primary' },
    }

    const resolved      = colorMap[color] || colorMap.primary
    // borderColor is tolerant of multiple formats:
    //   colorMap key   → 'indigo' or 'emerald' etc.
    //   bare color     → 'indigo-500', 'blue-500' etc.
    //   prefixed class → 'border-t-indigo-500' (legacy, used as-is)
    //   CSS var class  → 'border-t-[var(--color-primary)]' (used as-is)
    const finalBorderTop = borderColor
        ? (colorMap[borderColor]?.borderTop          // colorMap key
            ?? (borderColor.startsWith('border-t-')
                ? borderColor                        // already prefixed → use as-is
                : `border-t-${borderColor}`))        // bare color → add prefix
        : resolved.borderTop
    const finalDotBg     = resolved.dotBg
    const finalBg        = iconBg || resolved.bg

    // Active ring — matches the card's accent color
    const activeRing = isActive ? `ring-2 ring-offset-1 ${resolved.borderTop.replace('border-t-', 'ring-')}` : ''

    // Progress fill percentage clamped 0-100
    const progressPct = progressValue != null
        ? Math.min(100, Math.max(0, (progressValue / (progressMax || 100)) * 100))
        : null

    const animatedValue = useCountUp(value, 1500, loading)
    const displayValue  = typeof value === 'number' || !isNaN(parseFloat(value)) ? animatedValue : value

    // Trend arrow indicator
    const TrendArrow = trendUp === true ? '↑' : trendUp === false ? '↓' : null

    return (
        <div 
            onClick={onClick} 
            title={title} 
            className={`shrink-0 snap-center w-[210px] xs:w-[230px] sm:w-auto bg-surface group relative overflow-hidden rounded-xl border-t ${finalBorderTop} border border-border p-4 sm:p-5 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-[border-color,box-shadow] duration-200 min-h-[88px] ${onClick ? 'cursor-pointer active:scale-95' : ''} ${activeRing} ${className}`}
        >
            {/* Status Pulse Dot — top-right corner */}
            <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                <div className={`w-1.5 h-1.5 rounded-full ${finalDotBg} opacity-50 animate-pulse`} />
            </div>

            {/* Icon Container */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${finalBg} group-hover:scale-105 transition-transform duration-200`}>
                {renderIcon(icon, 'w-5.5 h-5.5')}
            </div>
            
            {/* Content */}
            <div className="min-w-0 relative z-10 flex-1 text-start">
                {/* Label */}
                {loading
                    ? <span className="inline-block w-20 h-2.5 rounded bg-[var(--color-border)] animate-pulse mb-1" />
                    : <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-80 mb-1 truncate">{label}</p>
                }

                {/* Value + Trend */}
                <div className="flex items-center gap-2">
                <h3 className={`font-bold leading-none tabular-nums tracking-tight ${valueClassName}`}>
                    {loading
                        ? <span className="inline-block w-10 h-5 rounded bg-border animate-pulse" />
                        : <>{tNum(displayValue)}{suffix && tNum(suffix)}</>}
                </h3>
                {!loading && trend && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md leading-none ${
                        trendUp === true  ? 'text-success bg-success/10' :
                        trendUp === false ? 'text-danger bg-danger/10' :
                        'text-text-muted bg-surface-alt'
                    }`}>
                            {TrendArrow && <span>{TrendArrow}</span>}
                            {tNum(trend)}
                        </span>
                    )}
                    {loading && trend !== undefined && (
                        <span className="inline-block w-10 h-4 rounded bg-[var(--color-border)] animate-pulse" />
                    )}
                </div>

                {/* SubValue */}
                {loading
                    ? <span className="inline-block w-16 h-2 rounded bg-[var(--color-border)] animate-pulse mt-1" />
                    : subValue && (
                        <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-1 opacity-70 uppercase tracking-wide truncate">{tNum(subValue)}</p>
                    )
                }
            </div>

            {/* Optional Progress Bar — thin strip at the bottom of card */}
            {progressPct != null && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-border)]/60">
                    <div
                        className={`h-full ${finalDotBg} opacity-70 transition-all duration-1000 ease-out rounded-full`}
                        style={{ width: loading ? '0%' : `${progressPct}%` }}
                    />
                </div>
            )}
        </div>
    )
}

export function DataTable({ columns, data, onRowClick, loading, emptyMessage = 'Tidak ada data' }) {
    if (loading) {
        return (
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((_, j) => (
                                    <td key={j}>
                                        <div className="skeleton h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-surface border border-border text-center py-16 rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-alt border border-border flex items-center justify-center text-text-muted">
                    <span className="text-2xl">👀</span>
                </div>
                <p className="text-text-muted font-medium text-sm">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={row.id || rowIdx}
                            onClick={() => onRowClick?.(row)}
                            className={onRowClick ? 'cursor-pointer' : ''}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function EmptyState({ icon, title, description, action, variant = 'glass', color = 'indigo' }) {
    const isPlain = variant === 'plain'
    const isDashed = variant === 'dashed'
    const isMinimal = isPlain || isDashed

    // Warna dari token — alias lama dipetakan
    const colorMap = {
      indigo: 'bg-primary/10 text-primary border-primary/20',
      emerald: 'bg-success/10 text-success border-success/20',
      amber: 'bg-warning/10 text-warning border-warning/20',
      slate: 'bg-surface-alt text-text-muted border-border',
    }[color] || 'bg-surface-alt text-text-muted border-border'
    // Dynamic text colors for the glass variant
    const glassColor = {
        indigo: 'text-primary',
        emerald: 'text-success',
        amber: 'text-warning',
        slate: 'text-text-muted',
    }[color] || 'text-primary'

    const containerClasses = isPlain
        ? 'flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity'
        : isDashed
            ? 'flex-1 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl bg-surface-alt/20 transition-colors hover:bg-surface-alt/40'
            : 'bg-surface border border-border rounded-xl py-16 text-center px-6 relative overflow-hidden transition-opacity duration-200 animate-in fade-in zoom-in-95'

    return (
        <div className={containerClasses}>

            <div className={`relative z-10 flex flex-col items-center`}>
                {icon && (
                    <div className={`${isMinimal ? `w-16 h-16 rounded-xl border flex items-center justify-center text-3xl mb-4 shadow-sm mx-auto rotate-3 ${colorMap}` : `w-20 h-20 mb-6 rounded-xl mx-auto flex items-center justify-center bg-surface-alt border border-border ${glassColor} shadow-sm group-hover:scale-105 transition-transform duration-200`}`}>
                        {renderIcon(icon, isMinimal ? 'w-6 h-6' : 'w-8 h-8 text-3xl')}
                    </div>
                )}
                <h3 className={`${isMinimal ? 'text-base font-bold mb-1' : 'text-base sm:text-lg font-bold mb-1.5'} text-text`}>
                    {title}
                </h3>
                <p className={`${isMinimal ? 'text-xs max-w-xs px-4 font-normal' : 'text-xs sm:text-sm max-w-xs mx-auto font-normal mb-6'} text-text-muted leading-relaxed`}>
                    {description}
                </p>
                {action && <div className={`${isMinimal ? 'mt-4' : 'mt-6'}`}>{action}</div>}
            </div>
        </div>
    )
}
