/**
 * importExportEngine — kumpulan pure helper untuk pipeline import/export
 * Excel/CSV/PDF yang dipakai bersama useImportExportCore dan halaman yang
 * butuh writer langsung. Semua library berat di-load on-demand via await import().
 *
 * Konvensi filename: pemanggil mengirim nama TANPA ekstensi; writer menambahkan.
 */

// ── Parsing ─────────────────────────────────────────────────────────────────

export async function parseCSVFile(file) {
    const Papa = (await import('papaparse')).default
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: (err) => reject(err)
        })
    })
}

export async function parseExcelFile(file) {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// Matrix mentah (raw:false supaya NIK/NISN tetap teks utuh, tidak jadi notasi ilmiah)
export async function parseExcelMatrix(file) {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
}

// ── Auto-match header file → kolom sistem ───────────────────────────────────
// Varian terbaik: equality penuh + synonyms (dengan perbandingan alnum-stripped),
// lalu tiebreak berdasarkan jumlah baris terisi bila beberapa header cocok.

const normStr = (s) => (s || '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()

export function autoMatchColumns(headers, rows, systemCols) {
    const filled = (h) => rows.reduce((n, r) => n + (String(r[h] ?? '').trim() !== '' ? 1 : 0), 0)
    const mapping = {}

    systemCols.forEach(sys => {
        const normL = normStr(sys.label)
        const normK = normStr(sys.key)
        const matches = headers.filter(h => {
            const normH = normStr(h)
            const cleanH = normStr((h || '').split(/[([{（\n\r]/)[0])
            if (normH === normL || normH === normK || cleanH === normL || cleanH === normK) return true
            if (sys.synonyms && sys.synonyms.some(syn => {
                const s = normStr(syn)
                return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
            })) return true
            return false
        })
        const match = matches.length > 1
            ? [...matches].sort((a, b) => filled(b) - filled(a))[0]
            : matches[0]
        if (match) mapping[sys.key] = match
    })
    return mapping
}

// ── Helper teks ──────────────────────────────────────────────────────────────

export const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()

// Nilai non-kosong pertama dari daftar key (fallback synonym pada row mentah)
export const pick = (obj, keys) => {
    for (const k of keys) {
        const v = obj?.[k]
        if (v !== undefined && v !== null && String(v).trim() !== '') return v
    }
    return ''
}

export const normalizePhone = (raw) => {
    const v = String(raw ?? '').trim()
    if (!v) return ''
    const cleaned = v.replace(/[\s-]/g, '')
    const keepPlus = cleaned.startsWith('+') ? '+' : ''
    const digits = cleaned.replace(/[^\d]/g, '')
    return keepPlus ? `+${digits}` : digits
}

export function downloadBlob(blob, filename) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

const withExt = (name, ext) => (/\.[a-z0-9]+$/i.test(name || '') ? name : `${name || 'export'}${ext}`)

// ── Writers ──────────────────────────────────────────────────────────────────

// CSV koma + quote-doubling (konvensi mayoritas fitur). Return jumlah baris.
export async function writeCSV(filename, rows, { includeHeader = true } = {}) {
    if (!rows.length) return 0
    const headers = Object.keys(rows[0])
    const csvContent = [
        ...(includeHeader !== false ? [headers.join(',')] : []),
        ...rows.map(r => headers.map(h => {
            const v = String(r[h] ?? '').replace(/"/g, '""')
            return `"${v}"`
        }).join(','))
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, withExt(filename, '.csv'))
    return rows.length
}

// Excel: sheet pertama dari array-of-objects + lebar kolom otomatis. Return jumlah baris.
export async function writeExcel(filename, rows, sheetName = 'Data') {
    if (!rows.length) return 0
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Data')
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, withExt(filename, '.xlsx'))
    return rows.length
}

// PDF tabel via jsPDF+autoTable dengan footer halaman standar Laporanmu.
// metaText = baris metadata (tanggal/total/scope); filterLines = rincian filter aktif.
export async function exportTablePDF({
    filename, title, metaText = '', filterLines = [],
    rows, columnStyles = {}, orientation = 'landscape', includeHeader = true
}) {
    if (!rows.length) return 0
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ])
    const autoTable = autoTableMod.default || autoTableMod

    const doc = new jsPDF({ orientation })
    doc.setFontSize(13)
    doc.text(title, 14, 12)
    doc.setFontSize(8)
    doc.text(metaText, 14, 18)

    let startY = 22
    if (filterLines.length > 0) {
        doc.text(`Filter: ${filterLines.join(' | ')}`, 14, 24)
        startY = 28
    }

    const headers = Object.keys(rows[0])
    const body = rows.map(r => headers.map(h => String(r[h] ?? '')))
    autoTable(doc, {
        head: includeHeader !== false ? [headers] : [],
        body,
        startY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles,
    })

    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
        doc.text(`Dicetak otomatis oleh Laporanmu pada ${dateStr}`, 14, doc.internal.pageSize.height - 8)
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8)
    }

    doc.save(withExt(filename, '.pdf'))
    return rows.length
}

// Template import: header + contoh baris (AOA) + lebar kolom. XLSX.writeFile.
export async function buildTemplateFile({ headers, widths = [], rows = [], filename = 'Template Import' }) {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    if (widths.length) ws['!cols'] = widths.map(wch => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import')
    XLSX.writeFile(wb, withExt(filename, '.xlsx'))
}
