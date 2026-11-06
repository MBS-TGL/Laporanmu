import { useRef } from 'react'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import { RiskThreshold, calculateCompleteness } from '@features/students/utils/studentsConstants'
import { isDapodikDaftarPD, flattenDapodik, extractDapodikMetadata } from '@features/students/utils/dapodik'
import { sanitizeText, pick, normalizePhone, parseExcelMatrix, parseExcelFile, parseCSVFile } from '@utils/importExportEngine'

export const SYSTEM_COLS = [
    { key: 'name', label: 'Nama', synonyms: ['nama', 'name', 'nama lengkap', 'full name', 'student name', 'siswa', 'nama siswa'] },
    { key: 'class_name', label: 'Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombel', 'rombongan belajar', 'rombel saat ini', 'kelas saat ini'] },
    { key: 'gender', label: 'Gender', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex', 'l/p'] },
    { key: 'nisn', label: 'NISN', synonyms: ['nisn', 'nomor induk siswa nasional', 'nisn siswa'] },
    { key: 'registration_code', label: 'NIPD / Kode Registrasi', synonyms: ['nipd', 'no. nipd', 'kode registrasi', 'registration code', 'nis'] },
    { key: 'phone', label: 'No. HP / WA', synonyms: ['phone', 'no_hp', 'hp', 'no hp', 'whatsapp', 'wa', 'telp', 'telepon', 'phone number', 'wali_phone', 'no. whatsapp', 'no whatsapp', 'no. hp / wa', 'no. hp', 'whatsapp number'] },
    { key: 'father_name', label: 'Nama Ayah', synonyms: ['nama ayah', 'father_name', 'father name', 'nama bapak'] },
    { key: 'mother_name', label: 'Nama Ibu', synonyms: ['nama ibu', 'mother_name', 'mother name', 'nama mama'] },
    { key: 'guardian_name', label: 'Nama Wali', synonyms: ['guardian_name', 'nama_wali', 'wali', 'parent name', 'nama orang tua', 'nama wali', 'wali murid', 'nama ayah/ibu'] },
]

const ALL_EXPORT_COLUMNS = [
    { key: 'id', label: 'ID', fn: s => s.id },
    { key: 'kode', label: 'Kode Registrasi', fn: s => s.registration_code || '' },
    { key: 'nisn', label: 'NISN', fn: s => s.nisn || '' },
    { key: 'nama', label: 'Nama', fn: s => s.name || '' },
    { key: 'gender', label: 'Gender', fn: s => s.gender === 'L' ? 'Putra' : s.gender === 'P' ? 'Putri' : '' },
    { key: 'kelas', label: 'Kelas', fn: s => s.classes?.name || '' },
    { key: 'father_name', label: 'Nama Ayah', fn: s => s.metadata?.father?.name || s.father_name || '' },
    { key: 'mother_name', label: 'Nama Ibu', fn: s => s.metadata?.mother?.name || s.mother_name || '' },
    { key: 'guardian_name', label: 'Nama Wali', fn: s => s.guardian_name || '' },
    { key: 'poin', label: 'Poin', fn: s => s.total_points ?? 0 },
    { key: 'phone', label: 'Phone/WA', fn: s => s.phone || '' },
    { key: 'status', label: 'Status', fn: s => s.status || 'aktif' },
    { key: 'tags', label: 'Label', fn: s => (s.tags || []).join(', ') },
    { key: 'kelengkapan', label: 'Kelengkapan Data', fn: s => `${calculateCompleteness(s)}%` },
]

const isValidPhone = (phone) => {
    if (!phone) return true
    return /^(\+?62|08)\d{8,11}$/.test(phone)
}

