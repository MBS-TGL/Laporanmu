import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { RiskThreshold, calculateCompleteness } from '@features/students/utils/studentsConstants'

export const SYSTEM_COLS = [
    { key: 'name', label: 'Nama', synonyms: ['nama', 'name', 'nama lengkap', 'full name', 'student name', 'siswa', 'nama siswa'] },
    { key: 'class_name', label: 'Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombel', 'rombongan belajar'] },
    { key: 'gender', label: 'Gender', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex', 'l/p'] },
    { key: 'nisn', label: 'NISN', synonyms: ['nisn', 'nomor induk siswa nasional', 'nisn siswa'] },
    { key: 'nis', label: 'NIS', synonyms: ['nis', 'nomor induk siswa', 'no induk'] },
    { key: 'nik', label: 'NIK', synonyms: ['nik', 'nomor induk kependudukan', 'no ktp'] },
    { key: 'phone', label: 'No. HP / WA', synonyms: ['phone', 'no_hp', 'hp', 'whatsapp', 'wa', 'telp', 'telepon', 'phone number', 'wali_phone', 'no. whatsapp', 'no whatsapp', 'no. hp / wa', 'no. hp', 'whatsapp number'] },
    { key: 'birth_place', label: 'Tempat Lahir', synonyms: ['tempat lahir', 'birth_place', 'birthplace', 'tmp_lahir'] },
    { key: 'birth_date', label: 'Tanggal Lahir', synonyms: ['tanggal lahir', 'birth_date', 'tgl_lahir', 'tgl lahir'] },
    { key: 'religion', label: 'Agama', synonyms: ['agama', 'religion'] },
    { key: 'address', label: 'Alamat', synonyms: ['alamat', 'address', 'alamat lengkap'] },
    { key: 'father_name', label: 'Nama Ayah', synonyms: ['nama ayah', 'father_name', 'father name', 'nama bapak'] },
    { key: 'mother_name', label: 'Nama Ibu', synonyms: ['nama ibu', 'mother_name', 'mother name', 'nama mama'] },
    { key: 'guardian_name', label: 'Nama Wali', synonyms: ['guardian_name', 'nama_wali', 'wali', 'parent name', 'nama orang tua', 'nama wali', 'wali murid', 'nama ayah/ibu'] },
    { key: 'guardian_relation', label: 'Hubungan Wali', synonyms: ['hubungan wali', 'guardian_relation', 'relasi wali', 'status wali', 'hubungan'] },
]

