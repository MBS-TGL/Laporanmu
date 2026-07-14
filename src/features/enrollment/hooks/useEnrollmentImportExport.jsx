import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

export const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Pendaftar', synonyms: ['nama', 'name', 'nama lengkap', 'full name', 'pendaftar', 'nama pendaftar', 'calon santri'] },
    { key: 'gender', label: 'Gender', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex', 'l/p'] },
    { key: 'phone', label: 'No. HP / WA', synonyms: ['phone', 'no_hp', 'hp', 'whatsapp', 'wa', 'telp', 'telepon', 'phone number', 'no. whatsapp', 'no whatsapp', 'no. hp / wa', 'no. hp', 'whatsapp number'] },
    { key: 'nisn', label: 'NISN', synonyms: ['nisn', 'nomor induk siswa nasional', 'nisn pendaftar'] },
    { key: 'school_origin', label: 'Asal Sekolah', synonyms: ['asal sekolah', 'school_origin', 'school', 'asal_sekolah', 'sd/mi', 'sekolah asal', 'sekolah'] },
    { key: 'program', label: 'Program', synonyms: ['program', 'pilihan program', 'program studi', 'jurusan'] },
    { key: 'wave_name', label: 'Gelombang', synonyms: ['gelombang', 'wave', 'wave_name', 'periode'] },
    { key: 'birth_place', label: 'Tempat Lahir', synonyms: ['tempat lahir', 'birth_place', 'birthplace', 'tmp_lahir'] },
    { key: 'birth_date', label: 'Tanggal Lahir', synonyms: ['tanggal lahir', 'birth_date', 'tgl_lahir', 'tgl lahir'] },
    { key: 'father_name', label: 'Nama Ayah', synonyms: ['nama ayah', 'father_name', 'father name', 'nama bapak'] },
    { key: 'mother_name', label: 'Nama Ibu', synonyms: ['nama ibu', 'mother_name', 'mother name', 'nama mama'] },
    { key: 'address', label: 'Alamat', synonyms: ['alamat', 'address', 'alamat lengkap'] },
]

