import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import {
    parseCSVFile, parseExcelFile, autoMatchColumns,
    writeCSV, writeExcel, exportTablePDF, buildTemplateFile
} from '@utils/importExportEngine'

/**
 * useImportExportCore — mesin state import/export generik untuk semua fitur.
 * Menyimpan seluruh state wizard (step/preview/mapping/issues/progress/…)
 * dan aksi generik (parse file + auto-match, edit sel, bulk-fix, commit
 * chunk-50, download template, export CSV/Excel/PDF + audit).
 *
 * Yang TETAP di fitur (dikirim lewat config): pembuatan row domain,
 * validasi/dupe, payload commit, query export, teks toast/audit — sehingga
 * perilaku domain tiap fitur tidak berubah.
 *
 * Config dibaca lewat ref (selalu nilai render terbaru), jadi callback stabil
 * tanpa perlu membungkus config dalam useMemo di sisi fitur.
 *
 * config = {
 *   systemCols   : [{ key, label, synonyms? }]
 *   addToast     : (msg, type) => void
 *   table        : 'students' | ... (untuk insert default & audit)
 *   buildPreview : async (rows, mapping) => { validated, issues, dupeIndices? }
 *   validate     : (preview) => { validated, issues, dupeIndices? }   // re-run saat edit
 *   resyncRow    : (row, key, value) => row      // sync field turunan (_className dkk.)
 *   buildCommitRow: (row, ctx) => payload        // mapping row → kolom DB
 *   commitRows   : async (chunk, allRows) => void // override; default insert ke table
 *   afterCommit  : async () => void              // refetch data fitur
 *   messages     : { unsupportedFormat?, emptyFile?, parseFailed?, noData?, hasErrors?, noValidRows?,
 *                    removeRow?, bulkFix?: (value, n) => string, commitSuccess?: (n) => string, commitFailed?: (err) => string }
 *   audit        : { source?: 'SYSTEM'|'OPERATIONAL'|'MASTER', insertPayload?: (n, rows) => object } | null
 *   parseWorkbook: async (file) => rows           // override parser xlsx (mis. dapodik)
 *   template     : { headers, widths?, rows?, filename? }
 *   export       : { getExportData(scope, cols), sheetName?, defaultFileName?, defaultColumns?,
 *                    pdfTitle?, pdfMeta?(rows, scope), pdfFilterLines?(), pdfColumnStyles?,
 *                    auditSource?, auditPayload?(format, count, ctx), toast?(format, count),
 *                    noData?, failed?(format) }
 * }
 */
const CHUNK = 50
const NOOP = () => {}

