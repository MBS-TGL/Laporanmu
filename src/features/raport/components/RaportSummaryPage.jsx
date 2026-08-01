import React, { memo, useEffect } from 'react'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@features/raport/utils/raportTypeRegistry'
import { calcAvg } from '@features/raport/utils/raportHelpers'
import { RAPORT_SERIF } from '@features/raport/utils/raportFonts'

const PredBadge = ({ label, color }) => (
    <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: '7.5pt', fontWeight: 700, background: `${color}18`, border: `1px solid ${color}50`, color, whiteSpace: 'nowrap' }}>{label}</span>
)

const PelanggaranBadges = ({ text }) => {
    if (!text || !text.trim()) return <span style={{ color: '#10b981', fontSize: '8pt' }}>-</span>
    const items = text.split(',').map(s => s.trim()).filter(Boolean)
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {items.map((item, i) => (
                <span key={i} style={{ display: 'inline-block', padding: '0 4px', borderRadius: 3, fontSize: '7pt', fontWeight: 600, background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', whiteSpace: 'nowrap' }}>{item}</span>
            ))}
        </div>
    )
}

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

    const pad = isA4 ? '4mm 10mm 4mm 20mm' : '8mm 10mm 8mm 20mm'
    const pageW = isA4 ? '210mm' : '215mm'
    const pageH = isA4 ? '297mm' : '330mm'

    const periodStr = rtObj.periodType === 'monthly'
        ? `${bulanObj?.id_str || ''} ${tahun}`
        : `Semester ${Number(selectedSemester) === 1 ? '1 (Ganjil)' : '2 (Genap)'} T.A ${academicYear}`

    // Build per-student rows
    const rows = students.map((s, idx) => {
        const sc = scores[s.id] || {}
        const ex = extras[s.id] || {}
        const avg = calcAvg(sc, criteria)
        const avgNum = avg ? Number(avg) : null
        const gradeObj = avgNum ? getGradePredicate(avgNum, reportType, classLevel) : null

        // Count behavior reports
        const bReps = behaviorReports[s.id] || []
        const negPoints = bReps.reduce((sum, r) => sum + Math.abs(Number(r.point) || 0), 0)

        // Attendance
        const sakit = ex.hari_sakit || ''
        const izin = ex.hari_izin || ''
        const alpa = ex.hari_alpa || ''
        const pulang = ex.hari_pulang || ''
        const hasAttendance = sakit || izin || alpa || pulang

        // Catatan
        const catatan = ex.catatan || ''

        // Pelanggaran / Prestasi / Sholat
        const pelanggaran = ex.pelanggaran || ''
        const prestasi = ex.prestasi || ''
        const sholat = ex.sholat || ''

        // Per-subject scores
        const subjectScores = criteria.map(k => ({
            key: k.key,
            id: k.id,
            val: sc[k.key] !== undefined && sc[k.key] !== '' ? Number(sc[k.key]) : null,
        }))

        // Highlight flags for wali kelas
        const highlights = []
        if (negPoints > 0) highlights.push(`${negPoints} poin`)
        if (alpa) highlights.push(`Alpa ${alpa}hr`)
        if (pelanggaran.trim()) highlights.push('Ada pelanggaran')
        if (sholat.trim()) highlights.push('Sholat bermasalah')
        if (avgNum && avgNum < 6) highlights.push('Nilai rendah')

        return {
            idx: idx + 1,
            name: s.name,
            room: s.kamar || s.metadata?.kamar || '-',
            avg,
            avgNum,
            gradeObj,
            subjectScores,
            pelanggaran,
            prestasi,
            sholat,
            sakit,
            izin,
            alpa,
            pulang,
            hasAttendance,
            catatan,
            highlights,
            negPoints,
        }
    })

    // Class-level stats
    const avgs = rows.filter(r => r.avgNum !== null).map(r => r.avgNum)
    const classAvg = avgs.length ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '-'
    const highest = avgs.length ? Math.max(...avgs) : '-'
    const lowest = avgs.length ? Math.min(...avgs) : '-'
    const totalAlpa = rows.reduce((s, r) => s + (Number(r.alpa) || 0), 0)
    const totalSakit = rows.reduce((s, r) => s + (Number(r.sakit) || 0), 0)
    const totalIzin = rows.reduce((s, r) => s + (Number(r.izin) || 0), 0)
    const totalNegPoints = rows.reduce((s, r) => s + r.negPoints, 0)

    // Grade distribution
    const dist = { 'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Kurang Baik': 0 }
    rows.forEach(r => {
        if (r.gradeObj?.id) dist[r.gradeObj.id] = (dist[r.gradeObj.id] || 0) + 1
    })

    // Students needing attention (low avg or violations)
    const attentionStudents = rows.filter(r =>
        (r.avgNum !== null && r.avgNum < 6) || r.negPoints > 0 || r.highlights.length >= 2
    )

    // Per-subject class averages
    const subjectAvgs = criteria.map(k => {
        const vals = rows.map(r => r.subjectScores.find(s => s.key === k.key)?.val).filter(v => v !== null && v !== undefined)
        return {
            id: k.id,
            ar: k.ar,
            avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '-',
            min: vals.length ? Math.min(...vals) : '-',
            max: vals.length ? Math.max(...vals) : '-',
        }
    })

    useEffect(() => { onRendered?.() }, [onRendered])

    return (
        <div className="raport-card" style={{ padding: pad, width: pageW, minWidth: pageW, minHeight: pageH, height: pageH, pageBreakAfter: 'always', background: '#fff', color: '#000', fontFamily: RAPORT_SERIF, fontSize: '10pt', lineHeight: 1.4, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: '13pt', fontWeight: 800, letterSpacing: '0.5px' }}>REKAPITULASI RAPORT</div>
                <div style={{ fontSize: '10pt', fontWeight: 600, marginTop: 2 }}>
                    Kelas {className} — {periodStr}
                </div>
                <div style={{ fontSize: '9pt', color: '#555', marginTop: 1 }}>
                    Wali Kelas: {musyrif || '-'}
                </div>
            </div>

            {/* Class Stats Summary */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '8.5pt' }}>
                <div style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', background: '#f9fafb' }}>
                    <div style={{ fontWeight: 700, fontSize: '8pt', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rata-Rata Kelas</div>
                    <div style={{ fontSize: '16pt', fontWeight: 800, color: '#4f46e5' }}>{classAvg}</div>
                    <div style={{ fontSize: '7.5pt', color: '#6b7280', marginTop: 2 }}>Tertinggi: {highest} | Terendah: {lowest}</div>
                </div>
                <div style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', background: '#f9fafb' }}>
                    <div style={{ fontWeight: 700, fontSize: '8pt', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribusi Predikat</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(dist).map(([k, v]) => v > 0 && (
                            <span key={k} style={{ fontSize: '7.5pt', fontWeight: 600 }}>
                                {k}: {v}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', background: '#f9fafb' }}>
                    <div style={{ fontWeight: 700, fontSize: '8pt', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absensi Total</div>
                    <div style={{ display: 'flex', gap: 6, fontSize: '8pt' }}>
                        <span>Sakit: <b>{totalSakit}</b></span>
                        <span>Izin: <b>{totalIzin}</b></span>
                        <span>Alpa: <b style={{ color: totalAlpa > 0 ? '#dc2626' : undefined }}>{totalAlpa}</b></span>
                    </div>
                    <div style={{ fontSize: '7.5pt', color: '#6b7280', marginTop: 2 }}>
                        Poin Pelanggaran: <b style={{ color: totalNegPoints > 0 ? '#dc2626' : undefined }}>{totalNegPoints}</b>
                    </div>
                </div>
            </div>

            {/* Subject Class Averages */}
            {subjectAvgs.length > 0 && (
                <div style={{ marginBottom: 8, border: '1px solid #d1d5db', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#f0f4f8', padding: '4px 8px', fontSize: '8pt', fontWeight: 700, borderBottom: '1px solid #d1d5db' }}>
                        Rata-Rata Per Aspek Penilaian
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, padding: '4px 8px' }}>
                        {subjectAvgs.map((sa, i) => (
                            <div key={i} style={{ flex: '1 1 0', minWidth: '20%', textAlign: 'center', borderRight: i < subjectAvgs.length - 1 ? '1px solid #e5e7eb' : 'none', padding: '2px 4px' }}>
                                <div style={{ fontSize: '7pt', color: '#6b7280', fontWeight: 600 }}>{sa.id}</div>
                                <div style={{ fontSize: '11pt', fontWeight: 800 }}>{sa.avg}</div>
                                <div style={{ fontSize: '6.5pt', color: '#9ca3af' }}>{sa.min}–{sa.max}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Table */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt' }}>
                    <thead>
                        <tr style={{ background: '#f0f4f8' }}>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '2.5%' }}>No</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'left', fontWeight: 700, width: '13%' }}>Nama</th>
                            {criteria.slice(0, 5).map(k => (
                                <th key={k.key} style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: `${60 / Math.min(criteria.length, 5) / 1.8}%` }}>
                                    <div style={{ fontSize: '6.5pt' }}>{k.id}</div>
                                </th>
                            ))}
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '5%' }}>Avg</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '7%' }}>Predikat</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'left', fontWeight: 700, width: '9%' }}>Pelanggaran</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '7%' }}>Sholat</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '4%' }}>Alpa</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'center', fontWeight: 700, width: '4%' }}>Plg</th>
                            <th style={{ border: '1px solid #d1d5db', padding: '4px 3px', textAlign: 'left', fontWeight: 700, width: '12%' }}>Catatan / Highlight</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.idx} style={{ background: r.highlights.length > 0 ? '#fefce8' : undefined }}>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center' }}>{r.idx}</td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'left', fontWeight: 600, fontSize: '7.5pt' }}>{r.name}</td>
                                {criteria.slice(0, 5).map(k => {
                                    const v = r.subjectScores.find(s => s.key === k.key)?.val
                                    const g = v !== null && v !== undefined ? getGradePredicate(v, reportType, classLevel, k.key) : null
                                    return (
                                        <td key={k.key} style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center' }}>
                                            {v !== null && v !== undefined ? (
                                                <span style={{ fontWeight: 700, color: g?.uiColor || '#000' }}>{v}</span>
                                            ) : <span style={{ color: '#d1d5db' }}>-</span>}
                                        </td>
                                    )
                                })}
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center', fontWeight: 800 }}>
                                    {r.avg || <span style={{ color: '#d1d5db' }}>-</span>}
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center' }}>
                                    {r.gradeObj ? <PredBadge label={r.gradeObj.id} color={r.gradeObj.uiColor || '#6b7280'} /> : <span style={{ color: '#d1d5db' }}>-</span>}
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'left' }}>
                                    <PelanggaranBadges text={r.pelanggaran} />
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center', fontSize: '7pt' }}>
                                    {r.sholat ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.sholat}</span> : <span style={{ color: '#d1d5db' }}>-</span>}
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center' }}>
                                    {r.alpa ? <span style={{ color: '#dc2626', fontWeight: 700 }}>{r.alpa}</span> : <span style={{ color: '#d1d5db' }}>0</span>}
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'center' }}>
                                    {r.pulang ? <span style={{ fontWeight: 600 }}>{r.pulang}</span> : <span style={{ color: '#d1d5db' }}>0</span>}
                                </td>
                                <td style={{ border: '1px solid #d1d5db', padding: '3px', textAlign: 'left', fontSize: '7pt' }}>
                                    {r.highlights.length > 0 ? (
                                        <span style={{ color: '#b45309', fontWeight: 600 }}>{r.highlights.join(', ')}</span>
                                    ) : r.catatan ? (
                                        <span style={{ color: '#6b7280' }}>{r.catatan.substring(0, 50)}{r.catatan.length > 50 ? '...' : ''}</span>
                                    ) : (
                                        <span style={{ color: '#d1d5db' }}>-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 6, padding: '6px 8px', background: '#f0f4f8', borderRadius: 6, fontSize: '7.5pt', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                <b>Catatan untuk Wali Kelas:</b> Halaman ini membantu Bapak/Ibu memahami gambaran umum raport setiap santri.
                Baris berwarna kuning menandakan santri yang perlu perhatian lebih (nilai rendah, pelanggaran, atau absensi tinggi).
                Gunakan data ini sebagai panduan saat menyampaikan raport kepada orang tua.
                {attentionStudents.length > 0 && (
                    <div style={{ marginTop: 3, color: '#b45309', fontWeight: 600 }}>
                        Perhatian khusus: {attentionStudents.map(r => r.name).join(', ')}
                    </div>
                )}
            </div>
        </div>
    )
})

RaportSummaryPage.displayName = 'RaportSummaryPage'

export default RaportSummaryPage
