import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCountUp } from '@hooks/useCountUp'
import { useLanguage } from '@context'

// Polymorphic Icon Renderer supporting both Lucide components and FontAwesome objects
const renderIcon = (icon, className = '') => {
    if (!icon) return null;
    
    // Check if it's a FontAwesome icon object
    const isFontAwesome = typeof icon === 'object' && icon !== null && 'iconName' in icon;
    
    if (isFontAwesome) {
        return <FontAwesomeIcon icon={icon} className={className} />;
    }
    
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
    valueClassName = 'text-xl sm:text-[22px] text-[var(--color-text)]',
    onClick,
    title
}) {
    const { tNum } = useLanguage()

    // Color map: border uses `border-t-2 border-t-*` for visible top accent
    const colorMap = {
        primary: { borderTop: 'border-t-[var(--color-primary)]', dotBg: 'bg-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' },
        indigo:  { borderTop: 'border-t-indigo-500',  dotBg: 'bg-indigo-500',  bg: 'bg-indigo-500/10 text-indigo-500' },
        emerald: { borderTop: 'border-t-emerald-500', dotBg: 'bg-emerald-500', bg: 'bg-emerald-500/10 text-emerald-500' },
        amber:   { borderTop: 'border-t-amber-500',   dotBg: 'bg-amber-500',   bg: 'bg-amber-500/10 text-amber-500' },
        rose:    { borderTop: 'border-t-rose-500',    dotBg: 'bg-rose-500',    bg: 'bg-rose-500/10 text-rose-500' },
        sky:     { borderTop: 'border-t-sky-500',     dotBg: 'bg-sky-500',     bg: 'bg-sky-500/10 text-sky-500' },
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
    const activeRing = isActive ? `ring-2 ring-offset-1 ${resolved.borderTop.replace('border-t-', 'ring-')} ${resolved.borderTop.replace('border-t-', 'shadow-md shadow-')} shadow-[color]/10` : ''

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
            className={`shrink-0 snap-center w-[200px] xs:w-[220px] sm:w-auto glass group relative overflow-hidden rounded-2xl border-t ${finalBorderTop} border border-[var(--color-border)] p-4 flex items-center gap-3.5 hover:border-[var(--color-primary)]/30 hover:shadow-lg hover:shadow-[var(--color-primary)]/5 transition-all duration-300 min-h-[78px] ${onClick ? 'cursor-pointer active:scale-95' : ''} ${activeRing} ${className}`}
        >
            {/* Status Pulse Dot — top-right corner */}
            <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3">
                <div className={`w-1.5 h-1.5 rounded-full ${finalDotBg} opacity-50 animate-pulse`} />
            </div>

            {/* Icon Container */}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${finalBg} transform group-hover:scale-110 transition-all duration-500`}>
                {renderIcon(icon, 'w-5 h-5')}
            </div>
            
            {/* Content */}
            <div className="min-w-0 relative z-10 flex-1 text-start">
                {/* Label */}
                {loading
                    ? <span className="inline-block w-20 h-2.5 rounded bg-[var(--color-border)] animate-pulse mb-1" />
                    : <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-70 mb-0.5 truncate">{label}</p>
                }

                {/* Value + Trend */}
                <div className="flex items-center gap-1.5">
                    <h3 className={`font-black font-heading leading-none tabular-nums tracking-tighter ${valueClassName}`}>
                        {loading
                            ? <span className="inline-block w-10 h-5 rounded bg-[var(--color-border)] animate-pulse" />
                            : <>{tNum(displayValue)}{suffix && tNum(suffix)}</>}
                    </h3>
                    {!loading && trend && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                            trendUp === true  ? 'text-emerald-500 bg-emerald-500/10' :
                            trendUp === false ? 'text-rose-500 bg-rose-500/10' :
                            'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]'
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
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] mt-0.5 opacity-60 uppercase tracking-wide truncate">{tNum(subValue)}</p>
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
            <div className="glass text-center py-16 rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                    <span className="text-2xl">👀</span>
                </div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">{emptyMessage}</p>
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
    
    // Exact colors matching Dashboard widgets
    const colorMap = {
        indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/10',
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10',
        slate: 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5',
    }[color] || 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5'
    // Dynamic text colors for the glass variant
    const glassColor = {
        indigo: 'text-indigo-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500',
        slate: 'text-[var(--color-text-muted)]',
    }[color] || 'text-[var(--color-primary)]'
 
    const containerClasses = isPlain 
        ? 'flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity' 
        : isDashed
            ? 'flex-1 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] bg-[var(--color-surface-alt)]/20 transition-all hover:bg-[var(--color-surface-alt)]/40'
            : 'glass rounded-[2rem] py-16 text-center px-6 relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95'

    return (
        <div className={containerClasses}>
            {/* Ambient Background Glow for Empty State */}
            {variant === 'glass' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
            )}
 
            <div className={`relative z-10 flex flex-col items-center`}>
                {icon && (
                    <div className={`${isMinimal ? `w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl mb-4 shadow-lg mx-auto transform rotate-3 ${colorMap}` : `w-20 h-20 mb-6 rounded-3xl mx-auto flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] border border-[var(--color-border)] ${glassColor} shadow-sm group-hover:scale-110 transition-transform duration-500`}`}>
                        {renderIcon(icon, isMinimal ? 'w-6 h-6' : 'w-8 h-8 text-3xl')}
                    </div>
                )}
                <h3 className={`${isMinimal ? 'text-[15px] font-black mb-1' : 'text-lg font-black font-heading uppercase tracking-widest mb-1.5'} text-[var(--color-text)]`}>
                    {title}
                </h3>
                <p className={`${isMinimal ? 'text-[11px] max-w-xs px-4 opacity-60 font-medium' : 'text-[10px] max-w-[240px] mx-auto opacity-60 font-bold mb-8'} text-[var(--color-text-muted)] leading-relaxed`}>
                    {description}
                </p>
                {action && <div className={`${isMinimal ? 'mt-4' : 'mt-6'}`}>{action}</div>}
            </div>
        </div>
    )
}
