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
 * Generator komentar otomatis berdasarkan tren nilai
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

    // Sort current scores to find highest and lowest
    const sortedScores = [...currentScores].sort((a, b) => b.val - a.val)
    const bestAspect = sortedScores[0]
    const worstAspect = sortedScores[sortedScores.length - 1]

    // 2. Parse past history
    const history = (trendHistory || []).slice().sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month
    )
    
    // Get the immediate previous report
    const prevReport = history.length > 0 ? history[history.length - 1] : null
    
    let trendText = ''
    let progressHighlight = ''
    
    if (prevReport) {
        const prevScores = criteria.map(k => ({
            key: k.key,
            id: k.id,
            val: prevReport.scores?.[k.key] !== '' && prevReport.scores?.[k.key] !== null && prevReport.scores?.[k.key] !== undefined ? Number(prevReport.scores[k.key]) : null
        })).filter(k => k.val !== null)

        if (prevScores.length > 0) {
            const prevAvg = prevScores.reduce((a, b) => a + b.val, 0) / prevScores.length
            const prevAvgFormatted = prevAvg.toFixed(1)
            const deltaAvg = avg - prevAvg

            if (Math.abs(deltaAvg) > (rtObj.maxScore === 9 ? 0.1 : 1.0)) {
                if (deltaAvg > 0) {
                    trendText = `Alhamdulillah, rata-rata nilai mengalami kenaikan dari ${prevAvgFormatted} menjadi ${avgFormatted}.`
                } else {
                    trendText = `Rata-rata nilai bulan ini (${avgFormatted}) mengalami sedikit penurunan dari periode lalu (${prevAvgFormatted}).`
                }
            } else {
                trendText = `Perkembangan nilai rata-rata ananda stabil di angka ${avgFormatted} dibanding periode lalu.`
            }

            // Find aspect with highest improvement and aspect with highest decline
            let maxImprovement = { key: '', id: '', delta: -99 }
            let maxDecline = { key: '', id: '', delta: 99 }

            currentScores.forEach(curr => {
                const prev = prevScores.find(p => p.key === curr.key)
                if (prev) {
                    const diff = curr.val - prev.val
                    if (diff > 0 && diff > maxImprovement.delta) {
                        maxImprovement = { key: curr.key, id: curr.id, delta: diff }
                    }
                    if (diff < 0 && diff < maxDecline.delta) {
                        maxDecline = { key: curr.key, id: curr.id, delta: diff }
                    }
                }
            })

            if (maxImprovement.key && maxImprovement.delta > 0) {
                progressHighlight = `Peningkatan terbaik terlihat pada aspek ${maxImprovement.id} (+${maxImprovement.delta.toFixed(0)}).`
            } else if (maxDecline.key && maxDecline.delta < 0) {
                progressHighlight = `Mohon perhatian khusus pada aspek ${maxDecline.id} yang mengalami penurunan (-${Math.abs(maxDecline.delta).toFixed(0)}).`
            }
        }
    }

    // 3. Construct the comment parts
    const introParts = []
    const thresholdHigh = rtObj.maxScore === 9 ? 8.5 : 85
    const thresholdMedium = rtObj.maxScore === 9 ? 7.5 : 75
    const thresholdLow = rtObj.maxScore === 9 ? 6.0 : 60

    if (avg >= thresholdHigh) {
        introParts.push(`Masya Allah, ananda menunjukkan prestasi yang luar biasa periode ini dengan rata-rata ${avgFormatted}.`)
    } else if (avg >= thresholdMedium) {
        introParts.push(`Alhamdulillah, perkembangan ananda periode ini cukup baik dan memuaskan dengan rata-rata ${avgFormatted}.`)
    } else if (avg >= thresholdLow) {
        introParts.push(`Perkembangan ananda periode ini secara umum cukup stabil dengan rata-rata ${avgFormatted}.`)
    } else {
        introParts.push(`Perkembangan ananda periode ini masih memerlukan bimbingan lebih intensif (rata-rata ${avgFormatted}).`)
    }

    const aspectParts = []
    const aspectGoodThreshold = rtObj.maxScore === 9 ? 8 : 80
    const aspectNeedThreshold = rtObj.maxScore === 9 ? 7 : 70

    if (bestAspect.val >= aspectGoodThreshold) {
        aspectParts.push(`Ananda sangat unggul dalam aspek ${bestAspect.id} (Nilai: ${bestAspect.val}).`)
    }
    if (worstAspect.val < aspectNeedThreshold && worstAspect.key !== bestAspect.key) {
        aspectParts.push(`Perlu pendampingan lebih pada aspek ${worstAspect.id} (Nilai: ${worstAspect.val}) agar bisa lebih ditingkatkan.`)
    }

    const closingParts = []
    if (avg >= thresholdHigh) {
        closingParts.push(`Pertahankan prestasi ini dan semoga terus istiqomah. Barakallahu fiik.`)
    } else if (avg >= thresholdMedium) {
        closingParts.push(`Semoga periode depan ananda bisa meraih hasil yang lebih baik lagi. Tetap semangat.`)
    } else {
        closingParts.push(`Mohon kerja sama orang tua untuk turut mendampingi dan memotivasi ananda di rumah.`)
    }

    // Assembly
    const paragraph = [
        introParts[0],
        trendText,
        progressHighlight,
        aspectParts.join(' '),
        closingParts[0]
    ].filter(Boolean).join(' ')

    return paragraph
}
