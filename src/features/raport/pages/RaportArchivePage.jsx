import React, { Suspense, lazy, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { Loader2 } from 'lucide-react'

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
    )
}
