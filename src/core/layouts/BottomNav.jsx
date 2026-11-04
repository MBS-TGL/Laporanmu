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
import MasterSheet from "../components/MasterSheet"

// ─── Warna aktif ─────────────────────────────────────────────────────────────
const INACTIVE_COLOR = "text-text-muted"

// ─── NavItem (route link) ────────────────────────────────────────────────────
function NavItem({ to, icon, label }) {
    const IconComp = icon
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1.5 py-2 px-1 transition-colors duration-200
                 ${isActive ? 'text-primary' : 'text-text-muted hover:text-text'}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active pill background around icon */}
                    <div className={`w-12 h-7 rounded-lg flex items-center justify-center transition-colors duration-200
                        ${isActive
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/10'
                            : 'bg-transparent text-text-muted'}`}
                    >
                        <IconComp
                            className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                    </div>
                    <span className={`text-xs font-bold tracking-tight leading-none truncate transition-colors duration-200 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
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
            className={`relative flex flex-col items-center justify-center gap-1.5 py-2 px-1 transition-colors duration-200
                ${active ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
            {/* Active pill background around icon */}
            <div className={`w-12 h-7 rounded-lg flex items-center justify-center transition-colors duration-200
                ${active
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/10'
                    : 'bg-transparent text-text-muted'}`}
            >
                <IconComp
                    className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-105' : ''}`}
                    strokeWidth={active ? 2.5 : 2}
                />
            </div>
            <span className={`text-xs font-bold tracking-tight leading-none truncate transition-colors duration-200 ${active ? 'text-primary' : 'text-text-muted'}`}>
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
                    transition-transform duration-200 ease-in-out
                    ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {/* Safe area padding for notched phones */}
                <div className="mx-auto max-w-lg px-3 pb-2">
                    <div className="rounded-xl border border-border bg-surface shadow-xl overflow-hidden">

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