import { useState } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { buildPrintHTML, openPrintWindow } from '@utils/printTemplate'
import { useLanguage } from '@context'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import { pick } from '@utils/importExportEngine'

export const SYSTEM_COLS = [
    { key: 'student_name', labelKey: 'colStudent', synonyms: ['nama', 'student', 'siswa', 'student_name', 'nama siswa', 'name', 'nama lengkap'] },
    { key: 'class_name', labelKey: 'colClass', synonyms: ['kelas', 'class', 'class_name', 'rombongan belajar', 'rombel', 'nama kelas'] },
    { key: 'rule_name', labelKey: 'colRule', synonyms: ['rule_name', 'violation', 'jenis', 'perilaku', 'jenis perilaku', 'jenis pelanggaran', 'pelanggaran', 'prestasi', 'rule'] },
    { key: 'points', labelKey: 'colPoints', synonyms: ['poin', 'points', 'nilai poin', 'nilai', 'point'] },
    { key: 'notes', labelKey: 'colNotes', synonyms: ['catatan', 'notes', 'keterangan', 'detail', 'deskripsi'] },
    { key: 'date', labelKey: 'colDate', synonyms: ['tanggal', 'date', 'reported_at', 'waktu'] }
]

/**
 * Hook import/export fitur Behavior. Mesin generik (state, parse, auto-match,
 * commit chunk, export CSV/Excel) ada di useImportExportCore; file ini hanya
 * logika domain: lookup siswa/aturan, validasi, payload commit, export PDF
 * bergaya surat (printHTML), dan fitur salin-bulan.
 */
