import React, { memo, useEffect } from 'react'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@features/raport/utils/raportTypeRegistry'
import { calcAvg } from '@features/raport/utils/raportHelpers'
import { RAPORT_SERIF } from '@features/raport/utils/raportFonts'

// ─── Constants ──────────────────────────────────────────────────────

const PRED_COLORS = {
    'Sangat Baik': '#10b981',
    'Baik': '#3b82f6',
    'Cukup': '#6366f1',
    'Kurang': '#f59e0b',
    'Kurang Baik': '#ef4444',
}

// ─── Helper Components ──────────────────────────────────────────────

const TrophyRankBadge = ({ rank, idx }) => {
    if (rank === 1) {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2.5,
                padding: '1px 5px', borderRadius: 4,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff', fontSize: '6.8pt', fontWeight: 900,
                boxShadow: '0 1px 2px rgba(217,119,6,0.25)',
                lineHeight: 1.2, minWidth: 22, border: '1px solid #f59e0b',
            }} title="Juara 1 Kelas">
                <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
                </svg>
                1
            </span>
        )
    }
    if (rank === 2) {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2.5,
                padding: '1px 5px', borderRadius: 4,
                background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                color: '#fff', fontSize: '6.8pt', fontWeight: 900,
                boxShadow: '0 1px 2px rgba(100,116,139,0.2)',
                lineHeight: 1.2, minWidth: 22, border: '1px solid #94a3b8',
            }} title="Juara 2 Kelas">
                <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                2
            </span>
        )
    }
    if (rank === 3) {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2.5,
                padding: '1px 5px', borderRadius: 4,
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#fff', fontSize: '6.8pt', fontWeight: 900,
                boxShadow: '0 1px 2px rgba(180,83,9,0.2)',
                lineHeight: 1.2, minWidth: 22, border: '1px solid #d97706',
            }} title="Juara 3 Kelas">
                <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                3
            </span>
        )
    }
    return <span style={{ color: '#64748b', fontWeight: 500 }}>{idx}</span>
}

const PredBadge = ({ label, color }) => (
    <span style={{
        display: 'inline-block', padding: '2px 7px', borderRadius: 4,
        fontSize: '7.5pt', fontWeight: 700, lineHeight: 1.3,
        background: color, color: '#fff',
        whiteSpace: 'nowrap', letterSpacing: '0.2px',
    }}>{label}</span>
)

