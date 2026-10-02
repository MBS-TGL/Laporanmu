import { RAPORT_TYPES, getClassLevel, getGradePredicate } from './raportTypeRegistry'

/**
 * Validasi apakah semua kriteria nilai sudah terisi
 */
export const isComplete = (scores, criteria) => {
    if (!scores || !criteria) return false
    return criteria.every(k =>
        scores[k.key] !== '' &&
        scores[k.key] !== null &&
        scores[k.key] !== undefined
    )
}

/**
 * Format sel CSV untuk export
 */
export const escapeCsvCell = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Hitung Rata-Rata Secara Dinamis
 */
export const calcAvg = (scores, criteria) => {
    if (!scores || !criteria || !criteria.length) return null
    const vals = criteria
        .filter(k => !k.isPractical)
        .map(k => scores[k.key])
        .filter(v => v !== '' && v !== null && v !== undefined)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
}

/**
 * Membangun baris pesan WhatsApp
 */
export const buildWaLines = ({
    student, sc, extras, bulanObj, selectedYear, selectedSemester, selectedClass, musyrif, pdfUrl, waFooter, reportTypeId = 'bulanan'
}) => {
    const rtObj = RAPORT_TYPES[reportTypeId] || RAPORT_TYPES.bulanan
    const classLevel = getClassLevel(selectedClass)
    const criteria = rtObj.getCriteria(selectedClass)
    const avg = calcAvg(sc, criteria)
    const g = avg ? getGradePredicate(Number(avg), reportTypeId, classLevel) : null

    const periodStr = rtObj.periodType === 'monthly'
        ? `Bulanan ${bulanObj?.id_str || ''} ${selectedYear}`
        : `Semester ${Number(selectedSemester) === 1 ? '1 (Ganjil)' : '2 (Genap)'} T.A ${selectedYear}`

    const header = [
        `Assalamu'alaikum Wr. Wb.`,
        ``,
        `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*`,
        ``,
        `Berikut hasil *${rtObj.name} ${periodStr}*:`,
        `Kelas: *${selectedClass?.name || '—'}* | Musyrif: *${musyrif || '—'}*`,
        `\n━ ASPEK PENILAIAN`,
    ]

    const scoreLines = criteria.map(k => {
        const v = sc[k.key]
        const hasScore = v !== '' && v !== null && v !== undefined
        const gr = hasScore ? getGradePredicate(Number(v), reportTypeId, classLevel, k.key) : null
        return `- ${k.id}: *${hasScore ? v : '—'}*${gr ? ` (${gr.id || gr.label})` : ''}`
    })

    const avgLine = avg ? [
        `Rata-rata: *${avg}/${rtObj.maxScore}* — *${g?.id || g?.label || '—'}*`
    ] : []

    // Physical stats & Attendance
    const devLines = []
    if (extras && (rtObj.hasFisik || rtObj.hasAttendance)) {
        const hasFisik = rtObj.hasFisik && (extras.berat_badan || extras.tinggi_badan)
        const hasKehadiran = rtObj.hasAttendance && (extras.hari_sakit || extras.hari_izin || extras.hari_alpa || extras.hari_pulang)

        if (hasFisik || hasKehadiran) {
            devLines.push(`━ PERKEMBANGAN & KEHADIRAN`)

            if (hasFisik) {
                const parts = []
                if (extras.berat_badan) parts.push(`Berat: *${extras.berat_badan} kg*`)
                if (extras.tinggi_badan) parts.push(`Tinggi: *${extras.tinggi_badan} cm*`)
                devLines.push(`- Fisik: ${parts.join(' / ')}`)
            }

            if (hasKehadiran) {
                const parts = []
                if (extras.hari_sakit) parts.push(`Sakit: *${extras.hari_sakit} hari*`)
                if (extras.hari_izin) parts.push(`Izin: *${extras.hari_izin} hari*`)
                if (extras.hari_alpa) parts.push(`Alpa: *${extras.hari_alpa} hari*`)
                if (extras.hari_pulang) parts.push(`Pulang: *${extras.hari_pulang} kali*`)
                devLines.push(`- Kehadiran: ${parts.join(' / ') || 'Nihil'}`)
            }
        }
    }

    const catatanLine = []
    if (extras?.catatan && rtObj.hasCatatan) {
        catatanLine.push(`━ CATATAN MUSYRIF`)
        catatanLine.push(`_"${extras.catatan}"_`)
    }

    const pdfLine = pdfUrl ? [
        `\n━ UNDUH RAPORT PDF`,
        pdfUrl,
        `_Simpan PDF ini untuk arsip Bapak/Ibu._`
    ] : []

    const footer = [
        `\nWassalamu'alaikum Wr. Wb.`,
        `_${waFooter || 'Muhammadiyah Boarding School Tanggul · LaporanMu'}_`
    ]

    return [
        ...header,
        ...scoreLines,
        ...avgLine,
        ...devLines,
        ...catatanLine,
        ...pdfLine,
        ...footer
    ]
}

/**
 * Generator komentar otomatis berdasarkan tren nilai (Lebih Manusiawi, Ringkas & Alami)
 */
