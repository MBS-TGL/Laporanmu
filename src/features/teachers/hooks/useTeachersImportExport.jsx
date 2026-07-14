import { useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { STATUS_CONFIG } from '@features/teachers/components/TeacherRow'

const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Lengkap', synonyms: ['nama', 'name', 'nama lengkap', 'nama guru', 'guru'] },
    { key: 'nbm', label: 'NBM', synonyms: ['nbm', 'nomor baku muhammadiyah', 'no. btm', 'btm'] },
    { key: 'subject', label: 'Mata Pelajaran', synonyms: ['mapel', 'mata pelajaran', 'subject', 'bidang studi'] },
    { key: 'gender', label: 'Jenis Kelamin', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex', 'l/p', 'jenis kelamin (l/p)'] },
    { key: 'phone', label: 'No. WhatsApp', synonyms: ['wa', 'no. hp/wa', 'phone', 'whatsapp', 'no hp', 'no telp'] },
    { key: 'email', label: 'Email', synonyms: ['email', 'surel', 'e-mail'] },
    { key: 'status', label: 'Status', synonyms: ['status', 'aktif', 'status aktif', 'status (active/inactive/cuti)'] },
    { key: 'type', label: 'Jenis Pegawai', synonyms: ['jenis', 'type', 'jenis pegawai', 'tipe', 'peran', 'jenis pegawai (guru/karyawan)'] },
    { key: 'nik', label: 'NIK', synonyms: ['nik', 'nomor induk kependudukan', 'no ktp', 'ktp'] },
    { key: 'nip', label: 'NIP', synonyms: ['nip', 'nomor induk pegawai'] },
    { key: 'nuptk', label: 'NUPTK', synonyms: ['nuptk'] },
    { key: 'birth_place', label: 'Tempat Lahir', synonyms: ['tempat lahir', 'birth_place', 'birthplace', 'tmp lahir'] },
    { key: 'birth_date', label: 'Tanggal Lahir', synonyms: ['tanggal lahir', 'birth_date', 'tgl lahir', 'tanggal_lahir', 'tanggal lahir (yyyy-mm-dd)'] },
    { key: 'address', label: 'Alamat', synonyms: ['alamat', 'address', 'alamat tinggal'] },
    { key: 'employment_status', label: 'Status Kepegawaian', synonyms: ['status kepegawaian', 'status pegawai', 'kepegawaian', 'status kerja'] },
    { key: 'teaching_hours', label: 'Jam Mengajar', synonyms: ['jam mengajar', 'teaching_hours', 'jam', 'teaching hours'] },
    { key: 'last_education', label: 'Pendidikan Terakhir', synonyms: ['pendidikan terakhir', 'pendidikan', 'last_education', 'last education', 'pendidikan_terakhir'] },
    { key: 'major', label: 'Jurusan', synonyms: ['jurusan', 'major', 'program studi', 'prodi'] },
    { key: 'graduation_year', label: 'Tahun Lulus', synonyms: ['tahun lulus', 'graduation_year', 'tahun_lulus', 'lulus tahun'] },
]

const ALL_EXPORT_COLUMNS = [
    { key: 'nama', label: 'Nama', fn: t => t.name || '' },
    { key: 'nbm', label: 'NBM', fn: t => t.nbm || '' },
    { key: 'subject', label: 'Mata Pelajaran', fn: t => t.subject || '' },
    { key: 'gender', label: 'Gender', fn: t => t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-' },
    { key: 'phone', label: 'No. HP/WA', fn: t => t.phone || '' },
    { key: 'email', label: 'Email', fn: t => t.email || '' },
    { key: 'status', label: 'Status', fn: t => STATUS_CONFIG[t.status]?.label || t.status || '' },
    { key: 'join_date', label: 'Tgl Bergabung', fn: t => t.join_date || '' },
    { key: 'address', label: 'Alamat', fn: t => t.address || '' },
    { key: 'type', label: 'Jenis Pegawai', fn: t => t.type === 'karyawan' ? 'Karyawan' : 'Guru' },
    { key: 'nik', label: 'NIK', fn: t => t.nik || '' },
    { key: 'nip', label: 'NIP', fn: t => t.nip || '' },
    { key: 'nuptk', label: 'NUPTK', fn: t => t.nuptk || '' },
    { key: 'birth_place', label: 'Tempat Lahir', fn: t => t.birth_place || '' },
    { key: 'birth_date', label: 'Tanggal Lahir', fn: t => t.birth_date || '' },
    { key: 'employment_status', label: 'Status Kepegawaian', fn: t => t.employment_status || '' },
    { key: 'teaching_hours', label: 'Jam Mengajar', fn: t => t.teaching_hours || 0 },
    { key: 'last_education', label: 'Pendidikan Terakhir', fn: t => t.last_education || '' },
    { key: 'major', label: 'Jurusan', fn: t => t.major || '' },
    { key: 'graduation_year', label: 'Tahun Lulus', fn: t => t.graduation_year || '' }
]

export function useTeachersImportExport({
    teachers,
    selectedIds,
    filterStatus,
    filterGender,
    filterSubject,
    filterType,
    fetchData,
    fetchStats,
    addToast,
    setIsImportModalOpen,
    setIsExportModalOpen
}) {
    // import
    const [importStep, setImportStep] = useState(1)
    const [importFileName, setImportFileName] = useState('')
    const [importRawData, setImportRawData] = useState([])
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importLoading, setImportLoading] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(true)
    const [importDrag, setImportDrag] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importEditCell, setImportEditCell] = useState(null)
    const [importSkipDupes, setImportSkipDupes] = useState(true)

    // export
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['nama', 'nbm', 'subject', 'gender', 'phone', 'email', 'status', 'join_date'])
    const [exporting, setExporting] = useState(false)

    // ── import processing ─────────────────────────────────────────────────────
    const processImportFile = useCallback(async file => {
        if (!file) return
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) { addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error'); return }
        setImportFileName(file.name)
        setImportLoading(true)
        try {
            let rows = []
            if (ext.endsWith('.csv')) rows = await new Promise(res => Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data) }))
            else {
                const XLSX = await import('xlsx')
                rows = await new Promise(res => { const reader = new FileReader(); reader.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) }; reader.readAsArrayBuffer(file) })
            }

            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }

            const headers = Object.keys(rows[0])
            setImportRawData(rows)
            setImportFileHeaders(headers)

            // Auto-mapping
            const mapping = {}
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const lowH = h.toLowerCase().trim()
                    const cleanH = h.split('(')[0].toLowerCase().trim().replace(/\s+/g, ' ')
                    const lowL = sys.label.toLowerCase().trim()
                    const lowK = sys.key.toLowerCase().trim()

                    if (lowH === lowL || lowH === lowK || cleanH === lowL || cleanH === lowK) return true
                    if (sys.synonyms && sys.synonyms.some(syn => {
                        const s = syn.toLowerCase().trim()
                        return lowH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })
            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch { addToast('Gagal membaca file import', 'error') }
        finally { setImportLoading(false) }
    }, [addToast])

    const buildImportPreview = useCallback(async (raw, mapping) => {
        setImportLoading(true)
        try {
            const preview = raw.map((row, i) => {
                const data = {}
                SYSTEM_COLS.forEach(sys => {
                    const fileCol = mapping[sys.key]
                    data[sys.key] = fileCol ? (row[fileCol] || '').toString().trim() : ''
                })

                // Normalization
                if (data.gender) {
                    const g = data.gender.toUpperCase().trim()
                    data.gender = ['L', 'LAKI-LAKI', 'LAKI LAKI', 'MALE', 'PUTRA'].includes(g) ? 'L' : ['P', 'PEREMPUAN', 'FEMALE', 'PUTRI'].includes(g) ? 'P' : ''
                }
                if (data.status) {
                    const s = data.status.toLowerCase().trim()
                    data.status = ['active', 'aktif'].includes(s) ? 'active' : ['inactive', 'nonaktif'].includes(s) ? 'inactive' : ['leave', 'cuti'].includes(s) ? 'cuti' : 'active'
                }
                if (data.type) {
                    const t = data.type.toLowerCase().trim()
                    data.type = ['karyawan', 'staf', 'staff', 'non-guru', 'kary'].includes(t) ? 'karyawan' : 'guru'
                }
                if (data.teaching_hours) {
                    data.teaching_hours = Number(data.teaching_hours) || 0
                }
                if (data.graduation_year) {
                    data.graduation_year = Number(data.graduation_year) || null
                }
                if (data.phone) {
                    data.phone = data.phone.toString().replace(/[\s-]/g, '')
                    if (data.phone.startsWith('62')) data.phone = '0' + data.phone.slice(2)
                }

                return { ...data, _row: i }
            })

            // Validation
            const issues = []
            preview.forEach((row, i) => {
                const rowIssues = []
                if (!row.name) rowIssues.push('Nama tidak boleh kosong')
                if (row.nbm && preview.slice(0, i).some(p => p.nbm === row.nbm)) rowIssues.push(`NBM "${row.nbm}" duplikat di file`)

                if (rowIssues.length) {
                    issues.push({ row: i + 2, level: 'error', messages: rowIssues })
                    row._hasError = true
                }
            })

            setImportPreview(preview)
            setImportIssues(issues)
        } finally {
            setImportLoading(false)
        }
    }, [])

    const handleImportCellEdit = useCallback((rowIdx, colKey, newValue) => {
        setImportPreview(prev => {
            const next = [...prev]
            next[rowIdx] = { ...next[rowIdx], [colKey]: newValue }

            // Re-validate row
            const rowIssues = []
            if (!next[rowIdx].name) rowIssues.push('Nama tidak boleh kosong')

            next[rowIdx]._hasError = rowIssues.length > 0

            // Re-build all issues
            setImportIssues(prevIssues => {
                const newIssues = prevIssues.filter(iss => iss.row !== rowIdx + 2)
                if (rowIssues.length) {
                    newIssues.push({ row: rowIdx + 2, level: 'error', messages: rowIssues })
                }
                return newIssues.sort((a, b) => a.row - b.row)
            })

            return next
        })
    }, [])

    const handleRemoveImportRow = useCallback(idx => {
        setImportPreview(prev => prev.filter((_, i) => i !== idx))
        setImportIssues(prev => prev.filter(iss => iss.row !== idx + 2).map(iss => iss.row > idx + 2 ? { ...iss, row: iss.row - 1 } : iss))
    }, [])

    const handleBulkFix = useCallback((colKey, value) => {
        setImportPreview(prev => prev.map(r => ({ ...r, [colKey]: value, _hasError: colKey === 'name' ? !value : r._hasError })))
        if (colKey === 'name' && value) setImportIssues(prev => prev.filter(iss => !iss.messages.includes('Nama tidak boleh kosong')))
        addToast(`Berhasil merubah semua baris ke ${value}`, 'success')
    }, [addToast])

    const handleDownloadTemplate = useCallback(async () => {
        const headers = [
            'Nama Lengkap', 'NBM', 'Mata Pelajaran', 'Jenis Kelamin', 'No. WhatsApp',
            'Email', 'Status', 'Jenis Pegawai', 'NIK', 'NIP',
            'NUPTK', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Status Kepegawaian',
            'Jam Mengajar', 'Pendidikan Terakhir', 'Jurusan', 'Tahun Lulus'
        ]
        const data = [
            [
                'Ahmad Fauzi, S.Pd', '12345678', 'Bahasa Indonesia', 'L', '081234567890',
                'ahmad@sekolah.sch.id', 'active', 'guru', '320101XXXXXXXXXX', '19850312XXXXXXXXXX',
                '9876543210987654', 'Jakarta', '1985-03-12', 'Jl. Merdeka No. 123', 'GTY',
                24, 'S1', 'Pendidikan Bahasa Indonesia', 2008
            ],
            [
                'Siti Aminah, M.Pd', '87654321', 'Matematika', 'P', '089876543210',
                'siti@sekolah.sch.id', 'active', 'guru', '320101XXXXXXXXXY', '',
                '', 'Bandung', '1989-07-24', 'Jl. Kenanga No. 45', 'GTY',
                28, 'S2', 'Pendidikan Matematika', 2013
            ],
            [
                'Budi Hartono', '', '', 'L', '085678901234',
                'budi@sekolah.sch.id', 'active', 'karyawan', '320101XXXXXXXXXZ', '',
                '', 'Surabaya', '1992-11-05', 'Jl. Melati No. 8', 'PTY',
                0, 'SMA', 'IPS', 2010
            ]
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

        // Auto column width (perfectly padded like in Student template!)
        ws['!cols'] = [
            { wch: 25 }, // Nama Lengkap
            { wch: 12 }, // NBM
            { wch: 20 }, // Mata Pelajaran
            { wch: 15 }, // Jenis Kelamin (L/P)
            { wch: 18 }, // No. WhatsApp
            { wch: 25 }, // Email
            { wch: 12 }, // Status (active)
            { wch: 15 }, // Jenis Pegawai (guru/karyawan)
            { wch: 20 }, // NIK
            { wch: 22 }, // NIP
            { wch: 20 }, // NUPTK
            { wch: 15 }, // Tempat Lahir
            { wch: 15 }, // Tanggal Lahir
            { wch: 30 }, // Alamat
            { wch: 20 }, // Status Kepegawaian (GTY)
            { wch: 15 }, // Jam Mengajar
            { wch: 20 }, // Pendidikan Terakhir
            { wch: 25 }, // Jurusan
            { wch: 12 }  // Tahun Lulus
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import Guru')
        XLSX.writeFile(wb, 'Template Import Guru.xlsx')
    }, [])

    const importReadyRows = useMemo(() => importPreview.filter(r => !r._hasError), [importPreview])
    const hasImportBlockingErrors = useMemo(() => importIssues.some(x => x.level === 'error'), [importIssues])

    const handleCommitImport = useCallback(async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }

        const validRows = importPreview.filter(r => !r._hasError)

        if (!validRows.length) { addToast('Tidak ada baris valid', 'warning'); return }
        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })
        try {
            const CHUNK = 50
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    name: r.name,
                    nbm: r.nbm || null,
                    subject: r.subject || null,
                    gender: r.gender || null,
                    phone: r.phone || null,
                    email: r.email || null,
                    status: r.status || 'active',
                    type: r.type || 'guru',
                    nik: r.nik || null,
                    nip: r.nip || null,
                    nuptk: r.nuptk || null,
                    birth_place: r.birth_place || null,
                    birth_date: r.birth_date || null,
                    address: r.address || null,
                    employment_status: r.employment_status || 'GTY',
                    teaching_hours: Number(r.teaching_hours) || 0,
                    last_education: r.last_education || null,
                    major: r.major || null,
                    graduation_year: r.graduation_year ? Number(r.graduation_year) : null
                }))
                const { error } = await supabase.from('teachers').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }
            addToast(`Berhasil import ${validRows.length} guru`, 'success')
            await logAudit({ action: 'INSERT', source: 'OPERATIONAL', tableName: 'teachers', newData: { bulk_import: true, count: validRows.length, data: validRows } })
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportFileName('')
            setImportStep(1)
            fetchData()
            fetchStats()
        } catch { addToast('Gagal import (cek constraint DB / duplikat)', 'error') }
        finally { setImporting(false) }
    }, [importPreview, hasImportBlockingErrors, fetchData, fetchStats, addToast, setIsImportModalOpen])

    // ── export data ───────────────────────────────────────────────────────────
    const getExportData = useCallback(async () => {
        let q = supabase.from('teachers').select('name,nbm,subject,gender,phone,email,status,join_date,address').is('deleted_at', null)

        if (exportScope === 'selected' && selectedIds.length > 0) {
            q = q.in('id', selectedIds)
        } else if (exportScope === 'filtered') {
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterType) q = q.eq('type', filterType)
        }

        q = q.order('name')
        const { data, error } = await q
        if (error) throw error

        return (data || []).map(t => {
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) row[col.label] = col.fn(t)
            })
            return row
        })
    }, [exportScope, selectedIds, filterStatus, filterGender, filterSubject, filterType, exportColumns])

    const handleExportCSV = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data', 'warning')

            const headers = Object.keys(rows[0])
            const csvContent = [
                ...(options.includeHeader !== false ? [headers.join(',')] : []),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${filename || 'export_guru'}.csv`
            a.click()

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'csv',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })

            addToast(`Export CSV berhasil (${rows.length} guru)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export CSV', 'error') }
        finally { setExporting(false) }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    const handleExportExcel = useCallback(async (filename) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data', 'warning')
            const XLSX = await import('xlsx')
            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Data Guru')
            XLSX.writeFile(wb, `${filename || 'export_guru'}.xlsx`)

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'xlsx',
                    scope: exportScope,
                    columns: exportColumns,
                    count: rows.length
                }
            })

            addToast(`Export Excel berhasil (${rows.length} guru)`, 'success')
            setIsExportModalOpen(false)
        } catch { addToast('Gagal export Excel', 'error') }
        finally { setExporting(false) }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    const handleExportPDF = useCallback(async (filename, options = {}) => {
        setExporting(true)
        try {
            const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const autoTable = autoTableMod.default || autoTableMod
            const allRows = await getExportData()
            if (!allRows.length) return addToast('Tidak ada data untuk diekspor', 'warning')

            const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
            doc.setFontSize(13)
            doc.text('Laporan Data Guru', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} guru  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))

            autoTable(doc, {
                head: options.includeHeader !== false ? [headers] : [],
                body: rows,
                startY: 22,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    'Gender': { halign: 'center' },
                    'NBM': { halign: 'center' },
                    'NIK': { halign: 'center' },
                    'NIP': { halign: 'center' },
                    'NUPTK': { halign: 'center' },
                    'Status': { halign: 'center' },
                    'Tgl Bergabung': { halign: 'center' },
                    'Tanggal Lahir': { halign: 'center' },
                    'No. HP/WA': { halign: 'center' },
                    'Jam Mengajar': { halign: 'right' },
                    'Tahun Lulus': { halign: 'center' }
                }
            })

            // Add enterprise footer with pagination and metadata
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150);
                const dateStr = new Date().toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
                doc.text(`Dicetak otomatis oleh Laporanmu pada ${dateStr}`, 14, doc.internal.pageSize.height - 8);
                doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8);
            }

            doc.save(`${filename || 'export_guru'}.pdf`)
            addToast(`Export PDF berhasil (${allRows.length} guru)`, 'success')

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'teachers',
                newData: {
                    format: 'pdf',
                    scope: exportScope,
                    columns: exportColumns,
                    count: allRows.length
                }
            })
            setIsExportModalOpen(false)
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
        }
    }, [getExportData, exportScope, exportColumns, addToast, setIsExportModalOpen])

    return {
        importStep, setImportStep, importFileName, setImportFileName, importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders, importColumnMapping, setImportColumnMapping,
        importPreview, setImportPreview, importIssues, setImportIssues, importLoading, setImportLoading,
        importValidationOpen, setImportValidationOpen, importDrag, setImportDrag, importing, setImporting,
        importProgress, setImportProgress, importEditCell, setImportEditCell, importSkipDupes, setImportSkipDupes,
        exportScope, setExportScope, exportColumns, setExportColumns, exporting, setExporting,
        importReadyRows, hasImportBlockingErrors, SYSTEM_COLS, ALL_EXPORT_COLUMNS,
        processImportFile, buildImportPreview, handleImportCellEdit, handleRemoveImportRow,
        handleBulkFix, handleDownloadTemplate, handleCommitImport, getExportData,
        handleExportCSV, handleExportExcel, handleExportPDF
    }
}
