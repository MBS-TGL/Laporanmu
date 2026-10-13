import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { BULAN } from '@utils/reports/raportConstants'
import { AlertTriangle, Loader2, RefreshCw, Trash2 } from 'lucide-react'

const LazyRaportArchive = lazy(() => import('@features/raport/components/RaportArchive'))

const ZOOM_MIN = 0.4
const ZOOM_MAX = 1.2

/* ---------- helpers ---------- */

const getEntryLabel = (entry) => {
    if (!entry) return ''
    const period =
        !entry.report_type || entry.report_type === 'bulanan'
            ? `${BULAN.find((b) => b.id === entry.month)?.id_str ?? ''} ${entry.year ?? ''}`.trim()
            : `Sem. ${entry.semester} (${entry.academic_year})`
    return [entry.class_name, period].filter(Boolean).join(' · ')
}

// Print hanya isi preview (bukan seluruh halaman app) lewat iframe tersembunyi.
const printNode = (node) => {
    if (!node) return false
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')]
        .map((el) => el.outerHTML)
        .join('')

    doc.open()
    doc.write(`<!doctype html><html><head>${styles}</head><body>${node.innerHTML}</body></html>`)
    doc.close()

    iframe.onload = () => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => iframe.remove(), 1000)
    }
    return true
}

/* ---------- sub components ---------- */

function ArchiveError({ message, onRetry, retrying }) {
    return (
        <div role="alert" className="p-10 flex flex-col items-center justify-center gap-3 text-center rounded-2xl border border-red-100 bg-red-50/60">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div>
                <p className="text-sm font-bold text-[var(--color-text)]">Arsip gagal dimuat</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{message || 'Periksa koneksi lalu coba lagi.'}</p>
            </div>
            <button type="button" onClick={onRetry} disabled={retrying} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Coba lagi
            </button>
        </div>
    )
}

