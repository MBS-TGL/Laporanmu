import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
    Menu,
    ChevronLeft,
    Search,
    Moon,
    Sun,
    Bell,
    ChevronDown,
    Settings,
    LogOut,
    X,
    ArrowRight,
    RotateCw,
    Globe,
    Check,
    Sparkles,
    PanelRightOpen,
    PanelRightClose,
    PanelLeftOpen,
    PanelLeftClose,
} from "lucide-react"
import { useTheme, useAuth, useLanguage, useFeatureFlags } from "@context"
import { useNotifications, translateNotification } from "@hooks/useNotifications"
import {
    DASHBOARD_ITEM, TASK_CENTER_ITEM, NAV_GROUPS, filterNavItems, TYPE_STYLE,
} from "./navItems"

// ─── Portal container helper ──────────────────────────────────────────────────
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

// ─── NavIcon Helper (Pure outline, lightweight and crisp) ───────────────────
function NavIcon({ icon, className = "" }) {
    if (!icon) return null
    const isLucide = typeof icon === 'function' || (typeof icon === 'object' && icon.render)
    if (isLucide) {
        const IconComponent = icon
        return <IconComponent className={className || "w-4 h-4"} strokeWidth={2} />
    }
    return null
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ url, name, size = "w-8 h-8", textSize = "text-xs", rounded = "rounded-xl" }) {
    const [imgError, setImgError] = useState(false)
    const letter = name?.charAt(0)?.toUpperCase() || 'U'
    const showImg = url && !imgError

    return (
        <div className={`${size} ${rounded} bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold shadow-sm overflow-hidden shrink-0`}>
            {showImg ? (
                <img
                    src={url}
                    alt={name || "Avatar"}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className={textSize}>{letter}</span>
            )}
        </div>
    )
}