export function useImportExportCore(config) {
    // Config selalu dibaca dari ref → callback stabil walau config dibangun per-render
    const configRef = useRef(config)
    useEffect(() => { configRef.current = config })

    const addToast = useCallback((msg, type) => (configRef.current.addToast || NOOP)(msg, type), [])

    // ---- STATE ----
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')   // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState(config?.export?.defaultColumns || [])
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importStep, setImportStep] = useState(1)              // 1 Upload, 2 Mapping, 3 Review
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importDuplicates, setImportDuplicates] = useState([])
    const [importSkipDupes, setImportSkipDupes] = useState(true)
    const [importDragOver, setImportDragOver] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [importEditCell, setImportEditCell] = useState(null)
    const [exporting, setExporting] = useState(false)

    // ---- COMPUTED ----
    const importReadyRows = useMemo(
        () => importPreview.filter(r => !r._hasError && !(importSkipDupes && r._isDupe)),
        [importPreview, importSkipDupes]
    )
    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    // Terapkan hasil validasi fitur ke state
    const applyValidation = useCallback((res, fallbackPreview) => {
        const issues = res?.issues || []
        setImportPreview(res?.validated || fallbackPreview || [])
        setImportIssues(issues)
        setImportDuplicates(res?.dupeIndices || [])
        setImportValidationOpen(issues.length > 0)
    }, [])

    const runValidation = useCallback((preview) => {
        const validate = configRef.current.validate
        if (!validate) return
        applyValidation(validate(preview), preview)
    }, [applyValidation])

    // ---- IMPORT FLOW ----
    const processImportFile = useCallback(async (file) => {
        const { systemCols, parseWorkbook, messages } = configRef.current
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast(messages?.unsupportedFormat || 'Format tidak didukung. Gunakan .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportDuplicates([])
        setImportLoading(true)
        try {
            const isXlsx = ext.endsWith('.xlsx') || (file.type || '').includes('sheet')
            let rows
            if (isXlsx) {
                rows = parseWorkbook ? await parseWorkbook(file) : await parseExcelFile(file)
            } else {
                rows = await parseCSVFile(file)
            }
            if (!rows.length) { addToast(messages?.emptyFile || 'File kosong atau tidak terbaca', 'error'); return }

            setImportRawData(rows)
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)
            setImportColumnMapping(autoMatchColumns(headers, rows, systemCols || []))
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast(messages?.parseFailed || 'Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }, [addToast])

    const resetImport = useCallback(() => {
        setImportStep(1)
        setImportFileName('')
        setImportRawData([])
        setImportPreview([])
        setImportIssues([])
        setImportDuplicates([])
        setImportColumnMapping({})
        setImportDragOver(false)
        setImportLoading(false)
        setImportEditCell(null)
    }, [])

    const handleImportClick = useCallback(() => {
        resetImport()
        setIsImportModalOpen(true)
    }, [resetImport])

    const handleImportCellEdit = useCallback((index, key, value) => {
        const { resyncRow } = configRef.current
        const next = [...importPreview]
        const updatedRow = { ...next[index], [key]: value }
        next[index] = resyncRow ? resyncRow(updatedRow, key, value) : updatedRow
        setImportPreview(next)
        runValidation(next)
    }, [importPreview, runValidation])

    const handleRemoveImportRow = useCallback((idx) => {
        const { messages } = configRef.current
        const next = importPreview.filter((_, i) => i !== idx)
        setImportPreview(next)
        runValidation(next)
        addToast(messages?.removeRow || 'Baris berhasil dihapus dari preview', 'success')
    }, [importPreview, runValidation, addToast])

    const handleBulkFix = useCallback((sysKey, value) => {
        const { resyncRow, messages } = configRef.current
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            return resyncRow ? resyncRow(updated, sysKey, value) : updated
        })
        setImportPreview(newPrev)
        runValidation(newPrev)
        addToast(
            messages?.bulkFix ? messages.bulkFix(value, newPrev.length) : `Selesai memperbarui ${newPrev.length} baris`,
            'success'
        )
    }, [importPreview, runValidation, addToast])

    const buildImportPreview = useCallback(async (rawRows, mapping) => {
        const res = await configRef.current.buildPreview(rawRows, mapping)
        applyValidation(res, [])
    }, [applyValidation])

    const handleCommitImport = useCallback(async () => {
        const { messages, audit, table, commitRows: customCommitRows, buildCommitRow, afterCommit } = configRef.current
        if (!importPreview.length) { addToast(messages?.noData || 'Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast(messages?.hasErrors || 'Masih ada ERROR. Perbaiki file dulu ya.', 'error'); return }
        if (importReadyRows.length === 0) {
            addToast(messages?.noValidRows || 'Tidak ada data baru yang valid untuk diimport (semua duplikat atau error)', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })
        try {
            const commitRows = customCommitRows || (async (chunk) => {
                const { error } = await supabase.from(table).insert(chunk)
                if (error) throw error
            })
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map((r, cIdx) => buildCommitRow(r, { chunkStart: i, indexInChunk: cIdx }))
                await commitRows(chunk, importReadyRows)
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(
                messages?.commitSuccess
                    ? messages.commitSuccess(importReadyRows.length)
                    : `Berhasil import ${importReadyRows.length} data`,
                'success'
            )
            // audit === null → lewati audit (mis. dorms: commit hanya update metadata)
            if (audit !== null) {
                await logAudit({
                    action: 'INSERT',
                    source: audit?.source || 'SYSTEM',
                    tableName: table,
                    newData: audit?.insertPayload
                        ? audit.insertPayload(importReadyRows.length, importReadyRows)
                        : { bulk_import: true, count: importReadyRows.length }
                })
            }
            resetImport()
            setIsImportModalOpen(false)
            await afterCommit?.()
        } catch (err) {
            console.error(err)
            addToast(messages?.commitFailed ? messages.commitFailed(err) : `Gagal import: ${err?.message || 'cek constraint DB / duplikat / koneksi'}`, 'error')
        } finally {
            setImporting(false)
        }
    }, [importPreview, hasImportBlockingErrors, importReadyRows, addToast, resetImport])

    const handleDownloadTemplate = useCallback(() => {
        const { template, systemCols } = configRef.current
        return buildTemplateFile({
            headers: template?.headers || (systemCols || []).map(s => s.label),
            widths: template?.widths || [],
            rows: template?.rows || [],
            filename: template?.filename || 'Template Import'
        })
    }, [])

    // ---- EXPORT ----
    const runExport = useCallback(async (fmt, filename, options = {}) => {
        const { export: exportCfg, table } = configRef.current
        setExporting(true)
        try {
            const rows = await exportCfg?.getExportData(exportScope, exportColumns)
            if (!rows.length) { addToast(exportCfg?.noData || 'Tidak ada data untuk diekspor', 'warning'); return }
            const fname = filename || exportCfg?.defaultFileName || 'export'
            let count
            if (fmt === 'csv') {
                count = await writeCSV(fname, rows, options)
            } else if (fmt === 'xlsx') {
                count = await writeExcel(fname, rows, exportCfg?.sheetName || 'Data')
            } else {
                count = await exportTablePDF({
                    filename: fname,
                    title: exportCfg?.pdfTitle || 'Laporan Data',
                    metaText: exportCfg?.pdfMeta ? exportCfg.pdfMeta(rows, exportScope) : `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length}`,
                    filterLines: exportCfg?.pdfFilterLines ? exportCfg.pdfFilterLines() : [],
                    rows,
                    columnStyles: exportCfg?.pdfColumnStyles || {},
                    orientation: options.orientation || 'landscape',
                    includeHeader: options.includeHeader,
                })
            }
            addToast(
                exportCfg?.toast ? exportCfg.toast(fmt, count) : `Export ${fmt.toUpperCase()} berhasil (${count} data)`,
                'success'
            )
            await logAudit({
                action: 'EXPORT',
                source: exportCfg?.auditSource || 'OPERATIONAL',
                tableName: table,
                newData: exportCfg?.auditPayload
                    ? exportCfg.auditPayload(fmt, count, { exportScope, exportColumns })
                    : { format: fmt.toUpperCase(), count, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(configRef.current.export?.failed ? configRef.current.export.failed(fmt) : `Gagal export ${fmt.toUpperCase()}`, 'error')
        } finally {
            setExporting(false)
        }
    }, [exportScope, exportColumns, addToast])

    const handleExportCSV = useCallback((filename, options) => runExport('csv', filename, options), [runExport])
    const handleExportExcel = useCallback((filename) => runExport('xlsx', filename), [runExport])
    const handleExportPDF = useCallback((filename, options) => runExport('pdf', filename, options), [runExport])

    return {
        // State
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDuplicates, setImportDuplicates,
        importSkipDupes, setImportSkipDupes,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        exporting, setExporting,

        // Computed
        importReadyRows,
        hasImportBlockingErrors,

        // Actions
        processImportFile,
        handleImportClick,
        resetImport,
        handleCommitImport,
        handleImportCellEdit,
        handleRemoveImportRow,
        handleBulkFix,
        buildImportPreview,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,

        // Helper untuk kebutuhan khusus fitur (GSheets, dsb.)
        helpers: { parseCSVFile },
    }
}
