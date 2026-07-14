import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle,
    faFileLines,
    faSliders,
    faSpinner,
    faTableList,
    faTriangleExclamation,
    faUsers,
    faIdCard,
    faFileExport,
    faHashtag,
    faUser,
    faVenusMars,
    faSchool,
    faStar,
    faTags,
    faFileExcel,
    faFileCsv,
    faFilePdf,
    faGear,
    faHeading,
    faArrowsLeftRight,
    faArrowsUpDown,
    faCalendarAlt,
    faHome,
    faClipboardList,
    faBed,
    faBroom,
    faWarehouse,
    faBoxOpen,
    faCheckSquare
} from '@fortawesome/free-solid-svg-icons'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { buildPrintHTML, openPrintWindow } from '@shared/utils/printTemplate'

// Column definitions for each dataset
const DATASETS = {
    plotting: {
        labelKey: 'dorms.tabPlotting',
        icon: faBed,
        colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
        columns: [
            { key: 'name', labelKey: 'dorms.plotting.thSantri', icon: faUser },
            { key: 'class', labelKey: 'dorms.plotting.class', icon: faSchool },
            { key: 'gender', labelKey: 'dorms.plotting.gender', icon: faVenusMars },
            { key: 'room', labelKey: 'dorms.plotting.dorm', icon: faHome },
            { key: 'building', labelKey: 'dorms.plotting.building', icon: faWarehouse },
            { key: 'status', labelKey: 'dorms.plotting.thStatus', icon: faCheckSquare }
        ],
        presets: [
            { id: 'all', labelKey: 'dorms.export.presetComplete', cols: ['name', 'class', 'gender', 'room', 'building', 'status'] },
            { id: 'summary', labelKey: 'dorms.export.presetSummary', cols: ['name', 'class', 'room'] }
        ]
    },
    cleanliness: {
        labelKey: 'dorms.export.datasetCleanliness',
        icon: faBroom,
        colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
        columns: [
            { key: 'room', labelKey: 'dorms.plotting.dorm', icon: faHome },
            { key: 'score', labelKey: 'dorms.export.scoreAverage', icon: faStar },
            { key: 'rating', labelKey: 'dorms.export.predicate', icon: faSliders },
            { key: 'aspect_kerapian', labelKey: 'dorms.export.aspectKerapian', icon: faCheckCircle },
            { key: 'aspect_kebersihan', labelKey: 'dorms.export.aspectKebersihan', icon: faCheckCircle },
            { key: 'aspect_keharuman', labelKey: 'dorms.export.aspectKeharuman', icon: faCheckCircle },
            { key: 'date', labelKey: 'dorms.cleanliness.dateLabel', icon: faCalendarAlt },
            { key: 'notes', labelKey: 'dorms.musyrif.notes', icon: faFileLines }
        ],
        presets: [
            { id: 'all', labelKey: 'dorms.export.presetComplete', cols: ['room', 'score', 'rating', 'aspect_kerapian', 'aspect_kebersihan', 'aspect_keharuman', 'date', 'notes'] },
            { id: 'summary', labelKey: 'dorms.export.presetSummary', cols: ['room', 'score', 'rating', 'date'] }
        ]
    },
    inventory: {
        labelKey: 'dorms.export.datasetInventory',
        icon: faBoxOpen,
        colorClass: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30',
        columns: [
            { key: 'dorm', labelKey: 'dorms.plotting.dorm', icon: faHome },
            { key: 'item', labelKey: 'dorms.export.itemName', icon: faClipboardList },
            { key: 'total', labelKey: 'dorms.export.totalItem', icon: faHashtag },
            { key: 'good', labelKey: 'dorms.export.conditionGood', icon: faCheckCircle },
            { key: 'damaged', labelKey: 'dorms.export.conditionDamaged', icon: faTriangleExclamation },
            { key: 'notes', labelKey: 'dorms.musyrif.notes', icon: faFileLines },
            { key: 'last_checked', labelKey: 'dorms.export.lastChecked', icon: faCalendarAlt }
        ],
        presets: [
            { id: 'all', labelKey: 'dorms.export.presetComplete', cols: ['dorm', 'item', 'total', 'good', 'damaged', 'notes', 'last_checked'] },
            { id: 'summary', labelKey: 'dorms.export.presetSummary', cols: ['dorm', 'item', 'total', 'good', 'damaged'] }
        ]
    }
}