export const generateAutoComment = (sc, studentId = '', trendHistory = [], criteria = [], reportTypeId = 'bulanan', classLevel = 'SMP') => {
    if (!criteria || criteria.length === 0) return ''

    // 1. Parse current scores
    const currentScores = criteria.map(k => ({
        key: k.key,
        id: k.id,
        val: sc?.[k.key] !== '' && sc?.[k.key] !== null && sc?.[k.key] !== undefined ? Number(sc[k.key]) : null
    })).filter(k => k.val !== null)

    if (currentScores.length === 0) return ''

    const rtObj = RAPORT_TYPES[reportTypeId] || RAPORT_TYPES.bulanan
    const avg = currentScores.reduce((a, b) => a + b.val, 0) / currentScores.length
    const avgFormatted = avg.toFixed(1)

    // Sort current scores
    const sortedScores = [...currentScores].sort((a, b) => b.val - a.val)
    const bestAspect = sortedScores[0]
    const worstAspect = sortedScores[sortedScores.length - 1]

    // 2. Parse past history
    const history = (trendHistory || []).slice().sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month
    )
    const prevReport = history.length > 0 ? history[history.length - 1] : null

    let prevAvg = null
    let prevAvgFormatted = null
    let deltaAvg = 0
    let maxImprovement = null
    let maxDecline = null

    if (prevReport) {
        const prevScores = criteria.map(k => ({
            key: k.key,
            id: k.id,
            val: prevReport.scores?.[k.key] !== '' && prevReport.scores?.[k.key] !== null && prevReport.scores?.[k.key] !== undefined ? Number(prevReport.scores[k.key]) : null
        })).filter(k => k.val !== null)

        if (prevScores.length > 0) {
            prevAvg = prevScores.reduce((a, b) => a + b.val, 0) / prevScores.length
            prevAvgFormatted = prevAvg.toFixed(1)
            deltaAvg = avg - prevAvg

            let topImpDelta = 0
            let topDecDelta = 0

            currentScores.forEach(curr => {
                const prev = prevScores.find(p => p.key === curr.key)
                if (prev) {
                    const diff = curr.val - prev.val
                    if (diff > 0 && diff > topImpDelta) {
                        topImpDelta = diff
                        maxImprovement = { key: curr.key, id: curr.id, delta: diff }
                    }
                    if (diff < 0 && diff < topDecDelta) {
                        topDecDelta = diff
                        maxDecline = { key: curr.key, id: curr.id, delta: diff }
                    }
                }
            })
        }
    }

    // Thresholds
    const thresholdHigh = rtObj.maxScore === 9 ? 8.5 : 85
    const thresholdMedium = rtObj.maxScore === 9 ? 7.5 : 75
    const thresholdLow = rtObj.maxScore === 9 ? 6.0 : 60
    const aspectGoodThreshold = rtObj.maxScore === 9 ? 8 : 80
    const aspectNeedThreshold = rtObj.maxScore === 9 ? 7 : 70

    // Sentence 1: Pembuka + Capaian & Tren Rata-Rata (Menyatu secara alami tanpa pengulangan angka)
    let sentence1 = ''
    const hasSignificantTrend = prevAvg !== null && Math.abs(deltaAvg) >= (rtObj.maxScore === 9 ? 0.1 : 1.0)

    if (avg >= thresholdHigh) {
        if (hasSignificantTrend && deltaAvg > 0) {
            sentence1 = `Masya Allah, capaian ananda meningkat sangat baik periode ini hingga meraih rata-rata ${avgFormatted} (sebelumnya ${prevAvgFormatted}).`
        } else if (hasSignificantTrend && deltaAvg < 0) {
            sentence1 = `Masya Allah, ananda menunjukkan hasil yang sangat baik dengan rata-rata ${avgFormatted}, meski ada sedikit penurunan dibanding bulan lalu (${prevAvgFormatted}).`
        } else if (prevAvg !== null) {
            sentence1 = `Masya Allah, ananda terus mempertahankan prestasi yang luar biasa periode ini dengan rata-rata ${avgFormatted}.`
        } else {
            sentence1 = `Masya Allah, ananda menunjukkan prestasi yang sangat memuaskan periode ini dengan rata-rata ${avgFormatted}.`
        }
    } else if (avg >= thresholdMedium) {
        if (hasSignificantTrend && deltaAvg > 0) {
            sentence1 = `Alhamdulillah, perkembangan nilai ananda membaik periode ini dengan peningkatan rata-rata menjadi ${avgFormatted} (sebelumnya ${prevAvgFormatted}).`
        } else if (hasSignificantTrend && deltaAvg < 0) {
            sentence1 = `Alhamdulillah, capaian ananda periode ini cukup baik dengan rata-rata ${avgFormatted}, walau ada sedikit penurunan dari bulan lalu (${prevAvgFormatted}).`
        } else if (prevAvg !== null) {
            sentence1 = `Alhamdulillah, perkembangan nilai ananda cukup stabil dan memuaskan dengan rata-rata ${avgFormatted}.`
        } else {
            sentence1 = `Alhamdulillah, perkembangan ananda periode ini cukup baik dan memuaskan dengan rata-rata ${avgFormatted}.`
        }
    } else if (avg >= thresholdLow) {
        if (hasSignificantTrend && deltaAvg < 0) {
            sentence1 = `Capaian ananda periode ini rata-rata ${avgFormatted}, mengalami penurunan dari bulan lalu (${prevAvgFormatted}).`
        } else {
            sentence1 = `Alhamdulillah, capaian ananda periode ini secara umum cukup stabil di rata-rata ${avgFormatted}.`
        }
    } else {
        sentence1 = `Capaian ananda periode ini meraih rata-rata ${avgFormatted} dan memerlukan bimbingan lebih intensif.`
    }

    // Sentence 2: Sorotan Aspek (Keunggulan & Area Perhatian digabung secara mengalir tanpa format angka mentah)
    let sentence2 = ''
    const hasBest = bestAspect && bestAspect.val >= aspectGoodThreshold
    const hasNeedsWork = worstAspect && worstAspect.val < aspectNeedThreshold && worstAspect.key !== bestAspect?.key

    if (maxDecline && hasBest) {
        sentence2 = `Ananda sangat menonjol di aspek ${bestAspect.id}, namun perlu perhatian lebih pada aspek ${maxDecline.id} yang mengalami penurunan.`
    } else if (maxImprovement && hasNeedsWork) {
        sentence2 = `Peningkatan terbaik terlihat pada aspek ${maxImprovement.id}, sementara aspek ${worstAspect.id} masih perlu pendampingan lebih.`
    } else if (hasBest && hasNeedsWork) {
        sentence2 = `Ananda sangat baik pada aspek ${bestAspect.id}, namun aspek ${worstAspect.id} masih perlu ditingkatkan lagi.`
    } else if (hasBest) {
        sentence2 = `Keunggulan ananda terlihat sangat menonjol pada aspek ${bestAspect.id}.`
    } else if (maxDecline) {
        sentence2 = `Mohon perhatian khusus pada aspek ${maxDecline.id} yang sedikit mengalami penurunan.`
    } else if (hasNeedsWork) {
        sentence2 = `Perlu pendampingan lebih pada aspek ${worstAspect.id} agar hasilnya bisa lebih optimal.`
    }

    // Sentence 3: Penutup & Motivasi
    let sentence3 = ''
    if (avg >= thresholdHigh) {
        sentence3 = `Semoga terus konsisten dan istiqamah. Barakallahu fiik.`
    } else if (avg >= thresholdMedium) {
        sentence3 = `Semoga di periode berikutnya ananda dapat meraih hasil yang lebih optimal.`
    } else {
        sentence3 = `Mohon dukungan dan bimbingan Bapak/Ibu di rumah agar ananda semakin bersemangat.`
    }

    return [sentence1, sentence2, sentence3].filter(Boolean).join(' ')
}

