import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useSessionGuard } from '@hooks/useSessionGuard'
import { useLanguage } from '@context'
import BottomNav from "./BottomNav"
import Sidebar from './Sidebar'
import SlimTopBar from './SlimTopBar'

const ChatAssistant = lazy(() => import('./ChatAssistant'))

// ─── Persist sidebar state ────────────────────────────────────────────────────
const STORAGE_KEY = 'sidebar-collapsed'

function getInitialCollapsed() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch { return false } // default: expanded
}

export default function DashboardLayout({ children, title }) {
    useSessionGuard(15000)

    const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialCollapsed)
    const [isChatOpen, setIsChatOpen] = useState(false)
    const { dir } = useLanguage()

    // Persist collapse state
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, String(sidebarCollapsed)) }
        catch { /* ignore */ }
    }, [sidebarCollapsed])

    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => !prev)
    }, [])

    // Sidebar dimensions (must match Sidebar.jsx)
    const sidebarExpandedW = '220px'
    const sidebarCollapsedW = '56px'
    const currentW = sidebarCollapsed ? sidebarCollapsedW : sidebarExpandedW

    return (
        <div className="min-h-screen bg-[var(--color-app-bg)] transition-colors" translate="no">
            {/* Mobile bottom tab bar */}
            <BottomNav />

            {/* Desktop sidebar */}
            <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

            {/* Slim top bar */}
            <SlimTopBar
                onToggleSidebar={toggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
                onOpenChatAssistant={() => setIsChatOpen(prev => !prev)}
            />

            {/* Chat Assistant Widget */}
            <Suspense fallback={null}>
                <ChatAssistant isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
            </Suspense>

            {/* Ambient glows — desktop only, lightweight */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden lg:block">
                <div className="absolute -top-24 -right-24 w-[400px] h-[400px] bg-[var(--color-primary)]/4 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-[var(--color-accent)]/4 rounded-full blur-[80px]" />
            </div>

            {/* Page Content — shifts right on desktop to make room for sidebar */}
            <main
                className="relative z-10 w-full px-4 sm:px-5 lg:px-6 py-4 lg:py-6 pb-24 lg:pb-6"
                style={{ 
                    marginLeft: `0px`,
                    '--sidebar-width': '0px'
                }}
            >
                {/* Desktop: offset for sidebar via CSS (Tailwind can't do dynamic calc easily) */}
                <style>{`
                    @media (min-width: 1024px) {
                        main[class] {
                            margin-left: ${dir === 'rtl' ? '0' : currentW} !important;
                            margin-right: ${dir === 'rtl' ? currentW : '0'} !important;
                            width: calc(100% - ${currentW}) !important;
                            --sidebar-width: ${currentW} !important;
                        }
                    }
                `}</style>
                <div className="mx-auto w-full max-w-[1600px]">
                    {children}
                </div>
            </main>
        </div>
    )
}