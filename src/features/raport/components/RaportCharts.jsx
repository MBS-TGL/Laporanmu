import React, { memo } from 'react'
import { KRITERIA, MAX_SCORE, GRADE, calcAvg } from '@utils/reports/raportConstants'

export const RadarChart = memo(({ scores, size = 80, criteria = KRITERIA, maxScore = MAX_SCORE }) => {
    const vals = criteria.map(k => Number(scores?.[k.key]) || 0)
    const cx = size / 2, cy = size / 2, r = size * 0.36
    const angle = (i) => (i * 2 * Math.PI / criteria.length) - Math.PI / 2
    const pt = (i, v) => [cx + (v / maxScore) * r * Math.cos(angle(i)), cy + (v / maxScore) * r * Math.sin(angle(i))]
    const bgPt = (i) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
    const polyPts = vals.map((v, i) => pt(i, v).join(',')).join(' ')
    const avg = calcAvg(scores || {}, criteria)
    
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" className="overflow-visible">
            {[0.33, 0.67, 1].map((sc, ri) => (
                <polygon 
                    key={ri} 
                    points={criteria.map((_, i) => { 
                        const [x, y] = bgPt(i)
                        return [cx + (x - cx) * sc, cy + (y - cy) * sc].join(',') 
                    }).join(' ')} 
                    fill="none" 
                    stroke="var(--color-border)" 
                    strokeWidth="0.6" 
                />
            ))}
            {criteria.map((_, i) => { 
                const [x, y] = bgPt(i)
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="0.5" /> 
            })}
            <polygon points={polyPts} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="1.2" strokeLinejoin="round" />
            {vals.map((v, i) => { 
                const [x, y] = pt(i, v)
                return <circle key={i} cx={x} cy={y} r="1.8" fill={criteria[i]?.color || '#6366f1'} /> 
            })}
            {avg && (
                <>
                    <circle cx={cx} cy={cy} r={size * 0.14} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="0.8" />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.12} fontWeight="900" fill="var(--color-text)">{avg}</text>
                </>
            )}
        </svg>
    )
})

export const SparklineTrend = memo(({ trendData, criteria = KRITERIA }) => {
    if (!trendData || trendData.length < 2) return null
    const avgs = trendData.map(t => {
        const vals = criteria.map(k => t.scores[k.key]).filter(v => v !== null && v !== undefined)
        return vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null
    }).filter(v => v !== null)
    
    if (avgs.length < 2) return null
    const W = 60, H = 22, pad = 2
    const minV = Math.min(...avgs), maxV = Math.max(...avgs)
    const range = maxV - minV || 1
    const pts = avgs.map((v, i) => {
        const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
        const y = H - pad - ((v - minV) / range) * (H - pad * 2)
        return `${x},${y}`
    }).join(' ')
    const last = avgs[avgs.length - 1], prev = avgs[avgs.length - 2]
    const trendColor = last > prev ? '#10b981' : last < prev ? '#ef4444' : '#6366f1'
    
    return (
        <div className="flex items-center gap-1.5" title={`Tren rata-rata ${trendData.length} bulan terakhir`}>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
                <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                {avgs.map((v, i) => {
                    const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
                    const y = H - pad - ((v - minV) / range) * (H - pad * 2)
                    return (
                        <circle 
                            key={i} 
                            cx={x} 
                            cy={y} 
                            r="2" 
                            fill={i === avgs.length - 1 ? trendColor : 'var(--color-surface)'} 
                            stroke={trendColor} 
                            strokeWidth="1.2" 
                        />
                    )
                })}
            </svg>
            <span style={{ fontSize: 9, fontWeight: 900, color: trendColor }}>{last.toFixed(1)}</span>
        </div>
    )
})
