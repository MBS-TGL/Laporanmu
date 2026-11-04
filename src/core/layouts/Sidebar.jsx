import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useAuth, useFeatureFlags, useLanguage } from "@context"
import {
    DASHBOARD_ITEM, TASK_CENTER_ITEM, NAV_GROUPS, filterNavItems,
} from "./navItems"

// ─── NavIcon Helper ──────────────────────────────────────────────────────────
function NavIcon({ icon, className = "" }) {
    if (!icon) return null
    const IconComponent = icon
    return <IconComponent className={className || "w-4.5 h-4.5"} strokeWidth={2} />
}

// ─── Sidebar Persistence ─────────────────────────────────────────────────────
const GROUPS_KEY = 'sidebar-groups-open'

const DEFAULT_GROUPS_OPEN = {
    boarding: true,
    academic: true,
    finance: false,
    master: false,
    admin: false,
}

function getInitialGroupsOpen() {
    try {
        const stored = localStorage.getItem(GROUPS_KEY)
        return stored
            ? { ...DEFAULT_GROUPS_OPEN, ...JSON.parse(stored) }
            : DEFAULT_GROUPS_OPEN
    } catch {
        return DEFAULT_GROUPS_OPEN
    }
}

// ─── Single Nav Item ─────────────────────────────────────────────────────────
// Rail ciut = stabil (tooltip native), bukan flyout hover yang menutupi konten.
function SidebarItem({ item, collapsed, inGroup = false }) {
    const { tNav } = useLanguage()
    const label = tNav(item)

    return (
        <NavLink
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/admin'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
                `group/item relative flex h-9 min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150
                ${isActive
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-text-muted hover:bg-surface-alt hover:text-text'}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Indikator aktif — di anak grup menempel pada guide line */}
                    <span
                        aria-hidden="true"
                        className={`absolute top-1 bottom-1 w-[3px] rounded-full bg-primary transition-opacity duration-150
                            ${inGroup ? '-left-1' : 'left-0'}
                            ${isActive ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className={`flex w-4.5 shrink-0 items-center justify-center
                        ${isActive ? 'text-primary' : 'text-text-muted group-hover/item:text-text'}`}
                    >
                        <NavIcon icon={item.icon} />
                    </span>
                    <span className="truncate leading-none">{label}</span>
                </>
            )}
        </NavLink>
    )
}

// ─── Collapsible Group ───────────────────────────────────────────────────────
function SidebarGroup({ group, items, collapsed, isOpen, onToggle }) {
    const { tGroup, dir } = useLanguage()
    const location = useLocation()
    const label = tGroup(group.key, group.label)

    // Auto-expand group if any child route is active
    const hasActiveChild = useMemo(() =>
        items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/')),
        [items, location.pathname]
    )

    const showChildren = isOpen || hasActiveChild

    // Rail ciut: grup jadi pemisah section tipis — tanpa ikon ganda yang membingungkan
    if (collapsed) {
        return <div className="mx-3 my-1.5 h-px bg-border/60" title={label} />
    }

    return (
        <div className="flex flex-col">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={showChildren}
                className="group/grp flex h-8 w-full items-center justify-between rounded-lg px-2.5 transition-colors duration-150 text-text-muted/70 hover:text-text-muted"
            >
                <span className="truncate text-xs font-semibold uppercase tracking-wider">
                    {label}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-200
                        ${showChildren ? 'rotate-0' : dir === 'rtl' ? 'rotate-90' : '-rotate-90'}`}
                />
            </button>

            {/* Anak grup: indent + guide line tipis sebagai penanda hierarki */}
            {showChildren && (
                <div className="mt-0.5 ml-2.5 mr-1 space-y-0.5 border-l border-border/70 py-0.5 pl-1">
                    {items.map(item => (
                        <SidebarItem key={item.to} item={item} collapsed={collapsed} inGroup />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main Sidebar Component ──────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
    const { profile } = useAuth()
    const { flags } = useFeatureFlags()
    const { tNum, dir } = useLanguage()
    const role = profile?.role?.toLowerCase() || ''              // untuk filter nav (format asli)
    const roleDisplay = role.replace(/_/g, ' ')                  // untuk tampilan footer

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

    const initial = (profile?.name || 'P').trim().charAt(0).toUpperCase()
    const isRtl = dir === 'rtl'
    const isExpanded = !collapsed

    return (
        <aside
            className={`hidden inset-y-0 lg:flex fixed z-50 flex-col bg-surface border-border transition-[width] duration-200 ease-out
                ${collapsed ? 'w-14' : 'w-[250px]'}
                ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}`}
        >
            {/* ── Logo ── */}
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
                <div
                    className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0"
                    title="Laporanmu"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 4v14a2 2 0 0 0 2 2h10" />
                        <path d="M10 8h6" />
                        <path d="M10 12h4" />
                    </svg>
                </div>
                {isExpanded && (
                    <div className="min-w-0 animate-in fade-in duration-200">
                        <p className="truncate text-sm font-bold leading-tight text-text">Laporanmu</p>
                        <p className="text-xs font-semibold tracking-wide text-text-muted">{tNum("TA 2026/2027")}</p>
                    </div>
                )}
            </div>

            {/* ── Navigasi ── */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                aria-label="Navigasi utama"
                className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-none"
            >
                <SidebarItem item={DASHBOARD_ITEM} collapsed={collapsed} />
                <SidebarItem item={TASK_CENTER_ITEM} collapsed={collapsed} />

                {/* Pemisah antara menu utama dan grup fitur */}
                {isExpanded && <div className="mx-1 my-1.5 h-px bg-border/60" />}

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

            {/* ── Footer: identitas pengguna + toggle ── */}
            <div className="shrink-0 border-t border-border px-2 py-2">
                {isExpanded ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-200">
                        <div
                            className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0"
                            aria-hidden="true"
                        >
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                            <p className="truncate text-xs font-semibold text-text">{profile?.name || 'Pengguna'}</p>
                            <p className="truncate text-xs text-text-muted capitalize">{roleDisplay || '—'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-label="Ciutkan sidebar"
                            title="Ciutkan sidebar"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-alt hover:text-text transition-colors duration-150 shrink-0"
                        >
                            <PanelLeftClose className="w-4.5 h-4.5 rtl:-scale-x-100" />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-label="Perluas sidebar"
                            title="Perluas sidebar"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-alt hover:text-text transition-colors duration-150"
                        >
                            <PanelLeftOpen className="w-4.5 h-4.5 rtl:-scale-x-100" />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    )
}