export default function DormsExportModal({
    isOpen,
    onClose,
    defaultDataset = 'plotting',
    students = [],
    audits = [],
    inventories = [],
    dorms = [],
    selectedIds = [],
    addToast
}) {
    const { t, tNum, language } = useLanguage()
    const [dataset, setDataset] = useState(defaultDataset) // 'plotting' | 'cleanliness' | 'inventory'
    const [exportScope, setExportScope] = useState('all') // 'all' | 'assigned' | 'unassigned' | 'selected'
    const [exportColumns, setExportColumns] = useState([])
    const [fileName, setFileName] = useState('')
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [pdfOrientation, setPdfOrientation] = useState('landscape') // 'landscape' | 'portrait'
    const [includeHeader, setIncludeHeader] = useState(true)
    const [exporting, setExporting] = useState(false)
    const containerRef = useRef(null)

    // Sync dataset state when opening modal
    useEffect(() => {
        if (isOpen) {
            setDataset(defaultDataset)
        }
    }, [isOpen, defaultDataset])

    // Set default columns and filename when opening/changing dataset
    useEffect(() => {
        if (isOpen) {
            const defCols = DATASETS[dataset].presets[0].cols
            setExportColumns(defCols)
            const prefix = dataset === 'plotting'
                ? t('dorms.tabPlotting').replace(/\s+/g, '_')
                : dataset === 'cleanliness'
                    ? t('dorms.export.datasetCleanliness').replace(/\s+/g, '_')
                    : t('dorms.export.datasetInventory').replace(/\s+/g, '_')
            setFileName(`${prefix}_${new Date().toISOString().slice(0, 10)}`)
        }
    }, [isOpen, dataset, t])

    useEffect(() => {
        if (exportScope === 'selected' && selectedIds.length === 0) {
            setExportScope('all')
        }
    }, [selectedIds, exportScope])

    // Auto-scroll modal on export start
    useEffect(() => {
        if (exporting && containerRef.current) {
            const scrollContainer = containerRef.current.parentElement
            if (scrollContainer) {
                scrollContainer.scrollTop = 0
            }
        }
    }, [exporting])

    const activePresetId = useMemo(() => {
        const sortedCols = [...exportColumns].sort().join(',')
        const active = DATASETS[dataset].presets.find(preset => {
            const presetSorted = [...preset.cols].sort().join(',')
            return sortedCols === presetSorted
        })
        return active ? active.id : null
    }, [exportColumns, dataset])

    const estimatedCount = useMemo(() => {
        if (dataset === 'plotting') {
            if (exportScope === 'assigned') return students.filter(s => s.metadata?.kamar).length
            if (exportScope === 'unassigned') return students.filter(s => !s.metadata?.kamar).length
            if (exportScope === 'selected') return selectedIds.length
            return students.length
        }
        if (dataset === 'cleanliness') return audits.length
        if (dataset === 'inventory') return inventories.length
        return 0
    }, [dataset, exportScope, students, audits, inventories, selectedIds])

    const currentDatasetDef = useMemo(() => DATASETS[dataset], [dataset])

    const handlePresetClick = useCallback((cols) => {
        setExportColumns(cols)
    }, [])

    const exportOptions = useMemo(() => ({
        includeHeader,
        orientation: pdfOrientation
    }), [includeHeader, pdfOrientation])

    const getExportData = useCallback(() => {
        let rawList = []
        if (dataset === 'plotting') {
            rawList = students
            if (exportScope === 'assigned') rawList = students.filter(s => s.metadata?.kamar)
            else if (exportScope === 'unassigned') rawList = students.filter(s => !s.metadata?.kamar)
            else if (exportScope === 'selected') rawList = students.filter(s => selectedIds.includes(s.id))
        } else if (dataset === 'cleanliness') {
            rawList = audits
        } else if (dataset === 'inventory') {
            rawList = inventories
        }
        return rawList.map(item => {
            const row = {}
            exportColumns.forEach(key => {
                const colDef = currentDatasetDef.columns.find(c => c.key === key)
                const headerLabel = colDef ? t(colDef.labelKey) : key

                if (dataset === 'plotting') {
                    const roomName = item.metadata?.kamar || ''
                    const dormObj = roomName ? dorms.find(d => d.id === roomName) : null
                    if (key === 'name') row[headerLabel] = item.name
                    if (key === 'class') row[headerLabel] = item.classes?.name || '—'
                    if (key === 'gender') row[headerLabel] = item.gender === 'putra' ? t('dorms.export.genderPutra') : item.gender === 'putri' ? t('dorms.export.genderPutri') : '—'
                    if (key === 'room') row[headerLabel] = roomName || '—'
                    if (key === 'building') row[headerLabel] = dormObj?.building || '—'
                    if (key === 'status') row[headerLabel] = roomName ? t('dorms.export.statusAssigned') : t('dorms.export.statusUnassigned')
                } else if (dataset === 'cleanliness') {
                    if (key === 'room') row[headerLabel] = item.room || '—'
                    if (key === 'score') row[headerLabel] = item.score ?? 0
                    if (key === 'rating') row[headerLabel] = item.rating ? t(`dorms.cleanliness.predicate`).replace('{rating}', item.rating) : '—'
                    if (key === 'aspect_kerapian') row[headerLabel] = item.aspects?.kerapian ?? 0
                    if (key === 'aspect_kebersihan') row[headerLabel] = item.aspects?.kebersihan ?? 0
                    if (key === 'aspect_keharuman') row[headerLabel] = item.aspects?.keharuman ?? 0
                    if (key === 'date') row[headerLabel] = item.date || '—'
                    if (key === 'notes') row[headerLabel] = item.notes || '—'
                } else if (dataset === 'inventory') {
                    if (key === 'dorm') row[headerLabel] = item.dorm_id || '—'
                    if (key === 'item') row[headerLabel] = item.item_name || '—'
                    if (key === 'total') row[headerLabel] = item.total_quantity ?? 0
                    if (key === 'good') row[headerLabel] = item.good_condition_count ?? 0
                    if (key === 'damaged') row[headerLabel] = item.damaged_condition_count ?? 0
                    if (key === 'notes') row[headerLabel] = item.notes || '—'
                    if (key === 'last_checked') row[headerLabel] = item.last_checked_at ? new Date(item.last_checked_at).toLocaleDateString(language === 'id' ? 'id-ID' : language === 'ar' ? 'ar-EG' : 'en-US') : '—'
                }
            })
            return row
        })
    }, [dataset, exportScope, students, audits, inventories, selectedIds, exportColumns, dorms, t, language, currentDatasetDef])

    const downloadBlob = useCallback((blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
        URL.revokeObjectURL(link.href)
    }, [])

    const handleExportCSV = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const Papa = (await import('papaparse')).default
            const rows = getExportData()
            if (!rows.length) { addToast(t('dorms.export.errNoDormData'), 'warning'); return }
            const csv = Papa.unparse(rows, { header: options.includeHeader !== false })
            downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename || 'export_asrama'}.csv`)
            addToast(t('dorms.export.exportCsvSuccess').replace('{count}', tNum(rows.length)), 'success')
        } catch (e) {
            console.error(e)
            addToast(t('dorms.export.exportCsvFailed'), 'error')
        } finally { setExporting(false) }
    }, [getExportData, downloadBlob, addToast, t, tNum])

    const handleExportExcel = useCallback(async (filename) => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const data = getExportData()
            if (!data.length) { addToast(t('dorms.export.errNoDormData'), 'warning'); return }
            const ws = XLSX.utils.json_to_sheet(data)
            ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, t(currentDatasetDef.labelKey))
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename || 'export_asrama'}.xlsx`)
            addToast(t('dorms.export.exportExcelSuccess').replace('{count}', tNum(data.length)), 'success')
        } catch (e) {
            console.error(e)
            addToast(t('dorms.export.exportExcelFailed'), 'error')
        } finally { setExporting(false) }
    }, [getExportData, downloadBlob, addToast, currentDatasetDef, t, tNum])

    const handleExportPDF = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const allRows = getExportData()
            if (!allRows.length) { addToast(t('dorms.export.errNoDormData'), 'warning'); return }
            
            let stats = []
            let docBadge = t('dorms.export.dorms').toUpperCase()
            let title = t('dorms.export.pdfReport')
            let subtitle = ''
            let totalLabel = t('dorms.export.totalItem')
            let secondarySignatureTitle = t('dorms.export.teamSarpras')

            if (dataset === 'plotting') {
                docBadge = t('dorms.tabPlottingShort').toUpperCase()
                title = t('dorms.export.pdfPlottingReport')
                const scopeLabel = exportScope === 'assigned' ? t('dorms.export.scopeAssigned') : exportScope === 'unassigned' ? t('dorms.export.scopeUnassigned') : exportScope === 'selected' ? t('dorms.export.scopeSelected') : t('dorms.export.scopeAll')
                subtitle = `${t('dorms.plotting.filter')}: ${scopeLabel}`
                totalLabel = t('dorms.export.totalStudents')
                secondarySignatureTitle = t('dorms.export.staffKesantrian')
                
                const totalVal = students.length
                const assignedVal = students.filter(s => s.metadata?.kamar).length
                const unassignedVal = students.filter(s => !s.metadata?.kamar).length
                const percentVal = totalVal ? Math.round((assignedVal / totalVal) * 100) : 0
                
                stats = [
                    { label: t('dorms.export.totalStudents'), value: tNum(totalVal), type: 'total' },
                    { label: t('dorms.export.statusAssigned'), value: tNum(assignedVal), type: 'prestasi', description: t('dorms.export.statusAssigned').toLowerCase() },
                    { label: t('dorms.export.statusUnassigned'), value: tNum(unassignedVal), type: 'pelanggaran', description: t('dorms.export.statusUnassigned').toLowerCase() },
                    { label: t('dorms.export.assignedPercentage'), value: `${tNum(percentVal)}%`, type: 'avg', description: t('dorms.export.percentageDescription') }
                ]
            } else if (dataset === 'cleanliness') {
                docBadge = t('dorms.tabCleanlinessShort').toUpperCase()
                title = t('dorms.export.pdfCleanlinessReport')
                subtitle = t('dorms.export.cleanlinessLog')
                totalLabel = t('dorms.export.totalAudits')
                secondarySignatureTitle = t('dorms.export.teamSarpras')
                
                const totalVal = audits.length
                const avgScore = audits.length ? (audits.reduce((acc, a) => acc + (a.score ?? 0), 0) / audits.length).toFixed(1) : 0
                const goodVal = audits.filter(a => (a.score ?? 0) >= 80).length
                const badVal = audits.filter(a => (a.score ?? 0) < 60).length
                
                stats = [
                    { label: t('dorms.export.totalAudits'), value: tNum(totalVal), type: 'total' },
                    { label: t('dorms.export.scoreAverage'), value: tNum(avgScore), type: 'avg', description: t('dorms.export.scoreAverage').toLowerCase() },
                    { label: t('dorms.export.ratingGood'), value: tNum(goodVal), type: 'prestasi', description: t('dorms.export.goodScoreDesc') },
                    { label: t('dorms.export.needFollowUp'), value: tNum(badVal), type: 'pelanggaran', description: t('dorms.export.needFollowUpDesc') }
                ]
            } else if (dataset === 'inventory') {
                docBadge = t('dorms.export.datasetInventory').toUpperCase()
                title = t('dorms.export.pdfInventoryReport')
                subtitle = t('dorms.export.inventoryLog')
                totalLabel = t('dorms.export.totalItem')
                secondarySignatureTitle = t('dorms.export.teamSarpras')
                
                const totalItems = inventories.reduce((acc, i) => acc + (i.total_quantity ?? 0), 0)
                const goodItems = inventories.reduce((acc, i) => acc + (i.good_condition_count ?? 0), 0)
                const damagedItems = inventories.reduce((acc, i) => acc + (i.damaged_condition_count ?? 0), 0)
                const needFollowUp = inventories.filter(i => (i.damaged_condition_count ?? 0) > 0).length
                
                stats = [
                    { label: t('dorms.export.totalItem'), value: tNum(totalItems), type: 'total' },
                    { label: t('dorms.export.conditionGood'), value: tNum(goodItems), type: 'prestasi' },
                    { label: t('dorms.export.conditionDamaged'), value: tNum(damagedItems), type: 'pelanggaran' },
                    { label: t('dorms.export.needFollowUp'), value: tNum(needFollowUp), type: 'avg', description: t('dorms.export.needFollowUpInventoryDesc') }
                ]
            }

            const headerKeys = Object.keys(allRows[0])
            const tableHeaders = ['#', ...headerKeys]

            const tableRowsHTML = allRows.map((r, i) => {
                const cells = headerKeys.map(h => {
                    const val = r[h]
                    if (val === t('dorms.export.statusAssigned') || val === t('dorms.export.conditionGood')) {
                        return `<td><span class="tag-status success">${val}</span></td>`
                    } else if (val === t('dorms.export.statusUnassigned') || val === t('dorms.export.conditionDamaged')) {
                        return `<td><span class="tag-status warning">${val}</span></td>`
                    }
                    return `<td>${val ?? '—'}</td>`
                }).join('')
                return `<tr><td>${tNum(i + 1)}</td>${cells}</tr>`
            }).join('')

            const periodLabel = new Date().toLocaleDateString(language === 'id' ? 'id-ID' : language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })
            const asramaLabel = t('dorms.export.genderBoth')
            const infoStrip = [
                { label: t('dorms.export.period'), value: periodLabel },
                { label: t('dorms.export.dorms'), value: asramaLabel },
                { label: t('dorms.export.arranger'), value: secondarySignatureTitle }
            ]

            const html = buildPrintHTML({
                schoolLogo: window.location.origin + '/logo-smp.png',
                docBadge,
                docNumber: `ASM/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
                title,
                subtitle,
                totalCount: allRows.length,
                totalLabel,
                stats,
                infoStrip,
                tableHeaders,
                tableRowsHTML,
                signaturePlace: t('dorms.export.signPlace'),
                signatureTitle: t('dorms.export.headmaster'),
                secondarySignatureTitle,
                paperSize: options.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape',
                colorPrimary: '#1a5c35',
                colorSecondary: '#c8a400',
            })

            openPrintWindow(html)
            addToast(t('dorms.export.pdfPrepareSuccess'), 'success')
        } catch (e) {
            console.error(e)
            addToast(t('dorms.export.pdfPrepareFailed'), 'error')
        } finally {
            setExporting(false)
        }
    }, [getExportData, addToast, dataset, exportScope, students, audits, inventories, t, tNum, language])

    const columnButtons = useMemo(() => currentDatasetDef.columns.map(({ key, labelKey, icon }) => {
        const orderIdx = exportColumns.indexOf(key) + 1
        const isSelected = orderIdx > 0
        const label = t(labelKey)
        return (
            <button
                key={key}
                onClick={() => setExportColumns(prev => isSelected ? prev.filter(k => k !== key) : [...prev, key])}
                className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all
                    ${isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] shadow-sm'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                `}
            >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all
                     ${isSelected ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]'}`}>
                    <FontAwesomeIcon icon={icon} className="text-[9px]" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`text-[9px] font-black uppercase tracking-tight truncate ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{label}</div>
                </div>
                {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--color-primary)] text-white text-[8px] font-black flex items-center justify-center shadow-md border border-white dark:border-[var(--color-surface)] animate-in zoom-in duration-200">
                        {tNum(orderIdx)}
                    </div>
                )}
            </button>
        )
    }), [currentDatasetDef, exportColumns, t, tNum])

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dorms.export.title')}
            description={t('dorms.export.description')}
            icon={faFileExport}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600"
            size="lg"
            mobileVariant="bottom-sheet"
            contentClassName={exporting ? "relative !overflow-hidden" : "relative"}
            footer={
                <div className="flex items-center w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                    >
                        {t('dorms.export.cancel')}
                    </button>
                    <div className="flex-1" />
                </div>
            }
        >
            <div ref={containerRef}>
                {/* Premium Loading Overlay */}
                {exporting && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-surface)]/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-surface-alt)]/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[var(--color-border)]/60 rounded-3xl p-8 flex flex-col items-center gap-5 scale-110 animate-in zoom-in-95 duration-300">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/10 animate-ping opacity-75"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/10"></div>
                                <div
                                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] border-r-[var(--color-primary)] animate-spin"
                                    style={{ filter: 'drop-shadow(0 0 4px var(--color-primary))' }}
                                ></div>
                                <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]/60 flex items-center justify-center shadow-sm z-10">
                                    <FontAwesomeIcon icon={faFileExport} className="text-[var(--color-primary)] text-sm animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">{t('dorms.export.exporting')}</span>
                                <span className="text-[8px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                    {t('dorms.export.processing')}
                                    <span className="inline-flex gap-0.5 items-center">
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--color-text-muted)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`space-y-4 pb-2 transition-all duration-500 ${exporting ? 'blur-sm grayscale-[0.5] opacity-50 pointer-events-none' : ''}`}>
                    {/* Section 1: Select Dataset */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">{t('dorms.export.stepDataset')}</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {Object.entries(DATASETS).map(([key, def]) => {
                                const isActive = dataset === key
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setDataset(key)}
                                        className={`group p-3 rounded-2xl border-2 text-left transition-all active:scale-95 flex flex-col gap-2
                                        ${isActive
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all 
                                            ${isActive ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10'}`}>
                                            <FontAwesomeIcon icon={def.icon} className="text-xs" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-[var(--color-text)] leading-tight">{t(def.labelKey)}</div>
                                            <div className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                                                {key === 'plotting'
                                                    ? `${tNum(students.length)}${t('dorms.suffixSantri')}`
                                                    : key === 'cleanliness'
                                                        ? `${tNum(audits.length)} ${t('dorms.cleanliness.reportsCount')}`
                                                        : `${tNum(inventories.length)} ${t('dorms.inventory.unitPieces')}`}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Section 2: Scope (Plotting only) */}
                    {dataset === 'plotting' && (
                        <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">{t('dorms.export.stepScope')}</p>
                            <div className="grid grid-cols-4 gap-2.5">
                                {[
                                    { val: 'all', label: t('dorms.export.scopeAll'), desc: `${tNum(students.length)}${t('dorms.suffixSantri')}`, icon: faUsers },
                                    { val: 'assigned', label: t('dorms.export.scopeAssigned'), desc: `${tNum(students.filter(s => s.metadata?.kamar).length)}${t('dorms.suffixSantri')}`, icon: faHome },
                                    { val: 'unassigned', label: t('dorms.export.scopeUnassigned'), desc: `${tNum(students.filter(s => !s.metadata?.kamar).length)}${t('dorms.suffixSantri')}`, icon: faSliders },
                                    { val: 'selected', label: t('dorms.export.scopeSelected'), desc: `${tNum(selectedIds.length)}${t('dorms.suffixSantri')}`, icon: faCheckCircle, disabled: selectedIds.length === 0 }
                                ].map(({ val, label, desc, icon, disabled }) => {
                                    const isActive = exportScope === val
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => !disabled && setExportScope(val)}
                                            disabled={disabled}
                                            className={`group p-3 rounded-2xl border-2 text-left transition-all flex flex-col gap-2
                                            ${isActive
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'}
                                            ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                                            `}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all 
                                                ${isActive ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10'}`}>
                                                <FontAwesomeIcon icon={icon} className="text-xs" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-[var(--color-text)] leading-tight">{label}</div>
                                                <div className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{desc}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section 3: Columns */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">{t('dorms.export.stepColumns')}</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handlePresetClick(currentDatasetDef.columns.map(c => c.key))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest bg-[var(--color-primary)]/5 px-2 py-1 rounded-lg transition-colors">{t('dorms.export.allColumns')}</button>
                                <button type="button" onClick={() => handlePresetClick(currentDatasetDef.presets[1].cols)} className="text-[9px] font-black text-rose-500 hover:underline uppercase tracking-widest bg-rose-500/5 px-2 py-1 rounded-lg transition-colors">{t('dorms.export.reset')}</button>
                            </div>
                        </div>

                        {/* Presets Sub-section with label and horizontal scroll */}
                        <div className="flex flex-col gap-2 p-3 bg-[var(--color-surface-alt)]/40 rounded-2xl border border-[var(--color-border)]/50">
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                                <FontAwesomeIcon icon={faTags} className="text-[9px]" />
                                <span>{t('dorms.export.quickPreset')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {currentDatasetDef.presets.map(preset => {
                                    const isActive = activePresetId === preset.id
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() => handlePresetClick(preset.cols)}
                                            className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0
                                                ${isActive
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]'}`}
                                        >
                                            {t(preset.labelKey)}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Divider Line */}
                        <div className="relative flex items-center justify-center my-1">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-dashed border-[var(--color-border)]/65"></div>
                            </div>
                            <div className="relative bg-[var(--color-surface)] px-3 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50">
                                {t('dorms.export.customColumns')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {columnButtons}
                        </div>
                    </div>

                    {/* Section 4: Filename & Advanced */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">{t('dorms.export.stepFilename')}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    placeholder={t('dorms.export.placeholderFilename')}
                                    className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-xs font-bold focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all placeholder:opacity-50 pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[var(--color-border)] text-[8px] font-black uppercase text-[var(--color-text-muted)]">
                                    .xlsx / .csv / .pdf
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(!advancedOpen)}
                                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-xs font-black
                                    ${advancedOpen ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}
                            >
                                <FontAwesomeIcon icon={faGear} className={advancedOpen ? 'animate-spin-slow' : ''} />
                                {t('dorms.export.advanced')}
                            </button>
                        </div>

                        {advancedOpen && (
                            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faHeading} />
                                        {t('dorms.export.includeHeader')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[{ v: true, l: t('dorms.export.yes') }, { v: false, l: t('dorms.export.no') }].map(opt => (
                                            <button
                                                key={String(opt.v)}
                                                type="button"
                                                onClick={() => setIncludeHeader(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all ${includeHeader === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faArrowsLeftRight} />
                                        {t('dorms.export.pdfOrientation')}
                                    </label>
                                    <div className="flex gap-1 bg-[var(--color-surface)] p-1 rounded-lg border border-[var(--color-border)]">
                                        {[
                                            { v: 'landscape', l: t('dorms.export.landscape'), icon: faArrowsLeftRight },
                                            { v: 'portrait', l: t('dorms.export.portrait'), icon: faArrowsUpDown }
                                        ].map(opt => (
                                            <button
                                                key={opt.v}
                                                type="button"
                                                onClick={() => setPdfOrientation(opt.v)}
                                                className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${pdfOrientation === opt.v ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            >
                                                <FontAwesomeIcon icon={opt.icon} className="text-[8px]" />
                                                {opt.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 5: Mulai Ekspor */}
                    <div className="space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">{t('dorms.export.stepExport')}</p>
                        <div className="grid grid-cols-3 gap-2.5">
                            {[
                                { label: 'CSV', icon: faFileCsv, desc: 'Universal', onClick: () => handleExportCSV(fileName, exportOptions), color: 'hover:border-slate-400 hover:bg-slate-50', iconColor: 'text-slate-500' },
                                { label: 'Excel', icon: faFileExcel, desc: '.xlsx', onClick: () => handleExportExcel(fileName), color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-500' },
                                { label: 'PDF Tabel', icon: faFilePdf, desc: 'Tabel', onClick: () => handleExportPDF(fileName, exportOptions), color: 'hover:border-rose-400 hover:bg-rose-50 text-rose-700', iconColor: 'text-rose-500' },
                            ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={onClick}
                                    disabled={exporting || exportColumns.length === 0 || estimatedCount === 0}
                                    className={`relative group h-24 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 ${color}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-transform group-hover:scale-110 ${iconColor} bg-[var(--color-surface-alt)]`}>
                                        <FontAwesomeIcon icon={icon} className="text-xl" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                    <span className="text-[8px] font-bold opacity-60 uppercase">{desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {exportColumns.length === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 text-xs font-black uppercase tracking-tight animate-pulse">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            {t('dorms.export.errNoColumns')}
                        </div>
                    )}

                    {estimatedCount === 0 && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-tight">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            {t('dorms.export.errNoData')}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
