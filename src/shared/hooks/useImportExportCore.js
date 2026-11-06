import { useState, useMemo, useCallback } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import {
    parseCSVFile, parseExcelFile, autoMatchColumns,
    downloadBlob, writeCSV, writeExcel, exportTablePDF, buildTemplateFile
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
 * config = {
 *   systemCols   : [{ key, label, synonyms? }]
 *   addToast     : (msg, type) => void
 *   table        : 'students' | ... (untuk insert default & audit)
 *   buildPreview : async (rows, mapping) => { validated, issues, dupeIndices? }
 *   validate     : (preview) => { validated, issues, dupeIndices? }   // re-run saat edit
 *   resyncRow    : (row, key, value) => row      // sync field turunan (_className dkk.)
 *   buildCommitRow: (row) => payload             // mapping row → kolom DB
 *   commitRows   : async (chunk, allRows) => void // override; default insert ke table
 *   afterCommit  : async () => void              // refetch data fitur
 *   messages     : { unsupportedFormat?, emptyFile?, parseFailed?, noData?, hasErrors?, noValidRows?,
 *                    removeRow?, bulkFix?: (n) => string, commitSuccess?: (n) => string, commitFailed?: (err) => string }
 *   audit        : { source?: 'SYSTEM'|'OPERATIONAL'|'MASTER', insertPayload?: (n, rows) => object }
 *   parseWorkbook: async (file) => rows           // override parser xlsx (mis. dapodik)
 *   template     : { headers, widths?, rows?, filename? }
 *   export       : { getExportData, sheetName?, defaultFileName?, defaultColumns?,
 *                    pdfTitle?, pdfMeta?(rows, scope), pdfFilterLines?(), pdfColumnStyles?,
 *                    auditSource?, auditPayload?(format, count), toast?(format, count),
 *                    noData?, failed?(format) }
 * }
 */
const CHUNK = 50

export function useImportExportCore(config) {
    const cfg = config || {}
    const addToast = cfg.addToast || (() => {})

    // ---- STATE ----
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')   // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState(cfg.export?.defaultColumns || [])
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
        if (!cfg.validate) return
        applyValidation(cfg.validate(preview), preview)
    }, [cfg.validate, applyValidation])

    // ---- IMPORT FLOW ----
    const processImportFile = useCallback(async (file) => {
        const ext = file.name.toLowerCase()
        const msg = cfg.messages || {}
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast(msg.unsupportedFormat || 'Format tidak didukung. Gunakan .csv atau .xlsx', 'error')
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
                rows = cfg.parseWorkbook ? await cfg.parseWorkbook(file) : await parseExcelFile(file)
            } else {
                rows = await parseCSVFile(file)
            }
            if (!rows.length) { addToast(msg.emptyFile || 'File kosong atau tidak terbaca', 'error'); return }

            setImportRawData(rows)
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)
            setImportColumnMapping(autoMatchColumns(headers, rows, cfg.systemCols || []))
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast(msg.parseFailed || 'Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }, [cfg.systemCols, cfg.parseWorkbook, cfg.messages, addToast])

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
        const next = [...importPreview]
        const updatedRow = { ...next[index], [key]: value }
        next[index] = cfg.resyncRow ? cfg.resyncRow(updatedRow, key, value) : updatedRow
        setImportPreview(next)
        runValidation(next)
    }, [importPreview, cfg.resyncRow, runValidation])

    const handleRemoveImportRow = useCallback((idx) => {
        const next = importPreview.filter((_, i) => i !== idx)
        setImportPreview(next)
        runValidation(next)
        addToast(cfg.messages?.removeRow || 'Baris berhasil dihapus dari preview', 'success')
    }, [importPreview, runValidation, addToast, cfg.messages])

    const handleBulkFix = useCallback((sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            return cfg.resyncRow ? cfg.resyncRow(updated, sysKey, value) : updated
        })
        setImportPreview(newPrev)
        runValidation(newPrev)
        addToast(
            cfg.messages?.bulkFix ? cfg.messages.bulkFix(value, newPrev.length) : `Selesai memperbarui ${newPrev.length} baris`,
            'success'
        )
    }, [importPreview, cfg.resyncRow, runValidation, addToast, cfg.messages])

    const buildImportPreview = useCallback(async (rawRows, mapping) => {
        const res = await cfg.buildPreview(rawRows, mapping)
        applyValidation(res, [])
    }, [cfg.buildPreview, applyValidation])

    const handleCommitImport = useCallback(async () => {
        const msg = cfg.messages || {}
        if (!importPreview.length) { addToast(msg.noData || 'Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast(msg.hasErrors || 'Masih ada ERROR. Perbaiki file dulu ya.', 'error'); return }
        if (importReadyRows.length === 0) {
            addToast(msg.noValidRows || 'Tidak ada data baru yang valid untuk diimport (semua duplikat atau error)', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })
        try {
            const commitRows = cfg.commitRows || (async (chunk) => {
                const { error } = await supabase.from(cfg.table).insert(chunk)
                if (error) throw error
            })
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map((r, cIdx) => cfg.buildCommitRow(r, { chunkStart: i, indexInChunk: cIdx }))
                await commitRows(chunk, importReadyRows)
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(
                msg.commitSuccess
                    ? msg.commitSuccess(importReadyRows.length)
                    : `Berhasil import ${importReadyRows.length} data`,
                'success'
            )
            // cfg.audit === null → lewati audit (mis. dorms: commit hanya update metadata)
            if (cfg.audit !== null) {
                await logAudit({
                    action: 'INSERT',
                    source: cfg.audit?.source || 'SYSTEM',
                    tableName: cfg.table,
                    newData: cfg.audit?.insertPayload
                        ? cfg.audit.insertPayload(importReadyRows.length, importReadyRows)
                        : { bulk_import: true, count: importReadyRows.length }
                })
            }
            resetImport()
            setIsImportModalOpen(false)
            await cfg.afterCommit?.()
        } catch (err) {
            console.error(err)
            addToast(msg.commitFailed ? msg.commitFailed(err) : `Gagal import: ${err?.message || 'cek constraint DB / duplikat / koneksi'}`, 'error')
        } finally {
            setImporting(false)
        }
    }, [importPreview, hasImportBlockingErrors, importReadyRows, cfg, addToast, resetImport])

    const handleDownloadTemplate = useCallback(() => {
        return buildTemplateFile({
            headers: cfg.template?.headers || (cfg.systemCols || []).map(s => s.label),
            widths: cfg.template?.widths || [],
            rows: cfg.template?.rows || [],
            filename: cfg.template?.filename || 'Template Import'
        })
    }, [cfg.template, cfg.systemCols])

    // ---- EXPORT ----
    const runExport = useCallback(async (fmt, filename, options = {}) => {
        setExporting(true)
        try {
            const exp = cfg.export || {}
            const rows = await exp.getExportData()
            if (!rows.length) { addToast(exp.noData || 'Tidak ada data untuk diekspor', 'warning'); return }
            const fname = filename || exp.defaultFileName || 'export'
            let count
            if (fmt === 'csv') {
                count = await writeCSV(fname, rows, options)
            } else if (fmt === 'xlsx') {
                count = await writeExcel(fname, rows, exp.sheetName || 'Data')
            } else {
                count = await exportTablePDF({
                    filename: fname,
                    title: exp.pdfTitle || 'Laporan Data',
                    metaText: exp.pdfMeta ? exp.pdfMeta(rows, exportScope) : `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length}`,
                    filterLines: exp.pdfFilterLines ? exp.pdfFilterLines() : [],
                    rows,
                    columnStyles: exp.pdfColumnStyles || {},
                    orientation: options.orientation || 'landscape',
                    includeHeader: options.includeHeader,
                })
            }
            addToast(
                exp.toast ? exp.toast(fmt, count) : `Export ${fmt.toUpperCase()} berhasil (${count} data)`,
                'success'
            )
            await logAudit({
                action: 'EXPORT',
                source: exp.auditSource || 'OPERATIONAL',
                tableName: cfg.table,
                newData: exp.auditPayload
                    ? exp.auditPayload(fmt, count, { exportScope, exportColumns })
                    : { format: fmt.toUpperCase(), count, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(cfg.export?.failed ? cfg.export.failed(fmt) : `Gagal export ${fmt.toUpperCase()}`, 'error')
        } finally {
            setExporting(false)
        }
    }, [cfg.export, cfg.table, exportScope, addToast])

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
        helpers: { parseCSVFile, downloadBlob },
    }
}
