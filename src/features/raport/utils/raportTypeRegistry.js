import {
    Star, Heart, Brush, BookOpen, Languages,
    Scale, Ruler, HeartPulse, AlertCircle,
    AlertTriangle, DoorOpen, FileText, Mic,
    MessageSquare, PenTool, BookOpenCheck, Bookmark,
    Scale as ScaleIcon, Landmark, Compass, Award,
    Calculator, Binary, Globe, FileDigit, Trophy, Music
} from 'lucide-react'

import {
    KRITERIA as KRITERIA_BULANAN,
    FISIK_FIELDS,
    HAFALAN_FIELDS,
    GRADE as GRADE_BULANAN
} from './raportConstants'

// 1. Kriteria Pondok Lisan SMP & SMA
export const KRITERIA_PONDOK_LISAN_SMP = [
    { key: 'doa', id: 'Doa Harian', ar: 'الدعاء اليومي', icon: Heart, color: '#ef4444' },
    { key: 'wafa', id: 'Wafa', ar: 'تلاوة القرآن', icon: BookOpen, color: '#10b981' },
    { key: 'h_arbain', id: 'Hadits Arbain', ar: 'حديث الأربعين النووي', icon: Award, color: '#f59e0b' },
    { key: 'h_biru', id: 'Hadits Pilihan', ar: 'الحديث اليومي', icon: Bookmark, color: '#6366f1' },
    { key: 'd_sholat', id: 'Doa Sholat', ar: 'الذكر والدعاء بعد الصلاة', icon: Compass, color: '#06b6d4' },
    { key: 'pagi_petang', id: 'Pagi Petang', ar: 'ذكر الصباح والمساء', icon: Star, color: '#f59e0b' },
    { key: 'juz_30', id: 'Juz 30', ar: 'تحفيظ القرآن الكريم جزء ٣٠', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_29', id: 'Juz 29', ar: 'تحفيظ القرآن الكريم جزء ٢٩', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_28', id: 'Juz 28', ar: 'تحفيظ القرآن الكريم جزء ٢٨', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_27', id: 'Juz 27', ar: 'تحفيظ القرآن الكريم جزء ٢٧', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_26', id: 'Juz 26', ar: 'تحفيظ القرآن الكريم جزء ٢٦', icon: FileText, color: '#8b5cf6' },
    { key: 'praktek', id: 'Praktek Ibadah', ar: 'الاختبار التطبيقي', icon: HeartPulse, color: '#10b981', isPractical: true }
]

