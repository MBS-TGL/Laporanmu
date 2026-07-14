import { useLanguage } from '@context'

export default function Breadcrumb({ items = [], badge = null, className = '' }) {
    let t = (x) => x
    try {
        const lang = useLanguage()
        if (lang && lang.t) {
            t = lang.t
        }
    } catch (e) {
        // Safe fallback if not wrapped in context
    }

    const translate = (str) => {
        if (!str) return ''
        const trimmed = str.trim()
        
        // Exact match check
        const exact = t(trimmed)
        if (exact !== trimmed) return exact

        const lower = trimmed.toLowerCase()
        
        // Smart matching with standard prefixes
        const possibleKeys = [
            lower,
            `nav.${lower}`,
            `section.${lower}`,
            `ui.${lower}`,
            `breadcrumb.${lower}`
        ]
        
        for (const k of possibleKeys) {
            const res = t(k)
            if (res !== k) return res
        }

        // Specific structural mappings for common breadcrumbs
        if (lower === 'gate monitor' || lower === 'gate') return t('nav.gate')
        if (lower === 'technical dashboard') return t('nav.admin_dashboard')
        if (lower === 'engine health' || lower === 'database health') return t('nav.database')
        if (lower === 'neural engine center' || lower === 'ai insights') return t('nav.ai_insights')
        if (lower === 'audit center' || lower === 'system logs') return t('nav.logs')
        if (lower === 'design system' || lower === 'developer tools') return t('nav.playground')
        if (lower === 'cms management') return t('nav.news')
        if (lower === 'psb / enrollment' || lower === 'ppdb') return t('nav.enrollment')
        if (lower === 'rules configuration' || lower === 'points parameters') return t('nav.poin')
        if (lower === 'behavior analytics' || lower === 'behavior') return t('nav.behavior')
        if (lower === 'attendance analytics' || lower === 'attendance') return t('nav.attendance')
        if (lower === 'storage analysis' || lower === 'storage') return t('nav.storage')
        if (lower === 'background tasks' || lower === 'tasks') return t('nav.tasks')
        if (lower === 'reports') return t('section.boarding') // Reports are part of boarding/kesantrian section
        
        return trimmed
    }

    const safeItems = (items || []).filter(Boolean)
    if (safeItems.length === 0 && !badge) return null

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
            {badge ? (
                <span className="px-2 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    {translate(badge)}
                </span>
            ) : null}

            {safeItems.length > 0 ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                    {safeItems.map((it, idx) => (
                        <span key={`${it}-${idx}`}>
                            {idx > 0 ? <span className="opacity-30 mx-1">›</span> : null}
                            {translate(it)}
                        </span>
                    ))}
                </span>
            ) : null}
        </div>
    )
}