// ─── Search Result Item ────────────────────────────────────────────────────────
function SearchResultItem({ item, isHighlighted, onClick }) {
    return (
        <button
            onClick={() => onClick(item.to)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left
                ${isHighlighted
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
            type="button"
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color || 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                <NavIcon icon={item.icon} className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[var(--color-text)] leading-tight truncate">{item.label}</p>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-tight mt-0.5 truncate">{item.desc}</p>
            </div>
            {item._groupLabel && (
                <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)]">
                    {item._groupLabel}
                </span>
            )}
        </button>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SlimTopBar({ onToggleSidebar, sidebarCollapsed, onOpenChatAssistant }) {
    const { isDark, toggleTheme } = useTheme()
    const { profile, signOut } = useAuth()
    const { flags } = useFeatureFlags()
    const { language, setLanguage, t, tNav, tNavDesc, tGroup, dir } = useLanguage()
    const navigate = useNavigate()
    const location = useLocation()
    const { notifications, loading, refreshing, dismiss, refresh } = useNotifications()

    const role = profile?.role?.toLowerCase() || ''

    // State
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifOpen, setNotifOpen] = useState(false)
    const [langOpen, setLangOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [highlightIdx, setHighlightIdx] = useState(0)

    // Refs
    const profileRef = useRef(null)
    const notifBtnRef = useRef(null)
    const notifPanelRef = useRef(null)
    const searchRef = useRef(null)
    const searchDropdownRef = useRef(null)
    const langRef = useRef(null)

    // Notification counts
    const urgentCount = notifications.filter(n => n.type === 'error' || n.type === 'warning').length
    const totalCount = notifications.length

    // ── Build searchable items list (Translated dynamically) ──
    const allSearchItems = useMemo(() => {
        const items = [
            { ...DASHBOARD_ITEM, label: tNav(DASHBOARD_ITEM), desc: tNavDesc(DASHBOARD_ITEM), _groupLabel: '' },
            { ...TASK_CENTER_ITEM, label: tNav(TASK_CENTER_ITEM), desc: tNavDesc(TASK_CENTER_ITEM), _groupLabel: '' }
        ]

        NAV_GROUPS.forEach(group => {
            // Role filter
            if (group.requireRoles && !group.requireRoles.includes(role)) return
            if (group.hideForRoles && group.hideForRoles.includes(role)) return

            const filteredItems = filterNavItems(group.items, flags, role)
            filteredItems.forEach(item => {
                items.push({
                    ...item,
                    label: tNav(item),
                    desc: tNavDesc(item),
                    _groupLabel: tGroup(group.key, group.label)
                })
            })
        })

        return items
    }, [role, flags, tNav, tNavDesc, tGroup])

    // ── Filter search results ──
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return []
        const q = searchQuery.toLowerCase()
        return allSearchItems.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.desc?.toLowerCase().includes(q)
        ).slice(0, 8)
    }, [searchQuery, allSearchItems])

    // Reset highlight index when results change
    useEffect(() => { setHighlightIdx(0) }, [searchResults.length])

    // ── Close on outside click ──
    useEffect(() => {
        const onClick = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
            if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
            const isOutsideNotifBtn = notifBtnRef.current && !notifBtnRef.current.contains(e.target)
            const isOutsideNotifPanel = notifPanelRef.current && !notifPanelRef.current.contains(e.target)
            if (isOutsideNotifBtn && isOutsideNotifPanel) setNotifOpen(false)
            const isOutsideSearch = searchRef.current && !searchRef.current.contains(e.target)
            const isOutsideDropdown = searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)
            if (isOutsideSearch && isOutsideDropdown) {
                setSearchFocused(false)
            }
        }
        window.addEventListener("mousedown", onClick)
        return () => window.removeEventListener("mousedown", onClick)
    }, [])

    // Clear search on navigate
    useEffect(() => {
        setSearchQuery('')
        setSearchFocused(false)
    }, [location.pathname])

    const handleNotifNavigate = useCallback((route) => {
        setNotifOpen(false)
        navigate(route)
    }, [navigate])

    const handleSearchNavigate = useCallback((to) => {
        setSearchQuery('')
        setSearchFocused(false)
        navigate(to)
    }, [navigate])

    // Keyboard navigation for search
    const handleSearchKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIdx(prev => Math.min(prev + 1, searchResults.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIdx(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && searchResults.length > 0) {
            e.preventDefault()
            handleSearchNavigate(searchResults[highlightIdx]?.to)
        } else if (e.key === 'Escape') {
            setSearchFocused(false)
            setSearchQuery('')
            searchRef.current?.querySelector('input')?.blur()
        }
    }, [searchResults, highlightIdx, handleSearchNavigate])

    // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchRef.current?.querySelector('input')?.focus()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    const showSearchDropdown = searchFocused && searchQuery.trim().length > 0

    return (
        <>
            {/* Bell shake animation */}
            <style>{`
                @keyframes bellShake {
                    0%, 85%, 100% { transform: rotate(0deg); }
                    88% { transform: rotate(-12deg); }
                    92% { transform: rotate(12deg); }
                    96% { transform: rotate(-8deg); }
                    98% { transform: rotate(8deg); }
                }
            `}</style>

            <header
                className={`sticky top-0 z-40 bg-[var(--color-surface)]/85 backdrop-blur-xl border-b border-[var(--color-border)]
                    ${dir === 'rtl'
                        ? (sidebarCollapsed ? 'lg:pr-[56px]' : 'lg:pr-[220px]')
                        : (sidebarCollapsed ? 'lg:pl-[56px]' : 'lg:pl-[220px]')}`}
            >
                <div className="flex items-center justify-between h-14 px-3 sm:px-4 lg:px-4 gap-2 sm:gap-4">

                    {/* Left + Search Group to align search left next to the navigation controls */}
                    <div className={`flex items-center gap-2 sm:gap-3 min-w-0 transition-all duration-200 ${searchFocused ? 'flex-1' : 'flex-1 sm:flex-1'}`}>
                        {/* ── Left: Hamburger + Back — hidden when mobile search is open ── */}
                        <div className={`flex items-center gap-1 shrink-0 ${searchFocused ? 'hidden sm:flex' : 'flex'}`}>
                            {/* Hamburger — desktop only */}
                            <button
                                onClick={onToggleSidebar}
                                type="button"
                                aria-label="Toggle sidebar"
                                className="hidden lg:flex w-8 h-8 items-center justify-center rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                {dir === 'rtl' ? (
                                    sidebarCollapsed ? (
                                        <PanelRightOpen className="w-4.5 h-4.5" strokeWidth={2} />
                                    ) : (
                                        <PanelRightClose className="w-4.5 h-4.5" strokeWidth={2} />
                                    )
                                ) : (
                                    sidebarCollapsed ? (
                                        <PanelLeftOpen className="w-4.5 h-4.5" strokeWidth={2} />
                                    ) : (
                                        <PanelLeftClose className="w-4.5 h-4.5" strokeWidth={2} />
                                    )
                                )}
                            </button>

                            {/* Back button */}
                            <button
                                onClick={() => navigate(-1)}
                                type="button"
                                aria-label="Kembali"
                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2} />
                            </button>
                        </div>

                        {/* ── Center: Search ── */}
                        {/* Mobile: collapsed icon → expands to full bar when tapped */}
                        <div className={`relative transition-all duration-200 ${searchFocused ? 'flex-1' : 'sm:flex-1'}`} ref={searchRef}>

                            {/* Mobile collapsed state: search icon button */}
                            {!searchFocused && (
                                <button
                                    type="button"
                                    aria-label="Cari halaman"
                                    onClick={() => setSearchFocused(true)}
                                    className="sm:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                                >
                                    <Search className="w-4 h-4" strokeWidth={2} />
                                </button>
                            )}

                            {/* Full search bar: always visible on sm+, expands on mobile when focused */}
                            <div className={`w-full ${searchFocused ? 'flex' : 'hidden sm:flex'} items-center gap-2 h-8 px-3 rounded-xl border transition-all
                                ${searchFocused
                                    ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-sm ring-2 ring-[var(--color-primary)]/20'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)]'}`}
                            >
                                <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" strokeWidth={2} />
                                <input
                                    type="text"
                                    placeholder={t("ui.search_placeholder")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onKeyDown={handleSearchKeyDown}
                                    autoFocus={searchFocused}
                                    className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                                />
                                {/* Keyboard shortcut badge — sm+ only */}
                                {!searchFocused && (
                                    <span className="hidden sm:flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded-md border border-[var(--color-border)]">
                                        <span>⌘</span><span>K</span>
                                    </span>
                                )}
                                {/* Clear / close button */}
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setSearchFocused(false) }}
                                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs shrink-0"
                                >
                                    <X className="w-4 h-4" strokeWidth={2} />
                                </button>
                            </div>

                            {/* Search dropdown */}
                            {showSearchDropdown && (
                                <div
                                    ref={searchDropdownRef}
                                    className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden z-50"
                                >
                                    {searchResults.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                                            <p className="text-[12px] font-bold">{t('ui.search_no_result')}</p>
                                            <p className="text-[10px] mt-1">{t('ui.search_no_result_hint')}</p>
                                        </div>
                                    ) : (
                                        <div className="p-1.5">
                                            {searchResults.map((item, idx) => (
                                                <SearchResultItem
                                                    key={item.to}
                                                    item={item}
                                                    isHighlighted={idx === highlightIdx}
                                                    onClick={handleSearchNavigate}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-between text-[var(--color-text-muted)]">
                                        <span className="text-[9px] font-bold">{t('ui.search_hint_navigate')}</span>
                                        <span className="text-[9px] font-bold">{t('ui.search_hint_open')}</span>
                                        <span className="text-[9px] font-bold">{t('ui.search_hint_close')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Language + Theme + Bell + Avatar ── */}
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Language Selector */}
                        <div className={`relative ${searchFocused ? 'hidden' : 'block'}`} ref={langRef}>
                            <button
                                onClick={() => setLangOpen(v => !v)}
                                className={`w-8 h-8 sm:h-8 sm:w-auto flex items-center justify-center sm:gap-1.5 sm:px-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition text-[var(--color-text-muted)] hover:text-[var(--color-text)] border border-transparent sm:border-[var(--color-border)]/80
                                    ${langOpen
                                        ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)] border-[var(--color-primary)]/30'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                aria-label="Pilih Bahasa / Language Selection"
                                type="button"
                            >
                                <Globe className="w-4 h-4 shrink-0" strokeWidth={2} />
                                <span className="hidden sm:inline text-[11px] font-extrabold uppercase tracking-tight">{language}</span>
                                <ChevronDown className={`hidden sm:block w-3 h-3 text-[var(--color-text-muted)] transition-transform duration-200 ${langOpen ? 'rotate-180 text-[var(--color-primary)]' : ''}`} />
                            </button>

                            {langOpen && (
                                <div className={`absolute mt-2 w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden z-50 p-1
                                    ${dir === 'rtl' ? 'left-0' : 'right-0'}`}
                                >
                                    {[
                                        { code: "id", label: "Bahasa Indonesia", codeLabel: "ID" },
                                        { code: "en", label: "English", codeLabel: "EN" },
                                        { code: "ar", label: "العربية", codeLabel: "AR" }
                                    ].map(item => (
                                        <button
                                            key={item.code}
                                            onClick={() => { setLanguage(item.code); setLangOpen(false); }}
                                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3
                                                ${language === item.code
                                                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}`}
                                            type="button"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-6 h-4.5 flex items-center justify-center rounded text-[9px] font-black leading-none select-none shrink-0 transition-colors
                                                    ${language === item.code
                                                        ? 'bg-[var(--color-primary)] text-white'
                                                        : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                                    {item.codeLabel}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            {language === item.code && <Check className="w-3.5 h-3.5 shrink-0 text-[var(--color-primary)]" strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
                            className={`w-8 h-8 items-center justify-center rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition ${searchFocused ? 'hidden' : 'flex'}`}
                            type="button"
                        >
                            {isDark ? (
                                <Sun className="w-4.5 h-4.5" strokeWidth={2} />
                            ) : (
                                <Moon className="w-4.5 h-4.5" strokeWidth={2} />
                            )}
                        </button>

                        {/* Asisten button */}
                        <button
                            onClick={onOpenChatAssistant}
                            className={`w-8 h-8 sm:w-auto sm:h-8 flex items-center justify-center sm:gap-1.5 sm:px-3 rounded-xl border border-transparent sm:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-primary)] transition text-[11px] font-extrabold text-[var(--color-text-muted)] ${searchFocused ? 'hidden' : 'flex'}`}
                            type="button"
                        >
                            <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2} />
                            <span className="hidden sm:inline">{t('ui.assistant') || 'Asisten'}</span>
                        </button>

                        {/* Notification bell */}
                        <div className={`relative ${searchFocused ? 'hidden' : 'block'}`} ref={notifBtnRef}>
                            <button
                                onClick={() => setNotifOpen(v => !v)}
                                className={`relative w-8 h-8 flex items-center justify-center rounded-xl transition
                                    ${notifOpen
                                        ? 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
                                        : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}
                                    ${urgentCount > 0 ? 'animate-[bellShake_2s_ease-in-out_infinite]' : ''}`}
                                aria-label={t('notif.header')}
                                type="button"
                            >
                                <Bell className="w-4.5 h-4.5" strokeWidth={2} />
                                <NotifBadge count={urgentCount || (totalCount > 0 ? totalCount : 0)} />
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-[var(--color-border)] mx-0.5 opacity-50" />

                        {/* Profile — visible on all screen sizes */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(v => !v)}
                                aria-label="Menu Profil"
                                className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]
                                    ${profileOpen ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)]' : ''}`}
                                type="button"
                            >
                                <Avatar url={profile?.avatar_url} name={profile?.name} />
                                {/* Name + role — visible on lg+ */}
                                <div className="hidden lg:flex flex-col min-w-0 max-w-[120px]">
                                    <span className="text-[11px] font-extrabold text-[var(--color-text)] leading-tight truncate">{profile?.name || 'User'}</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-none mt-0.5 truncate">{profile?.role || 'Staff'}</span>
                                </div>
                                <ChevronDown
                                    className={`w-3 h-3 text-[var(--color-text-muted)] transition-transform hidden sm:block ${profileOpen ? "rotate-180" : ""}`}
                                    strokeWidth={2}
                                />
                            </button>

                            {profileOpen && (
                                <div className={`absolute mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden z-50
                                    ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>
                                    {/* User info header */}
                                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                                        <p className="text-[12.5px] font-black text-[var(--color-text)] truncate">{profile?.name || 'User'}</p>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{profile?.role || 'Staff'}</p>
                                    </div>


                                    <button
                                        onClick={() => { setProfileOpen(false); navigate("/settings") }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-semibold text-[13px] text-[var(--color-text)] ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                        type="button"
                                    >
                                        <Settings className="w-4 h-4 shrink-0" strokeWidth={2} /> <span>{t("nav.settings")}</span>
                                    </button>
                                    <button
                                        onClick={async () => { setProfileOpen(false); await signOut(); navigate("/login") }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-semibold text-[13px] text-red-600 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                                        type="button"
                                    >
                                        <LogOut className="w-4 h-4 text-red-600 shrink-0" strokeWidth={2} /> <span>{t("ui.logout")}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Notification Panel ── */}
            <NotifPanel
                isOpen={notifOpen}
                notifications={notifications.map(n => translateNotification(n, t))}
                loading={loading}
                refreshing={refreshing}
                onDismiss={dismiss}
                onRefresh={refresh}
                onNavigate={handleNotifNavigate}
                anchorRef={notifBtnRef}
                panelRef={notifPanelRef}
            />
        </>
    )
}

// ─── Notification Badge Helper ─────────────────────────────────────────────────
function NotifBadge({ count }) {
    const { tNum } = useLanguage()
    if (!count || count <= 0) return null
    return (
        <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center border border-[var(--color-surface)]">
            {count > 9 ? tNum("9+") : tNum(count)}
        </span>
    )
}

// ─── Notification Item Component ──────────────────────────────────────────────
function NotifItem({ item, onDismiss, onNavigate }) {
    const { t } = useLanguage()
    const s = TYPE_STYLE[item.type] || TYPE_STYLE.info
    const Icon = s.icon

    return (
        <div className={`group relative p-3 rounded-xl border ${s.bg} ${s.border} transition-all hover:scale-[1.01] flex gap-2.5 min-w-0`}>
            {/* Type badge icon */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-surface)] shadow-sm ${s.text}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0 pe-6">
                <p className="text-[12px] font-bold text-[var(--color-text)] leading-tight">{item.title}</p>
                <p className="text-[10.5px] text-[var(--color-text-muted)] leading-relaxed mt-0.5">{item.body || item.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    {item.created_at && (
                        <span className="text-[9px] font-bold tracking-wider text-[var(--color-text-muted)]/75 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    {item.action && (
                        <button
                            onClick={() => onNavigate(item.action.route)}
                            className={`text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 hover:underline ${s.text}`}
                        >
                            {item.action.label} <ArrowRight className="w-3 h-3" strokeWidth={2} />
                        </button>
                    )}
                    {!item.action && item.action_url && (
                        <button
                            onClick={() => onNavigate(item.action_url)}
                            className={`text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1 hover:underline ${s.text}`}
                        >
                            {t('ui.detail')} <ArrowRight className="w-3 h-3" strokeWidth={2} />
                        </button>
                    )}
                </div>
            </div>

            {/* Dismiss button */}
            <button
                onClick={() => onDismiss(item.id)}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
                aria-label={t('notif.close')}
            >
                <X className="w-4 h-4" strokeWidth={2} />
            </button>
        </div>
    )
}

// ─── Notification Panel Dropdown ──────────────────────────────────────────────
function NotifPanel({ isOpen, notifications, loading, refreshing, onDismiss, onRefresh, onNavigate, anchorRef, panelRef }) {
    const { t, dir } = useLanguage()
    if (!isOpen) return null

    return (
        <div
            ref={panelRef}
            className={`absolute top-[52px] w-full max-w-[340px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden z-[99999] flex flex-col ${dir === 'rtl' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'}`}
        >
            {/* Header */}
            <div className="px-3.5 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[var(--color-primary)]" strokeWidth={2} />
                    <span className="text-[12px] font-extrabold text-[var(--color-text)]">{t('notif.header')}</span>
                </div>
                <button
                    onClick={onRefresh}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] transition"
                    disabled={refreshing}
                    type="button"
                >
                    <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
                </button>
            </div>

            {/* List */}
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-2 no-scrollbar">
                {loading ? (
                    <div className="py-8 text-center text-[var(--color-text-muted)] flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[11px] font-bold">{t('notif.loading')}</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-12 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
                        <Bell className="w-8 h-8 opacity-15 mb-2.5" strokeWidth={1.5} />
                        <p className="text-[11.5px] font-bold">{t('notif.empty_title')}</p>
                        <p className="text-[10px] mt-0.5">{t('notif.empty_desc')}</p>
                    </div>
                ) : (
                    notifications.map(item => (
                        <NotifItem
                            key={item.id}
                            item={item}
                            onDismiss={onDismiss}
                            onNavigate={onNavigate}
                        />
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-3.5 py-2 bg-black/5 dark:bg-white/5 border-t border-[var(--color-border)] flex items-center justify-between text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">
                <span>{t('notif.realtime')}</span>
                <span>LaporanMu</span>
            </div>
        </div>
    )
}