// Buang nilai kosong ('' / null / {}) dari metadata supaya jsonb tetap bersih.
const isPlainObj = (v) => Object.prototype.toString.call(v) === '[object Object]'
const compactMeta = (obj) => {
    const out = {}
    for (const [k, v] of Object.entries(obj || {})) {
        const val = isPlainObj(v) ? compactMeta(v) : v
        const empty = val === '' || val === null || val === undefined
            || (isPlainObj(val) && Object.keys(val).length === 0)
        if (!empty) out[k] = val
    }
    return out
}

/**
 * Hook import/export fitur Students. Mesin generik ada di useImportExportCore;
 * file ini hanya logika domain: dukungan file Dapodik, metadata jsonb,
 * validasi duplikat (nama/NISN/NIPD), kode registrasi + PIN, import Google
 * Sheets, dan query export dengan filter chain.
 */
export function useImportExport({
    classesList,
    fetchData,
    fetchStats,
    addToast,
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

    selectedStudentIds,
    selectedStudents,
    gSheetsUrl,
    setFetchingGSheets,
    profile // untuk audit forensik
}) {
    // Cache siswa existing di DB untuk deteksi duplikat saat revalidasi
    const dbCacheRef = useRef({ names: new Set(), nisns: new Set(), codes: new Set() })

    const getExportData = async (scopeArg, colsArg) => {
        // Dukung dua gaya panggilan: (scope, cols) atau ({ scope, cols | columns })
        const scope = typeof scopeArg === 'object' && scopeArg !== null ? scopeArg.scope : scopeArg
        const rawCols = colsArg ?? (typeof scopeArg === 'object' ? (scopeArg?.cols ?? scopeArg?.columns) : undefined)

        // Fallback: kalau tidak ada kolom yang dikirim, ekspor semua kolom
        const cols = Array.isArray(rawCols) && rawCols.length > 0
            ? rawCols.map(c => (typeof c === 'string' ? c : c?.key)).filter(Boolean)
            : ALL_EXPORT_COLUMNS.map(c => c.key)

        if (scope === 'selected' && selectedStudentIds.length > 0) {
            // Ambil dari state (sudah include className)
            return selectedStudents.map(s => {
                const row = {}
                cols.forEach(key => {
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

        if (scope === 'filtered') {
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

        if (sortBy === 'total_points_desc') q = q.order('total_points', { ascending: false })
        else if (sortBy === 'created_at') q = q.order('created_at', { ascending: false })
        else q = q.order('name', { ascending: true })

        const { data, error } = await q
        if (error) throw error

        return (data || []).map(s => {
            const row = {}
            cols.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) {
                    if (key === 'kelas') row[col.label] = s.classes?.name || ''
                    else row[col.label] = col.fn(s)
                }
            })
            return row
        })
    }

    const validatePreview = (preview) => {
        const issues = []
        const dupeIndices = []
        const { names, nisns, codes } = dbCacheRef.current
        const seenNamesInFile = new Map()
        const seenNisnInFile = new Map()
        const seenCodesInFile = new Map()

        const validated = preview.map((r, idx) => {
            const rowIssues = []

            // Required checks
            if (!r.name) rowIssues.push({ level: 'error', message: 'Nama tidak boleh kosong' })
            if (!r.class_id) rowIssues.push({ level: 'error', message: 'Kelas tidak valid atau tidak ditemukan' })
            if (r.phone && !isValidPhone(r.phone)) rowIssues.push({ level: 'warn', message: 'Format No. HP mungkin salah (cek lagi jika ragu)' })
            if (!r.gender) rowIssues.push({ level: 'warn', message: 'Gender kosong / tidak dikenali (isi manual)' })

            // Dupe check
            let isDupe = false
            const lowerName = (r.name || '').toLowerCase().trim()
            const cleanNisn = String(r.nisn || '').trim()
            const cleanCode = String(r.registration_code || '').trim()

            if (lowerName && names.has(lowerName)) isDupe = true
            if (cleanNisn && nisns.has(cleanNisn)) isDupe = true
            if (cleanCode && codes.has(cleanCode)) isDupe = true

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
            if (cleanCode) {
                if (seenCodesInFile.has(cleanCode)) {
                    // NIPD/kode registrasi punya constraint UNIQUE di DB —
                    // dibiarkan lewat akan menggagalkan insert batch
                    rowIssues.push({ level: 'error', message: `NIPD/Kode registrasi sama dengan baris ${seenCodesInFile.get(cleanCode) + 1}` })
                } else seenCodesInFile.set(cleanCode, idx)
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

        return { validated, issues, dupeIndices }
    }

    const core = useImportExportCore({
        systemCols: SYSTEM_COLS,
        addToast,
        table: 'students',
        messages: {
            commitSuccess: (n) => `Berhasil import ${n} siswa`,
        },
        // Dapodik: baca sebagai matrix dulu, deteksi format Daftar PD
        parseWorkbook: async (file) => {
            const matrix = await parseExcelMatrix(file)
            const flat = isDapodikDaftarPD(matrix) ? flattenDapodik(matrix) : null
            return flat ? flat.rows : await parseExcelFile(file)
        },
        buildPreview: async (rows, mapping) => {
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
                const registrationCode = getVal(r, 'registration_code')
                const phone = normalizePhone(getVal(r, 'phone'))
                const fatherName = getVal(r, 'father_name')
                const motherName = getVal(r, 'mother_name')
                const guardianName = getVal(r, 'guardian_name')

                // Kolom Dapodik lainnya (NIK, tempat/tanggal lahir, data ortu
                // lengkap, KIP, dll.) -> metadata jsonb
                const { father: dpFather = {}, mother: dpMother = {}, guardian: dpGuardian = {}, ...dpOther } = extractDapodikMetadata(r)

                // Gender kosong / tidak dikenali dibiarkan kosong (jangan diam-diam jadi 'L');
                // validate memberi peringatan agar diisi manual.
                let gender = ''
                if (genderRaw) {
                    const l = genderRaw.toLowerCase()
                    if (l.startsWith('l') || l === 'pria' || l === 'cowok' || l === 'laki') gender = 'L'
                    else if (l.startsWith('p') || l === 'wanita' || l === 'cewek' || l === 'perempuan') gender = 'P'
                }

                const classObj = classesList.find(c => c.name.toLowerCase() === (className || '').toLowerCase())

                return {
                    name,
                    gender,
                    phone,
                    nisn,
                    registration_code: registrationCode || '',
                    class_id: classObj?.id || '',
                    guardian_name: guardianName || null,
                    photo_url: null,
                    metadata: compactMeta({
                        father: { name: fatherName, ...dpFather },
                        mother: { name: motherName, ...dpMother },
                        guardian: { ...dpGuardian },
                        ...dpOther,
                    }),
                    _className: className || '',
                    _isDupe: false,
                    _hasError: false,
                    _hasWarn: false,
                }
            })

            // Cache siswa existing di DB (untuk duplikat, termasuk saat revalidasi)
            let existingNames = new Set()
            let existingNisn = new Set()
            let existingCodes = new Set()
            try {
                const { data: allStudents } = await supabase
                    .from('students')
                    .select('name, nisn, registration_code')
                    .is('deleted_at', null)
                if (allStudents) {
                    existingNames = new Set(allStudents.map(s => (s.name || '').toLowerCase().trim()))
                    existingNisn = new Set(allStudents.filter(s => s.nisn).map(s => String(s.nisn).trim()))
                    existingCodes = new Set(allStudents.map(s => String(s.registration_code || '').trim()).filter(Boolean))
                }
            } catch (err) { console.error(err) }
            dbCacheRef.current = { names: existingNames, nisns: existingNisn, codes: existingCodes }

            return validatePreview(preview)
        },
        validate: validatePreview,
        resyncRow: (row) => {
            if (row.class_id !== undefined) {
                row._className = classesList.find(c => c.id === row.class_id)?.name || row._className
            }
            return row
        },
        buildCommitRow: (r) => {
            const { _className, _isDupe, _hasError, _hasWarn, ...cleanRow } = r
            return {
                ...cleanRow,
                // String kosong -> null (constraint students_nisn_not_blank + unique index nisn)
                nisn: String(r.nisn ?? '').trim() || null,
                phone: String(r.phone ?? '').trim() || null,
                gender: r.gender || null,
                guardian_name: String(r.guardian_name ?? '').trim() || null,
                // Pakai NIPD dari file Dapodik kalau ada, kalau tidak generate otomatis
                registration_code: String(r.registration_code || '').trim() || generateCode(),
                pin: String(Math.floor(1000 + Math.random() * 9000)),
                total_points: 0
            }
        },
        afterCommit: async () => {
            await fetchData()
            fetchStats()
        },
        template: {
            headers: ['Nama', 'Jenis Kelamin', 'No. WhatsApp', 'Kelas', 'NISN', 'Nama Ayah', 'Nama Ibu', 'Nama Wali'],
            widths: [25, 12, 18, 15, 15, 20, 20, 20],
            rows: [
                ['Ahmad Rizki', 'L', '081234567890', 'XII IPA 1', '1234567890', 'Budi Rizki', 'Siti Maryam', 'Budi Rizki'],
                ['Siti Aminah', 'P', '081234567891', 'XI IPS 2', '0987654321', 'Mulyono', 'Aminah', 'Aminah'],
            ],
            filename: 'Template Import Siswa',
        },
        export: {
            getExportData,
            sheetName: 'Data Siswa',
            defaultFileName: 'export_siswa',
            pdfTitle: 'Laporan Data Siswa',
            pdfMeta: (rows, scope) => `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length} siswa  |  Scope: ${scope === 'filtered' ? 'Filter Aktif' : scope === 'selected' ? 'Dipilih' : 'Semua'}`,
            pdfFilterLines: () => {
                const filterInfo = []
                if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
                if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
                if (filterTag) filterInfo.push(`Label: ${filterTag}`)
                if (debouncedSearch) filterInfo.push(`Cari: "${debouncedSearch}"`)
                return filterInfo
            },
            pdfColumnStyles: {
                'Poin': { halign: 'right' },
                'Gender': { halign: 'center' },
                'Kode Registrasi': { halign: 'center' },
                'Phone/WA': { halign: 'center' },
                'NIS': { halign: 'center' },
                'NISN': { halign: 'center' },
                'NIK': { halign: 'center' },
                'Status': { halign: 'center' },
                'Kelengkapan Data': { halign: 'center' }
            },
        },
    })

    // ---- GOOGLE SHEETS (khusus students) ----
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
            const rows = await core.helpers.parseCSVFile(new Blob([text], { type: 'text/csv' }))
            if (!rows.length) throw new Error('Sheet kosong')
            await core.buildImportPreview(rows)
            core.setIsImportModalOpen(true)
            core.setImportStep(2)
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

    // Petakan satu grup rombel Dapodik (nama rombel + gender) ke kelas asli.
    // Rombel Dapodik campur putra/putri & program, sedangkan kelas asli
    // dipisah (mis. "A Boarding Putra"), jadi keputusan pemetaan per grup.
    const handleBulkFixClassGroup = (fromClassName, gender, classId) => {
        if (!fromClassName || !classId) return
        const targetName = classesList.find(x => x.id === classId)?.name || ''
        const newPrev = core.importPreview.map(r => {
            if ((r._className || '') !== fromClassName) return r
            if (gender && (r.gender || '') !== gender) return r
            return { ...r, class_id: classId, _className: targetName || r._className }
        })
        core.setImportPreview(newPrev)
        const res = validatePreview(newPrev)
        core.setImportPreview(res.validated)
        core.setImportIssues(res.issues)
        core.setImportDuplicates(res.dupeIndices)
    }

    return {
        ...core,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,
        handleFetchGSheets,
        handleBulkFixClassGroup,
    }
}
