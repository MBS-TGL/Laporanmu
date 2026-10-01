import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { ArrowLeft, Loader2 } from 'lucide-react'

const LazyRaportArchive = lazy(() => import('@features/raport/components/RaportArchive'))

export default function RaportArchivePage({ isAcademic = false }) {
    const navigate = useNavigate()
    const {
        core,
        importExport,
        pageSize, setPageSize,
        layoutConfig,
        archiveLoading, setArchiveLoading,
        archiveList, setArchiveList,
        archiveFilter, setArchiveFilter,
        archiveSearch, setArchiveSearch,
        archiveSort, setArchiveSort,
        archiveVisibleCount, setArchiveVisibleCount,
        archiveStatusFilter, setArchiveStatusFilter,
        archiveMinAvg, setArchiveMinAvg,
        archivePreview, setArchivePreview,
        archiveTab, setArchiveTab,
        archiveEditMode, setArchiveEditMode,
        archiveEditScores, setArchiveEditScores,
        archiveEditExtras, setArchiveEditExtras,
        archiveEditSaving, setArchiveEditSaving,
        loadArchive,
        loadArchiveDetail,
        saveArchiveEdit,
        executeDeleteArchive,
    } = useRaportContext()

    const { lang, setLang, previewStudentId, setPreviewStudentId } = core
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [previewZoom] = useState(0.65)
    const [isFullScreenPreview, setIsFullScreenPreview] = useState(false)

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    // Load archive data when page mounts
    useEffect(() => {
        if (archiveList.length === 0) {
            loadArchive()
        }
    }, [archiveList.length, loadArchive])

    const sendWATextOnly = () => {}

    const openPrintWindow = (stuList) => {
        if (!stuList?.length) return
        // basic print using window.print
        window.print()
    }

    const exportBulkPDF = async (entry) => {
        await loadArchiveDetail(entry)
    }

    return (
        <div className="space-y-4">
            {/* Top Navigation */}
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                <button
                    onClick={() => navigate(basePath)}
                    className="w-8 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div>
                    <h2 className="text-sm font-black text-[var(--color-text)]">Riwayat Arsip Raport</h2>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
                        Telusuri dan kelola raport yang telah tersimpan
                    </p>
                </div>
            </div>

            {/* Archive Component */}
            <Suspense fallback={
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">Memuat arsip...</p>
                </div>
            }>
                <LazyRaportArchive
                    archiveList={archiveList}
                    archiveLoading={archiveLoading}
                    archiveFilter={archiveFilter}
                    setArchiveFilter={setArchiveFilter}
                    archiveSearch={archiveSearch}
                    setArchiveSearch={setArchiveSearch}
                    archiveSort={archiveSort}
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
                    archiveStatusFilter={archiveStatusFilter}
                    archiveMinAvg={archiveMinAvg}
                    loadArchiveDetail={loadArchiveDetail}
                    saveArchiveEdit={saveArchiveEdit}
                    exportBulkPDF={exportBulkPDF}
                    setConfirmDelete={setConfirmDelete}
                    openPrintWindow={openPrintWindow}
                    sendWATextOnly={sendWATextOnly}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    lang={lang}
                    setLang={setLang}
                    previewZoom={previewZoom}
                    setPreviewZoom={() => {}}
                    setIsFullScreenPreview={setIsFullScreenPreview}
                    settings={core.settings}
                    setStep={() => navigate(basePath)}
                    previewContainerRef={{ current: null }}
                    manualZoomRef={{ current: false }}
                    reportType={core.reportType}
                />
            </Suspense>
        </div>
    )
}
