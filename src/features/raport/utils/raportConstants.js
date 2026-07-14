import {
    Star, Heart, Brush, BookOpen, Languages,
    Scale, Ruler, HeartPulse, AlertCircle,
    AlertTriangle, DoorOpen, FileText
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
        ziyadah: 'الزيادة', murojaah: 'المراجعة', sick: 'للمرض', home: 'للرجوع',
        izin: 'الإذن', alpa: 'بلا إذن', gradeScale: 'نظام التقدير',
        musyrif: 'مربي الفصل', guardian: 'ولي الأمر',
        reportTitle: 'نتيجة الشخصية', month: 'شهر',
    },
    id: {
        studentName: 'Nama Santri', room: 'Kamar', class: 'Kelas', year: 'Tahun Ajaran',
        subject: 'Aspek Penilaian', score: 'Nilai',
        grade: 'Predikat', num: 'No', weight: 'Berat Badan', height: 'Tinggi Badan',
        ziyadah: 'Ziyadah', murojaah: "Muroja'ah", sick: 'Sakit', home: 'Pulang',
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
]

export const GRADE = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'ممتاز', id: 'Istimewa', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000' }
    if (num >= 8) return { label: 'جيد جدا', id: 'Sangat Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000' }
    if (num >= 6) return { label: 'جيد', id: 'Baik', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000' }
    if (num >= 4) return { label: 'مقبول', id: 'Cukup', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000' }
    return { label: 'راسب', id: 'Kurang', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444' }
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
        '2 Halaman',
        '3 Halaman',
        '5 Halaman',
        '7 Halaman',
        '10 Halaman',
        '1 Juz',
        '2 Juz'
    ],
    murojaah: [
        '1/2 Juz',
        '1 Juz',
        '2 Juz',
        '3 Juz',
        '5 Juz',
        '10 Juz',
        '15 Juz',
        '30 Juz'
    ]
}
