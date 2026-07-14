// Local storage keys for audit and task persistence during preview/session
export const LS_AUDITS = 'laporanmu_dorm_audits'
export const LS_TASKS = 'laporanmu_dorm_tasks'
export const LS_LOGS = 'laporanmu_dorm_shift_logs'

export function getMockAudits() {
    return [
        {
            id: '1',
            date: '2026-05-24',
            room: 'Ahmad Dahlan',
            score: 94,
            rating: 'A',
            aspects: { kerapian: 95, kebersihan: 92, keharuman: 95 },
            notes: 'Sangat bersih dan rapi. Lemari tertata sempurna.'
        },
        {
            id: '2',
            date: '2026-05-24',
            room: 'Buya Hamka',
            score: 86,
            rating: 'A',
            aspects: { kerapian: 82, kebersihan: 88, keharuman: 88 },
            notes: 'Kondisi wangi, ventilasi baik. Ada sedikit pakaian gantung di luar lemari.'
        },
        {
            id: '3',
            date: '2026-05-24',
            room: 'Ibrahim',
            score: 72,
            rating: 'B',
            aspects: { kerapian: 70, kebersihan: 75, keharuman: 71 },
            notes: 'Kasur kurang rapi. Tolong Musyrif bantu ingatkan santri untuk lipat selimut.'
        }
    ]
}

export function getMockTasks() {
    return [
        { id: '1', title: 'Absensi Subuh Berjamaah', desc: 'Kontrol ketertiban shalat subuh berjamaah di masjid jami mbs.', completed: true, completedAt: '05.00' },
        { id: '2', title: 'Pemberian Mufradat / Kosa Kata', desc: 'Pemberian 3 kosakata bahasa Arab/Inggris pagi hari setelah subuh.', completed: true, completedAt: '05.45' },
        { id: '3', title: 'Inspeksi Kamar Pagi (Kerapian)', desc: 'Musyrif keliling memastikan kasur dilipat dan tidak ada baju bergelantungan.', completed: false, completedAt: null },
        { id: '4', title: 'Kontrol Tidur Siang', desc: 'Pengkondisian santri untuk qailulah (istirahat tidur siang) jam 13.00 - 14.00.', completed: false, completedAt: null },
        { id: '5', title: 'Absensi Kehadiran Masjid Isya', desc: 'Pengecekan absensi santri lengkap pada shalat Isya berjamaah.', completed: false, completedAt: null },
        { id: '6', title: 'Kunci Pintu Asrama & Absen Malam', desc: 'Jam malam asrama, kunci pintu utama pada 22.00 dan absen kamar masing-masing.', completed: false, completedAt: null }
    ]
}

export function getMockShiftLogs() {
    return [
        { id: '1', date: '28 Mei 2026', musyrifName: 'Ustadz Ahmad Fauzi', shift: 'Malam', notes: 'Santri lengkap dan tertib tidur malam tepat waktu.', issues: 'Nihil' },
        { id: '2', date: '27 Mei 2026', musyrifName: 'Ustadz Muhammad Rafli', shift: 'Malam', notes: 'Kamar Fachruddin sempat bising jam 22.30, sudah dibina.', issues: 'Nihil' },
        { id: '3', date: '26 Mei 2026', musyrifName: 'Ustadz Hilman Hakim', shift: 'Siang', notes: 'Piket asrama berjalan normal.', issues: 'Gagang pintu kamar Ibrahim longgar' }
    ]
}
