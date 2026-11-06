import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Bangun query string untuk pindah halaman Setup -> Input -> Preview.
 * Semua pengaturan periode ikut di URL supaya refresh tidak menghilangkan state.
 */
export function buildRaportQuery({ month, year, type, lang, semester, academicYear, musyrif }) {
    const p = new URLSearchParams()
    if (month != null && month !== '') p.set('month', String(month))
    if (year != null && year !== '') p.set('year', String(year))
    if (type) p.set('type', String(type))
    if (lang) p.set('lang', String(lang))
    if (semester != null && semester !== '') p.set('semester', String(semester))
    if (academicYear != null && academicYear !== '') p.set('ay', String(academicYear))
    if (musyrif) p.set('musyrif', String(musyrif))
    return p.toString()
}

const same = (a, b) => String(a ?? '') === String(b ?? '')
// pertahankan tipe nilai yang dipakai context (number tetap number)
const coerce = (current, raw) => (typeof current === 'number' ? Number(raw) : raw)

/**
 * Sinkronkan context raport dengan URL saat halaman dibuka / di-refresh.
 *
 * Mengembalikan:
 *  - hydrated: true jika context sudah sama dengan URL (aman memanggil loadStudents)
 *  - waitingForClass: true selama daftar kelas masih dimuat (hindari kilasan "Kelas tidak ditemukan")
 *  - params: nilai efektif (URL lebih diutamakan daripada state context)
 */
export function useRaportUrlParams(classId, core) {
    const [searchParams] = useSearchParams()
    const {
        selectedClass, setSelectedClassId,
        selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear,
        reportType, setReportType,
        lang, setLang,
        selectedSemester, setSelectedSemester,
        academicYear, setAcademicYear,
        musyrif, setMusyrif,
    } = core

    const q = useMemo(() => ({
        month: searchParams.get('month'),
        year: searchParams.get('year'),
        type: searchParams.get('type'),
        lang: searchParams.get('lang'),
        semester: searchParams.get('semester'),
        ay: searchParams.get('ay'),
        musyrif: searchParams.get('musyrif'),
    }), [searchParams])

    useEffect(() => {
        if (classId) setSelectedClassId?.(classId)
        if (q.month && !same(selectedMonth, q.month)) setSelectedMonth?.(Number(q.month))
        if (q.year && !same(selectedYear, q.year)) setSelectedYear?.(Number(q.year))
        if (q.type && !same(reportType, q.type)) setReportType?.(q.type)
        if (q.lang && !same(lang, q.lang)) setLang?.(q.lang)
        if (q.semester && !same(selectedSemester, q.semester)) setSelectedSemester?.(coerce(selectedSemester, q.semester))
        if (q.ay && !same(academicYear, q.ay)) setAcademicYear?.(coerce(academicYear, q.ay))
        if (q.musyrif && !same(musyrif, q.musyrif)) setMusyrif?.(q.musyrif)
    }, [
        classId, q,
        selectedMonth, selectedYear, reportType, lang, selectedSemester, academicYear, musyrif,
        setSelectedClassId, setSelectedMonth, setSelectedYear, setReportType,
        setLang, setSelectedSemester, setAcademicYear, setMusyrif,
    ])

    const hydrated =
        (!classId || selectedClass?.id === classId) &&
        (!q.month || same(selectedMonth, q.month)) &&
        (!q.year || same(selectedYear, q.year)) &&
        (!q.type || same(reportType, q.type)) &&
        (!q.lang || same(lang, q.lang)) &&
        (!q.semester || same(selectedSemester, q.semester)) &&
        (!q.ay || same(academicYear, q.ay)) &&
        (!q.musyrif || same(musyrif, q.musyrif))

    // beri waktu daftar kelas dimuat sebelum menyatakan "tidak ditemukan"
    const [waited, setWaited] = useState(false)
    useEffect(() => {
        if (selectedClass) return
        const t = setTimeout(() => setWaited(true), 3000)
        return () => clearTimeout(t)
    }, [selectedClass])

    return {
        hydrated,
        waitingForClass: !selectedClass && !waited,
        params: {
            month: q.month ? Number(q.month) : selectedMonth,
            year: q.year ? Number(q.year) : selectedYear,
            type: q.type || reportType,
            lang: q.lang || lang,
            semester: q.semester ? coerce(selectedSemester, q.semester) : selectedSemester,
            academicYear: q.ay ? coerce(academicYear, q.ay) : academicYear,
        },
    }
}