const HALAMAN_PER_JUZ = 20
const HALAMAN_PER_LEMBAR = 2

const parseMixedNumber = (raw) => {
    const s = String(raw).trim().replace(',', '.')
    const mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
    if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
    const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (frac) return Number(frac[1]) / Number(frac[2])
    const n = Number(s)
    return Number.isFinite(n) ? n : null
}

/**
 * Ubah catatan hafalan (1 Juz, 1/2 Halaman, 2 Lembar, angka) ke satuan halaman
 * agar bisa diurutkan. Nilai kualitatif (Lancar, Juz 30, Bab 1) mengembalikan null.
 */
export const parseHafalanToHalaman = (raw) => {
    if (raw === null || raw === undefined) return null
    const s = String(raw).trim()
    if (!s) return null
    if (/^(lancar|mutqin|cukup lancar|bab\b)/i.test(s)) return null
    if (/^juz\s*\d+/i.test(s)) return null

    const unitMatch = s.match(/^(.*?)\s*(juz|halaman|hlm|lembar|lbr)\s*$/i)
    if (unitMatch) {
        const qty = parseMixedNumber(unitMatch[1])
        if (qty == null) return null
        const unit = unitMatch[2].toLowerCase()
        if (unit.startsWith('juz')) return qty * HALAMAN_PER_JUZ
        if (unit.startsWith('lem') || unit.startsWith('lbr')) return qty * HALAMAN_PER_LEMBAR
        return qty
    }

    return parseMixedNumber(s)
}

export const hafalanRankScore = (ex = {}) => {
    const total = parseHafalanToHalaman(ex.total_hafalan)
    const ziy = parseHafalanToHalaman(ex.ziyadah)
    const mur = parseHafalanToHalaman(ex.murojaah)
    if (total != null) return total
    if (ziy != null && mur != null) return ziy + mur
    if (ziy != null) return ziy
    if (mur != null) return mur
    return null
}

export const hafalanDisplay = (ex = {}) => {
    const total = String(ex.total_hafalan || '').trim()
    const ziy = String(ex.ziyadah || '').trim()
    const mur = String(ex.murojaah || '').trim()
    if (total) return total
    if (ziy && mur) return `Z ${ziy} · M ${mur}`
    if (ziy) return ziy
    if (mur) return mur
    return ''
}

