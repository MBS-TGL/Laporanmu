import { useRef } from 'react'
import { supabase } from '@lib/supabase'
import { useImportExportCore } from '@shared/hooks/useImportExportCore'
import { sanitizeText, pick, normalizePhone } from '@utils/importExportEngine'

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

const normalizeDate = (raw) => {
    if (!raw) return null
    if (raw instanceof Date) return raw.toISOString().split('T')[0]
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return raw
}

const isValidPhone = (phone) => {
    if (!phone) return true
    return /^(\+?62|08)\d{8,12}$/.test(phone)
}

/**
 * Hook import/export fitur Enrollment (PSB). Mesin generik ada di
 * useImportExportCore; file ini hanya logika domain: normalisasi baris
 * pendaftar (metadata jsonb, gelombang aktif), validasi duplikat,
 * nomor registrasi, dan query export dengan soft-delete jsonb.
 */
export function useImportExport({
    waves,
    fetchData,
    addToast,
    generateCode,
    selectedIds,
    selectedEnrollments,
    filterWave,
    filterStatus,
    filterGender,
    filterProgram,
    debouncedSearch,
    sortBy
}) {
    // Cache pendaftar existing untuk deteksi duplikat saat revalidasi
    const dbCacheRef = useRef({ names: new Set(), nisns: new Set() })

    const getExportData = async (scope, cols) => {
        if (scope === 'selected' && selectedIds.length > 0) {
            return selectedEnrollments.map(e => {
                const row = {}
                cols.forEach(key => {
                    const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                    if (col) row[col.label] = col.fn(e)
                })
                return row
            })
        }

        let q = supabase
            .from('enrollments')
            .select('*, enrollment_waves(name)')
            .is('metadata->>deleted_at', null)

        if (scope === 'filtered') {
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
            cols.forEach(key => {
                const col = ALL_EXPORT_COLUMNS.find(c => c.key === key)
                if (col) row[col.label] = col.fn(e)
            })
            return row
        })
    }

    const validatePreview = (preview) => {
        const issues = []
        const dupeIndices = []
        const { names, nisns } = dbCacheRef.current
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

        return { validated, issues, dupeIndices }
    }

    const core = useImportExportCore({
        systemCols: SYSTEM_COLS,
        addToast,
        table: 'enrollments',
        messages: {
            unsupportedFormat: 'Format file tidak didukung. Gunakan .csv atau .xlsx',
            emptyFile: 'File kosong atau tidak dapat dibaca',
            parseFailed: 'Gagal membaca file import',
            hasErrors: 'Harap perbaiki semua error sebelum menyimpan',
            noValidRows: 'Tidak ada data baru yang valid untuk diimport',
            commitSuccess: (n) => `Berhasil mengimport ${n} pendaftar baru`,
            commitFailed: () => 'Gagal melakukan import data',
            removeRow: 'Baris berhasil dihapus',
            bulkFix: () => 'Berhasil memperbarui semua baris',
        },
        buildPreview: async (rows, mapping) => {
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

            // Cache pendaftar existing untuk deteksi duplikat (termasuk saat revalidasi)
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
            dbCacheRef.current = { names: existingNames, nisns: existingNisns }

            return validatePreview(preview)
        },
        validate: validatePreview,
        resyncRow: (row) => {
            if (row.wave_id !== undefined) {
                row._waveName = waves.find(w => w.id === row.wave_id)?.name || ''
            }
            return row
        },
        buildCommitRow: (r, ctx = {}) => {
            const { _waveName, _isDupe, _hasError, _hasWarn, ...cleanRow } = r
            const indexSuffix = String((ctx.chunkStart || 0) + (ctx.indexInChunk || 0) + 1).padStart(4, '0')
            const year = new Date().getFullYear()
            return {
                ...cleanRow,
                registration_number: generateCode ? generateCode() : `REG-${year}-${indexSuffix}`,
                created_at: new Date().toISOString()
            }
        },
        afterCommit: async () => {
            await fetchData()
        },
        template: {
            headers: ['Nama Pendaftar', 'Gender', 'No. HP / WA', 'NISN', 'Asal Sekolah', 'Program', 'Gelombang', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'Alamat'],
            widths: [25, 10, 18, 15, 20, 15, 15, 15, 15, 20, 20, 30],
            rows: [
                ['Fulan Ahmad', 'L', '081234567890', '1234567890', 'SDN 1 Depok', 'reguler', waves.find(w => w.is_active)?.name || 'Gelombang 1', 'Jakarta', '2012-08-20', 'Abdullah', 'Aminah', 'Jl. Mawar No. 12, Depok'],
                ['Fulanah Aisyah', 'P', '089876543210', '0987654321', 'MI Al-Ikhlas', 'boarding', waves.find(w => w.is_active)?.name || 'Gelombang 1', 'Bandung', '2012-11-05', 'Abdurrahman', 'Fathimah', 'Jl. Melati No. 5, Bandung'],
            ],
            filename: 'Template Import Pendaftar PSB',
        },
        export: {
            getExportData,
            sheetName: 'PSB Pendaftar',
            defaultFileName: 'export_psb',
            pdfTitle: 'Laporan Pendaftaran Santri Baru (PSB)',
            pdfMeta: (rows, scope) => `Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${rows.length} pendaftar  |  Scope: ${scope === 'filtered' ? 'Filter Aktif' : scope === 'selected' ? 'Dipilih' : 'Semua'}`,
            pdfFilterLines: () => {
                const filterInfo = []
                if (filterWave) {
                    const wv = waves.find(w => w.id === filterWave)
                    if (wv) filterInfo.push(`Gelombang: ${wv.name}`)
                }
                if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
                if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
                if (filterProgram) filterInfo.push(`Program: ${filterProgram}`)
                if (debouncedSearch) filterInfo.push(`Cari: "${debouncedSearch}"`)
                return filterInfo
            },
            pdfColumnStyles: {
                'No. Registrasi': { halign: 'center' },
                'Gender': { halign: 'center' },
                'No. WhatsApp': { halign: 'center' },
                'Status': { halign: 'center' },
            },
            toast: (fmt, n) => `Export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'} sukses (${n} data)`,
            failed: (fmt) => `Gagal export ${fmt === 'csv' ? 'CSV' : fmt === 'xlsx' ? 'Excel' : 'PDF'}`,
        },
    })

    return {
        ...core,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,
    }
}
