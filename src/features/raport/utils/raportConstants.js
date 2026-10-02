import {
    Star, Heart, Brush, BookOpen, Languages,
    Scale, Ruler, HeartPulse, AlertCircle,
    AlertTriangle, DoorOpen, FileText, Compass, Award
} from 'lucide-react'

export const MAX_SCORE = 9
export const STORAGE_BUCKET = 'raport-mbs'

export const LIST_KAMAR = [
    { id: 'Fachruddin', ar: 'فخر الدين', capacity: 30 },
    { id: 'Ibrahim', ar: 'إبراهيم', capacity: 30 },
    { id: 'Ahmad Dahlan', ar: 'أحمد دحلان', capacity: 30 },
    { id: 'Mas Mansyur', ar: 'ماس منصور', capacity: 30 },
    { id: 'Buya Hamka', ar: 'بويا هامكا', capacity: 30 }
]

export const toArabicNum = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

export const BULAN = [
    { id: 1, ar: 'يناير', id_str: 'Januari' },
    { id: 2, ar: 'فبراير', id_str: 'Februari' },
    { id: 3, ar: 'مارس', id_str: 'Maret' },
    { id: 4, ar: 'أبريل', id_str: 'April' },
    { id: 5, ar: 'مايو', id_str: 'Mei' },
    { id: 6, ar: 'يونيو', id_str: 'Juni' },
    { id: 7, ar: 'يوليو', id_str: 'Juli' },
    { id: 8, ar: 'أغسطس', id_str: 'Agustus' },
    { id: 9, ar: 'سبتمبر', id_str: 'September' },
    { id: 10, ar: 'أكتوبر', id_str: 'Oktober' },
    { id: 11, ar: 'نوفمبر', id_str: 'November' },
    { id: 12, ar: 'ديسمبر', id_str: 'Desember' },
]

export const CATATAN_TEMPLATES = [
    'Alhamdulillah perkembangannya sangat baik bulan ini.',
    'Perlu perhatian lebih pada aspek kedisiplinan.',
    'Konsisten dan terus meningkat, pertahankan.',
    'Mohon dukungan orang tua untuk hafalan di rumah.',
    'Ada peningkatan signifikan dibanding bulan lalu.',
    'Perlu bimbingan lebih intensif untuk Al-Qur\'an.',
    'Akhlak dan ibadah sangat baik, tingkatkan bahasa.',
    'Kesehatan kurang baik bulan ini, semoga lekas pulih.',
]

export const LABEL = {
    ar: {
        studentName: 'اسم الطالب', room: 'الغرفة', class: 'الفصل', year: 'العام الدراسي',
        subject: 'جوانب التقييم', score: 'النقاط',
        grade: 'التقدير', num: 'الرقم', weight: 'وزن البدن', height: 'طول البدن',
        ziyadah: 'الزيادة', murojaah: 'المراجعة', totalHafalan: 'المحفوظات', sick: 'للمرض', home: 'للرجوع',
        izin: 'الإذن', alpa: 'بلا إذن', gradeScale: 'نظام التقدير',
        musyrif: 'مربي الفصل', guardian: 'ولي الأمر',
        reportTitle: 'نتيجة الشخصية', month: 'شهر',
    },
    id: {
        studentName: 'Nama Santri', room: 'Kamar', class: 'Kelas', year: 'Tahun Ajaran',
        subject: 'Aspek Penilaian', score: 'Nilai',
        grade: 'Predikat', num: 'No', weight: 'Berat Badan', height: 'Tinggi Badan',
        ziyadah: 'Ziyadah', murojaah: "Muroja'ah", totalHafalan: 'Hafalan', sick: 'Sakit', home: 'Pulang',
        izin: 'Izin', alpa: 'Alpa', gradeScale: 'Skala Penilaian',
        musyrif: 'Wali Kelas', guardian: 'Wali Santri',
        reportTitle: 'RAPORT BULANAN', month: 'Bulan',
    }
}