export function useImportExport({
    students,
    violationTypes,
    fetchReports,
    fetchStats,
    addToast,
    filterType,
    filterClass,
    debouncedSearch,
    selectedIds,
    profile
}) {
    const { t, tNum, language } = useLanguage()
    const [copyingData, setCopyingData] = useState(false)

    // ---- EXPORT (domain) ----
    const ALL_EXPORT_COLUMNS = [
        { key: 'date', label: t('behavior.colDate'), fn: r => r.reported_at ? new Date(r.reported_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
        { key: 'student', label: t('behavior.colStudent'), fn: r => r.students?.name || '-' },
        { key: 'class', label: t('behavior.colClass'), fn: r => r.students?.classes?.name || '-' },
        { key: 'type', label: t('behavior.colRule'), fn: r => r.point_rules?.name || '-' },
        { key: 'points', label: t('behavior.colPoints'), fn: r => r.points ?? 0 },
        { key: 'notes', label: t('behavior.colNotes'), fn: r => r.notes || '-' },
        { key: 'teacher', label: t('behavior.colTeacher'), fn: r => r.teacher_name || '-' }
    ]

    const getExportRawData = async (scope = 'filtered') => {
        let q = supabase
            .from('reports')
            .select('*, students(name, class_id, classes(name)), point_rules(name)')
            .order('reported_at', { ascending: false })

        if (scope === 'selected') {
            q = q.in('id', selectedIds)
        }

        const { data, error } = await q
        if (error) throw error

        let filtered = data || []

        // Scope 'filtered': filter in-memory (konsisten dengan fetch BehaviorPage)
        if (scope === 'filtered') {
            if (filterType === 'positive') filtered = filtered.filter(r => r.points > 0)
            if (filterType === 'negative') filtered = filtered.filter(r => r.points < 0)
            if (filterClass) {
                filtered = filtered.filter(r => r.students?.classes?.name === filterClass)
            }
            if (debouncedSearch) {
                const s = debouncedSearch.toLowerCase()
                filtered = filtered.filter(r =>
                    (r.students?.name || '').toLowerCase().includes(s) ||
                    (r.point_rules?.name || '').toLowerCase().includes(s)
                )
            }
        }
        return filtered
    }

    const mapExportRows = (rawList, cols) => rawList.map(r => {
        const row = {}
        cols.forEach(key => {
            const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
            if (col) row[col.label] = col.fn(r)
        })
        return row
    })

    // ---- VALIDASI DOMAIN ----
    const validatePreview = (preview) => {
        const issues = []
        const validated = preview.map((r, idx) => {
            const rowIssues = []
            if (!r.student_id) {
                rowIssues.push({ level: 'error', type: 'student', message: t('behavior.importErrStudentNotFound').replace('{name}', r._studentName) })
            }
            if (!r.violation_type_id) {
                rowIssues.push({ level: 'error', type: 'rule', message: t('behavior.importErrRuleNotFound').replace('{name}', r._violationName) })
            }
            if (rowIssues.length) {
                issues.push({
                    row: idx + 2,
                    level: 'error',
                    types: rowIssues.map(x => x.type),
                    messages: rowIssues.map(x => x.message)
                })
            }
            return { ...r, _hasError: rowIssues.length > 0 }
        })
        return { validated, issues, dupeIndices: [] }
    }

    // Sinkron field turunan saat sel/bulk diedit (selalu set poin default aturan)
    const resyncRow = (row) => {
        if (row.student_id !== undefined) {
            const student = students.find(s => s.id === row.student_id)
            row._studentName = student?.name || ''
            row._className = student?.class_name || ''
        }
        if (row.violation_type_id !== undefined) {
            const rule = violationTypes.find(v => v.id === row.violation_type_id)
            row._violationName = rule?.name || ''
            row.points = rule?.points ?? 0
        }
        return row
    }

    const core = useImportExportCore({
        systemCols: SYSTEM_COLS.map(s => ({ ...s, label: t(`behavior.${s.labelKey}`) })),
        addToast,
        table: 'reports',
        audit: { source: 'OPERATIONAL', insertPayload: (count) => ({ bulk_import: true, count }) },
        messages: {
            unsupportedFormat: t('behavior.toastImportUnsupportedFormat'),
            emptyFile: t('behavior.toastImportEmptyFile'),
            parseFailed: t('behavior.toastImportFailedRead'),
            noData: t('behavior.toastImportNoData'),
            hasErrors: t('behavior.toastImportFixErrors'),
            removeRow: t('behavior.toastImportRowDeleted'),
            bulkFix: (n) => t('behavior.toastImportBulkUpdateSuccess').replace('{count}', tNum(n)),
            commitSuccess: (n) => t('behavior.toastImportTextSuccess') || t('behavior.toastImportSuccess').replace('{count}', tNum(n)),
            commitFailed: () => t('behavior.toastImportFailed'),
        },
        buildPreview: async (rows, mapping) => {
            const preview = rows.map((r) => {
                const getVal = (row, sysKey) => {
                    if (mapping && mapping[sysKey]) return row[mapping[sysKey]]
                    const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                    return pick(row, colDef ? colDef.synonyms : [sysKey])
                }

                const studentName = String(getVal(r, 'student_name') ?? '').trim()
                const className = String(getVal(r, 'class_name') ?? '').trim()
                const ruleName = String(getVal(r, 'rule_name') ?? '').trim()
                const pointsRaw = String(getVal(r, 'points') ?? '').trim()
                const notes = String(getVal(r, 'notes') ?? '').trim()
                const dateRaw = String(getVal(r, 'date') ?? '').trim()

                // Cari siswa yang cocok (nama + kelas opsional)
                const matchedStudent = students.find(s => {
                    const nameMatches = s.name.toLowerCase() === studentName.toLowerCase()
                    if (!nameMatches) return false
                    if (className) {
                        return (s.class_name || '').toLowerCase() === className.toLowerCase()
                    }
                    return true
                })

                const matchedRule = violationTypes.find(v => v.name.toLowerCase() === ruleName.toLowerCase())

                // Poin dari file, fallback ke poin default aturan
                let points = pointsRaw !== '' ? Number(pointsRaw) : (matchedRule?.points ?? 0)
                if (isNaN(points)) points = matchedRule?.points ?? 0

                // Tanggal (fallback hari ini bila tidak valid)
                let date = dateRaw ? new Date(dateRaw) : new Date()
                if (isNaN(date.getTime())) date = new Date()

                return {
                    student_id: matchedStudent?.id || '',
                    violation_type_id: matchedRule?.id || '',
                    points,
                    notes: notes || matchedRule?.name || '',
                    date: date.toISOString().slice(0, 10),
                    _studentName: matchedStudent?.name || studentName || '',
                    _violationName: matchedRule?.name || ruleName || '',
                    _className: className || matchedStudent?.class_name || '',
                    _hasError: false
                }
            })
            return validatePreview(preview)
        },
        validate: validatePreview,
        resyncRow,
        buildCommitRow: (r) => ({
            student_id: r.student_id,
            violation_type_id: r.violation_type_id,
            points: r.points,
            notes: r.notes,
            reported_at: new Date(r.date).toISOString(),
            teacher_name: profile?.name || 'Sistem'
        }),
        afterCommit: async () => {
            await fetchReports()
            fetchStats()
        },
        template: {
            headers: [t('behavior.colStudent'), t('behavior.colClass'), t('behavior.colRule'), t('behavior.colPoints'), t('behavior.colNotes'), t('behavior.colDate')],
            widths: [25, 20, 25, 10, 25, 15],
            rows: [
                [t('behavior.tplStudent1'), t('behavior.tplClass1'), t('behavior.tplRule1'), -5, t('behavior.tplNotes1'), '2026-05-29'],
                [t('behavior.tplStudent2'), t('behavior.tplClass2'), t('behavior.tplRule2'), 10, t('behavior.tplNotes2'), '2026-05-29'],
            ],
            filename: t('behavior.importDownloadTemplate'),
        },
        export: {
            getExportData: async (scope, cols) => mapExportRows(await getExportRawData(scope), cols || ALL_EXPORT_COLUMNS.map(c => c.key)),
            sheetName: t('behavior.importRefDesc'),
            defaultFileName: 'export_perilaku',
            noData: t('behavior.toastNoDataExport'),
            failed: (fmt) => t(fmt === 'csv' ? 'behavior.toastExportFailedCSV' : fmt === 'xlsx' ? 'behavior.toastExportFailedExcel' : 'behavior.toastExportFailedPDF'),
            toast: (fmt, n) => t(fmt === 'csv' ? 'behavior.toastExportSuccessCSV' : fmt === 'xlsx' ? 'behavior.toastExportSuccessExcel' : 'behavior.toastExportSuccessPDF').replace('{count}', tNum(n)),
        },
    })

    // PDF khusus behavior: dokumen bergaya surat via buildPrintHTML (bukan autoTable)
    const handleExportPDF = async (filename, options = {}) => {
        core.setExporting(true)
        try {
            const rawList = await getExportRawData(core.exportScope)
            if (!rawList.length) return addToast(t('behavior.toastNoDataExport'), 'warning')

            const allRows = mapExportRows(rawList, core.exportColumns)

            const totalCount = rawList.length
            const positiveCount = rawList.filter(r => r.points > 0).length
            const negativeCount = rawList.filter(r => r.points < 0).length
            const totalPoints = rawList.reduce((acc, r) => acc + Math.abs(r.points ?? 0), 0)
            const avgPoints = totalCount ? Math.round(totalPoints / totalCount) : 0

            const stats = [
                { label: t('behavior.pdfTotal') || 'Total Laporan', value: totalCount, type: 'total' },
                { label: t('behavior.positive') || 'Prestasi (+)', value: positiveCount, type: 'prestasi', description: 'poin penghargaan' },
                { label: t('behavior.negative') || 'Pelanggaran (−)', value: negativeCount, type: 'pelanggaran', description: 'poin kedisiplinan' },
                { label: 'Rata-rata Poin', value: avgPoints, type: 'avg', description: 'rata-rata poin mutlak' }
            ]

            const periodLabel = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })
            const scopeLabel = core.exportScope === 'filtered' ? t('behavior.pdfScopeFiltered') : core.exportScope === 'selected' ? t('behavior.pdfScopeSelected') : t('behavior.pdfScopeAll')
            const infoStrip = [
                { label: 'Periode', value: periodLabel },
                { label: 'Cakupan', value: scopeLabel },
                { label: 'Penyusun', value: 'Staff Kesiswaan' }
            ]

            const headerKeys = Object.keys(allRows[0])
            const tableHeaders = ['#', ...headerKeys]

            const tableRowsHTML = allRows.map((r, i) => {
                const cells = headerKeys.map(h => {
                    const val = r[h]
                    if (h === t('behavior.colPoints')) {
                        const numVal = Number(val)
                        if (numVal > 0) return `<td><span class="tag-status success">+${numVal}</span></td>`
                        if (numVal < 0) return `<td><span class="tag-status warning">${numVal}</span></td>`
                    }
                    return `<td>${val ?? '—'}</td>`
                }).join('')
                return `<tr><td>${i + 1}</td>${cells}</tr>`
            }).join('')

            const html = buildPrintHTML({
                schoolLogo: window.location.origin + '/logo-smp.png',
                docBadge: 'DISIPLIN & POIN',
                docNumber: `BVR/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 9000) + 1000)}`,
                title: t('behavior.pdfTitle') || 'Laporan Poin Perilaku Santri',
                subtitle: 'Log Pelanggaran & Prestasi Siswa',
                totalCount,
                totalLabel: t('behavior.reports') || 'Laporan',
                stats,
                infoStrip,
                tableHeaders,
                tableRowsHTML,
                signaturePlace: 'Tanggul',
                signatureTitle: 'Kepala Sekolah',
                secondarySignatureTitle: 'Staff Kesiswaan',
                paperSize: options.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape',
                colorPrimary: '#1a5c35',
                colorSecondary: '#c8a400',
            })

            openPrintWindow(html)
            addToast(t('behavior.toastExportSuccessPDF').replace('{count}', tNum(allRows.length)), 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'reports',
                newData: { format: 'PDF', count: allRows.length, scope: core.exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast(t('behavior.toastExportFailedPDF'), 'error')
        } finally {
            core.setExporting(false)
        }
    }

    // ---- Fitur khusus: salin laporan antar-bulan ----
    const copyDataFromMonth = async (sourceMonth, sourceYear, targetMonth, targetYear) => {
        setCopyingData(true)
        try {
            const startDate = new Date(sourceYear, sourceMonth - 1, 1)
            const endDate = new Date(sourceYear, sourceMonth, 0, 23, 59, 59, 999)

            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .gte('reported_at', startDate.toISOString())
                .lte('reported_at', endDate.toISOString())

            if (error) throw error

            if (!data || data.length === 0) {
                addToast(
                    t('behavior.toastCopyNoData') ||
                    `Tidak ada data laporan perilaku pada bulan ${sourceMonth}/${sourceYear}`,
                    'warning'
                )
                return false
            }

            const newReports = data.map(r => {
                const sourceDate = new Date(r.reported_at)
                const day = sourceDate.getDate()
                const lastDayOfTarget = new Date(targetYear, targetMonth, 0).getDate()
                const newDay = Math.min(day, lastDayOfTarget)

                const targetDate = new Date(
                    targetYear,
                    targetMonth - 1,
                    newDay,
                    sourceDate.getHours(),
                    sourceDate.getMinutes(),
                    sourceDate.getSeconds(),
                    sourceDate.getMilliseconds()
                )

                return {
                    student_id: r.student_id,
                    violation_type_id: r.violation_type_id,
                    points: r.points,
                    notes: r.notes,
                    reported_at: targetDate.toISOString(),
                    teacher_name: profile?.name || r.teacher_name || 'Sistem'
                }
            })

            const CHUNK = 50
            for (let i = 0; i < newReports.length; i += CHUNK) {
                const chunk = newReports.slice(i, i + CHUNK)
                const { error: insertError } = await supabase
                    .from('reports')
                    .insert(chunk)
                if (insertError) throw insertError
            }

            addToast(
                t('behavior.toastCopySuccess') ||
                `Berhasil menyalin ${newReports.length} data laporan perilaku`,
                'success'
            )

            await logAudit({
                action: 'INSERT',
                source: 'OPERATIONAL',
                tableName: 'reports',
                newData: {
                    bulk_copy: true,
                    count: newReports.length,
                    source: `${sourceMonth}/${sourceYear}`,
                    target: `${targetMonth}/${targetYear}`
                }
            })

            await fetchReports()
            fetchStats()
            return true
        } catch (e) {
            console.error(e)
            addToast(t('behavior.toastCopyFailed') || 'Gagal menyalin data laporan perilaku', 'error')
            return false
        } finally {
            setCopyingData(false)
        }
    }

    return {
        ...core,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,
        copyingData,
        copyDataFromMonth,
        handleExportPDF,
    }
}
