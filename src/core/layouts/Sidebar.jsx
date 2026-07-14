import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons"
import { useAuth, useFeatureFlags, useLanguage } from "@context"
import {
    DASHBOARD_ITEM, TASK_CENTER_ITEM, NAV_GROUPS, filterNavItems,
} from "./navItems"

// ─── NavIcon Helper (Pure outline, lightweight and crisp) ───────────────────
function NavIcon({ icon, className = "" }) {
    if (!icon) return null
    const isLucide = typeof icon === 'function' || (typeof icon === 'object' && icon.render)
    if (isLucide) {
        const IconComponent = icon
        return <IconComponent className={className || "w-4 h-4"} strokeWidth={2} />
    }
    return <FontAwesomeIcon icon={icon} className={className} />
}

// ─── Sidebar Persistence ──────────────────────────────────────────────────────
const GROUPS_KEY = 'sidebar-groups-open'

function getInitialGroupsOpen() {
    try {
        const stored = localStorage.getItem(GROUPS_KEY)
        return stored ? JSON.parse(stored) : {
            boarding: true,
            academic: true,
            finance: true,
            master: true,
            admin: true
        }
    } catch {
        return {
            boarding: true,
            academic: true,
            finance: true,
            master: true,
            admin: true
        }
    }
}

// ─── Single Nav Item ──────────────────────────────────────────────────────────
function SidebarItem({ item, collapsed }) {
    const { tNav } = useLanguage()

    return (
        <NavLink
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/admin'}
            className={({ isActive }) =>
                `group/item flex items-center rounded-xl text-[12.5px] font-semibold transition-all duration-300 relative min-w-0
                ${isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}
                ${collapsed
                    ? 'w-10 h-10 justify-center p-2 mx-auto group-hover/sidebar:w-full group-hover/sidebar:px-2.5 group-hover/sidebar:py-[5px] group-hover/sidebar:gap-2.5 group-hover/sidebar:justify-start group-hover/sidebar:mx-0'
                    : 'w-full px-2.5 py-[5px] gap-2.5'}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active indicator bar */}
                    {isActive && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--color-primary)] transition-all duration-300
                            ${collapsed ? 'opacity-0 group-hover/sidebar:opacity-100' : 'opacity-100'}`}
                        />
                    )}

                    {/* Icon */}
                    <div className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors duration-200
                        ${isActive
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] group-hover/item:text-[var(--color-text)]'}`}
                    >
                        <NavIcon icon={item.icon} className="w-[18px] h-[18px]" />
                    </div>

                    {/* Label — animated slide/fade */}
                    <span className={`truncate leading-none text-left transition-all duration-300
                        ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}
                    >
                        {tNav(item)}
                    </span>
                </>
            )}
        </NavLink>
    )
}

// ─── Collapsible Group ────────────────────────────────────────────────────────
function SidebarGroup({ group, items, collapsed, isOpen, onToggle }) {
    const { tNav, tGroup } = useLanguage()
    const location = useLocation()

    // Auto-expand group if any child route is active
    const hasActiveChild = useMemo(() =>
        items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/')),
        [items, location.pathname]
    )

    const showChildren = isOpen || hasActiveChild

    return (
        <div className="relative group/grp flex flex-col">
            {/* Group Header Button */}
            <button
                type="button"
                onClick={collapsed ? undefined : onToggle}
                className={`flex items-center justify-between rounded-xl min-w-0 outline-none transition-all duration-300
                    ${collapsed
                        ? 'w-10 h-10 justify-center mx-auto hover:bg-[var(--color-surface-alt)] group-hover/sidebar:w-full group-hover/sidebar:px-2.5 group-hover/sidebar:py-[5px] group-hover/sidebar:justify-between group-hover/sidebar:mx-0'
                        : 'w-full justify-between px-2.5 py-[5px]'}
                    ${(!collapsed && hasActiveChild)
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-text-muted)]/70 hover:text-[var(--color-text-muted)]'}`}
            >
                {/* Left Side: Group Icon (when collapsed) OR Group Label (when expanded/hovered) */}
                <div className="flex items-center min-w-0">
                    {/* Group Icon — only visible when collapsed (hidden on hover sidebar) */}
                    <div className={`flex items-center justify-center shrink-0 transition-all duration-300
                        ${collapsed ? 'w-5 opacity-100 group-hover/sidebar:w-0 group-hover/sidebar:opacity-0 group-hover/sidebar:overflow-hidden' : 'w-0 opacity-0 overflow-hidden'}`}
                    >
                        <NavIcon icon={group.icon} className="w-4 h-4 text-[var(--color-text-muted)]/70" />
                    </div>

                    {/* Group Label — hidden when collapsed, shown when expanded or sidebar hover */}
                    <span className={`truncate text-left leading-none transition-all duration-300
                        ${collapsed
                            ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden text-[9px] font-black tracking-widest uppercase text-[var(--color-text-muted)]/70'
                            : 'text-[9px] font-black tracking-widest uppercase text-[var(--color-text-muted)]/70'}`}
                    >
                        {tGroup(group.key, group.label)}
                    </span>
                </div>

                {/* Right Side: Chevron icon — only visible when expanded/hovered */}
                <div className={`w-2.5 flex items-center justify-center shrink-0 transition-all duration-300
                    ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-2.5 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-2.5 opacity-100'}`}
                >
                    <NavIcon
                        icon={showChildren ? faChevronDown : faChevronRight}
                        className="text-[7px] shrink-0 text-[var(--color-text-muted)]/70"
                    />
                </div>
            </button>

            {/* Vertical Submenu Items */}
            <div className={`pl-0.5 space-y-[1px] mt-0.5 transition-all duration-300 origin-top
                ${collapsed ? 'h-0 opacity-0 overflow-hidden group-hover/sidebar:h-auto group-hover/sidebar:opacity-100 group-hover/sidebar:mt-1' : ''}`}
            >
                {showChildren && items.map(item => (
                    <SidebarItem key={item.to} item={item} collapsed={collapsed} />
                ))}
            </div>
        </div>
    )
}