export const KRITERIA = [
    { key: 'nilai_akhlak', id: 'Akhlak', ar: 'الأخلاق', arShort: 'الأخلاق', icon: Star, color: '#f59e0b' },
    { key: 'nilai_ibadah', id: 'Ibadah', ar: 'العبادة', arShort: 'العبادة', icon: Heart, color: '#6366f1' },
    { key: 'nilai_kebersihan', id: 'Kebersihan', ar: 'النظافة', arShort: 'النظافة', icon: Brush, color: '#06b6d4' },
    { key: 'nilai_quran', id: "Al-Qur'an", ar: 'تحسين القراءة وحفظ القرآن', arShort: 'القرآن', icon: BookOpen, color: '#10b981' },
    { key: 'nilai_bahasa', id: 'Bahasa', ar: 'اللغة', arShort: 'اللغة', icon: Languages, color: '#8b5cf6' },
]

export const FISIK_FIELDS = [
    { key: 'berat_badan', label: 'BB', fullLabel: 'Berat Badan', icon: Scale, color: '#6366f1', unit: 'kg' },
    { key: 'tinggi_badan', label: 'TB', fullLabel: 'Tinggi Badan', icon: Ruler, color: '#06b6d4', unit: 'cm' },
    { key: 'hari_sakit', label: 'Skt', fullLabel: 'Hari Sakit', icon: HeartPulse, color: '#ef4444', unit: 'hr' },
    { key: 'hari_izin', label: 'Izin', fullLabel: 'Hari Izin', icon: AlertCircle, color: '#f59e0b', unit: 'hr' },
    { key: 'hari_alpa', label: 'Alpa', fullLabel: 'Hari Alpa', icon: AlertTriangle, color: '#ef4444', unit: 'hr' },
    { key: 'hari_pulang', label: 'Plg', fullLabel: 'Hari Pulang', icon: DoorOpen, color: '#8b5cf6', unit: 'x' },
]

export const HAFALAN_FIELDS = [
    { key: 'ziyadah', ph: 'Ziyadah', icon: BookOpen, color: '#10b981' },
    { key: 'murojaah', ph: "Muroja'ah", icon: FileText, color: '#8b5cf6' },
    { key: 'total_hafalan', ph: 'Hafalan', icon: Award, color: '#3b82f6' },
]