export function useEnrollmentImportExport({
    enrollments,
    waves,
    fetchData,
    addToast,
    closeModal,
    importFileInputRef,
    generateCode, // function to generate REG-XXXX-XXXX
    selectedIds,
    selectedEnrollments,
    filterWave,
    filterStatus,
    filterGender,
    filterProgram,
    debouncedSearch,
    sortBy
}) {
    // ---- STATE ----
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    // Export Wizard state
    const [exportScope, setExportScope] = useState('filtered') // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState(['no_reg', 'nama', 'gender', 'asal_sekolah', 'program', 'phone', 'status', 'gelombang'])

    const [importTab, setImportTab] = useState('guideline')
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importStep, setImportStep] = useState(1) // 1: Upload, 2: Mapping, 3: Review
    const [importRawData, setImportRawData] = useState([]) // original rows from file
    const [importFileHeaders, setImportFileHeaders] = useState([]) // headers from file
    const [importColumnMapping, setImportColumnMapping] = useState({}) // { sys_key: user_header }
    const [importDuplicates, setImportDuplicates] = useState([]) // row indices flagged as duplicate
    const [importSkipDupes, setImportSkipDupes] = useState(true) // skip duplicates on commit
    const [importDragOver, setImportDragOver] = useState(false) // drag-drop highlight
    const [importValidationOpen, setImportValidationOpen] = useState(false) // collapsible validation notes
    const [importLoading, setImportLoading] = useState(false) // loading state during file parsing
    const [isRevalidating, setIsRevalidating] = useState(false)
    const [importEditCell, setImportEditCell] = useState(null)
    const [importCachedDBEnrollments, setImportCachedDBEnrollments] = useState({ names: new Set(), nisns: new Set() })
    const [exporting, setExporting] = useState(false)

    // ---- COMPUTED ----
    const importReadyRows = useMemo(() => {
        if (!importPreview.length) return []
        const errorSet = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const dupeSet = new Set(importDuplicates)
        return importPreview.filter((_, i) => {
            if (errorSet.has(i)) return false
            if (importSkipDupes && dupeSet.has(i)) return false
            return true
        })
    }, [importPreview, importIssues, importDuplicates, importSkipDupes])

    // ---- EXPORT LOGIC ----
    const ALL_EXPORT_COLUMNS = [
        { key: 'id', label: 'ID', fn: e => e.id },
        { key: 'no_reg', label: 'No. Registrasi', fn: e => e.registration_number || '' },
        { key: 'nama', label: 'Nama', fn: e => e.name || '' },
        { key: 'gender', label: 'Gender', fn: e => e.gender === 'L' ? 'Laki-laki' : 'Perempuan' },
        { key: 'nisn', label: 'NISN', fn: e => e.nisn || '' },
        { key: 'asal_sekolah', label: 'Asal Sekolah', fn: e => e.school_origin || '' },
        { key: 'previous_pesantren', label: 'Pesantren Sebelumnya', fn: e => e.previous_pesantren || '' },
        { key: 'program', label: 'Program', fn: e => e.program || 'reguler' },
        { key: 'gelombang', label: 'Gelombang', fn: e => e.waveName || '' },
        { key: 'phone', label: 'No. WhatsApp', fn: e => e.phone || '' },
        { key: 'birth_place', label: 'Tempat Lahir', fn: e => e.birth_place || '' },
        { key: 'birth_date', label: 'Tanggal Lahir', fn: e => e.birth_date || '' },
        { key: 'father_name', label: 'Nama Ayah', fn: e => e.father_name || '' },
        { key: 'mother_name', label: 'Nama Ibu', fn: e => e.mother_name || '' },
        { key: 'address', label: 'Alamat', fn: e => e.address || '' },
        { key: 'uniform_size', label: 'Ukuran Seragam', fn: e => e.uniform_size || 'M' },
        { key: 'status', label: 'Status', fn: e => e.status || 'mendaftar' },
    ]

    const getExportData = async () => {
        let sourceData = []

        if (exportScope === 'selected' && selectedIds.length > 0) {
            sourceData = selectedEnrollments
            return sourceData.map(e => {
                const row = {}
                exportColumns.forEach(key => {
                    const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                    if (col) {
                        row[col.label] = col.fn(e)
                    }
                })
                return row
            })
        }

        // Fetch from Supabase for 'filtered' and 'all'
        let q = supabase
            .from('enrollments')
            .select('*, enrollment_waves(name)')
            .is('metadata->>deleted_at', null)

        if (exportScope === 'filtered') {
            if (filterWave) q = q.eq('wave_id', filterWave)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterProgram) q = q.eq('program', filterProgram)
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_number.ilike.%${s}%,nisn.ilike.%${s}%,phone.ilike.%${s}%,school_origin.ilike.%${s}%`)
            }
        }

        if (sortBy === 'name_asc') q = q.order('name', { ascending: true })
        else if (sortBy === 'name_desc') q = q.order('name', { ascending: false })
        else if (sortBy === 'date_asc') q = q.order('created_at', { ascending: true })
        else q = q.order('created_at', { ascending: false })

        const { data, error } = await q
        if (error) throw error

        const transformed = (data || []).map(e => {
            const meta = e.metadata || {}
            return {
                ...e,
                waveName: e.enrollment_waves?.name || '-',
                father_name: meta.father_name || '',
                mother_name: meta.mother_name || '',
                address: meta.address || '',
                uniform_size: meta.uniform_size || 'M',
            }
        })

        return transformed.map(e => {
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) {
                    row[col.label] = col.fn(e)
                }
            })
            return row
        })
    }

    const handleDownloadTemplate = async () => {
        const templateData = [
            {
                'Nama Pendaftar': 'Fulan Ahmad',
                'Gender': 'L',
                'No. HP / WA': '081234567890',
                'NISN': '1234567890',
                'Asal Sekolah': 'SDN 1 Depok',
                'Program': 'reguler',
                'Gelombang': waves.find(w => w.is_active)?.name || 'Gelombang 1',
                'Tempat Lahir': 'Jakarta',
                'Tanggal Lahir': '2012-08-20',
                'Nama Ayah': 'Abdullah',
                'Nama Ibu': 'Aminah',
                'Alamat': 'Jl. Mawar No. 12, Depok'
            },
            {
                'Nama Pendaftar': 'Fulanah Aisyah',
                'Gender': 'P',
                'No. HP / WA': '089876543210',
                'NISN': '0987654321',
                'Asal Sekolah': 'MI Al-Ikhlas',
                'Program': 'boarding',
                'Gelombang': waves.find(w => w.is_active)?.name || 'Gelombang 1',
                'Tempat Lahir': 'Bandung',
                'Tanggal Lahir': '2012-11-05',
                'Nama Ayah': 'Abdurrahman',
                'Nama Ibu': 'Fathimah',
                'Alamat': 'Jl. Melati No. 5, Bandung'
            }
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [
            { wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 15 },
            { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template PSB')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadBlob(blob, 'Template Import Pendaftar PSB.xlsx')
    }

    const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()

    const normalizePhone = (raw) => {
        const v = String(raw ?? '').trim()
        if (!v) return ''
        const cleaned = v.replace(/[\s-]/g, '')
        const keepPlus = cleaned.startsWith('+') ? '+' : ''
        const digits = cleaned.replace(/[^\d]/g, '')
        return keepPlus ? `+${digits}` : digits
    }

    const isValidPhone = (phone) => {
        if (!phone) return true
        return /^(\+?62|08)\d{8,12}$/.test(phone)
    }

    const normalizeDate = (raw) => {
        if (!raw) return null
        if (raw instanceof Date) {
            return raw.toISOString().split('T')[0]
        }
        const d = new Date(raw)
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0]
        }
        return raw
    }

    const pick = (obj, keys) => {
        for (const k of keys) {
            const v = obj?.[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return v
        }
        return ''
    }

    const parseCSVFile = async (file) => {
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

    const parseExcelFile = async (file) => {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array', cellDates: true })
        const firstSheet = wb.SheetNames[0]
        const ws = wb.Sheets[firstSheet]
        return XLSX.utils.sheet_to_json(ws, { defval: '' })
    }

    const buildImportPreview = async (rows, mapping) => {
        const preview = rows.map((r) => {
            const getVal = (row, sysKey) => {
                if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                return sanitizeText(pick(row, colDef ? colDef.synonyms : [sysKey]))
            }

            const name = getVal(r, 'name')
            const genderRaw = getVal(r, 'gender')
            const phone = normalizePhone(getVal(r, 'phone'))
            const nisn = getVal(r, 'nisn')
            const schoolOrigin = getVal(r, 'school_origin')
            const programRaw = getVal(r, 'program')
            const waveName = getVal(r, 'wave_name')
            const birthPlace = getVal(r, 'birth_place')
            const birthDate = normalizeDate(mapping && mapping['birth_date'] ? r[mapping['birth_date']] : pick(r, SYSTEM_COLS.find(c => c.key === 'birth_date')?.synonyms || ['birth_date']))
            const fatherName = getVal(r, 'father_name')
            const motherName = getVal(r, 'mother_name')
            const address = getVal(r, 'address')

            let gender = 'L'
            if (genderRaw) {
                const l = genderRaw.toLowerCase()
                if (l.startsWith('l') || l === 'pria' || l === 'cowok' || l === 'laki') gender = 'L'
                else if (l.startsWith('p') || l === 'wanita' || l === 'cewek' || l === 'perempuan') gender = 'P'
            }

            let program = 'reguler'
            if (programRaw) {
                const p = programRaw.toLowerCase()
                if (p.includes('tahfidz')) program = 'tahfidz'
                else if (p.includes('kitab')) program = 'kitab'
            }

            const matchedWave = waves.find(w => w.name.toLowerCase() === (waveName || '').toLowerCase()) || waves.find(w => w.is_active)

            return {
                name,
                gender,
                phone,
                nisn: nisn || null,
                school_origin: schoolOrigin || null,
                program,
                wave_id: matchedWave?.id || '',
                birth_place: birthPlace || null,
                birth_date: birthDate || null,
                status: 'mendaftar',
                metadata: {
                    father_name: fatherName || '',
                    mother_name: motherName || '',
                    address: address || '',
                    uniform_size: 'M',
                },
                _waveName: matchedWave?.name || '',
                _isDupe: false,
                _hasError: false,
                _hasWarn: false,
            }
        })

        let existingNames = new Set()
        let existingNisns = new Set()
        try {
            const { data } = await supabase
                .from('enrollments')
                .select('name, nisn')
                .is('metadata->>deleted_at', null)
            if (data) {
                existingNames = new Set(data.map(e => (e.name || '').toLowerCase().trim()))
                existingNisns = new Set(data.filter(e => e.nisn).map(e => String(e.nisn).trim()))
            }
        } catch (e) { console.error(e) }

        setImportCachedDBEnrollments({ names: existingNames, nisns: existingNisns })
        setImportPreview(preview)
        validateImportPreview(preview, existingNames, existingNisns)
    }

    const validateImportPreview = (preview, dbNames = null, dbNisns = null) => {
        const issues = []
        const dupeIndices = []

        const names = dbNames || importCachedDBEnrollments.names
        const nisns = dbNisns || importCachedDBEnrollments.nisns

        const seenNames = new Map()
        const seenNisns = new Map()

        const validated = preview.map((r, idx) => {
            const rowIssues = []

            if (!r.name) rowIssues.push({ level: 'error', message: 'Nama pendaftar tidak boleh kosong' })
            if (!r.wave_id) rowIssues.push({ level: 'error', message: 'Gelombang tidak valid atau tidak aktif' })
            if (r.phone && !isValidPhone(r.phone)) rowIssues.push({ level: 'warn', message: 'Format No. HP/WA mungkin tidak valid' })

            let isDupe = false
            const lowerName = (r.name || '').toLowerCase().trim()
            const cleanNisn = String(r.nisn || '').trim()

            if (lowerName && names.has(lowerName)) isDupe = true
            if (cleanNisn && nisns.has(cleanNisn)) isDupe = true

            if (lowerName) {
                if (seenNames.has(lowerName)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `Nama sama dengan baris ${seenNames.get(lowerName) + 2}` })
                } else seenNames.set(lowerName, idx)
            }
            if (cleanNisn) {
                if (seenNisns.has(cleanNisn)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `NISN sama dengan baris ${seenNisns.get(cleanNisn) + 2}` })
                } else seenNisns.set(cleanNisn, idx)
            }

            if (isDupe) dupeIndices.push(idx)
            if (rowIssues.length) {
                issues.push({
                    row: idx + 2,
                    level: rowIssues.some(x => x.level === 'error') ? 'error' : rowIssues.some(x => x.level === 'dupe') ? 'dupe' : 'warn',
                    messages: rowIssues.map(x => x.message)
                })
            }

            return {
                ...r,
                _isDupe: isDupe,
                _hasError: rowIssues.some(x => x.level === 'error'),
                _hasWarn: rowIssues.some(x => x.level === 'warn')
            }
        })

        setImportPreview(validated)
        setImportIssues(issues)
        setImportDuplicates(dupeIndices)
        setImportValidationOpen(issues.length > 0)
    }

    const processImportFile = async (file) => {
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast('Format file tidak didukung. Gunakan .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportDuplicates([])
        setImportLoading(true)

        try {
            const isXlsx = ext.endsWith('.xlsx')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)
            if (!rows.length) {
                addToast('File kosong atau tidak dapat dibaca', 'error')
                return
            }

            setImportRawData(rows)
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)

            const mapping = {}
            const norm = (str) => (str || '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()
            SYSTEM_COLS.forEach(sys => {
                const match = headers.find(h => {
                    const normH = norm(h)
                    const cleanH = norm(h.split(/[\(\[\{（\n\r]/)[0])
                    const normL = norm(sys.label)
                    const normK = norm(sys.key)
                    if (normH === normL || normH === normK || cleanH === normL || cleanH === normK) return true
                    if (sys.synonyms && sys.synonyms.some(syn => {
                        const s = norm(syn)
                        return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })
            setImportColumnMapping(mapping)
            setImportStep(2)
        } catch (e) {
            console.error(e)
            addToast('Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const handleBulkFix = (sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            if (sysKey === 'wave_id') {
                updated._waveName = waves.find(x => x.id === value)?.name || ''
            }
            return updated
        })
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
        addToast(`Berhasil memperbarui semua baris`, 'success')
    }

    const handleImportCellEdit = (index, key, value) => {
        const newPrev = [...importPreview]
        const updatedRow = { ...newPrev[index], [key]: value }
        if (key === 'wave_id') {
            updatedRow._waveName = waves.find(w => w.id === value)?.name || value
        }
        newPrev[index] = updatedRow
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
    }

    const handleRemoveImportRow = (idx) => {
        const next = importPreview.filter((_, i) => i !== idx)
        setImportPreview(next)
        validateImportPreview(next)
        addToast('Baris berhasil dihapus', 'success')
    }

    const handleImportClick = () => {
        if (!isImportModalOpen) {
            setImportStep(1)
            setImportFileName('')
            setImportRawData([])
            setImportPreview([])
            setImportIssues([])
            setImportDuplicates([])
            setImportColumnMapping({})
            setImportLoading(false)
            setIsImportModalOpen(true)
        } else {
            importFileInputRef.current?.click()
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processImportFile(file)
        e.target.value = ''
    }

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleCommitImport = async () => {
        if (!importPreview.length) {
            addToast('Tidak ada data untuk diimport', 'error')
            return
        }
        if (hasImportBlockingErrors) {
            addToast('Harap perbaiki semua error sebelum menyimpan', 'error')
            return
        }
        if (importReadyRows.length === 0) {
            addToast('Tidak ada data baru yang valid untuk diimport', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        const CHUNK = 50
        try {
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map((r, cIdx) => {
                    const { _waveName, _isDupe, _hasError, _hasWarn, ...cleanRow } = r
                    const indexSuffix = String(i + cIdx + 1).padStart(4, '0')
                    const year = new Date().getFullYear()
                    return {
                        ...cleanRow,
                        registration_number: generateCode ? generateCode() : `REG-${year}-${indexSuffix}`,
                        created_at: new Date().toISOString()
                    }
                })
                const { error } = await supabase.from('enrollments').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            addToast(`Berhasil mengimport ${importReadyRows.length} pendaftar baru`, 'success')
            await logAudit({
                action: 'INSERT',
                source: 'SYSTEM',
                tableName: 'enrollments',
                newData: { bulk_import: true, count: importReadyRows.length }
            })

            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportDuplicates([])
            setImportFileName('')
            setImportStep(1)
            await fetchData()
        } catch (e) {
            console.error(e)
            addToast('Gagal melakukan import data', 'error')
        } finally {
            setImporting(false)
        }
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
    }

    const handleExportCSV = async (filename, options = {}) => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const headers = Object.keys(rows[0])
            const csvContent = [
                ...(options.includeHeader !== false ? [headers.join(',')] : []),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `${filename || 'export_psb'}.csv`)
            addToast(`Export CSV sukses (${rows.length} data)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'enrollments',
                newData: { format: 'CSV', count: rows.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export CSV', 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleExportExcel = async (filename) => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const data = await getExportData()
            if (!data.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const ws = XLSX.utils.json_to_sheet(data)
            ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'PSB Pendaftar')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `${filename || 'export_psb'}.xlsx`)
            addToast(`Export Excel sukses (${data.length} data)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'enrollments',
                newData: { format: 'XLSX', count: data.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export Excel', 'error')
        } finally {
            setExporting(false)
        }
    }

    const handleExportPDF = async (filename, options = {}) => {
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
            doc.text('Laporan Pendaftaran Santri Baru (PSB)', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} pendaftar  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)

            const filterInfo = []
            if (filterWave) {
                const wv = waves.find(w => w.id === filterWave)
                if (wv) filterInfo.push(`Gelombang: ${wv.name}`)
            }
            if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
            if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
            if (filterProgram) filterInfo.push(`Program: ${filterProgram}`)
            if (debouncedSearch) filterInfo.push(`Cari: "${debouncedSearch}"`)
            if (filterInfo.length > 0) doc.text(`Filter: ${filterInfo.join(' | ')}`, 14, 24)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))
            autoTable(doc, {
                head: options.includeHeader !== false ? [headers] : [],
                body: rows,
                startY: filterInfo.length ? 28 : 22,
                theme: 'grid',
                styles: { fontSize: 7.5, cellPadding: 2 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    'No. Registrasi': { halign: 'center' },
                    'Gender': { halign: 'center' },
                    'No. WhatsApp': { halign: 'center' },
                    'Status': { halign: 'center' },
                }
            })

            const pageCount = doc.internal.getNumberOfPages()
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(7)
                doc.setTextColor(150)
                const dateStr = new Date().toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                })
                doc.text(`Dicetak otomatis oleh Laporanmu pada ${dateStr}`, 14, doc.internal.pageSize.height - 8)
                doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 8)
            }

            doc.save(`${filename || 'export_psb'}.pdf`)
            addToast(`Export PDF sukses (${allRows.length} data)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'enrollments',
                newData: { format: 'PDF', count: allRows.length, scope: exportScope }
            })
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
        }
    }

    return {
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDuplicates, setImportDuplicates,
        importSkipDupes, setImportSkipDupes,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        isRevalidating,
        importEditCell, setImportEditCell,
        importCachedDBEnrollments, setImportCachedDBEnrollments,
        exporting, setExporting,
        importTab, setImportTab,

        importReadyRows,
        hasImportBlockingErrors,
        ALL_EXPORT_COLUMNS,
        SYSTEM_COLS,

        processImportFile,
        handleImportClick,
        handleFileChange,
        handleCommitImport,
        handleBulkFix,
        validateImportPreview,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    }
}