export function useStudentsImportExport({
    students,
    classesList,
    fetchData,
    fetchStats,
    addToast,
    closeModal,
    importFileInputRef,
    generateCode,

    // Filter & sort dependencies for export
    filterClasses,
    filterClass,
    filterGender,
    filterStatus,
    filterTag,
    filterMissing,
    debouncedSearch,
    filterPointMode,
    filterPointMin,
    filterPointMax,
    sortBy,

    // Additional features state
    selectedStudentIds,
    selectedStudents,
    gSheetsUrl,
    setFetchingGSheets,
    fetchingGSheets,
    profile // NEW: for forensic audit
}) {
    // ---- STATE ----
    // =========================================
    // Advanced Import and Export System
    // =========================================
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    // Export Wizard state
    const [exportScope, setExportScope] = useState('filtered')   // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState(['kode', 'nama', 'gender', 'kelas', 'poin', 'phone', 'tags']) // Array for ordered keys

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
    const [isRevalidating, setIsRevalidating] = useState(false) // spinning icon state for Re-validasi button
    const [importEditCell, setImportEditCell] = useState(null) // { idx, key }
    const [importCachedDBStudents, setImportCachedDBStudents] = useState({ names: new Set(), nisns: new Set() })
    const [exporting, setExporting] = useState(false)

    // ---- COMPUTED & EFFECTS ----
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

    // Effect to re-validate on manual preview edits (Inline Editing)
    useEffect(() => {
        if (isImportModalOpen && importStep === 3 && importPreview.length > 0) {
            // Note: we only trigger if validPreview changes, but we must avoid infinite loops
            // The validateImportPreview itself sets state, so we must be CAREFUL.
            // A better way is to only call this on Cell Blur.
        }
    }, [importSkipDupes])

    // Rentang Poin Filter

    // ---- EXPORT LOGIC ----
    // NEW: Fitur 9 - Export hasil filter aktif
    const fetchFilteredForExport = async () => {
        let q = supabase.from('students').select(`*, classes (name)`).is('deleted_at', null)

        // Sync with primary filters
        if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
        else if (filterClass) q = q.eq('class_id', filterClass)
        if (filterGender) q = q.eq('gender', filterGender)
        if (filterStatus) q = q.eq('status', filterStatus)
        if (filterTag) q = q.contains('tags', [filterTag])

        // filterMissing logic
        if (filterMissing === 'photo') {
            q = q.or('photo_url.is.null,photo_url.eq.""')
        } else if (filterMissing === 'wa') {
            q = q.or('phone.is.null,phone.eq.""')
        }

        if (debouncedSearch) {
            const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
            q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
        }

        // Points filters
        if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
        else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
        else if (filterPointMode === 'custom') {
            if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
            if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
        }

        // Sorting (Important for 'New Student' or 'Top Performer' presets)
        if (sortBy === 'total_points_desc') q = q.order('total_points', { ascending: false })
        else if (sortBy === 'created_at') q = q.order('created_at', { ascending: false })
        else q = q.order('name', { ascending: true })

        const { data, error } = await q
        if (error) throw error

        return (data || []).map(s => ({
            ID: s.id,
            'Kode Registrasi': s.registration_code || '',
            NISN: s.nisn || '',
            Nama: s.name || '',
            Gender: s.gender === 'L' ? 'Putra' : 'Putri',
            Kelas: s.classes?.name || '',
            Poin: s.total_points ?? 0,
            Phone: s.phone || '',
            Status: s.status || 'aktif',
            Tags: (s.tags || []).join(', '),
            'Data Lengkap': `${calculateCompleteness(s)}%`
        }))
    }

    // â”€â”€ Export Wizard: ambil data sesuai scope & kolom yang dipilih â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ALL_EXPORT_COLUMNS = [
        { key: 'id', label: 'ID', fn: s => s.id },
        { key: 'kode', label: 'Kode Registrasi', fn: s => s.registration_code || '' },
        { key: 'nisn', label: 'NISN', fn: s => s.nisn || '' },
        { key: 'nis', label: 'NIS', fn: s => s.nis || '' },
        { key: 'nik', label: 'NIK', fn: s => s.nik || '' },
        { key: 'nama', label: 'Nama', fn: s => s.name || '' },
        { key: 'gender', label: 'Gender', fn: s => s.gender === 'L' ? 'Putra' : 'Putri' },
        { key: 'kelas', label: 'Kelas', fn: s => s.classes?.name || '' },
        { key: 'birth_place', label: 'Tempat Lahir', fn: s => s.birth_place || '' },
        { key: 'birth_date', label: 'Tanggal Lahir', fn: s => s.birth_date || '' },
        { key: 'religion', label: 'Agama', fn: s => s.religion || '' },
        { key: 'address', label: 'Alamat', fn: s => s.address || '' },
        { key: 'father_name', label: 'Nama Ayah', fn: s => s.metadata?.father?.name || s.father_name || '' },
        { key: 'mother_name', label: 'Nama Ibu', fn: s => s.metadata?.mother?.name || s.mother_name || '' },
        { key: 'guardian_name', label: 'Nama Wali', fn: s => s.guardian_name || '' },
        { key: 'poin', label: 'Poin', fn: s => s.total_points ?? 0 },
        { key: 'phone', label: 'Phone/WA', fn: s => s.phone || '' },
        { key: 'status', label: 'Status', fn: s => s.status || 'aktif' },
        { key: 'tags', label: 'Label', fn: s => (s.tags || []).join(', ') },
        { key: 'kelengkapan', label: 'Kelengkapan Data', fn: s => `${calculateCompleteness(s)}%` },
    ]

    const getExportData = async () => {
        let sourceData = []

        if (exportScope === 'selected' && selectedStudentIds.length > 0) {
            // Ambil dari data yang sudah ada di state (sudah include className)
            sourceData = selectedStudents
            // Mapping manual karena struktur berbeda dengan supabase response
            return sourceData.map(s => {
                const row = {}
                exportColumns.forEach(key => {
                    const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                    if (col) {
                        // Untuk kelas, gunakan className dari state
                        if (key === 'kelas') row[col.label] = s.className || ''
                        else row[col.label] = col.fn(s)
                    }
                })
                return row
            })
        }

        // Untuk 'filtered' dan 'all', fetch dari Supabase
        let q = supabase.from('students').select('*, classes (name)').is('deleted_at', null)

        if (exportScope === 'filtered') {
            if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])
            if (filterMissing === 'photo') q = q.or('photo_url.is.null,photo_url.eq.""')
            else if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
            }
            if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }
        }
        // exportScope === 'all': no extra filters

        if (sortBy === 'total_points_desc') q = q.order('total_points', { ascending: false })
        else if (sortBy === 'created_at') q = q.order('created_at', { ascending: false })
        else q = q.order('name', { ascending: true })

        const { data, error } = await q
        if (error) throw error

        // Mapping data berdasarkan urutan di exportColumns (Array)
        return (data || []).map(s => {
            const row = {}
            exportColumns.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) {
                    if (key === 'kelas') row[col.label] = s.classes?.name || ''
                    else row[col.label] = col.fn(s)
                }
            })
            return row
        })
    }

    // ---- GOOGLE SHEETS ----
    // NEW: Fitur 12 - Import Google Sheets
    const handleFetchGSheets = async () => {
        if (!gSheetsUrl.trim()) { addToast('Masukkan URL Google Sheets terlebih dahulu', 'warning'); return }
        setFetchingGSheets(true)
        try {
            // Extract spreadsheet ID
            const match = gSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
            if (!match) throw new Error('URL tidak valid')
            const sheetId = match[1]
            // Fetch as CSV (requires public sheet)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
            const res = await fetch(csvUrl)
            if (!res.ok) throw new Error('Gagal fetch sheet —” pastikan sheet bersifat publik')
            const text = await res.text()
            const rows = await parseCSVFile(new Blob([text], { type: 'text/csv' }))
            if (!rows.length) throw new Error('Sheet kosong')
            await buildImportPreview(rows)
            setIsImportModalOpen(true)
            setImportStep(2)
            addToast(`${rows.length} baris berhasil dibaca dari Google Sheets`, 'success')
            await logAudit({
                action: 'READ', source: 'SYSTEM', tableName: 'students',
                newData: { via: 'gsheets', row_count: rows.length, url: gSheetsUrl }
            })
        } catch (err) {
            addToast(err.message || 'Gagal mengambil data dari Google Sheets', 'error')
        } finally {
            setFetchingGSheets(false)
        }
    }

    const handleDownloadTemplate = async () => {
        const templateData = [
            {
                'Nama': 'Ahmad Rizki',
                'Jenis Kelamin': 'L',
                'No. WhatsApp': '081234567890',
                'Kelas': 'XII IPA 1',
                'NIS': '2024001',
                'NISN': '1234567890',
                'NIK': '320101XXXXXXXXXX',
                'Tempat Lahir': 'Jakarta',
                'Tanggal Lahir': '2008-05-15',
                'Agama': 'Islam',
                'Alamat': 'Jl. Merdeka No. 123',
                'Nama Ayah': 'Budi Rizki',
                'Nama Ibu': 'Siti Maryam',
                'Nama Wali': 'Budi Rizki',
                'Hubungan Wali': 'Ayah'
            },
            {
                'Nama': 'Siti Aminah',
                'Jenis Kelamin': 'P',
                'No. WhatsApp': '081234567891',
                'Kelas': 'XI IPS 2',
                'NIS': '2024002',
                'NISN': '0987654321',
                'NIK': '320101XXXXXXXXXY',
                'Tempat Lahir': 'Bandung',
                'Tanggal Lahir': '2009-02-20',
                'Agama': 'Islam',
                'Alamat': 'Jl. Kenanga No. 45',
                'Nama Ayah': 'Mulyono',
                'Nama Ibu': 'Aminah',
                'Nama Wali': 'Aminah',
                'Hubungan Wali': 'Ibu'
            },
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(templateData)
        // Auto column width (approximate)
        ws['!cols'] = [
            { wch: 25 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
            { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 },
            { wch: 20 }, { wch: 20 }, { wch: 15 }
        ]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        const blobUrl = URL.createObjectURL(blob)
        link.href = blobUrl
        link.download = 'Template Import Siswa.xlsx'
        link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    }

    // ---- HELPERS & IMPORT PROCESS ----
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
        return /^(\+?62|08)\d{8,11}$/.test(phone)
    }

    const normalizeDate = (raw) => {
        if (!raw) return null
        // If it's already a JS Date (from XLSX cellDates: true)
        if (raw instanceof Date) {
            return raw.toISOString().split('T')[0]
        }
        // If it's a string, try to parse
        const d = new Date(raw)
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0]
        }
        return raw // fallback
    }


    const pick = (obj, keys) => {
        // Now 'keys' can be a specific header from user mapping
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
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        return json
    }

    const buildImportPreview = async (rows, mapping) => {
        // 1. Initial Mapping & Pre-processing
        const preview = rows.map((r) => {
            const getVal = (row, sysKey) => {
                if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                return sanitizeText(pick(row, colDef ? colDef.synonyms : [sysKey]))
            }

            const name = getVal(r, 'name')
            const className = getVal(r, 'class_name')
            const genderRaw = getVal(r, 'gender')
            const nisn = getVal(r, 'nisn')
            const nis = getVal(r, 'nis')
            const nik = getVal(r, 'nik')
            const phone = normalizePhone(getVal(r, 'phone'))
            const birthPlace = getVal(r, 'birth_place')
            const birthDate = normalizeDate(mapping && mapping['birth_date'] ? r[mapping['birth_date']] : pick(r, SYSTEM_COLS.find(c => c.key === 'birth_date')?.synonyms || ['birth_date']))
            const religion = getVal(r, 'religion')
            const address = getVal(r, 'address')
            const fatherName = getVal(r, 'father_name')
            const motherName = getVal(r, 'mother_name')
            const guardianName = getVal(r, 'guardian_name')
            const guardianRelation = getVal(r, 'guardian_relation')

            let gender = genderRaw
            if (genderRaw) {
                const l = genderRaw.toLowerCase()
                if (l.startsWith('l') || l === 'pria' || l === 'cowok' || l === 'laki') gender = 'L'
                else if (l.startsWith('p') || l === 'wanita' || l === 'cewek' || l === 'perempuan') gender = 'P'
                else gender = 'L'
            } else {
                gender = 'L'
            }

            const classObj = classesList.find(c => c.name.toLowerCase() === (className || '').toLowerCase())

            return {
                name,
                gender,
                phone,
                nisn,
                nis: nis || null,
                nik: nik || null,
                birth_place: birthPlace || null,
                birth_date: birthDate || null,
                religion: religion || null,
                address: address || null,
                class_id: classObj?.id || '',
                guardian_name: guardianName || null,
                guardian_relation: guardianRelation || 'Ayah',
                photo_url: null,
                metadata: {
                    father: { name: fatherName || '' },
                    mother: { name: motherName || '' },
                    address_detail: {
                        street: address || ''
                    }
                },
                _className: className || '',
                _isDupe: false,
                _hasError: false,
                _hasWarn: false,
            }
        })

        // 2. Initial Fetch of DB Students (Cache)
        let existingNames = new Set()
        let existingNisn = new Set()
        try {
            const { data: allStudents } = await supabase
                .from('students')
                .select('name, nisn')
                .is('deleted_at', null)
            if (allStudents) {
                existingNames = new Set(allStudents.map(s => (s.name || '').toLowerCase().trim()))
                existingNisn = new Set(allStudents.filter(s => s.nisn).map(s => String(s.nisn).trim()))
            }
        } catch (err) { console.error(err) }

        setImportCachedDBStudents({ names: existingNames, nisns: existingNisn })
        setImportPreview(preview)
        validateImportPreview(preview, existingNames, existingNisn)
    }

    const validateImportPreview = (preview, dbNames = null, dbNisns = null) => {
        const issues = []
        const dupeIndices = []

        const names = dbNames || importCachedDBStudents.names
        const nisns = dbNisns || importCachedDBStudents.nisns

        const seenNamesInFile = new Map()
        const seenNisnInFile = new Map()

        const validated = preview.map((r, idx) => {
            const rowIssues = []

            // Required checks
            if (!r.name) rowIssues.push({ level: 'error', message: 'Nama tidak boleh kosong' })
            if (!r.class_id) rowIssues.push({ level: 'error', message: 'Kelas tidak valid atau tidak ditemukan' })
            if (r.phone && !isValidPhone(r.phone)) rowIssues.push({ level: 'warn', message: 'Format No. HP mungkin salah (cek lagi jika ragu)' })

            // Dupe check
            let isDupe = false
            const lowerName = (r.name || '').toLowerCase().trim()
            const cleanNisn = String(r.nisn || '').trim()

            if (lowerName && names.has(lowerName)) isDupe = true
            if (cleanNisn && nisns.has(cleanNisn)) isDupe = true

            // Within file dupe
            if (lowerName) {
                if (seenNamesInFile.has(lowerName)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `Nama sama dengan baris ${seenNamesInFile.get(lowerName) + 1}` })
                } else seenNamesInFile.set(lowerName, idx)
            }
            if (cleanNisn) {
                if (seenNisnInFile.has(cleanNisn)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `NISN sama dengan baris ${seenNisnInFile.get(cleanNisn) + 1}` })
                } else seenNisnInFile.set(cleanNisn, idx)
            }

            if (isDupe) dupeIndices.push(idx)
            if (rowIssues.length) {
                issues.push({ row: idx + 2, level: rowIssues.some(x => x.level === 'error') ? 'error' : rowIssues.some(x => x.level === 'dupe') ? 'dupe' : 'warn', messages: rowIssues.map(x => x.message) })
            }

            return {
                ...r,
                _isDupe: isDupe,
                _hasError: rowIssues.some(x => x.level === 'error'),
                _hasWarn: rowIssues.some(x => x.level === 'warn'),
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
            addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportDuplicates([])
        setImportLoading(true)
        try {
            const isXlsx = ext.endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)
            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }

            setImportRawData(rows)

            // Extract headers for mapping
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)

            // Auto-mapping
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
                        return normH === s || cleanH === s || cleanH.replace(/[^a-z0-9]/g,'') === s.replace(/[^a-z0-9]/g,'')
                    })) return true
                    return false
                })
                if (match) mapping[sys.key] = match
            })
            setImportColumnMapping(mapping)

            // Go to step 2: Mapping
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast('Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const handleBulkFix = (sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            if (sysKey === 'class_id') {
                updated._className = classesList.find(x => x.id === value)?.name || ''
            }
            return updated
        })
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
        addToast(`Selesai memperbarui ${newPrev.length} baris`, 'success')
    }

    const handleImportCellEdit = (index, key, value) => {
        const newPrev = [...importPreview]
        const updatedRow = { ...newPrev[index], [key]: value }

        // Special handling for class_id
        if (key === 'class_id') {
            updatedRow._className = classesList.find(c => c.id === value)?.name || value
        }

        newPrev[index] = updatedRow
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
    }

    const handleRemoveImportRow = (idx) => {
        const next = importPreview.filter((_, i) => i !== idx)
        setImportPreview(next)
        validateImportPreview(next)
        addToast('Baris berhasil dihapus dari preview', 'success')
    }

    const handleImportClick = () => {
        // Open the import modal on the Panduan tab first.
        // The actual file picker is triggered from inside the modal.
        if (!isImportModalOpen) {
            // Reset all states for a fresh start
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
            // Already open (e.g. "Ganti File" button inside modal) — open picker directly
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
            addToast('Masih ada ERROR. Perbaiki file dulu ya.', 'error')
            return
        }

        if (importReadyRows.length === 0) {
            addToast('Tidak ada data baru yang valid untuk diimport (semua duplikat atau error)', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        // FIX: batch insert (chunk 50) jauh lebih cepat dari sequential
        const CHUNK = 50
        try {
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map(r => {
                    const { _className, _isDupe, _hasError, _hasWarn, ...cleanRow } = r
                    return {
                        ...cleanRow,
                        registration_code: generateCode(),
                        pin: String(Math.floor(1000 + Math.random() * 9000)),
                        total_points: 0
                    }
                })
                const { error } = await supabase.from('students').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            if (importReadyRows.length > 0) {
                addToast(`Berhasil import ${importReadyRows.length} siswa`, 'success')
                await logAudit({
                    action: 'INSERT',
                    source: 'SYSTEM',
                    tableName: 'students',
                    newData: {
                        bulk_import: true,
                        count: importReadyRows.length
                    }
                })
            } else {
                addToast('Tidak ada siswa yang diimport', 'info')
            }
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportDuplicates([])
            setImportFileName('')
            setImportStep(1)
            await fetchData();
            fetchStats()
        } catch (err) {
            console.error(err)
            addToast('Gagal import (cek constraint DB / duplikat / koneksi)', 'error')
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
            downloadBlob(blob, `${filename || 'export_siswa'}.csv`)
            addToast(`Export CSV berhasil (${rows.length} siswa)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
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
            // Auto column width
            const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            ws['!cols'] = cols
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `${filename || 'export_siswa'}.xlsx`)
            addToast(`Export Excel berhasil (${data.length} siswa)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
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
            doc.text('Laporan Data Siswa', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} siswa  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)
            const filterInfo = []
            if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
            if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
            if (filterTag) filterInfo.push(`Label: ${filterTag}`)
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
                    'Poin': { halign: 'right' },
                    'Gender': { halign: 'center' },
                    'Kode Registrasi': { halign: 'center' },
                    'Phone/WA': { halign: 'center' },
                    'NIS': { halign: 'center' },
                    'NISN': { halign: 'center' },
                    'NIK': { halign: 'center' },
                    'Status': { halign: 'center' },
                    'Kelengkapan Data': { halign: 'center' }
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

            doc.save(`${filename || 'export_siswa'}.pdf`)
            addToast(`Export PDF berhasil (${allRows.length} siswa)`, 'success')
            await logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
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
        // State
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
        isRevalidating, setIsRevalidating,
        importEditCell, setImportEditCell,
        importCachedDBStudents, setImportCachedDBStudents,
        exporting, setExporting,
        importTab, setImportTab,

        // Computed
        importReadyRows,
        hasImportBlockingErrors,
        ALL_EXPORT_COLUMNS,
        SYSTEM_COLS,

        // Actions
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
        handleFetchGSheets,
        fetchFilteredForExport,
        getExportData,
        downloadBlob,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    }
}