export const GRADE = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'ممتاز', id: 'Sangat Baik', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000' }
    if (num >= 8) return { label: 'جيد جدا', id: 'Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000' }
    if (num >= 6) return { label: 'جيد', id: 'Cukup', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000' }
    if (num >= 4) return { label: 'مقبول', id: 'Kurang', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000' }
    return { label: 'راسب', id: 'Kurang Baik', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444' }
}

export const calcAvg = (scores) => {
    const vals = KRITERIA.map(k => scores[k.key]).filter(v => v !== '' && v !== null && v !== undefined)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
}

export const HAFALAN_PRESETS = {
    ziyadah: [
        '1/2 Halaman',
        '1 Halaman',
        '1 Lembar',
        '2 Lembar',
        '3 Halaman',
        '5 Halaman',
        '10 Halaman',
        '1/2 Juz',
        '1 Juz',
        '1 1/2 Juz',
        '2 Juz',
        '3 Juz'
    ],
    murojaah: [
        '1/2 Halaman',
        '1 Halaman',
        '1 Lembar',
        '2 Lembar',
        '1/2 Juz',
        '1 Juz',
        '1 1/2 Juz',
        '2 Juz',
        '3 Juz',
        '5 Juz',
        '10 Juz',
        '15 Juz',
        '30 Juz'
    ],
    total_hafalan: [
        '1/2 Juz',
        '1 Juz',
        '1 1/2 Juz',
        '2 Juz',
        '3 Juz',
        '5 Juz',
        '10 Juz',
        '15 Juz',
        '20 Juz',
        '30 Juz',
        'Juz 30',
        'Juz 29',
        'Bab 1',
        'Bab 2',
        'Bab 3',
        'Bab 1-3',
        'Bab 1-5',
        'Lancar',
        'Mutqin',
        'Cukup Lancar'
    ]
}

// ─── Report Labels (Bisa Di-Override Via Settings) ────────────────────────────
// Default values — gunakan getReportLabels(settings) untuk merge dengan settings
export const DEFAULT_REPORT_LABELS = {
    // Section Headers
    section_physical: { id: 'PERKEMBANGAN FISIK', ar: 'التطور البدني' },
    section_hafalan: { id: 'PERKEMBANGAN HAFALAN', ar: 'تطور الحفظ' },
    section_attendance: { id: 'ABSENSI', ar: 'الغياب' },

    // Catatan
    catatan_label: { id: 'Catatan Wali Kelas', ar: 'ملاحظة' },

    // Total & Rata-rata
    total_label: { id: 'Jumlah Total', ar: 'المجموع الإجمالي' },
    avg_label: { id: 'Nilai Rata-Rata', ar: 'المعدل' },

    // KKM
    kkm_label: { id: 'KKM', ar: 'KKM' },

    // Ujian
    ujian_lisan_title: { id: 'Ujian Lisan', ar: 'الاختبار الشفهي' },
    ujian_pondok_title: { id: 'Ujian Mapel Pondok', ar: 'الاختبار للدراسة الإسلامية' },
    ujian_lisan_report: { id: 'Hasil Ujian Lisan', ar: 'نتيجة الإختبار الشفهي' },
    ujian_pondok_report: { id: 'Hasil Ujian Akhir', ar: 'نتيجة الاختبار النهائي' },

    // Semester
    semester_ganjil: { id: 'Ganjil', ar: 'الأول' },
    semester_genap: { id: 'Genap', ar: 'الثاني' },
    period_prefix_lisan: { id: 'Akhir Tahun Semester', ar: 'لآخر السنة للفصل الدراسي' },
    period_prefix_pondok: { id: 'Semester', ar: 'للفصل الدراسي' },
    period_prefix_general: { id: 'Semester', ar: 'الفصل الدراسي' },

    // Praktek Ibadah
    praktek_ibadah: { id: 'Praktek Ibadah', ar: 'الاختبار التطبيقي' },

    // Unit
    unit_day: { id: 'hari', ar: 'يَوْم' },

    // QR & Verifikasi
    portal_label: { id: 'LaporanMu Academic Portal', ar: 'بوابة LaporanMu الأكاديمية' },
    qr_instruction: { id: 'Pindai QR untuk verifikasi keaslian raport', ar: 'امسح الرمز للتحقق من صحة التقرير' },
    report_no_label: { id: 'No. Raport: ', ar: 'رقم التقرير: ' },
    print_time_label: { id: 'Waktu Cetak: ', ar: 'تاريخ الطباعة: ' },

    // Student Info
    student_name_label: { id: 'Nama Santri', ar: 'اسم الطالب' },
    student_no_label: { id: 'No. Absen', ar: 'رقم الطالب' },

    // Grading Scale Labels
    grade_istimewa: 'Sangat Baik',
    grade_sangat_baik: 'Baik',
    grade_baik: 'Cukup',
    grade_cukup: 'Kurang',
    grade_kurang: 'Kurang Baik',
    grade_gagal: 'Sangat Kurang',

    // Report Number Prefix
    report_number_prefix: 'RPT',

    // Behavior & Sholat Labels
    section_perilaku: { id: 'Catatan Perilaku', ar: 'ملاحظات السلوك' },
    pelanggaran_label: { id: 'Pelanggaran', ar: 'المخالفات' },
    prestasi_label: { id: 'Prestasi', ar: 'الإنجازات' },
    sholat_label: { id: 'Sholat', ar: 'الصلاة' },
}

/**
 * Merge default labels dengan custom labels dari settings
 * @param {Object} settings - school settings dari context
 * @returns {Object} merged labels
 */
export const getReportLabels = (settings = {}) => {
    const custom = settings.report_labels || {}
    const merged = {}
    for (const [key, defaultValue] of Object.entries(DEFAULT_REPORT_LABELS)) {
        merged[key] = custom[key] !== undefined ? custom[key] : defaultValue
    }
    return merged
}