const PelanggaranBadges = ({ text }) => {
    if (!text || !text.trim()) return <span style={{ color: '#a3a3a3', fontSize: '7.5pt' }}>—</span>
    const items = text.split(',').map(s => s.trim()).filter(Boolean)
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {items.map((item, i) => (
                <span key={i} style={{
                    display: 'inline-block', padding: '0.5px 4px', borderRadius: 3,
                    fontSize: '6.5pt', fontWeight: 600,
                    background: '#fef2f2', border: '1px solid #fca5a5',
                    color: '#b91c1c', whiteSpace: 'nowrap',
                }}>{item}</span>
            ))}
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────

const RaportSummaryPage = memo(({
    students = [],
    scores = {},
    extras = {},
    bulanObj,
    tahun,
    musyrif,
    className,
    reportType = 'bulanan',
    selectedSemester = 1,
    academicYear = '',
    selectedClass,
    onRendered,
    behaviorReports = {},
    pageSize = 'f4',
}) => {
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const criteria = rtObj.getCriteria(selectedClass)
    const classLevel = getClassLevel(selectedClass)
    const isA4 = pageSize === 'a4'
    const maxScore = rtObj.maxScore

    const pad = isA4 ? '4mm 10mm 4mm 20mm' : '8mm 10mm 8mm 20mm'
    const pageW = isA4 ? '210mm' : '215mm'
    const pageH = isA4 ? '297mm' : '330mm'

    const periodStr = rtObj.periodType === 'monthly'
        ? `${bulanObj?.id_str || ''} ${tahun}`
        : `Semester ${Number(selectedSemester) === 1 ? '1 (Ganjil)' : '2 (Genap)'} T.A ${academicYear}`

    // ─── Build per-student rows ─────────────────────────────────────
    const rows = students.map((s, idx) => {
        const sc = scores[s.id] || {}
        const ex = extras[s.id] || {}
        const avg = calcAvg(sc, criteria)
        const avgNum = avg ? Number(avg) : null
        const gradeObj = avgNum ? getGradePredicate(avgNum, reportType, classLevel) : null

        const bReps = behaviorReports[s.id] || []
        const negPoints = bReps.reduce((sum, r) => sum + Math.abs(Number(r.point) || 0), 0)

        const sakit = ex.hari_sakit || ''
        const izin = ex.hari_izin || ''
        const alpa = ex.hari_alpa || ''
        const pulang = ex.hari_pulang || ''
        const catatan = ex.catatan || ''
        const pelanggaran = ex.pelanggaran || ''
        const prestasi = ex.prestasi || ''
        const sholat = ex.sholat || ''

        const subjectScores = criteria.map(k => ({
            key: k.key,
            id: k.id,
            val: sc[k.key] !== undefined && sc[k.key] !== '' ? Number(sc[k.key]) : null,
        }))

        const highlights = []
        if (negPoints > 0) highlights.push(`${negPoints} poin`)
        if (alpa) highlights.push(`Alpa ${alpa}hr`)
        if (pelanggaran.trim()) highlights.push('Ada pelanggaran')
        if (sholat.trim()) highlights.push('Sholat bermasalah')
        if (avgNum && avgNum < (maxScore === 9 ? 6 : 60)) highlights.push('Nilai rendah')
        if (prestasi.trim()) highlights.push(`🏆 ${prestasi}`)
        if (Number(sakit) >= 3) highlights.push(`Sakit ${sakit}hr`)
        if (Number(izin) >= 3) highlights.push(`Izin ${izin}hr`)

        return {
            idx: idx + 1, name: s.name,
            room: s.kamar || s.metadata?.kamar || '-',
            avg, avgNum, gradeObj, subjectScores,
            pelanggaran, prestasi, sholat,
            sakit, izin, alpa, pulang,
            catatan, highlights, negPoints,
        }
    })

    // ─── Class-level stats ──────────────────────────────────────────
    const avgs = rows.filter(r => r.avgNum !== null).map(r => r.avgNum)
    const classAvg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '-'
    const highest = avgs.length ? Math.max(...avgs) : '-'
    const lowest = avgs.length ? Math.min(...avgs) : '-'
    const totalAlpa = rows.reduce((s, r) => s + (Number(r.alpa) || 0), 0)
    const totalSakit = rows.reduce((s, r) => s + (Number(r.sakit) || 0), 0)
    const totalIzin = rows.reduce((s, r) => s + (Number(r.izin) || 0), 0)
    const totalPulang = rows.reduce((s, r) => s + (Number(r.pulang) || 0), 0)
    const totalNegPoints = rows.reduce((s, r) => s + r.negPoints, 0)

    // Grade distribution
    const dist = { 'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Kurang Baik': 0 }
    rows.forEach(r => {
        if (r.gradeObj?.id) dist[r.gradeObj.id] = (dist[r.gradeObj.id] || 0) + 1
    })

    // Students needing attention
    const lowScoreCutoff = maxScore === 9 ? 6 : 60
    const attentionStudents = rows.filter(r =>
        (r.avgNum !== null && r.avgNum < lowScoreCutoff) || r.negPoints > 0 || r.highlights.length >= 2
    )

    // Per-subject class averages
    const subjectAvgs = criteria.map(k => {
        const vals = rows.map(r => r.subjectScores.find(s => s.key === k.key)?.val).filter(v => v !== null && v !== undefined)
        return {
            id: k.id, ar: k.ar,
            avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-',
            min: vals.length ? Math.min(...vals) : '-',
            max: vals.length ? Math.max(...vals) : '-',
        }
    })

    // ─── Ranking ────────────────────────────────────────────────────
    const sortedByAvg = [...rows].filter(r => r.avgNum !== null).sort((a, b) => b.avgNum - a.avgNum)
    const rankMap = new Map()
    sortedByAvg.forEach((r, i) => rankMap.set(r.idx, i + 1))
    const top3Set = new Set(sortedByAvg.slice(0, 3).map(r => r.idx))

    // ─── Multi-page pagination ──────────────────────────────────────
    const ROWS_FIRST = isA4 ? 20 : 25
    const ROWS_NEXT = isA4 ? 25 : 30

    const pages = []
    const allRows = [...rows]
    while (allRows.length > 0) {
        const limit = pages.length === 0 ? ROWS_FIRST : ROWS_NEXT
        pages.push(allRows.splice(0, limit))
    }
    if (pages.length === 0) pages.push([])
    const totalPages = pages.length

    // ─── Avg Color Helper ───────────────────────────────────────────
    const getAvgColor = (val) => {
        if (!val || val === '-') return '#64748b'
        const g = getGradePredicate(Number(val), reportType, classLevel)
        return g?.uiColor || '#64748b'
    }

    // ─── Row style helper ───────────────────────────────────────────
    const getRowStyle = (r, rowIdx) => {
        const isZebra = rowIdx % 2 === 1
        const base = { background: isZebra ? '#f8fafc' : '#fff' }

        if (r.highlights.length >= 3) {
            return { ...base, background: '#fef2f2', borderLeft: '3.5px solid #ef4444' }
        }
        if (r.highlights.length >= 1) {
            return { ...base, background: isZebra ? '#fffbeb' : '#fefce8', borderLeft: '3.5px solid #f59e0b' }
        }
        if (top3Set.has(r.idx)) {
            return { ...base, borderLeft: '3.5px solid #10b981' }
        }
        return { ...base, borderLeft: '3.5px solid transparent' }
    }

    // ─── Table styles ───────────────────────────────────────────────
    const displayCriteria = criteria
    const totalSubjectW = Math.max(22, Math.min(32, displayCriteria.length * 5.2))
    const critColW = `${totalSubjectW / displayCriteria.length}%`
    const critFontSize = displayCriteria.length > 8 ? '5.5pt' : displayCriteria.length > 6 ? '6pt' : '6.5pt'

    const thBase = {
        border: '1px solid #cbd5e1', padding: '4px 2px',
        textAlign: 'center', fontWeight: 700, fontSize: '7pt',
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e8ecf1 100%)',
        color: '#334155', textTransform: 'uppercase', letterSpacing: '0.3px',
        verticalAlign: 'middle',
    }
    const tdBase = {
        border: '1px solid #cbd5e1', padding: '3.5px 3px',
        fontSize: '8pt', verticalAlign: 'middle',
    }
    const tdC = { ...tdBase, textAlign: 'center' }
    const tdL = { ...tdBase, textAlign: 'left' }

    // ─── Page style ─────────────────────────────────────────────────
    const getPageStyle = (isLast) => ({
        padding: pad, width: pageW, minWidth: pageW,
        minHeight: pageH, height: pageH,
        pageBreakAfter: isLast ? 'auto' : 'always', background: '#fff', color: '#000',
        fontFamily: RAPORT_SERIF, fontSize: '10pt', lineHeight: 1.4,
        position: 'relative', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', margin: '0 auto',
    })

    useEffect(() => { onRendered?.() }, [onRendered])

    // ─── Render ─────────────────────────────────────────────────────
    return (
        <>
            {pages.map((pageRows, pageIdx) => {
                const isFirst = pageIdx === 0
                const isLast = pageIdx === totalPages - 1

                return (
                    <div key={pageIdx} className="raport-card" style={getPageStyle(isLast)}>
                        {/* Print styles (first page only) */}
                        {isFirst && (
                            <style>{`
                                @media print {
                                    @page { size: ${pageSize === 'f4' ? '215mm 330mm' : 'A4'}; margin: 0; }
                                    body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    .raport-card { box-shadow: none !important; }
                                }
                            `}</style>
                        )}

                        {/* ═══════════════ HEADER ═══════════════ */}
                        {isFirst ? (
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <div style={{
                                    fontSize: '14pt', fontWeight: 800, letterSpacing: '1.5px',
                                    color: '#1e293b', textTransform: 'uppercase',
                                }}>Rekapitulasi Raport</div>
                                <div style={{
                                    fontSize: '10.5pt', fontWeight: 600, marginTop: 3, color: '#334155',
                                }}>Kelas {className} — {periodStr}</div>
                                <div style={{
                                    fontSize: '9pt', color: '#64748b', marginTop: 2,
                                }}>Wali Kelas: {musyrif || '-'}</div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                marginBottom: 6, borderBottom: '2px solid #e2e8f0', paddingBottom: 5,
                            }}>
                                <div style={{ fontSize: '10pt', fontWeight: 700, color: '#334155' }}>
                                    Rekapitulasi — Kelas {className}
                                </div>
                                <div style={{ fontSize: '8pt', color: '#94a3b8' }}>
                                    {periodStr} | Wali: {musyrif || '-'}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ CLEAN 1-LINE FUNCTIONAL SUMMARY STRIP (First Page) ═══════════════ */}
                        {isFirst && (
                            <div style={{
                                marginBottom: 8, padding: '5px 12px', borderRadius: 6,
                                background: '#f8fafc', border: '1px solid #cbd5e1',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: '8.5pt', color: '#334155',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontWeight: 700, color: '#64748b', fontSize: '7.5pt', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        Rata-Rata Kelas:
                                    </span>
                                    <b style={{ fontSize: '11pt', color: getAvgColor(classAvg), lineHeight: 1 }}>{classAvg}</b>
                                    <span style={{ fontSize: '7.5pt', color: '#64748b' }}>
                                        (Tertinggi: <b style={{ color: '#10b981' }}>{highest}</b> | Terendah: <b style={{ color: '#ef4444' }}>{lowest}</b>)
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '7.5pt' }}>
                                    <span>
                                        <b style={{ color: '#64748b' }}>Absensi Total:</b> Sakit <b>{totalSakit}</b> · Izin <b>{totalIzin}</b> · Alpa <b style={{ color: totalAlpa > 0 ? '#dc2626' : undefined }}>{totalAlpa}</b> · Pulang <b>{totalPulang}</b>
                                    </span>
                                    {totalNegPoints > 0 ? (
                                        <span style={{ fontSize: '7pt', color: '#b91c1c', fontWeight: 700, background: '#fef2f2', padding: '1px 6px', borderRadius: 4, border: '1px solid #fca5a5' }}>
                                            {totalNegPoints} Poin Violasi
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '7pt', color: '#047857', fontWeight: 700, background: '#ecfdf5', padding: '1px 6px', borderRadius: 4, border: '1px solid #a7f3d0' }}>
                                            0 Violasi
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ═══════════════ STUDENT TABLE ═══════════════ */}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...thBase, width: '3%' }}>No</th>
                                        <th style={{ ...thBase, width: '13%', textAlign: 'left', paddingLeft: 6 }}>Nama</th>
                                        {displayCriteria.map(k => (
                                            <th key={k.key} style={{ ...thBase, width: critColW }}>
                                                <div style={{ fontSize: critFontSize, lineHeight: 1.15 }}>{k.id}</div>
                                            </th>
                                        ))}
                                        <th style={{ ...thBase, width: '5%', background: 'linear-gradient(180deg, #e8ecf1 0%, #dde3eb 100%)' }}>Avg</th>
                                        <th style={{ ...thBase, width: '7.5%' }}>Predikat</th>
                                        <th style={{ ...thBase, width: '9%', textAlign: 'left', paddingLeft: 5 }}>Pelanggaran</th>
                                        <th style={{ ...thBase, width: '7%' }}>Sholat</th>
                                        <th style={{ ...thBase, width: '3.5%' }}>Alpa</th>
                                        <th style={{ ...thBase, width: '3.5%' }}>Plg</th>
                                        <th style={{ ...thBase, width: isFirst ? '18%' : '18%', textAlign: 'left', paddingLeft: 5 }}>Catatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((r, i) => {
                                        const rank = rankMap.get(r.idx)
                                        const rowSt = getRowStyle(r, i)

                                        return (
                                            <tr key={r.idx} style={rowSt}>
                                                <td style={{ ...tdC, fontWeight: 500, color: '#64748b', padding: '3px 1px' }}>
                                                    <TrophyRankBadge rank={rank} idx={r.idx} />
                                                </td>
                                                <td style={{ ...tdL, paddingLeft: 6 }}>
                                                    <span style={{
                                                        fontWeight: 600, fontSize: '7.5pt',
                                                        lineHeight: 1.2, color: '#1e293b',
                                                    }}>{r.name}</span>
                                                </td>
                                                {displayCriteria.map(k => {
                                                    const sv = r.subjectScores.find(s => s.key === k.key)
                                                    const v = sv?.val
                                                    const g = v !== null && v !== undefined
                                                        ? getGradePredicate(v, reportType, classLevel, k.key)
                                                        : null
                                                    return (
                                                        <td key={k.key} style={{
                                                            ...tdC,
                                                            background: g?.bg || 'transparent',
                                                            fontWeight: 700,
                                                            color: g?.uiColor || '#cbd5e1',
                                                            fontSize: displayCriteria.length > 8 ? '7.5pt' : '8.5pt',
                                                        }}>
                                                            {v !== null && v !== undefined ? v : <span style={{ color: '#d1d5db', fontWeight: 400 }}>-</span>}
                                                        </td>
                                                    )
                                                })}
                                                {/* Avg */}
                                                <td style={{
                                                    ...tdC, fontWeight: 900, fontSize: '9pt',
                                                    color: r.avgNum ? getAvgColor(r.avg) : '#cbd5e1',
                                                    background: r.gradeObj?.bg || 'transparent',
                                                    letterSpacing: '-0.3px',
                                                }}>
                                                    {r.avg || <span style={{ color: '#d1d5db', fontWeight: 400, fontSize: '8pt' }}>-</span>}
                                                </td>
                                                {/* Predikat */}
                                                <td style={{ ...tdC }}>
                                                    {r.gradeObj
                                                        ? <PredBadge label={r.gradeObj.id} color={r.gradeObj.uiColor || '#6b7280'} />
                                                        : <span style={{ color: '#d1d5db' }}>-</span>
                                                    }
                                                </td>
                                                {/* Pelanggaran */}
                                                <td style={{ ...tdL, paddingLeft: 5 }}>
                                                    <PelanggaranBadges text={r.pelanggaran} />
                                                </td>
                                                {/* Sholat */}
                                                <td style={{ ...tdC, fontSize: '7pt', lineHeight: 1.2 }}>
                                                    {r.sholat ? (
                                                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                                            {r.sholat}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#10b981', fontSize: '7.5pt' }}>✓</span>
                                                    )}
                                                </td>
                                                {/* Alpa */}
                                                <td style={{ ...tdC }}>
                                                    {r.alpa ? (
                                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{r.alpa}</span>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1' }}>0</span>
                                                    )}
                                                </td>
                                                {/* Pulang */}
                                                <td style={{ ...tdC }}>
                                                    {r.pulang ? (
                                                        <span style={{ fontWeight: 600 }}>{r.pulang}</span>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1' }}>0</span>
                                                    )}
                                                </td>
                                                {/* Catatan / Highlight */}
                                                <td style={{ ...tdL, fontSize: '7pt', paddingLeft: 5, lineHeight: 1.25 }}>
                                                    {r.highlights.length > 0 ? (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                                            {r.highlights.map((h, hi) => (
                                                                <span key={hi} style={{
                                                                    display: 'inline-block', padding: '0.5px 4px',
                                                                    borderRadius: 3, fontSize: '6.5pt', fontWeight: 600,
                                                                    background: h.includes('🏆')
                                                                        ? '#ecfdf5' : h.includes('pelanggaran') || h.includes('poin')
                                                                            ? '#fef2f2' : h.includes('Sholat')
                                                                                ? '#fff7ed' : h.includes('Nilai')
                                                                                    ? '#fef2f2' : '#fffbeb',
                                                                    color: h.includes('🏆')
                                                                        ? '#047857' : h.includes('pelanggaran') || h.includes('poin')
                                                                            ? '#b91c1c' : h.includes('Sholat')
                                                                                ? '#c2410c' : h.includes('Nilai')
                                                                                    ? '#b91c1c' : '#92400e',
                                                                    border: `1px solid ${h.includes('🏆')
                                                                        ? '#a7f3d0' : h.includes('pelanggaran') || h.includes('poin')
                                                                            ? '#fca5a5' : h.includes('Sholat')
                                                                                ? '#fdba74' : h.includes('Nilai')
                                                                                    ? '#fca5a5' : '#fcd34d'}`,
                                                                    whiteSpace: 'nowrap',
                                                                }}>{h}</span>
                                                            ))}
                                                        </div>
                                                    ) : r.catatan ? (
                                                        <span style={{ color: '#64748b' }}>
                                                            {r.catatan.substring(0, 60)}{r.catatan.length > 60 ? '…' : ''}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#d1d5db' }}>-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>

                                {/* ═══════════════ TABLE FOOTER (RATA-RATA KELAS PER MAPEL) ═══════════════ */}
                                {isLast && (
                                    <tfoot>
                                        <tr style={{
                                            background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
                                            fontWeight: 700, fontSize: '8pt', borderTop: '2px solid #cbd5e1',
                                        }}>
                                            <td style={{ ...tdC, color: '#94a3b8' }}>-</td>
                                            <td style={{ ...tdL, paddingLeft: 6, fontWeight: 800, color: '#1e293b' }}>
                                                RATA-RATA KELAS
                                            </td>
                                            {displayCriteria.map(k => {
                                                const sa = subjectAvgs.find(s => s.id === k.id)
                                                return (
                                                    <td key={k.key} style={{ ...tdC, fontWeight: 900, color: '#1e293b', fontSize: displayCriteria.length > 8 ? '7.5pt' : '8.5pt' }}>
                                                        {sa ? sa.avg : '-'}
                                                    </td>
                                                )
                                            })}
                                            <td style={{ ...tdC, fontWeight: 900, color: getAvgColor(classAvg), fontSize: '9pt' }}>
                                                {classAvg}
                                            </td>
                                            <td style={tdC}>-</td>
                                            <td style={tdC}>-</td>
                                            <td style={tdC}>-</td>
                                            <td style={{ ...tdC, color: totalAlpa > 0 ? '#dc2626' : undefined, fontWeight: totalAlpa > 0 ? 800 : 500 }}>
                                                {totalAlpa}
                                            </td>
                                            <td style={{ ...tdC, fontWeight: 600 }}>{totalPulang}</td>
                                            <td style={{ ...tdL, paddingLeft: 5, fontSize: '7pt', color: '#64748b' }}>
                                                {totalNegPoints > 0 ? `${totalNegPoints} Poin Violasi` : 'Nihil'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* ═══════════════ FOOTER ═══════════════ */}
                        <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                            {/* Attention section — last page only */}
                            {isLast && (
                                <div style={{
                                    padding: '7px 10px', background: '#f8fafc',
                                    borderRadius: 7, fontSize: '7.5pt', color: '#475569',
                                    border: '1px solid #e2e8f0', marginBottom: 5,
                                }}>
                                    <div style={{ fontWeight: 700, marginBottom: 3, color: '#334155', fontSize: '8pt' }}>
                                        📝 Catatan untuk Wali Kelas
                                    </div>
                                    <div style={{ lineHeight: 1.35, color: '#64748b' }}>
                                        Halaman ini membantu memahami gambaran umum raport santri.
                                        Baris dengan <span style={{ display: 'inline-block', width: 10, height: 3, background: '#f59e0b', borderRadius: 1, verticalAlign: 'middle', margin: '0 2px' }} /> kuning menandakan perlu perhatian,
                                        {' '}<span style={{ display: 'inline-block', width: 10, height: 3, background: '#ef4444', borderRadius: 1, verticalAlign: 'middle', margin: '0 2px' }} /> merah menandakan masalah signifikan.
                                    </div>
                                    {attentionStudents.length > 0 && (
                                        <div style={{
                                            marginTop: 5, paddingTop: 5,
                                            borderTop: '1px solid #e2e8f0',
                                        }}>
                                            <div style={{
                                                fontWeight: 700, color: '#b45309', marginBottom: 3,
                                                fontSize: '7.5pt',
                                            }}>
                                                ⚠ Perlu Perhatian Khusus ({attentionStudents.length} santri):
                                            </div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: attentionStudents.length > 4 ? '1fr 1fr' : '1fr',
                                                gap: '2px 12px',
                                            }}>
                                                {attentionStudents.map(r => (
                                                    <div key={r.idx} style={{
                                                        fontSize: '7pt', lineHeight: 1.3,
                                                        display: 'flex', gap: 3,
                                                    }}>
                                                        <span style={{ fontWeight: 700, color: '#334155', flexShrink: 0 }}>• {r.name}</span>
                                                        <span style={{ color: '#b45309' }}>— {r.highlights.join(', ')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Page number */}
                            <div style={{
                                fontSize: '7pt', color: '#94a3b8', textAlign: 'right',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <span style={{ color: '#cbd5e1' }}>
                                    {rows.length} santri
                                </span>
                                <span>
                                    Halaman {pageIdx + 1}{totalPages > 1 ? ` dari ${totalPages}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                )
            })}
        </>
    )
})

RaportSummaryPage.displayName = 'RaportSummaryPage'

export default RaportSummaryPage
