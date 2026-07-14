// hooks/useNotifications.js
// Sistem notifikasi terpusat untuk semua kebutuhan aplikasi
// Fetch ringan — hanya ambil count/flag, bukan full data

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@lib/supabase'

const BULAN = [
    { id: 1, str: 'Januari' }, { id: 2, str: 'Februari' }, { id: 3, str: 'Maret' },
    { id: 4, str: 'April' }, { id: 5, str: 'Mei' }, { id: 6, str: 'Juni' },
    { id: 7, str: 'Juli' }, { id: 8, str: 'Agustus' }, { id: 9, str: 'September' },
    { id: 10, str: 'Oktober' }, { id: 11, str: 'November' }, { id: 12, str: 'Desember' },
]

const POLL_INTERVAL = 5 * 60 * 1000 // polling setiap 5 menit

export function useNotifications() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)    // true hanya saat pertama kali (initial load)
    const [refreshing, setRefreshing] = useState(false) // true saat manual refresh, notif lama tetap tampil
    const timerRef = useRef(null)

    const buildNotifications = useCallback(async () => {
        const now = new Date()
        const day = now.getDate()
        const month = now.getMonth() + 1       // 1–12
        const year = now.getFullYear()
        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        const prevMonthStr = BULAN.find(b => b.id === prevMonth)?.str || ''

        const items = []

        try {
            // ─────────────────────────────────────────────────────────────────
            // 1. RAPORT BULANAN: Kelas yang belum diisi bulan lalu
            //    Tampil di tgl 1–14 setiap bulan
            // ─────────────────────────────────────────────────────────────────
            if (day <= 14) {
                const { data: allStudents } = await supabase
                    .from('students')
                    .select('id, class_id')
                    .is('deleted_at', null)

                if (allStudents?.length) {
                    const studentIds = allStudents.map(s => s.id)
                    const { data: reports } = await supabase
                        .from('student_monthly_reports')
                        .select('student_id')
                        .in('student_id', studentIds)
                        .eq('month', prevMonth)
                        .eq('year', prevYear)

                    const archivedIds = new Set((reports || []).map(r => r.student_id))

                    // Group siswa per kelas
                    const byClass = {}
                    for (const s of allStudents) {
                        if (!s.class_id) continue
                        if (!byClass[s.class_id]) byClass[s.class_id] = { total: 0, archived: 0 }
                        byClass[s.class_id].total++
                        if (archivedIds.has(s.id)) byClass[s.class_id].archived++
                    }

                    const classesNotDone = Object.entries(byClass).filter(
                        ([, v]) => v.archived === 0
                    ).length
                    const partialClasses = Object.entries(byClass).filter(
                        ([, v]) => v.archived > 0 && v.archived < v.total
                    ).length

                    if (classesNotDone > 0) {
                        items.push({
                            id: 'raport-missing',
                            type: 'warning',
                            icon: '📋',
                            title: `Raport ${prevMonthStr} belum lengkap`,
                            body: `${classesNotDone} kelas belum diisi sama sekali`,
                            action: { label: 'Isi Sekarang', route: '/master/students' },
                            meta: { month: prevMonth, count: classesNotDone },
                            priority: 1,
                        })
                    } else if (partialClasses > 0) {
                        items.push({
                            id: 'raport-partial',
                            type: 'info',
                            icon: '📋',
                            title: `Raport ${prevMonthStr} hampir selesai`,
                            body: `${partialClasses} kelas baru sebagian terisi`,
                            action: { label: 'Lihat', route: '/master/students' },
                            meta: { month: prevMonth, count: partialClasses },
                            priority: 3,
                        })
                    }
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // 2. SISWA TANPA KELAS
            // ─────────────────────────────────────────────────────────────────
            const { count: noClassCount } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .is('class_id', null)
                .is('deleted_at', null)

            if (noClassCount > 0) {
                items.push({
                    id: 'students-no-class',
                    type: 'warning',
                    icon: '🎓',
                    title: 'Siswa belum punya kelas',
                    body: `${noClassCount} siswa belum ditempatkan ke kelas`,
                    action: { label: 'Data Siswa', route: '/master/students' },
                    meta: { count: noClassCount },
                    priority: 2,
                })
            }

            // ─────────────────────────────────────────────────────────────────
            // 3. TAHUN AJARAN AKTIF
            //    Cek apakah ada academic_year yang aktif
            // ─────────────────────────────────────────────────────────────────
            const { data: activeYears } = await supabase
                .from('academic_years')
                .select('id, name, is_active')
                .eq('is_active', true)

            if (!activeYears?.length) {
                items.push({
                    id: 'no-active-year',
                    type: 'error',
                    icon: '📅',
                    title: 'Tidak ada tahun ajaran aktif',
                    body: 'Set tahun ajaran aktif agar semua fitur berjalan normal',
                    action: { label: 'Atur Sekarang', route: '/master/academic-years' },
                    meta: {},
                    priority: 0, // tertinggi
                })
            } else if (activeYears.length > 1) {
                items.push({
                    id: 'multiple-active-years',
                    type: 'warning',
                    icon: '📅',
                    title: 'Ada lebih dari 1 tahun ajaran aktif',
                    body: `${activeYears.length} tahun ajaran aktif sekaligus`,
                    action: { label: 'Periksa', route: '/master/academic-years' },
                    meta: { count: activeYears.length },
                    priority: 1,
                })
            }

            // ─────────────────────────────────────────────────────────────────
            // 4. KELAS TANPA WALI KELAS (homeroom_teacher_id null)
            // ─────────────────────────────────────────────────────────────────
            const { count: noTeacherClass } = await supabase
                .from('classes')
                .select('id', { count: 'exact', head: true })
                .is('homeroom_teacher_id', null)

            if (noTeacherClass > 0) {
                items.push({
                    id: 'class-no-teacher',
                    type: 'info',
                    icon: '🏫',
                    title: 'Kelas belum ada wali kelas',
                    body: `${noTeacherClass} kelas belum memiliki wali kelas`,
                    action: { label: 'Data Kelas', route: '/master/classes' },
                    meta: { count: noTeacherClass },
                    priority: 3,
                })
            }

            // ─────────────────────────────────────────────────────────────────
            // 5. PELANGGARAN BULAN INI — pakai tabel 'reports', kolom reported_at
            // ─────────────────────────────────────────────────────────────────
            const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
            const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

            const { count: violationCount } = await supabase
                .from('reports')
                .select('id', { count: 'exact', head: true })
                .gte('reported_at', startOfMonth)
                .lte('reported_at', endOfMonth + 'T23:59:59')

            if (violationCount > 0) {
                items.push({
                    id: 'poin-this-month',
                    type: 'info',
                    icon: '⚠️',
                    title: `Pelanggaran bulan ${BULAN.find(b => b.id === month)?.str}`,
                    body: `${violationCount} pelanggaran tercatat bulan ini`,
                    action: { label: 'Lihat Laporan', route: '/raport' },
                    meta: { month: month, count: violationCount },
                    priority: 4,
                })
            }

            // ─────────────────────────────────────────────────────────────────
            // 6. SISWA TANPA NOMOR WA (tidak bisa terima raport via WA)
            // ─────────────────────────────────────────────────────────────────
            const { count: noPhoneCount } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .is('phone', null)
                .is('deleted_at', null)

            if (noPhoneCount > 0) {
                items.push({
                    id: 'students-no-phone',
                    type: 'info',
                    icon: '📱',
                    title: 'Siswa tanpa nomor WA',
                    body: `${noPhoneCount} siswa tidak bisa menerima raport via WhatsApp`,
                    action: { label: 'Data Siswa', route: '/master/students' },
                    meta: { count: noPhoneCount },
                    priority: 5,
                })
            }

        } catch (e) {
            console.error('useNotifications error:', e)
        }

        // Sort by priority (0 = paling penting)
        items.sort((a, b) => a.priority - b.priority)
        setNotifications(items)
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => {
        buildNotifications()
        timerRef.current = setInterval(buildNotifications, POLL_INTERVAL)
        return () => clearInterval(timerRef.current)
    }, [buildNotifications])

    const dismiss = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const refresh = useCallback(() => {
        setRefreshing(true) // tidak hapus notif lama, cukup spin icon
        buildNotifications()
    }, [buildNotifications])

    return { notifications, loading, refreshing, dismiss, refresh }
}

// Helper to dynamically translate notification item texts
export function translateNotification(notif, t) {
    if (!notif) return notif
    const meta = notif.meta || {}
    const getMonthStr = (mId) => t(`month.${mId}`)

    switch (notif.id) {
        case 'raport-missing':
            return {
                ...notif,
                title: t('notif.raport_missing_title').replace('{month}', getMonthStr(meta.month)),
                body: t('notif.raport_missing_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.fill_now') } : null
            }
        case 'raport-partial':
            return {
                ...notif,
                title: t('notif.raport_partial_title').replace('{month}', getMonthStr(meta.month)),
                body: t('notif.raport_partial_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.view') } : null
            }
        case 'students-no-class':
            return {
                ...notif,
                title: t('notif.students_no_class_title'),
                body: t('notif.students_no_class_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.student_data') } : null
            }
        case 'no-active-year':
            return {
                ...notif,
                title: t('notif.no_active_year_title'),
                body: t('notif.no_active_year_body'),
                action: notif.action ? { ...notif.action, label: t('notif.action.set_now') } : null
            }
        case 'multiple-active-years':
            return {
                ...notif,
                title: t('notif.multiple_active_years_title'),
                body: t('notif.multiple_active_years_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.verify') } : null
            }
        case 'class-no-teacher':
            return {
                ...notif,
                title: t('notif.class_no_teacher_title'),
                body: t('notif.class_no_teacher_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.class_data') } : null
            }
        case 'poin-this-month':
            return {
                ...notif,
                title: t('notif.poin_this_month_title').replace('{month}', getMonthStr(meta.month)),
                body: t('notif.poin_this_month_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.view_reports') } : null
            }
        case 'students-no-phone':
            return {
                ...notif,
                title: t('notif.students_no_phone_title'),
                body: t('notif.students_no_phone_body').replace('{count}', meta.count),
                action: notif.action ? { ...notif.action, label: t('notif.action.student_data') } : null
            }
        default:
            return notif
    }
}