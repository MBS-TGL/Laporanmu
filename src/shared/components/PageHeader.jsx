import React from 'react'
import Breadcrumb from './Breadcrumb'

export default function PageHeader({ 
    title, 
    subtitle, 
    breadcrumbs = [], 
    badge = null,
    actions = null,
    className = '' 
}) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}>
            <div>
                {(breadcrumbs.length > 0 || badge) && (
                    <Breadcrumb badge={badge} items={breadcrumbs} className="mb-1" />
                )}
                <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)] leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
