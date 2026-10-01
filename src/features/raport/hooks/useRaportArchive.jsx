import { useCallback, useRef } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { BULAN } from '@utils/reports/raportConstants'
import { RAPORT_TYPES } from '@features/raport/utils/raportTypeRegistry'

/**
 * useRaportArchive — Archive business logic hook.
 * Manages loading, displaying, editing and deleting archived raport data.
 *
 * Depends on shared archive state (provided via RaportContext).
 */
export function useRaportArchive({
    reportType,
    classesList,
    // Archive state setters
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
    // Print state (optional — for archive print)
    printContainerRef,
    setPrintQueue,
    setPrintRenderedCount,
    pageSize,
}) {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const exportingPdfRef = useRef(false)
    const printExecutingRef = useRef(false)

    // ── Load archive list ──────────────────────────────────────────────────────
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            const PAGE_SIZE = 1000
            let allReports = []
            let page = 0
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            const selectCols = reportType === 'bulanan'
                ? 'student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa'
                : 'student_id, report_type, semester, academic_year, musyrif_name, scores, extras'

            while (true) {
                let query = supabase.from(tableName).select(selectCols)
                if (reportType !== 'bulanan') {
                    query = query.eq('report_type', reportType)
                }
                const { data: batch, error: batchErr } = await query
                    .order(reportType === 'bulanan' ? 'year' : 'academic_year', { ascending: false })
                    .order(reportType === 'bulanan' ? 'month' : 'semester', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                if (batchErr) throw batchErr
                if (!batch?.length) break
                allReports = allReports.concat(batch)
                if (batch.length < PAGE_SIZE) break
                page++
            }

            const reports = allReports
            if (!reports.length) { setArchiveList([]); return }

            const studentIds = [...new Set(reports.map(r => r.student_id))]
            const { data: stuData } = await supabase.from('students').select('id, class_id').in('id', studentIds)
            const classIds = [...new Set((stuData || []).map(s => s.class_id).filter(Boolean))]
            const { data: classData } = await supabase.from('classes').select('id, name, grade, major').in('id', classIds)

            const stuMap = {}, clsMap = {}
            for (const s of (stuData || [])) stuMap[s.id] = s
            for (const c of (classData || [])) clsMap[c.id] = c

            const grouped = {}
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan

            for (const row of reports) {
                const stu = stuMap[row.student_id]; if (!stu?.class_id) continue
                const cls = clsMap[stu.class_id]; if (!cls) continue
                if (reportType === 'bulanan') {
                    const key = `${cls.id}__${row.month}__${row.year}`
                    if (!grouped[key]) grouped[key] = { key, class_id: cls.id, class_name: cls.name, month: row.month, year: row.year, musyrif: row.musyrif_name, count: 0, completed: 0, lang: 'id' }
                    grouped[key].count++
                    const hasAllMainScores = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                        .every(k => row[k] !== '' && row[k] !== null && row[k] !== undefined)
                    if (hasAllMainScores) grouped[key].completed++
                } else {
                    const key = `${cls.id}__${row.semester}__${row.academic_year.replace('/', '_')}`
                    if (!grouped[key]) grouped[key] = {
                        key, class_id: cls.id, class_name: cls.name,
                        semester: row.semester, academic_year: row.academic_year,
                        report_type: row.report_type, musyrif: row.musyrif_name,
                        count: 0, completed: 0, lang: 'id'
                    }
                    grouped[key].count++
                    const criteria = rtObj.getCriteria(cls)
                    const hasAllMainScores = criteria.every(k => row.scores?.[k.key] !== '' && row.scores?.[k.key] !== null && row.scores?.[k.key] !== undefined)
                    if (hasAllMainScores) grouped[key].completed++
                }
            }

            const list = Object.values(grouped).sort((a, b) => {
                if (reportType === 'bulanan') {
                    return b.year - a.year || b.month - a.month
                } else {
                    return b.academic_year.localeCompare(a.academic_year) || b.semester - a.semester
                }
            })

            setArchiveList(list)
            if (list.length > 0) {
                const latest = list[0]
                setArchiveFilter(prev => {
                    if (reportType === 'bulanan') {
                        if (!prev.year && !prev.month) {
                            return { ...prev, year: String(latest.year), month: String(latest.month) }
                        }
                    } else {
                        if (!prev.academic_year && !prev.semester) {
                            return { ...prev, academic_year: latest.academic_year, semester: String(latest.semester) }
                        }
                    }
                    return prev
                })
            }
        } catch (e) {
            addToast('Gagal memuat arsip', 'error')
            console.error('loadArchive error:', e)
        } finally {
            setArchiveLoading(false)
        }
    }, [addToast, reportType, setArchiveLoading, setArchiveList, setArchiveFilter])

    // ── Load archive detail ────────────────────────────────────────────────────
    const loadArchiveDetail = useCallback(async (entry) => {
        setArchiveLoading(true)
        try {
            const { data: stuData } = await supabase
                .from('students')
                .select('id, name, phone, metadata')
                .eq('class_id', entry.class_id)
                .is('deleted_at', null)
                .order('name')

            const ids = (stuData || []).map(s => s.id)
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let query = supabase.from(tableName).select('*').in('student_id', ids)

            if (reportType === 'bulanan') {
                query = query.eq('month', entry.month).eq('year', entry.year)
            } else {
                query = query.eq('report_type', reportType).eq('semester', entry.semester).eq('academic_year', entry.academic_year)
            }

            const { data: repData } = await query
            const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
            const classObj = classesList.find(c => c.id === entry.class_id)
            const criteria = rtObj.getCriteria(classObj)

            const scMap = {}, exMap = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                if (reportType === 'bulanan') {
                    scMap[s.id] = {
                        nilai_akhlak: rep?.nilai_akhlak ?? '',
                        nilai_ibadah: rep?.nilai_ibadah ?? '',
                        nilai_kebersihan: rep?.nilai_kebersihan ?? '',
                        nilai_quran: rep?.nilai_quran ?? '',
                        nilai_bahasa: rep?.nilai_bahasa ?? ''
                    }
                    exMap[s.id] = {
                        berat_badan: rep?.berat_badan ?? '',
                        tinggi_badan: rep?.tinggi_badan ?? '',
                        ziyadah: rep?.ziyadah ?? '',
                        murojaah: rep?.murojaah ?? '',
                        total_hafalan: rep?.total_hafalan ?? '',
                        hari_sakit: rep?.hari_sakit ?? '',
                        hari_izin: rep?.hari_izin ?? '',
                        hari_alpa: rep?.hari_alpa ?? '',
                        hari_pulang: rep?.hari_pulang ?? '',
                        catatan: rep?.catatan ?? ''
                    }
                } else {
                    const scObj = {}
                    criteria.forEach(k => { scObj[k.key] = rep?.scores?.[k.key] ?? '' })
                    scMap[s.id] = scObj
                    exMap[s.id] = {
                        berat_badan: rep?.extras?.berat_badan ?? '',
                        tinggi_badan: rep?.extras?.tinggi_badan ?? '',
                        hari_sakit: rep?.extras?.hari_sakit ?? '',
                        hari_izin: rep?.extras?.hari_izin ?? '',
                        hari_alpa: rep?.extras?.hari_alpa ?? '',
                        hari_pulang: rep?.extras?.hari_pulang ?? '',
                        catatan: rep?.catatan ?? rep?.extras?.catatan ?? ''
                    }
                }
            }

            setArchivePreview({
                students: stuData || [],
                scores: scMap,
                extras: exMap,
                bulanObj: reportType === 'bulanan' ? BULAN.find(b => b.id === entry.month) : null,
                tahun: reportType === 'bulanan' ? entry.year : null,
                musyrif: entry.musyrif,
                className: entry.class_name,
                lang: entry.lang,
                entry
            })
        } catch (e) {
            addToast('Gagal memuat detail arsip', 'error')
            console.error('loadArchiveDetail error:', e)
        } finally {
            setArchiveLoading(false)
        }
    }, [addToast, reportType, classesList, setArchiveLoading, setArchivePreview])

    // ── Save archive inline edits ──────────────────────────────────────────────
    const saveArchiveEdit = useCallback(async () => {
        if (!archivePreview) return
        setArchiveEditSaving(true)
        try {
            const { students: pStu, entry } = archivePreview
            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'

            const payloads = pStu.map(s => {
                const sc = archiveEditScores[s.id] || archivePreview.scores[s.id] || {}
                const ex = archiveEditExtras[s.id] || archivePreview.extras[s.id] || {}
                if (reportType === 'bulanan') {
                    return {
                        student_id: s.id,
                        month: entry.month,
                        year: entry.year,
                        musyrif_name: archivePreview.musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                        berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                        tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                        ziyadah: ex.ziyadah || null,
                        murojaah: ex.murojaah || null,
                        total_hafalan: ex.total_hafalan || null,
                        hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                        hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                        hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                        hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                        catatan: ex.catatan || null,
                    }
                } else {
                    return {
                        student_id: s.id,
                        report_type: reportType,
                        semester: entry.semester,
                        academic_year: entry.academic_year,
                        musyrif_name: archivePreview.musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        scores: Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                        extras: {
                            berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                            tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                            hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                            hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                            hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                            hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                            catatan: ex.catatan || null,
                        }
                    }
                }
            })

            let query
            if (reportType === 'bulanan') {
                query = supabase.from(tableName).upsert(payloads, { onConflict: 'student_id,month,year' })
            } else {
                query = supabase.from(tableName).upsert(payloads, { onConflict: 'student_id,report_type,semester,academic_year' })
            }

            const { error } = await query
            if (error) throw error

            setArchivePreview(prev => {
                if (!prev) return prev
                const mergedScores = { ...prev.scores }
                const mergedExtras = { ...prev.extras }
                for (const sid of Object.keys(archiveEditScores)) mergedScores[sid] = { ...mergedScores[sid], ...archiveEditScores[sid] }
                for (const sid of Object.keys(archiveEditExtras)) mergedExtras[sid] = { ...mergedExtras[sid], ...archiveEditExtras[sid] }
                return { ...prev, scores: mergedScores, extras: mergedExtras }
            })

            setArchiveEditScores({})
            setArchiveEditExtras({})
            setArchiveEditMode(false)
            addToast(`${pStu.length} raport arsip berhasil diperbarui`, 'success')

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName,
                newData: {
                    bulk_archive_edit: true,
                    count: pStu.length,
                    class_name: archivePreview.className,
                    ...(reportType === 'bulanan'
                        ? { month: entry.month, year: entry.year }
                        : { semester: entry.semester, academic_year: entry.academic_year })
                }
            })
        } catch (e) {
            addToast('Gagal menyimpan: ' + e.message, 'error')
        } finally {
            setArchiveEditSaving(false)
        }
    }, [archivePreview, archiveEditScores, archiveEditExtras, addToast, reportType, profile,
        setArchiveEditSaving, setArchivePreview, setArchiveEditScores, setArchiveEditExtras, setArchiveEditMode])

    // ── Delete archive entry ───────────────────────────────────────────────────
    const executeDeleteArchive = useCallback(async (entry) => {
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)

            if (!ids.length) {
                setArchiveList(prev => prev.filter(a => a.key !== entry.key))
                addToast('Arsip berhasil dihapus', 'success')
                return
            }

            const tableName = reportType === 'bulanan' ? 'student_monthly_reports' : 'student_semester_reports'
            let selectQuery = supabase.from(tableName).select('id').in('student_id', ids)

            if (reportType === 'bulanan') {
                selectQuery = selectQuery.eq('month', entry.month).eq('year', entry.year)
            } else {
                selectQuery = selectQuery.eq('report_type', reportType).eq('semester', entry.semester).eq('academic_year', entry.academic_year)
            }

            const { data: toDelete } = await selectQuery
            if (!toDelete?.length) {
                setArchiveList(prev => prev.filter(a => a.key !== entry.key))
                addToast('Arsip berhasil dihapus', 'success')
                return
            }

            const { error: delErr } = await supabase.from(tableName).delete().in('id', toDelete.map(r => r.id))
            if (delErr) throw delErr

            setArchiveList(prev => prev.filter(a => a.key !== entry.key))
            addToast('Arsip berhasil dihapus', 'success')

            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName, recordId: null,
                oldData: {
                    ...(reportType === 'bulanan' ? { archive_month: entry.month, archive_year: entry.year } : { semester: entry.semester, academic_year: entry.academic_year }),
                    class_id: entry.class_id,
                    count: toDelete.length
                }
            })
        } catch (e) {
            addToast('Gagal menghapus arsip: ' + e.message, 'error')
            console.error('executeDeleteArchive error:', e)
        }
    }, [addToast, reportType, setArchiveList])

    // ── Export/print archive entries ───────────────────────────────────────────
    const exportBulkPDF = useCallback(async (entry) => {
        await loadArchiveDetail(entry)
    }, [loadArchiveDetail])

    return {
        loadArchive,
        loadArchiveDetail,
        saveArchiveEdit,
        executeDeleteArchive,
        exportBulkPDF,
    }
}