// ─── Main Sidebar Component ──────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
    const { profile } = useAuth()
    const { flags } = useFeatureFlags()
    const { t, tNav, tNum, dir } = useLanguage()
    const role = profile?.role?.toLowerCase() || ''
    const navigate = useNavigate()

    // Main navigation scroll container reference
    const navRef = useRef(null)

    // Restore scroll top instantly before layout paint
    useLayoutEffect(() => {
        try {
            const savedScroll = sessionStorage.getItem('sidebar-scroll-top')
            if (savedScroll && navRef.current) {
                navRef.current.scrollTop = Number(savedScroll)
            }
        } catch { /* ignore */ }
    }, [collapsed])

    // Save scroll position on user scrolling
    const handleScroll = useCallback((e) => {
        try {
            sessionStorage.setItem('sidebar-scroll-top', String(e.currentTarget.scrollTop))
        } catch { /* ignore */ }
    }, [])

    // Groups open/close state
    const [groupsOpen, setGroupsOpen] = useState(getInitialGroupsOpen)

    // Persist groups open state
    useEffect(() => {
        try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groupsOpen)) }
        catch { /* ignore */ }
    }, [groupsOpen])

    const toggleGroup = useCallback((key) => {
        setGroupsOpen(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    // Filter groups based on role
    const visibleGroups = useMemo(() => {
        return NAV_GROUPS.filter(group => {
            if (group.requireRoles && !group.requireRoles.includes(role)) return false
            if (group.hideForRoles && group.hideForRoles.includes(role)) return false
            return true
        })
    }, [role])

    // Class styles based on state
    const sidebarW = collapsed
        ? 'w-[56px] hover:w-[220px] shadow-none hover:shadow-[10px_0_40px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[10px_0_40px_-6px_rgba(0,0,0,0.45)]'
        : 'w-[220px]'

    const isRtl = dir === 'rtl'

    return (
        <aside
            className={`hidden lg:flex flex-col fixed top-0 h-screen z-50 bg-[var(--color-surface)] ${sidebarW}
                transition-all duration-300 ease-in-out group/sidebar
                ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} border-[var(--color-border)]`}
        >
            {/* ── Logo Section ── */}
            <div className={`shrink-0 border-b border-[var(--color-border)] ${collapsed ? 'px-2 py-3 group-hover/sidebar:px-3.5 group-hover/sidebar:py-3' : 'px-3.5 py-3'} transition-all duration-300`}>
                <div className={`flex items-center ${collapsed ? 'justify-center group-hover/sidebar:justify-start group-hover/sidebar:gap-2.5' : 'gap-2.5'} transition-all duration-300`}>
                    {/* Logo badge */}
                    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 w-8 h-8 text-xs">
                        <span>L</span>
                    </div>

                    {/* Text — hidden smoothly, expands on hover */}
                    <div className={`min-w-0 flex flex-col transition-all duration-300
                        ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}
                    >
                        <p className="text-[13px] font-extrabold text-[var(--color-text)] leading-tight truncate font-heading">
                            Laporanmu
                        </p>
                        <p className="text-[8px] font-bold tracking-widest uppercase text-[var(--color-text-muted)] whitespace-nowrap mt-0.5">
                            {tNum("TA 2026/2027")}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto overflow-x-hidden py-2.5 space-y-0.5 scrollbar-none transition-all duration-300
                    ${collapsed ? 'px-1.5 group-hover/sidebar:px-2.5' : 'px-2.5'}`}
            >
                {/* Dashboard — always first, standalone */}
                <SidebarItem item={DASHBOARD_ITEM} collapsed={collapsed} />
                <SidebarItem item={TASK_CENTER_ITEM} collapsed={collapsed} />

                {/* Divider */}
                <div className={`h-px bg-[var(--color-border)]/60 !my-2 transition-all duration-300
                    ${collapsed ? 'mx-1 group-hover/sidebar:mx-1.5' : 'mx-1.5'}`}
                />

                {/* Grouped nav items */}
                {visibleGroups.map(group => {
                    const filteredItems = filterNavItems(group.items, flags, role)
                    if (filteredItems.length === 0) return null

                    return (
                        <SidebarGroup
                            key={group.key}
                            group={group}
                            items={filteredItems}
                            collapsed={collapsed}
                            isOpen={groupsOpen[group.key] ?? true}
                            onToggle={() => toggleGroup(group.key)}
                        />
                    )
                })}
            </nav>
        </aside>
    )
}
