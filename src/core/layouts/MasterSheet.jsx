import { useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useAuth, useFeatureFlags, useLanguage } from "@context"
import {
    ACADEMIC_ITEMS, FINANCE_ITEMS, BOARDING_ITEMS, MASTER_ITEMS, ADMIN_ITEMS,
    SECTION_TITLES, filterNavItems,
} from "./navItems"

// ─── Portal container ─────────────────────────────────────────────────────────
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

// ─── NavIcon Helper ──────────────────────────────────────────────────────────
function NavIcon({ icon, className = "" }) {
    if (!icon) return null
    const isLucide = typeof icon === 'function' || (typeof icon === 'object' && icon.render)
    if (isLucide) {
        const IconComponent = icon
        return <IconComponent className={className || "w-4 h-4"} strokeWidth={2} />
    }
    return <FontAwesomeIcon icon={icon} className={className} />
}


function Section({ title, items, onNavigate }) {
    return (
        <>
            <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{title}</p>
            </div>
            <div className="px-2 pb-1">
                {items.map((it) => (
                    <button key={it.to} onClick={() => onNavigate(it.to)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
                            <NavIcon icon={it.icon} className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="text-[13px] font-bold text-[var(--color-text)] leading-tight">{it.label}</div>
                            {it.desc && <div className="text-[10px] text-[var(--color-text-muted)]">{it.desc}</div>}
                        </div>
                    </button>
                ))}
            </div>
        </>
    )
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
    return <div className="h-px bg-[var(--color-border)] mx-4 my-1" />
}

// ─── MasterSheet ─────────────────────────────────────────────────────────────
export default function MasterSheet({ isOpen, onClose, section }) {
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { flags } = useFeatureFlags()
    const { t, tNav, tNavDesc } = useLanguage()

    const container = getPortalContainer('portal-sheet')

    const role = profile?.role?.toLowerCase()
    const isSatpam = role === 'satpam'
    const isAdminUp = ['developer', 'admin'].includes(role)

    // Translate helper: map raw navItems → { label, desc } via t()
    const translate = (items) => items.map(it => ({
        ...it,
        label: tNav(it),
        desc: tNavDesc(it),
    }))

    // Filter items berdasarkan role + feature flags (using shared utility)
    const visibleBoarding = translate(filterNavItems(BOARDING_ITEMS, flags, role))
    const visibleMaster = isSatpam ? [] : translate(filterNavItems(MASTER_ITEMS, flags, role))
    const visibleAcademic = translate(ACADEMIC_ITEMS)
    const visibleFinance = translate(FINANCE_ITEMS)
    const visibleAdmin = translate(ADMIN_ITEMS)

    // 'more' = Master + Admin gabungan (untuk tombol Lainnya di BottomNav)
    const isMore = section === 'more'

    // Tentukan section mana yang perlu ditampilkan
    const show = {
        boarding: !section || section === 'boarding',
        academic: (!section || section === 'academic') && !isSatpam,
        finance: (!section || section === 'finance') && !isSatpam,
        master: (!section || section === 'master' || isMore) && visibleMaster.length > 0,
        admin: (!section || section === 'admin' || isMore) && isAdminUp,
    }

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = prev }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => e.key === "Escape" && onClose?.()
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    const handleNav = (to) => { onClose?.(); navigate(to) }

    return createPortal(
        !isOpen ? null : (
            <div className="fixed inset-0 z-[100000] overflow-hidden" onClick={onClose}>
                <div className="absolute inset-0 bg-black/35 animate-in fade-in duration-200" />
                <div 
                    className="absolute left-0 right-0 bottom-0 px-3 pb-3 animate-in slide-in-from-bottom-full duration-300 ease-out" 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        willChange: 'transform',
                        backfaceVisibility: 'hidden',
                        contain: 'content'
                    }}
                >
                    <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">

                        {/* Grabber */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="h-1 w-10 rounded-full bg-gray-300/80 dark:bg-gray-700/80" />
                        </div>

                        <div className="max-h-[75vh] overflow-y-auto no-scrollbar pb-2">
                            {/* ── Kesantrian (Boarding) ── */}
                            {show.boarding && (
                                <Section
                                    title={t('section.sheet.boarding')}
                                    items={visibleBoarding}
                                    onNavigate={handleNav}
                                />
                            )}

                            {/* ── Academic ── */}
                            {show.academic && (
                                <>
                                    {show.boarding && <Divider />}
                                    <Section
                                        title={t('section.sheet.academic')}
                                        items={visibleAcademic}
                                        onNavigate={handleNav}
                                    />
                                </>
                            )}

                            {/* ── Finance ── */}
                            {show.finance && (
                                <>
                                    {(show.boarding || show.academic) && <Divider />}
                                    <Section
                                        title={t('section.sheet.finance')}
                                        items={visibleFinance}
                                        onNavigate={handleNav}
                                    />
                                </>
                            )}

                            {/* ── Master Data ── */}
                            {show.master && (
                                <>
                                    {(show.boarding || show.academic || show.finance) && <Divider />}
                                    <Section
                                        title={t('section.sheet.master')}
                                        items={visibleMaster}
                                        onNavigate={handleNav}
                                    />
                                </>
                            )}

                            {/* ── Admin Panel ── */}
                            {show.admin && (
                                <div className="mt-2">
                                    {(show.boarding || show.academic || show.finance || show.master) && <Divider />}
                                    <Section
                                        title={t('section.sheet.admin')}
                                        items={visibleAdmin}
                                        onNavigate={handleNav}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="h-2" />
                    </div>
                </div>
            </div>
        ),
        container
    )
}