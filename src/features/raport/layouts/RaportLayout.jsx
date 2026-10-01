import React, { useRef, useState, lazy, Suspense } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import DashboardLayout from '@core/layouts/DashboardLayout'
import PageHeader from '@shared/components/PageHeader'
import { RaportProvider, useRaportContext } from '@features/raport/context/RaportContext'
import { Check, Sliders, Keyboard, Lightbulb, Lock, Loader2, CheckCircle2, Upload, Download, Archive } from 'lucide-react'
import { createPortal } from 'react-dom'
import Modal from '@shared/components/Modal'
import { ShortcutModalContent } from '@features/raport/components/RaportModals'

const LazyRaportImportModal = lazy(() => import('@features/raport/components/RaportImportModal'))
const LazyRaportExportModal = lazy(() => import('@features/raport/components/RaportExportModal'))

function RaportLayoutContent({ isAcademic = false }) {
    const location = useLocation()
    const navigate = useNavigate()
    const params = useParams()
    const { core, importExport } = useRaportContext()
    const { isAllowed, canEdit, globalSaveIndicator, selectedClass, step } = core

    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [showShortcutModal, setShowShortcutModal] = useState(false)
    const [shortcutRect, setShortcutRect] = useState(null)
    const [showTutorialModal, setShowTutorialModal] = useState(false)

    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)

    const basePath = isAcademic ? '/academic/raport' : '/raport'
    const pathname = location.pathname

    // Active step index determination based on URL path
    const activeStepIndex = (() => {
        if (pathname === basePath || pathname === `${basePath}/`) return 0
        if (pathname.includes('/setup')) return 1
        if (pathname.includes('/input')) return 2
        if (pathname.includes('/preview')) return 3
        return -1
    })()

    const stepLabels = ['Pilih Kelas', 'Setup Periode', 'Input Nilai', 'Preview & Cetak']

    if (isAllowed === null) return (
        <DashboardLayout title={isAcademic ? 'Rapor & Penilaian' : 'Raport Pondok'}>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
        </DashboardLayout>
    )

    if (!isAllowed) return (
        <DashboardLayout title={isAcademic ? 'Rapor & Penilaian' : 'Raport Pondok'}>
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">Halaman ini hanya dapat diakses oleh <strong>Guru</strong> dan <strong>Admin</strong>.</p>
                </div>
                <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">Kembali</button>
            </div>
        </DashboardLayout>
    )

    return (
        <DashboardLayout title={isAcademic ? 'Rapor & Penilaian' : 'Raport Pondok'}>
            {/* Global auto-save indicator */}
            {activeStepIndex === 2 && globalSaveIndicator && (
                <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-2xl text-[10px] font-black transition-all duration-300 backdrop-blur-md ${globalSaveIndicator === 'saving' ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                    {globalSaveIndicator === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {globalSaveIndicator === 'saving' ? 'Menyimpan...' : 'Tersimpan ✓'}
                </div>
            )}

            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">Mode Read-only — Edit raport dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="academic"
                    breadcrumbs={['Grade Reports']}
                    title={isAcademic ? 'Rapor & Penilaian' : 'Raport Pondok'}
                    subtitle={isAcademic ? 'Kelola dan cetak rapor umum & penilaian akademik per kelas.' : 'Kelola dan cetak raport pondok bulanan per kelas.'}
                    actions={
                        <>
                            {activeStepIndex !== -1 && (
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mr-2 shadow-sm">
                                    {stepLabels.map((label, i) => {
                                        const classId = params.classId || selectedClass?.id
                                        const stepRoutes = [
                                            basePath,
                                            classId ? `${basePath}/setup/${classId}` : basePath,
                                            classId ? `${basePath}/input/${classId}` : basePath,
                                            classId ? `${basePath}/preview/${classId}` : basePath,
                                        ]
                                        return (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <button
                                                    disabled={i > activeStepIndex && !classId}
                                                    onClick={() => navigate(stepRoutes[i])}
                                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${activeStepIndex === i ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : activeStepIndex > i ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}
                                                >
                                                    {activeStepIndex > i ? <Check className="w-2 h-2" /> : i + 1}
                                                </button>
                                                <button
                                                    disabled={i > activeStepIndex && !classId}
                                                    onClick={() => navigate(stepRoutes[i])}
                                                    className={`text-[9px] font-bold transition-all hover:underline ${activeStepIndex === i ? 'text-indigo-600 font-extrabold' : activeStepIndex > i ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}
                                                >
                                                    {label}
                                                </button>
                                                {i < stepLabels.length - 1 && <div className="w-4 h-px bg-[var(--color-border)]" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <button
                                ref={headerMenuBtnRef}
                                onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Data & Backup Operations"
                            >
                                <Sliders className="w-3.5 h-3.5" />
                            </button>

                            <button
                                ref={shortcutBtnRef}
                                onClick={() => { if (!showShortcutModal) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setShowShortcutModal(v => !v) }}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center text-sm transition-all active:scale-95 ${showShortcutModal ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                            </button>

                            <button onClick={() => navigate(`${basePath}/archive`)} className="h-9 px-3 gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-500 text-[10px] font-black flex items-center justify-center hover:bg-amber-500/15 transition-all" title="Riwayat Arsip Raport">
                                <Archive className="w-3.5 h-3.5" />
                                Riwayat Arsip
                            </button>
                        </>
                    }
                />

                {/* ── SUB-ROUTE CONTENT ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:p-6">
                    <Outlet />
                </div>
            </div>
        </DashboardLayout>
    )
}

export default function RaportLayout({ isAcademic = false }) {
    return (
        <RaportProvider isAcademic={isAcademic}>
            <RaportLayoutContent isAcademic={isAcademic} />
        </RaportProvider>
    )
}
