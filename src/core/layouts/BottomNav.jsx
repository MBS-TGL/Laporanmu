import { useState, useEffect } from "react"
import { NavLink } from "react-router-dom"
import {
    Home,
    Compass,
    Layers,
    UserCog,
    Settings,
    Calendar,
    CreditCard,
    MoreHorizontal,
} from "lucide-react"
import { useAuth, useLanguage } from "@context"
import MasterSheet from "./MasterSheet"

// ─── Warna aktif ─────────────────────────────────────────────────────────────
const ACTIVE_COLOR = "text-indigo-600"
const INACTIVE_COLOR = "text-[var(--color-text-muted)]"

// ─── NavItem (route link) ────────────────────────────────────────────────────
function NavItem({ to, icon, label }) {
    const IconComp = icon
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300
                 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active pill background around icon */}
                    <div className={`w-12 h-7 rounded-xl flex items-center justify-center transition-all duration-300
                        ${isActive 
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10' 
                            : 'bg-transparent text-[var(--color-text-muted)]'}`}
                    >
                        <IconComp
                            className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'scale-105' : ''}`}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                    </div>
                    <span className={`text-[9.5px] font-black tracking-tight leading-none transition-all duration-300 ${isActive ? 'text-[var(--color-primary)] font-black' : 'text-[var(--color-text-muted)] font-bold'}`}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    )
}

// ─── MenuButton (sheet trigger) ──────────────────────────────────────────────
function MenuButton({ icon, label, onClick, active = false }) {
    const IconComp = icon
    return (
        <button
            onClick={onClick}
            type="button"
            aria-label={`Buka menu ${label}`}
            className={`relative flex flex-col items-center justify-center gap-1.5 py-2 px-1 transition-all duration-300
                ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
        >
            {/* Active pill background around icon */}
            <div className={`w-12 h-7 rounded-xl flex items-center justify-center transition-all duration-300
                ${active 
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10' 
                    : 'bg-transparent text-[var(--color-text-muted)]'}`}
            >
                <IconComp
                    className={`w-[18px] h-[18px] transition-transform duration-300 ${active ? 'scale-105' : ''}`}
                    strokeWidth={active ? 2.5 : 2}
                />
            </div>
            <span className={`text-[9.5px] font-black tracking-tight leading-none transition-all duration-300 ${active ? 'text-[var(--color-primary)] font-black' : 'text-[var(--color-text-muted)] font-bold'}`}>
                {label}
            </span>
        </button>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BottomNav() {
    // openSheet: null | 'boarding' | 'academic' | 'finance' | 'master' | 'admin' | 'more'
    const [openSheet, setOpenSheet] = useState(null)
    const [isVisible, setIsVisible] = useState(true)
    const { profile } = useAuth()
    const { t } = useLanguage()

    const role = profile?.role?.toLowerCase()
    const isAdminUp = ['developer', 'admin'].includes(role)
    const isSatpam = role === 'satpam'

    const open = (section) => setOpenSheet(section)
    const close = () => setOpenSheet(null)

    // ── Hide on Scroll ──
    useEffect(() => {
        let lastY = window.scrollY
        const handleScroll = () => {
            const currentY = window.scrollY
            const windowHeight = window.innerHeight
            const docHeight = document.documentElement.scrollHeight

            const isNearBottom = (windowHeight + currentY) >= (docHeight - 60)
            const isNearTop = currentY < 50
            const isScrollingUp = currentY < lastY
            const isScrollingDown = currentY > lastY

            if (isNearBottom || isNearTop || isScrollingUp) {
                setIsVisible(true)
            } else if (isScrollingDown && currentY > 100) {
                setIsVisible(false)
            }

            lastY = currentY
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <>
            <nav
                className={`lg:hidden fixed bottom-0 left-0 right-0 z-[200]
                    transition-transform duration-300 ease-in-out
                    ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {/* Safe area padding for notched phones */}
                <div className="mx-auto max-w-lg px-3 pb-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(15,23,42,0.10)] overflow-hidden">

                        {/* ── Admin / Developer: 5 col → Home | Kesantrian | Akademik | Keuangan | Lainnya ── */}
                        {isAdminUp && (
                            <div className="grid grid-cols-5">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <MenuButton icon={Calendar} label={t('section.academic')} onClick={() => open('academic')} active={openSheet === 'academic'} />
                                <MenuButton icon={CreditCard} label={t('section.finance')} onClick={() => open('finance')} active={openSheet === 'finance'} />
                                <MenuButton
                                    icon={MoreHorizontal}
                                    label={t('ui.more')}
                                    onClick={() => open(openSheet === 'more' ? null : 'more')}
                                    active={openSheet === 'more'}
                                />
                            </div>
                        )}

                        {/* ── Satpam: 3 col → Home | Kesantrian | Setting ── */}
                        {isSatpam && (
                            <div className="grid grid-cols-3">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <NavItem to="/settings" icon={Settings} label={t('nav.settings')} />
                            </div>
                        )}

                        {/* ── Staff: 5 col → Home | Kesantrian | Akademik | Keuangan | Master ── */}
                        {!isAdminUp && !isSatpam && (
                            <div className="grid grid-cols-5">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <MenuButton icon={Calendar} label={t('section.academic')} onClick={() => open('academic')} active={openSheet === 'academic'} />
                                <MenuButton icon={CreditCard} label={t('section.finance')} onClick={() => open('finance')} active={openSheet === 'finance'} />
                                <MenuButton icon={Layers} label={t('section.master')} onClick={() => open('master')} active={openSheet === 'master'} />
                            </div>
                        )}

                    </div>
                </div>
            </nav>

            {/* MasterSheet: 'boarding' | 'academic' | 'finance' | 'master' | 'admin' */}
            <MasterSheet isOpen={openSheet !== null} section={openSheet} onClose={close} />
        </>
    )
}