export const KRITERIA_PONDOK_LISAN_SMA = [
    { key: 'doa', id: 'Doa Harian', ar: 'الدعاء اليومي', icon: Heart, color: '#ef4444' },
    { key: 'wafa', id: 'Wafa', ar: 'تلاوة القرآن', icon: BookOpen, color: '#10b981' },
    { key: 'h_arbain', id: 'Hadits Arbain', ar: 'حديث الأربعين النووي', icon: Award, color: '#f59e0b' },
    { key: 'h_biru', id: 'Hadits Pilihan', ar: 'الحديث اليومي', icon: Bookmark, color: '#6366f1' },
    { key: 'd_sholat', id: 'Doa Sholat', ar: 'الذكر والدعاء setelah Sholat', icon: Compass, color: '#06b6d4' },
    { key: 'pagi_petang', id: 'Pagi Petang', ar: 'ذكر الصباح والمساء', icon: Star, color: '#f59e0b' },
    { key: 'juz_30', id: 'Juz 30', ar: 'تحفيظ القرآن الكريم جزء ٣٠', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_29', id: 'Juz 29', ar: 'تحفيظ القرآن الكريم جزء ٢٩', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_28', id: 'Juz 28', ar: 'تحفيظ القرآن الكريم جزء ٢٨', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_27', id: 'Juz 27', ar: 'تحفيظ القرآن الكريم جزء ٢٧', icon: FileText, color: '#8b5cf6' },
    { key: 'juz_26', id: 'Juz 26', ar: 'تحفيظ القرآن الكريم جزء ٢٦', icon: FileText, color: '#8b5cf6' }
]

// 2. Kriteria Pondok Mapel - SMP
export const KRITERIA_PONDOK_MAPEL_SMP = [
    { key: 'aqidah', id: 'Aqidah', ar: 'العقيدة', icon: ShieldAlertIconFallback(), color: '#6366f1' },
    { key: 'akhlaq', id: 'Akhlaq', ar: 'الأخلاق', icon: Star, color: '#f59e0b' },
    { key: 'b_arab', id: 'B. Arab', ar: 'اللغة العربية', icon: Languages, color: '#8b5cf6' },
    { key: 'fiqih', id: 'Fiqih', ar: 'الفقه', icon: BookOpenCheck, color: '#10b981' },
    { key: 'quran', id: 'Quran', ar: 'القرآن', icon: BookOpen, color: '#06b6d4' },
    { key: 'hadits', id: 'Hadits', ar: 'الحديث', icon: Award, color: '#ec4899' },
    { key: 'nahwu', id: 'Nahwu (Al-Qawaid)', ar: 'القواعد', icon: ScaleIcon, color: '#f97316' },
    { key: 'shorof', id: 'Shorof', ar: 'الصرف', icon: FileDigit, color: '#14b8a6' },
    { key: 'tarikh', id: 'Tarikh', ar: 'التاريخ الإسلامي', icon: Landmark, color: '#3b82f6' },
]

// 3. Kriteria Pondok Mapel - SMA
export const KRITERIA_PONDOK_MAPEL_SMA = [
    { key: 'aqidah', id: 'Aqidah', ar: 'العقيدة', icon: ShieldAlertIconFallback(), color: '#6366f1' },
    { key: 'akhlaq', id: 'Akhlaq', ar: 'الأخلاق', icon: Star, color: '#f59e0b' },
    { key: 'tarjih', id: 'Tarjih', ar: 'الترجيح', icon: Compass, color: '#f97316' },
    { key: 'fiqih', id: 'Fiqih', ar: 'الفقه', icon: BookOpenCheck, color: '#10b981' },
    { key: 'u_quran', id: "Ulumul Qur'an", ar: 'علوم القرآن', icon: BookOpen, color: '#06b6d4' },
    { key: 'hadits', id: 'Hadits', ar: 'الحديث', icon: Award, color: '#ec4899' },
    { key: 'qawaid', id: 'Qawaid (Nahwu-Shorof)', ar: 'القواعد', icon: ScaleIcon, color: '#8b5cf6' },
    { key: 'imla', id: "Imla'", ar: 'الإملاء', icon: PenTool, color: '#14b8a6' },
]

// 4. Kriteria Umum (Sekolah Formal)
export const KRITERIA_UMUM = [
    { key: 'matematika', id: 'Matematika', icon: Calculator, color: '#ef4444' },
    { key: 'ipa', id: 'IPA (Sains)', icon: Binary, color: '#10b981' },
    { key: 'ips', id: 'IPS', icon: Globe, color: '#3b82f6' },
    { key: 'bahasa_indonesia', id: 'B. Indonesia', icon: FileText, color: '#8b5cf6' },
    { key: 'bahasa_inggris', id: 'B. Inggris', icon: Languages, color: '#f59e0b' },
    { key: 'pkn', id: 'PKn / Pancasila', icon: ShieldAlertIconFallback(), color: '#ef4444' },
    { key: 'pai', id: 'PAI', icon: BookOpenCheck, color: '#10b981' },
    { key: 'seni_budaya', id: 'Seni Budaya', icon: Music, color: '#ec4899' },
    { key: 'pjok', id: 'PJOK', icon: Trophy, color: '#06b6d4' },
]

function ShieldAlertIconFallback() {
    return Landmark; // reuse standard Lucide icon
}

// Helper to determine if a class is SMP or SMA
export const getClassLevel = (classObj) => {
    if (!classObj) return 'SMP'
    const name = (typeof classObj === 'string' ? classObj : (classObj.name || '')).toLowerCase()
    const grade = typeof classObj === 'string' ? '' : String(classObj.grade || '')

    // SMA indicators
    if (grade === '10' || grade === '11' || grade === '12' ||
        grade.includes('X') || grade.includes('XI') || grade.includes('XII')) {
        return 'SMA'
    }
    if (name.includes('sma') || name.includes('aliyah') || name.includes('ma ') || name.endsWith(' ma') || name.includes('aliyah') || name.includes(' ulya')) {
        return 'SMA'
    }

    return 'SMP'
}

// Dynamic Predicate Grading Systems
export const getGradePredicate = (score, reportTypeId, classLevel = 'SMP', criterionKey = '') => {
    const val = Number(score)
    if (isNaN(val)) return { label: '—', id: '—', color: '#6b7280' }

    if (reportTypeId === 'bulanan') {
        return GRADE_BULANAN(val)
    }

    if (reportTypeId === 'umum') {
        // Standard Indonesian grade system (A, B, C, D)
        if (val >= 90) return { label: 'أ / A', id: 'Sangat Baik', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000', letter: 'A' }
        if (val >= 80) return { label: 'ب / B', id: 'Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000', letter: 'B' }
        if (val >= 70) return { label: 'ج / C', id: 'Cukup', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000', letter: 'C' }
        return { label: 'د / D', id: 'Kurang', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444', letter: 'D' }
    }

    // Special Practical grading for SMP Lisan
    if (reportTypeId === 'pondok_lisan' && criterionKey === 'praktek') {
        if (val >= 90) return { label: 'أ', id: 'A', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000', letter: 'أ' }
        if (val >= 80) return { label: 'ب', id: 'B', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000', letter: 'ب' }
        return { label: 'ج', id: 'C', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000', letter: 'ج' }
    }

    // Pondok Lisan or Pondok Mapel
    if (classLevel === 'SMA') {
        // SMA grading: KKM 50. Below 50 is weak/poor (ضعيف)
        if (val >= 90) return { label: 'ممتاز', id: 'Istimewa', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000', letter: 'أ' }
        if (val >= 80) return { label: 'جيد جدا', id: 'Sangat Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000', letter: 'ب' }
        if (val >= 60) return { label: 'جيد', id: 'Baik', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000', letter: 'ج' }
        if (val >= 50) return { label: 'مقبول', id: 'Cukup', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000', letter: 'د' }
        return { label: 'ضعيف', id: 'Kurang', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444', letter: 'هـ' }
    } else {
        // SMP grading: Below 50 is failed (راsb)
        if (val >= 90) return { label: 'ممتاز', id: 'Istimewa', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000', letter: 'أ' }
        if (val >= 80) return { label: 'جيد جدا', id: 'Sangat Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000', letter: 'ب' }
        if (val >= 60) return { label: 'جيد', id: 'Baik', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000', letter: 'ج' }
        if (val >= 50) return { label: 'مقبول', id: 'Cukup', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000', letter: 'د' }
        return { label: 'راسب', id: 'Gagal', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444', letter: 'هـ' }
    }
}

// Central Registry containing metadata, DB target table, and configurations for each report type
export const RAPORT_TYPES = {
    bulanan: {
        id: 'bulanan',
        name: 'Raport Bulanan',
        arName: 'نتيجة الشخصية الشهرية',
        icon: 'Calendar',
        color: 'indigo',
        periodType: 'monthly', // 'monthly' | 'semester'
        dbTable: 'student_monthly_reports',
        defaultLang: 'ar',
        maxScore: 9,
        getCriteria: () => KRITERIA_BULANAN,
        hasFisik: true,
        hasHafalan: true,
        hasAttendance: true,
        hasCatatan: true,
    },
    pondok_lisan: {
        id: 'pondok_lisan',
        name: 'Raport Pondok (Lisan)',
        arName: 'نتيجة الامتحان الشفهي',
        icon: 'Mic',
        color: 'emerald',
        periodType: 'semester',
        dbTable: 'student_semester_reports',
        defaultLang: 'ar',
        maxScore: 100,
        getCriteria: (classObj) => {
            const level = getClassLevel(classObj)
            return level === 'SMA' ? KRITERIA_PONDOK_LISAN_SMA : KRITERIA_PONDOK_LISAN_SMP
        },
        hasFisik: false,
        hasHafalan: false,
        hasAttendance: false,
        hasCatatan: true,
    },
    pondok_mapel: {
        id: 'pondok_mapel',
        name: 'Raport Pondok (Mapel)',
        arName: 'نتيجة المواد الدراسية',
        icon: 'BookOpen',
        color: 'amber',
        periodType: 'semester',
        dbTable: 'student_semester_reports',
        defaultLang: 'ar',
        maxScore: 100,
        getCriteria: (classObj) => {
            const level = getClassLevel(classObj)
            return level === 'SMA' ? KRITERIA_PONDOK_MAPEL_SMA : KRITERIA_PONDOK_MAPEL_SMP
        },
        hasFisik: true,
        hasHafalan: false,
        hasAttendance: true,
        hasCatatan: true,
    },
    umum: {
        id: 'umum',
        name: 'Raport Umum',
        arName: 'التقرير العام',
        icon: 'Award',
        color: 'sky',
        periodType: 'semester',
        dbTable: 'student_semester_reports',
        defaultLang: 'id',
        maxScore: 100,
        getCriteria: () => KRITERIA_UMUM,
        hasFisik: true,
        hasHafalan: false,
        hasAttendance: true,
        hasCatatan: true,
    }
}
