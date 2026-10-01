import React, { createContext, useContext, useState, useRef, useMemo } from 'react'
import { useRaportCore } from '@features/raport/hooks/useRaportCore'
import { useRaportImportExport } from '@features/raport/hooks/useRaportImportExport'
import { useRaportArchive } from '@features/raport/hooks/useRaportArchive'
import { loadLayoutConfig } from '@features/raport/components/RaportLayoutSettings'
import { RAPORT_TYPES } from '@features/raport/utils/raportTypeRegistry'
import { BULAN } from '@utils/reports/raportConstants'

const RaportContext = createContext(null)

export function RaportProvider({ children, isAcademic = false }) {
    const printContainerRef = useRef(null)
    const silentPrintRef = useRef(false)
    const printExecutingRef = useRef(false)
    const exportingPdfRef = useRef(false)

    const [layoutConfig, setLayoutConfig] = useState(() => loadLayoutConfig())
    const [pageSize, setPageSize] = useState('f4')

    // ── Raport Core hook integration
    const core = useRaportCore()

    // Override or set reportType if isAcademic
    const activeRtObj = useMemo(() => RAPORT_TYPES[core.reportType] || RAPORT_TYPES.bulanan, [core.reportType])
    const activeCriteria = useMemo(() => activeRtObj.getCriteria(core.selectedClass), [activeRtObj, core.selectedClass])
    const activeMaxScore = activeRtObj.maxScore || 9
    const activeDbTable = activeRtObj.dbTable || 'student_monthly_reports'

    const years = useMemo(() => {
        const nowYr = core.now?.getFullYear() || new Date().getFullYear()
        return [nowYr - 1, nowYr, nowYr + 1]
    }, [core.now])

    const monthOptions = useMemo(() => BULAN.map(b => ({
        id: b.id,
        name: `${b.id_str} — ${b.ar}`
    })), [])

    const yearOptions = useMemo(() => years.map(y => ({
        id: y,
        name: String(y)
    })), [years])

    // ── Raport Import / Export hook integration
    const importExport = useRaportImportExport(core, { printContainerRef, silentPrintRef, pageSize })

    // ── Archive states
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([])
    const [archiveFilter, setArchiveFilter] = useState({ classId: '', year: '', month: '' })
    const [archiveSearch, setArchiveSearch] = useState('')
    const [archiveSort, setArchiveSort] = useState('newest')
    const [archiveVisibleCount, setArchiveVisibleCount] = useState(12)
    const [archiveStatusFilter, setArchiveStatusFilter] = useState('all')
    const [archiveMinAvg, setArchiveMinAvg] = useState('')
    const [archivePreview, setArchivePreview] = useState(null)
    const [archiveTab, setArchiveTab] = useState('list')

    // Archive inline edit
    const [archiveEditMode, setArchiveEditMode] = useState(false)
    const [archiveEditScores, setArchiveEditScores] = useState({})
    const [archiveEditExtras, setArchiveEditExtras] = useState({})
    const [archiveEditSaving, setArchiveEditSaving] = useState(false)

    const [generatingPdfIds, setGeneratingPdfIds] = useState(new Set())

    // ── Archive actions hook
    const archiveActions = useRaportArchive({
        reportType: core.reportType,
        classesList: core.classesList,
        setArchiveLoading,
        setArchiveList,
        setArchiveFilter,
        setArchivePreview,
        setArchiveEditMode,
        setArchiveEditScores,
        setArchiveEditExtras,
        setArchiveEditSaving,
        archivePreview,
        archiveEditScores,
        archiveEditExtras,
        printContainerRef,
        pageSize,
    })

    const value = useMemo(() => ({
        isAcademic,
        printContainerRef,
        silentPrintRef,
        printExecutingRef,
        exportingPdfRef,
        layoutConfig,
        setLayoutConfig,
        pageSize,
        setPageSize,
        core,
        activeRtObj,
        activeCriteria,
        activeMaxScore,
        activeDbTable,
        years,
        monthOptions,
        yearOptions,
        importExport,
        // Archive states
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
        generatingPdfIds, setGeneratingPdfIds,
        // Archive actions
        ...archiveActions,
    }), [
        isAcademic, layoutConfig, pageSize, core, activeRtObj, activeCriteria,
        activeMaxScore, activeDbTable, years, monthOptions, yearOptions, importExport,
        archiveLoading, archiveList, archiveFilter, archiveSearch, archiveSort,
        archiveVisibleCount, archiveStatusFilter, archiveMinAvg, archivePreview,
        archiveTab, archiveEditMode, archiveEditScores, archiveEditExtras,
        archiveEditSaving, generatingPdfIds, archiveActions
    ])

    return (
        <RaportContext.Provider value={value}>
            {children}
        </RaportContext.Provider>
    )
}

export function useRaportContext() {
    const ctx = useContext(RaportContext)
    if (!ctx) {
        throw new Error('useRaportContext must be used within a RaportProvider')
    }
    return ctx
}