function ConfirmDeleteDialog({ entry, deleting, error, onCancel, onConfirm }) {
    const cancelRef = useRef(null)

    useEffect(() => {
        cancelRef.current?.focus()
        const onKey = (e) => e.key === 'Escape' && !deleting && onCancel()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [deleting, onCancel])

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && !deleting && onCancel()}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-desc" className="w-full max-w-sm rounded-2xl bg-[var(--color-surface,#fff)] p-6 shadow-2xl">
                <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                    <Trash2 className="w-5 h-5" />
                </div>
                <h2 id="del-title" className="text-base font-bold text-[var(--color-text)]">Hapus arsip ini?</h2>
                <p id="del-desc" className="text-sm text-[var(--color-text-muted)] mt-1">
                    <span className="font-semibold text-[var(--color-text)]">{getEntryLabel(entry)}</span>{' '}
                    beserta seluruh nilai raport santri di dalamnya akan dihapus permanen dan tidak bisa dikembalikan.
                </p>
                {error && <p className="text-xs font-semibold text-red-600 mt-3">{error}</p>}
                <div className="flex gap-2 mt-6">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={deleting} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--color-border,#e5e7eb)] hover:bg-black/5 disabled:opacity-60 transition-colors">
                        Batal
                    </button>
                    <button type="button" onClick={onConfirm} disabled={deleting} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
                        {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Hapus arsip
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ---------- page ---------- */

export default function RaportArchivePage({ isAcademic = false }) {
    const navigate = useNavigate()
    const {
        core,
        pageSize, setPageSize,
        archiveLoading,
        archiveList,
        archiveFilter, setArchiveFilter,
        archiveSearch, setArchiveSearch,
        archiveSort, setArchiveSort,
        archiveVisibleCount, setArchiveVisibleCount,
        archiveStatusFilter, setArchiveStatusFilter,
        archivePreview, setArchivePreview,
        archiveTab, setArchiveTab,
        archiveEditMode, setArchiveEditMode,
        archiveEditScores, setArchiveEditScores,
        archiveEditExtras, setArchiveEditExtras,
        archiveEditSaving,
        loadArchive,
        loadArchiveDetail,
        saveArchiveEdit,
        executeDeleteArchive,
    } = useRaportContext()

    const { lang, setLang, previewStudentId, setPreviewStudentId } = core

    const [loadError, setLoadError] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState(null)
    const [previewZoom, setPreviewZoom] = useState(0.65)
    const [isFullScreenPreview, setIsFullScreenPreview] = useState(false)

    const previewContainerRef = useRef(null)
    const manualZoomRef = useRef(false)
    const basePath = isAcademic ? '/academic/raport' : '/raport'

    /* --- load: selalu refresh saat halaman dibuka, tanpa risiko loop --- */
    const loadArchiveRef = useRef(loadArchive)
    loadArchiveRef.current = loadArchive

    const fetchArchive = useCallback(async () => {
        setLoadError(null)
        try {
            await loadArchiveRef.current()
        } catch (err) {
            setLoadError(err?.message || 'Terjadi kesalahan saat mengambil data arsip.')
        }
    }, [])

    useEffect(() => {
        fetchArchive()
    }, [fetchArchive])

    /* --- zoom: clamp (flag manual diatur oleh komponen preview) --- */
    const handleZoom = useCallback((value) => {
        setPreviewZoom((prev) => {
            const next = typeof value === 'function' ? value(prev) : value
            return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(next) || prev))
        })
    }, [])

    /* --- fullscreen preview: Esc untuk keluar + kunci scroll body --- */
    useEffect(() => {
        if (!isFullScreenPreview) return
        const onKey = (e) => e.key === 'Escape' && setIsFullScreenPreview(false)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [isFullScreenPreview])

    // Tutup fullscreen otomatis kalau preview ditutup
    useEffect(() => {
        if (!archivePreview) setIsFullScreenPreview(false)
    }, [archivePreview])

    /* --- actions --- */
    const handleConfirmDelete = async () => {
        if (!confirmDelete || deleting) return
        setDeleting(true)
        setDeleteError(null)
        try {
            await executeDeleteArchive(confirmDelete)
            setConfirmDelete(null)
        } catch (err) {
            setDeleteError(err?.message || 'Gagal menghapus arsip. Coba lagi.')
        } finally {
            setDeleting(false)
        }
    }

    const closeDeleteDialog = useCallback(() => {
        setConfirmDelete(null)
        setDeleteError(null)
    }, [])

    const openPrintWindow = () => {
        // Cetak hanya kartu raport yang sedang dipreview; fallback ke print halaman.
        if (!printNode(previewContainerRef.current)) window.print()
    }

    // TODO: ganti dengan generator PDF (Browserless). Sementara hanya membuka detail arsip.
    const exportBulkPDF = async (entry) => {
        await loadArchiveDetail(entry)
    }

    /* --- render --- */
    if (loadError && archiveList.length === 0) {
        return <ArchiveError message={loadError} onRetry={fetchArchive} retrying={archiveLoading} />
    }

    return (
        <>
            <Suspense
                fallback={
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-center" role="status">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-xs font-bold text-[var(--color-text-muted)]">Memuat arsip...</p>
                    </div>
                }
            >
                <LazyRaportArchive
                    archiveList={archiveList}
                    archiveLoading={archiveLoading}
                    archiveFilter={archiveFilter}
                    setArchiveFilter={setArchiveFilter}
                    archiveSearch={archiveSearch}
                    setArchiveSearch={setArchiveSearch}
                    archiveSort={archiveSort}
                    setArchiveSort={setArchiveSort}
                    archiveStatusFilter={archiveStatusFilter}
                    setArchiveStatusFilter={setArchiveStatusFilter}
                    archiveTab={archiveTab}
                    setArchiveTab={setArchiveTab}
                    archiveVisibleCount={archiveVisibleCount}
                    setArchiveVisibleCount={setArchiveVisibleCount}
                    archivePreview={archivePreview}
                    setArchivePreview={setArchivePreview}
                    previewStudentId={previewStudentId}
                    setPreviewStudentId={setPreviewStudentId}
                    archiveEditMode={archiveEditMode}
                    setArchiveEditMode={setArchiveEditMode}
                    archiveEditScores={archiveEditScores}
                    setArchiveEditScores={setArchiveEditScores}
                    archiveEditExtras={archiveEditExtras}
                    setArchiveEditExtras={setArchiveEditExtras}
                    archiveEditSaving={archiveEditSaving}
                    loadArchiveDetail={loadArchiveDetail}
                    saveArchiveEdit={saveArchiveEdit}
                    exportBulkPDF={exportBulkPDF}
                    setConfirmDelete={setConfirmDelete}
                    openPrintWindow={openPrintWindow}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    lang={lang}
                    setLang={setLang}
                    previewZoom={previewZoom}
                    setPreviewZoom={handleZoom}
                    isFullScreenPreview={isFullScreenPreview}
                    setIsFullScreenPreview={setIsFullScreenPreview}
                    settings={core.settings}
                    setStep={() => navigate(basePath)}
                    previewContainerRef={previewContainerRef}
                    manualZoomRef={manualZoomRef}
                    reportType={core.reportType}
                    onRefresh={fetchArchive}
                />
            </Suspense>

            {confirmDelete && (
                <ConfirmDeleteDialog entry={confirmDelete} deleting={deleting} error={deleteError} onCancel={closeDeleteDialog} onConfirm={handleConfirmDelete} />
            )}
        </>
    )
}