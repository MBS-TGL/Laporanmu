import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import {
    ArrowLeft,
    ArrowRight,
    ArrowLeftRight,
    Check,
    ChevronDown,
    Download,
    FileText,
    Loader2,
    Filter,
    Tags,
    Upload,
    FileUp,
    CheckCircle2,
    Copy,
    AlertCircle,
    AlertTriangle,
    Pencil,
    Trash2,
    Zap,
    School,
    Table,
    ChevronUp
} from 'lucide-react'
import { Modal, RichSelect } from '@shared/components'
import { supabase } from '@lib/supabase'
import { useToast } from '@context'

export default function RaportImportModal({
    isOpen,
    onClose,
    selectedMonth,
    selectedYear,
    selectedSemester,
    academicYear,
    musyrif,
    profile,
    onSuccess,
    activeClassName,
    criteria = [],
    reportType = 'bulanan',
    maxScore = 9,
    dbTable = 'student_monthly_reports'
}) {
    const { addToast } = useToast()

    const SYSTEM_COLS = useMemo(() => {
        const cols = [
            { key: 'name', label: 'Nama Siswa', required: true, desc: 'Untuk mencocokkan dengan database siswa' }
        ]

        if (criteria && criteria.length > 0) {
            criteria.forEach(k => {
                cols.push({
                    key: k.key,
                    label: `Nilai ${k.id}`,
                    required: false,
                    desc: `Rentang nilai 0 - ${maxScore}`
                })
            })
        } else {
            cols.push(
                { key: 'nilai_akhlak', label: 'Nilai Akhlak', required: false, desc: 'Rentang nilai 0 - 9' },
                { key: 'nilai_ibadah', label: 'Nilai Ibadah', required: false, desc: 'Rentang nilai 0 - 9' },
                { key: 'nilai_kebersihan', label: 'Nilai Kebersihan', required: false, desc: 'Rentang nilai 0 - 9' },
                { key: 'nilai_quran', label: 'Nilai Al-Qur\'an', required: false, desc: 'Rentang nilai 0 - 9' },
                { key: 'nilai_bahasa', label: 'Nilai Bahasa', required: false, desc: 'Rentang nilai 0 - 9' }
            )
        }

        cols.push(
            { key: 'berat_badan', label: 'Berat Badan (kg)', required: false, desc: 'Angka berat badan' },
            { key: 'tinggi_badan', label: 'Tinggi Badan (cm)', required: false, desc: 'Angka tinggi badan' },
            { key: 'ziyadah', label: 'Ziyadah', required: false, desc: 'Catatan tambahan hafalan baru' },
            { key: 'murojaah', label: 'Muroja\'ah', required: false, desc: 'Catatan tambahan pengulangan hafalan' },
            { key: 'hari_sakit', label: 'Sakit (Hari)', required: false, desc: 'Jumlah hari absen sakit' },
            { key: 'hari_izin', label: 'Izin (Hari)', required: false, desc: 'Jumlah hari absen izin' },
            { key: 'hari_alpa', label: 'Alpa (Hari)', required: false, desc: 'Jumlah hari absen alpa' },
            { key: 'hari_pulang', label: 'Pulang (Hari)', required: false, desc: 'Jumlah hari absen pulang' },
            { key: 'catatan', label: 'Catatan Musyrif', required: false, desc: 'Evaluasi perkembangan santri' }
        )

        return cols
    }, [criteria, maxScore])

    const scoreFields = useMemo(() => {
        if (criteria && criteria.length > 0) {
            return criteria.map(k => k.key)
        }
        return ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
    }, [criteria])
    const [importStep, setImportStep] = useState(1)
    const [importFileName, setImportFileName] = useState('')
    const [importDragOver, setImportDragOver] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importSkipDupes, setImportSkipDupes] = useState(true)
    const [filterIssuesOnly, setFilterIssuesOnly] = useState(false)
    const [importValidationOpen, setImportValidationOpen] = useState(true)

    // Data lists from DB
    const [classesList, setClassesList] = useState([])
    const [studentsList, setStudentsList] = useState([])

    // Excel raw & preview data state
    const [importRawSheets, setImportRawSheets] = useState({}) // sheetName -> rows Array
    const [importFileHeaders, setImportFileHeaders] = useState([])
    const [importColumnMapping, setImportColumnMapping] = useState({})
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importEditCell, setImportEditCell] = useState(null)

    const importFileInputRef = useRef(null)

    // Load classes & students for validation
    useEffect(() => {
        if (isOpen) {
            fetchValidationData()
            setImportStep(1)
            setImportFileName('')
            setImportRawSheets({})
            setImportPreview([])
            setImportIssues([])
        }
    }, [isOpen])

    const fetchValidationData = async () => {
        try {
            const { data: cls } = await supabase.from('classes').select('id, name').order('name')
            const { data: stu } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null).order('name')
            setClassesList(cls || [])
            setStudentsList(stu || [])
        } catch (err) {
            console.error('Gagal mengambil data validasi:', err)
        }
    }

    // Auto matching columns helper
    const autoMatchColumns = (headers) => {
        const mapping = {}
        const matches = {
            name: ['nama', 'name', 'nama siswa', 'nama santri', 'student name'],
            nilai_akhlak: ['akhlak', 'nilai akhlak', 'akhlak (0-9)', 'moral'],
            nilai_ibadah: ['ibadah', 'nilai ibadah', 'ibadah (0-9)'],
            nilai_kebersihan: ['kebersihan', 'nilai kebersihan', 'kebersihan (0-9)', 'rapi'],
            nilai_quran: ["al-qur'an", 'al-quran', 'quran', 'nilai quran', 'qur\'an'],
            nilai_bahasa: ['bahasa', 'nilai bahasa', 'bahasa (0-9)', 'language'],
            berat_badan: ['bb', 'bb(kg)', 'berat', 'berat badan', 'bb (kg)', 'weight'],
            tinggi_badan: ['tb', 'tb(cm)', 'tinggi', 'tinggi badan', 'tb (cm)', 'height'],
            ziyadah: ['ziyadah', 'ziyadah hafalan', 'tambah hafalan'],
            murojaah: ["muroja'ah", 'murojaah', 'murojaah hafalan', 'ulang hafalan'],
            hari_sakit: ['sakit', 'hari sakit', 'absen sakit', 'sakit (hari)'],
            hari_izin: ['izin', 'hari izin', 'absen izin', 'izin (hari)'],
            hari_alpa: ['alpa', 'hari alpa', 'absen alpa', 'alpa (hari)', 'tanpa keterangan'],
            hari_pulang: ['pulang', 'hari pulang', 'pulang (hari)'],
            catatan: ['catatan', 'catatan musyrif', 'keterangan', 'evaluasi', 'comment']
        }

        headers.forEach(h => {
            const lowerH = h.toLowerCase().trim()
            Object.keys(matches).forEach(key => {
                if (matches[key].includes(lowerH)) {
                    mapping[key] = h
                }
            })
        })

        setImportColumnMapping(mapping)
    }

    const processImportFile = async (file) => {
        if (!file) return
        setImportFileName(file.name)
        setImportLoading(true)

        try {
            // Lazy load XLSX
            const XLSX = await import('xlsx')

            const data = await file.arrayBuffer()
            const wb = XLSX.read(data, { type: 'array' })

            const sheetsData = {}
            let allHeaders = new Set()

            wb.SheetNames.forEach(sheetName => {
                const ws = wb.Sheets[sheetName]
                const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 })
                if (rawJson.length >= 2) {
                    sheetsData[sheetName] = rawJson
                    // Ambil header dari baris pertama
                    const headers = (rawJson[0] || []).map(h => String(h || '').trim()).filter(Boolean)
                    headers.forEach(h => allHeaders.add(h))
                }
            })

            setImportRawSheets(sheetsData)
            const headersArray = Array.from(allHeaders)
            setImportFileHeaders(headersArray)
            autoMatchColumns(headersArray)

            setImportStep(2)
        } catch (err) {
            addToast('Gagal memproses file: ' + err.message, 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const handleImportClick = () => {
        importFileInputRef.current?.click()
    }

    const buildImportPreview = async (sheets, mapping) => {
        setImportLoading(true)
        const previewRows = []
        const issues = []

        const classMap = {}
        classesList.forEach(c => { classMap[c.name.toLowerCase().trim()] = c.id })

        // Dapatkan nama indeks untuk mapping kolom
        const headerIndices = {}

        // Loop sheet
        Object.keys(sheets).forEach(sheetName => {
            const rawRows = sheets[sheetName]
            if (rawRows.length < 2) return

            const headers = rawRows[0].map(h => String(h || '').trim())
            const clsId = classMap[sheetName.toLowerCase().trim()]
            const className = sheetName.trim()

            // Iterasi baris (skip header)
            for (let i = 1; i < rawRows.length; i++) {
                const row = rawRows[i]
                if (!row || row.every(c => c === undefined || c === null || c === '')) continue

                const rowData = {
                    _sheetName: sheetName,
                    _rowNum: i + 1,
                    _className: className,
                    _classId: clsId,
                    _hasError: false,
                    _hasWarn: false,
                    _isDupe: false,
                }

                // Map data berdasarkan mapping kolom yang diatur
                SYSTEM_COLS.forEach(sys => {
                    const mappedHeader = mapping[sys.key]
                    if (mappedHeader) {
                        const colIdx = headers.indexOf(mappedHeader)
                        if (colIdx !== -1) {
                            rowData[sys.key] = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : ''
                        } else {
                            rowData[sys.key] = ''
                        }
                    } else {
                        rowData[sys.key] = ''
                    }
                })

                // Validasi data
                const sName = rowData.name
                if (!sName) {
                    rowData._hasError = true
                    issues.push({
                        row: i + 1,
                        sheet: sheetName,
                        level: 'error',
                        messages: ['Nama santri/siswa tidak boleh kosong']
                    })
                }

                // Cari student_id berdasarkan nama + class_id
                const student = studentsList.find(s =>
                    s.name.toLowerCase().trim() === String(sName || '').toLowerCase().trim() &&
                    (!clsId || s.class_id === clsId)
                )

                if (student) {
                    rowData._studentId = student.id
                    rowData._resolvedName = student.name
                } else {
                    rowData._hasError = true
                    issues.push({
                        row: i + 1,
                        sheet: sheetName,
                        level: 'error',
                        messages: [`Siswa "${sName}" tidak ditemukan di kelas "${sheetName}" database`]
                    })
                }

                // Validasi Nilai
                scoreFields.forEach(f => {
                    const val = rowData[f]
                    if (val !== '' && val !== undefined && val !== null) {
                        const num = Number(val)
                        if (isNaN(num) || num < 0 || num > maxScore) {
                            rowData._hasError = true
                            issues.push({
                                row: i + 1,
                                sheet: sheetName,
                                level: 'error',
                                messages: [`Nilai ${f.replace('nilai_', '').toUpperCase()} (${val}) harus berupa angka antara 0 - ${maxScore}`]
                            })
                        }
                    }
                })

                // Validasi BB/TB & Hari Absen (Harus angka positif)
                const numberFields = ['berat_badan', 'tinggi_badan', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang']
                numberFields.forEach(f => {
                    const val = rowData[f]
                    if (val !== '' && val !== undefined && val !== null) {
                        const num = Number(val)
                        if (isNaN(num) || num < 0) {
                            rowData._hasError = true
                            issues.push({
                                row: i + 1,
                                sheet: sheetName,
                                level: 'error',
                                messages: [`Kolom ${f.replace('hari_', '').replace('_', ' ').toUpperCase()} (${val}) harus berupa angka positif`]
                            })
                        }
                    }
                })

                previewRows.push(rowData)
            }
        })

        // Deteksi duplikat pada Supabase (optional preview)
        if (previewRows.length > 0) {
            try {
                let query = supabase.from(dbTable).select('student_id')
                if (reportType === 'bulanan') {
                    query = query.eq('month', selectedMonth).eq('year', selectedYear)
                } else {
                    query = query.eq('report_type', reportType).eq('semester', selectedSemester).eq('academic_year', academicYear)
                }
                const { data: dbReps } = await query

                const existingMap = new Set((dbReps || []).map(r => r.student_id))
                previewRows.forEach(row => {
                    if (row._studentId && existingMap.has(row._studentId)) {
                        row._isDupe = true
                        row._hasWarn = true
                        issues.push({
                            row: row._rowNum,
                            sheet: row._sheetName,
                            level: 'dupe',
                            messages: [`Raport untuk ${row._resolvedName || row.name} bulan/semester ini sudah ada di server. Data lama akan tertimpa.`]
                        })
                    }
                })
            } catch (err) {
                console.error(err)
            }
        }

        setImportPreview(previewRows)
        setImportIssues(issues)
        setImportLoading(false)
    }

    const handleImportCellEdit = (rowIdx, colKey, newValue) => {
        setImportPreview(prev => {
            const copy = [...prev]
            const row = { ...copy[rowIdx] }
            row[colKey] = newValue

            // Re-validate row
            let hasError = false
            let hasWarn = false

            // Cek nama
            if (colKey === 'name' && !newValue) {
                hasError = true
            }

            // Cari kembali student
            const targetName = colKey === 'name' ? newValue : row.name
            const student = studentsList.find(s =>
                s.name.toLowerCase().trim() === String(targetName || '').toLowerCase().trim() &&
                (!row._classId || s.class_id === row._classId)
            )

            if (student) {
                row._studentId = student.id
                row._resolvedName = student.name
            } else {
                hasError = true
            }

            // Validasi Nilai
            scoreFields.forEach(f => {
                const val = f === colKey ? newValue : row[f]
                if (val !== '' && val !== undefined && val !== null) {
                    const num = Number(val)
                    if (isNaN(num) || num < 0 || num > maxScore) {
                        hasError = true
                    }
                }
            })

            // Validasi BB/TB & Hari Absen
            const numberFields = ['berat_badan', 'tinggi_badan', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang']
            numberFields.forEach(f => {
                const val = f === colKey ? newValue : row[f]
                if (val !== '' && val !== undefined && val !== null) {
                    const num = Number(val)
                    if (isNaN(num) || num < 0) {
                        hasError = true
                    }
                }
            })

            row._hasError = hasError
            row._hasWarn = hasWarn || row._isDupe

            copy[rowIdx] = row

            // Update issues
            rebuildIssuesList(copy)

            return copy
        })
    }

    const rebuildIssuesList = (currentPreview) => {
        const issues = []
        currentPreview.forEach(row => {
            if (!row.name) {
                issues.push({ row: row._rowNum, sheet: row._sheetName, level: 'error', messages: ['Nama santri/siswa tidak boleh kosong'] })
            }
            if (!row._studentId) {
                issues.push({ row: row._rowNum, sheet: row._sheetName, level: 'error', messages: [`Siswa "${row.name}" tidak ditemukan di database kelas "${row._sheetName}"`] })
            }

            // Validasi Nilai
            scoreFields.forEach(f => {
                const val = row[f]
                if (val !== '' && val !== undefined && val !== null) {
                    const num = Number(val)
                    if (isNaN(num) || num < 0 || num > maxScore) {
                        issues.push({
                            row: row._rowNum, sheet: row._sheetName, level: 'error',
                            messages: [`Nilai ${f.replace('nilai_', '').toUpperCase()} (${val}) harus berupa angka antara 0 - ${maxScore}`]
                        })
                    }
                }
            })

            // Validasi BB/TB & Hari Absen
            const numberFields = ['berat_badan', 'tinggi_badan', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang']
            numberFields.forEach(f => {
                const val = row[f]
                if (val !== '' && val !== undefined && val !== null) {
                    const num = Number(val)
                    if (isNaN(num) || num < 0) {
                        issues.push({
                            row: row._rowNum, sheet: row._sheetName, level: 'error',
                            messages: [`Kolom ${f.replace('hari_', '').replace('_', ' ').toUpperCase()} (${val}) harus berupa angka positif`]
                        })
                    }
                }
            })

            if (row._isDupe) {
                issues.push({
                    row: row._rowNum, sheet: row._sheetName, level: 'dupe',
                    messages: [`Raport untuk ${row._resolvedName || row.name} bulan/semester ini sudah ada di server. Data lama akan tertimpa.`]
                })
            }
        })
        setImportIssues(issues)
    }

    const handleRemoveImportRow = (idx) => {
        setImportPreview(prev => {
            const next = prev.filter((_, i) => i !== idx)
            rebuildIssuesList(next)
            return next
        })
    }

    const handleBulkFix = (colKey, value) => {
        setImportPreview(prev => {
            const next = prev.map(row => {
                if (row._hasError && !row._studentId) {
                    // Coba fix dengan kelas baru
                    const classItem = classesList.find(c => c.id === value)
                    if (classItem) {
                        row._sheetName = classItem.name
                        row._className = classItem.name
                        row._classId = classItem.id
                    }
                }
                return row
            })
            rebuildIssuesList(next)
            return next
        })
        addToast(`Mencoba memetakan ulang baris error ke kelas baru`, 'info')
    }

    const handleCommitImport = async () => {
        const validRows = importPreview.filter(r => !r._hasError && (!importSkipDupes || !r._isDupe))
        if (!validRows.length) {
            addToast('Tidak ada baris valid yang bisa diimport', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })

        try {
            const getNum = (val) => (val === '' || val === undefined || val === null) ? null : Number(val)

            const payloads = validRows.map(r => {
                const sc = {}
                scoreFields.forEach(f => {
                    sc[f] = r[f] !== '' && r[f] !== undefined && r[f] !== null ? Number(r[f]) : null
                })

                if (reportType === 'bulanan') {
                    return {
                        student_id: r._studentId,
                        month: selectedMonth,
                        year: selectedYear,
                        musyrif_name: musyrif || null,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        ...sc,
                        berat_badan: getNum(r.berat_badan),
                        tinggi_badan: getNum(r.tinggi_badan),
                        ziyadah: r.ziyadah || null,
                        murojaah: r.murojaah || null,
                        hari_sakit: getNum(r.hari_sakit) || 0,
                        hari_izin: getNum(r.hari_izin) || 0,
                        hari_alpa: getNum(r.hari_alpa) || 0,
                        hari_pulang: getNum(r.hari_pulang) || 0,
                        catatan: r.catatan || null
                    }
                } else {
                    return {
                        student_id: r._studentId,
                        report_type: reportType,
                        semester: selectedSemester,
                        academic_year: academicYear,
                        musyrif_name: musyrif || null,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        scores: sc,
                        extras: {
                            berat_badan: getNum(r.berat_badan),
                            tinggi_badan: getNum(r.tinggi_badan),
                            ziyadah: r.ziyadah || null,
                            murojaah: r.murojaah || null,
                            hari_sakit: getNum(r.hari_sakit) || 0,
                            hari_izin: getNum(r.hari_izin) || 0,
                            hari_alpa: getNum(r.hari_alpa) || 0,
                            hari_pulang: getNum(r.hari_pulang) || 0,
                            catatan: r.catatan || null
                        }
                    }
                }
            })

            const conflictColumns = reportType === 'bulanan'
                ? 'student_id,month,year'
                : 'student_id,report_type,semester,academic_year'

            const CHUNK = 50
            for (let i = 0; i < payloads.length; i += CHUNK) {
                const chunk = payloads.slice(i, i + CHUNK)
                const { error } = await supabase
                    .from(dbTable)
                    .upsert(chunk, { onConflict: conflictColumns })

                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, payloads.length), total: payloads.length })
            }

            addToast(`Berhasil mengimport ${payloads.length} raport siswa`, 'success')

            // Log audit
            logAudit({
                action: 'INSERT', source: 'OPERATIONAL', tableName: dbTable,
                newData: { method: 'MODAL_IMPORT_XLS', count: payloads.length, file_name: importFileName }
            })

            onSuccess()
            onClose()
        } catch (err) {
            addToast('Gagal melakukan import: ' + err.message, 'error')
        } finally {
            setImporting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        try {
            const XLSX = await import('xlsx')
            const headers = ['No', 'Nama']
            if (criteria && criteria.length > 0) {
                criteria.forEach(k => {
                    headers.push(k.id)
                })
            } else {
                headers.push('Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa')
            }
            headers.push('Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan')

            const data = [
                [1, 'Budi Santoso'],
                [2, 'Siti Aminah']
            ]

            if (criteria && criteria.length > 0) {
                criteria.forEach(() => {
                    const is100Scale = maxScore > 10
                    data[0].push(is100Scale ? 80 : 8)
                    data[1].push(is100Scale ? 90 : 9)
                })
            } else {
                data[0].push(8, 9, 8, 9, 7)
                data[1].push(9, 9, 9, 9, 8)
            }

            data[0].push('', '', 45, 155, 'Juz 30 Selesai', 'Murojaah lancar', 0, 1, 0, 2, 'Perkembangan baik.')
            data[1].push('', '', 42, 152, 'Juz 29 Hal 2', 'Lancar', 1, 0, 0, 2, 'Sangat rajin dan taat.')

            const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
            ws['!cols'] = headers.map(() => ({ wch: 15 }))

            const wb = XLSX.utils.book_new()
            const sheetName = activeClassName || '10A Boarding Putra'
            XLSX.utils.book_append_sheet(wb, ws, sheetName)

            XLSX.writeFile(wb, 'Template Import Raport.xlsx')
            addToast('Template Excel berhasil diunduh', 'success')
        } catch (err) {
            addToast('Gagal mengunduh template: ' + err.message, 'error')
        }
    }

    const importReadyRows = importPreview.filter(r => !r._hasError)
    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    // Inner component for Cell editing
    const EditableCell = memo(({ rowIdx, colKey, value }) => {
        const isEditing = importEditCell?.row === rowIdx && importEditCell?.col === colKey
        const inputRef = useRef(null)

        useEffect(() => {
            if (isEditing) {
                inputRef.current?.focus()
                inputRef.current?.select()
            }
        }, [isEditing])

        if (isEditing) {
            return (
                <input
                    ref={inputRef}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-primary)] rounded px-1 py-0.5 text-[10px] font-bold outline-none"
                    value={value || ''}
                    onChange={(e) => handleImportCellEdit(rowIdx, colKey, e.target.value)}
                    onBlur={() => setImportEditCell(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') setImportEditCell(null)
                        if (e.key === 'Escape') setImportEditCell(null)
                    }}
                />
            )
        }

        const isCentered = [...scoreFields, 'berat_badan', 'tinggi_badan', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang'].includes(colKey)
        const isScore = scoreFields.includes(colKey)
        const isEmpty = value === '' || value === undefined || value === null

        // Check if has error specifically for this cell
        let cellHasError = false
        if (isScore && !isEmpty) {
            const num = Number(value)
            if (isNaN(num) || num < 0 || num > maxScore) cellHasError = true
        }

        return (
            <div
                className={`group cursor-pointer hover:bg-[var(--color-primary)]/10 px-1 rounded transition-colors min-h-[16px] flex items-center ${isCentered ? 'justify-center' : 'justify-between'} ${cellHasError ? 'text-red-500 bg-red-500/10' : ''}`}
                onClick={() => setImportEditCell({ row: rowIdx, col: colKey })}
            >
                <span className="truncate">{value || '-'}</span>
                {!isCentered && <Pencil className="w-2 h-2 opacity-0 group-hover:opacity-30 transition-opacity ml-1 shrink-0" />}
            </div>
        )
    })

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Nilai Raport"
            description="Unggah raport santri secara masal dari Excel."
            icon={FileUp}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    {importStep === 1 ? (
                        <button onClick={onClose} className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all">
                            Batal
                        </button>
                    ) : (
                        <button
                            onClick={() => setImportStep(v => v - 1)}
                            disabled={importing}
                            className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all flex items-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                        </button>
                    )}

                    <div className="flex-1" />

                    <div className="flex items-center gap-3">
                        {importing && (
                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)]" />
                                {importProgress.done}/{importProgress.total}
                            </span>
                        )}

                        {importStep === 1 ? (
                            <button
                                onClick={() => Object.keys(importRawSheets).length > 0 ? setImportStep(2) : handleImportClick()}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {Object.keys(importRawSheets).length > 0 ? (
                                    <>Lanjutkan <ArrowRight className="w-3.5 h-3.5" /></>
                                ) : (
                                    <>Pilih File <Upload className="w-3.5 h-3.5" /></>
                                )}
                            </button>
                        ) : importStep === 2 ? (
                            <button
                                onClick={async () => {
                                    setImportStep(3)
                                    await buildImportPreview(importRawSheets, importColumnMapping)
                                }}
                                disabled={!importColumnMapping.name}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                Validasi Data <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                            >
                                {importing ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
                                ) : (
                                    <><Check className="w-3.5 h-3.5" /> Selesaikan Import</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Wizard Stepper */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {[
                    { step: 1, label: 'Upload', desc: 'Pilih File Excel' },
                    { step: 2, label: 'Mapping', desc: 'Atur Kolom' },
                    { step: 3, label: 'Review', desc: 'Validasi & Edit' },
                ].map((s) => (
                    <React.Fragment key={s.step}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all shadow-sm
                                ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white scale-110' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] opacity-40'}`}>
                                {importStep > s.step ? <Check className="w-3 h-3" /> : s.step}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-wider leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tight mt-1">{s.desc}</span>
                            </div>
                        </div>
                        {s.step < 3 && <div className={`w-6 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* File info bar */}
            {importFileName && (
                <div className="flex items-center justify-between gap-4 mb-5 px-1 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 shrink-0 text-[10px] font-black shadow-sm">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{importFileName}</span>
                        </div>
                        <span className="text-[10px] px-3 py-1.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border font-bold">
                            {Object.keys(importRawSheets).length} Sheet terdeteksi
                        </span>
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm group"
                    >
                        <ArrowLeftRight className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                        Ganti File
                    </button>
                </div>
            )}

            {/* Steps Rendering */}
            {importStep === 1 && (
                <div className="space-y-4">
                    <input type="file" ref={importFileInputRef} onChange={(e) => processImportFile(e.target.files?.[0])} accept=".csv,.xlsx,.xls" className="hidden" />

                    <div
                        onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                        onDragLeave={() => setImportDragOver(false)}
                        onDrop={async e => {
                            e.preventDefault()
                            setImportDragOver(false)
                            const file = e.dataTransfer.files?.[0]
                            if (file) await processImportFile(file)
                        }}
                        onClick={handleImportClick}
                        className={`w-full h-14 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all
                        ${importDragOver
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                                : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8'}`}
                    >
                        <Upload className={`w-4 h-4 transition-all ${importDragOver ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                        <div className="text-left">
                            <p className="text-[11px] font-black text-[var(--color-primary)] uppercase tracking-wider leading-none">
                                {importDragOver ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk memilih File Raport Excel'}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 opacity-60">Mendukung format .csv, .xlsx, dan .xls</p>
                        </div>
                    </div>

                    {/* Reference and Template section */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)] shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                               <School className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)]">Bulan & Tahun Aktif</span>
                                <span className="text-[9px] font-bold text-emerald-600">
                                    Periode: {selectedMonth} / {selectedYear}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleDownloadTemplate}
                            className="shrink-0 h-9 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Download className="w-3.5 h-3.5" /> Download Template Raport
                        </button>
                    </div>

                    {/* Column visualization visual grid */}
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm flex flex-col">
                        <div className="px-4 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Table className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Aturan Penulisan Sheet & Baris Excel</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 text-[8px] font-black uppercase tracking-widest">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span>Sheet Name = Nama Kelas</span>
                            </div>
                        </div>

                        <div className="p-3 text-[10.5px] text-[var(--color-text-muted)] leading-relaxed space-y-2 text-left">
                            <p>1. <strong>Satu Sheet per Kelas</strong>: Sistem akan mencocokkan nama sheet di Excel dengan nama kelas di database (contoh sheet: <code className="bg-emerald-500/10 text-emerald-600 px-1 rounded">10A Boarding Putra</code>, <code className="bg-emerald-500/10 text-emerald-600 px-1 rounded">10B Boarding Putri</code>).</p>
                            <p>2. <strong>Pencocokan Nama Santri</strong>: Nama santri di kolom B (Nama) harus persis sama dengan nama di database siswa kelas tersebut.</p>
                            <p>3. <strong>Rentang Nilai Karakter</strong>: Nilai Akhlak, Ibadah, Kebersihan, Qur'an, dan Bahasa harus bernilai bulat antara <code className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1 rounded">0 s.d 9</code>.</p>
                        </div>
                    </div>
                </div>
            )}

            {importStep === 2 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cocokkan Kolom File Excel</span>
                        <span className="text-[9px] font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                            {importFileHeaders.length} Kolom Excel terdeteksi
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                        {SYSTEM_COLS.map(sys => {
                            const mapped = importColumnMapping[sys.key]
                            return (
                                <div key={sys.key} className={`p-2.5 rounded-xl border transition-all text-left ${mapped ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col w-[140px] shrink-0">
                                            <span className="text-[10.5px] font-black text-[var(--color-text)] flex items-center gap-1">
                                                {sys.label}
                                                {sys.required && <span className="text-red-500 text-[9px]">*</span>}
                                            </span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50 uppercase tracking-tight" title={sys.desc}>
                                                {sys.key.replace('nilai_', '').replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 opacity-30">
                                            <ArrowRight className={`w-3 h-3 ${mapped ? 'text-emerald-500 opacity-100' : ''}`} />
                                        </div>

                                        <div className="flex-1 min-w-0 relative">
                                            <RichSelect
                                                small
                                                value={mapped || ''}
                                                onChange={(val) => setImportColumnMapping(v => ({ ...v, [sys.key]: val }))}
                                                options={importFileHeaders.map(h => ({ id: h, name: h }))}
                                                placeholder="-- Lewati Kolom --"
                                                extraOption={{ id: '', name: '-- Lewati Kolom --' }}
                                                status={mapped ? 'success' : 'normal'}
                                                searchable={importFileHeaders.length > 5}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {importStep === 3 && (
                <div className="space-y-4">
                    {importLoading ? (
                        <div className="flex flex-col items-center justify-center py-14 text-[var(--color-text-muted)] gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                            <span className="text-xs font-bold">Menganalisis, memvalidasi & mendeteksi duplikat data...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Visual Stats Summary */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm">
                                <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/50">
                                    {[
                                        { label: 'Total Raport', value: importPreview.length, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border)]/20', icon: FileText },
                                        { label: 'Siap Simpan', value: importReadyRows.length, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
                                        { label: 'Menimpa Lama', value: importPreview.filter(r => r._isDupe).length, color: 'text-violet-600', bg: 'bg-violet-500/10', icon: Copy },
                                        { label: 'Error Blokir', value: importPreview.filter(r => r._hasError).length, color: 'text-red-600', bg: 'bg-red-500/10', icon: AlertCircle },
                                    ].map((stat, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-2.5 py-1 rounded-lg ${stat.bg} ${stat.color} transition-all`} title={stat.label}>
                                            {(() => {
                                                const IconComp = stat.icon
                                                return <IconComp className="w-3.5 h-3.5 opacity-70" />
                                            })()}
                                            <span className="text-[11px] font-black">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setImportSkipDupes(!importSkipDupes)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${importSkipDupes
                                                ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-violet-500/40 hover:text-violet-600'}`}
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span>{importSkipDupes ? 'Lewati Duplikat' : 'Tindih Duplikat'}</span>
                                    </button>

                                    <button
                                        onClick={() => setFilterIssuesOnly(!filterIssuesOnly)}
                                        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all
                                            ${filterIssuesOnly
                                                ? 'bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20'
                                                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-red-500/40 hover:text-red-500'}`}
                                    >
                                        {filterIssuesOnly ? (
                                            <Check className="w-3 h-3" />
                                        ) : (
                                            <Filter className="w-3 h-3" />
                                        )}
                                        <span>{filterIssuesOnly ? 'Hanya Error' : 'Semua'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Sheet Warning Banner (Bulk Fix) */}
                            {importIssues.some(iss => iss.messages.some(m => m.includes('tidak ditemukan di database kelas'))) && (
                                <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Perbaikan Massal Kelas Tersedia</p>
                                            <p className="text-[9.5px] font-bold text-amber-600/80 leading-tight">Beberapa santri tidak ditemukan di kelas yang sesuai nama sheet. Pindahkan semua santri bermasalah tersebut ke kelas valid?</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleBulkFix('class_id', e.target.value);
                                                    e.target.value = '';
                                                }
                                            }}
                                            className="h-8 px-3 rounded-xl bg-[var(--color-surface)] border border-amber-500/30 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                                        >
                                            <option value="">-- Pilih Kelas Valid --</option>
                                            {classesList.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Dynamic spreadsheet grid preview */}
                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-sm">
                                <div className="max-h-[35vh] overflow-auto">
                                    <table className="w-full border-collapse table-fixed min-w-[1200px]">
                                        <thead>
                                            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 sticky top-0 z-10">
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[8%]">Sheet</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[12%]">Nama Santri</th>
                                                {criteria && criteria.length > 0 ? criteria.map(k => (
                                                    <th key={k.key} className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">{k.id}</th>
                                                )) : (
                                                    <>
                                                        <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Akhlak</th>
                                                        <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Ibadah</th>
                                                        <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Bersih</th>
                                                        <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Quran</th>
                                                        <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Bahasa</th>
                                                    </>
                                                )}
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">BB(kg)</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">TB(cm)</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[10%]">Ziyadah</th>
                                                <th className="px-2 py-2 text-left text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[10%]">Murojaah</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[4%]">Skt</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[4%]">Izn</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[4%]">Alp</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[6%]">Status</th>
                                                <th className="px-2 py-2 text-center text-[8px] font-black uppercase tracking-tighter text-[var(--color-text-muted)] w-[4%]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview
                                                .map((r, originalIdx) => ({ ...r, originalIdx }))
                                                .filter(r => !filterIssuesOnly || (r._hasError || r._isDupe || r._hasWarn))
                                                .map((r) => {
                                                    const i = r.originalIdx
                                                    return (
                                                        <tr key={i} className={`hover:bg-[var(--color-surface-alt)]/40 transition-colors border-b border-[var(--color-border)]/30 last:border-0 ${r._hasError ? 'bg-red-500/5' : r._isDupe ? 'bg-violet-500/5' : ''}`}>
                                                            <td className="px-2 py-1 text-[var(--color-text-muted)] text-[10px] font-medium truncate text-left">{r._sheetName}</td>
                                                            <td className="px-2 py-1 font-bold text-[var(--color-text)] text-[10px] truncate text-left">
                                                                <EditableCell rowIdx={i} colKey="name" value={r.name} />
                                                            </td>
                                                            {criteria && criteria.length > 0 ? criteria.map(k => (
                                                                <td key={k.key} className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey={k.key} value={r[k.key]} /></td>
                                                            )) : (
                                                                <>
                                                                    <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="nilai_akhlak" value={r.nilai_akhlak} /></td>
                                                                    <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="nilai_ibadah" value={r.nilai_ibadah} /></td>
                                                                    <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="nilai_kebersihan" value={r.nilai_kebersihan} /></td>
                                                                    <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="nilai_quran" value={r.nilai_quran} /></td>
                                                                    <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="nilai_bahasa" value={r.nilai_bahasa} /></td>
                                                                </>
                                                            )}
                                                            <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="berat_badan" value={r.berat_badan} /></td>
                                                            <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="tinggi_badan" value={r.tinggi_badan} /></td>
                                                            <td className="px-2 py-1 text-[10px] text-left"><EditableCell rowIdx={i} colKey="ziyadah" value={r.ziyadah} /></td>
                                                            <td className="px-2 py-1 text-[10px] text-left"><EditableCell rowIdx={i} colKey="murojaah" value={r.murojaah} /></td>
                                                            <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="hari_sakit" value={r.hari_sakit} /></td>
                                                            <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="hari_izin" value={r.hari_izin} /></td>
                                                            <td className="px-2 py-1 text-[10px]"><EditableCell rowIdx={i} colKey="hari_alpa" value={r.hari_alpa} /></td>

                                                             <td className="px-2 py-1 text-center">
                                                                {r._hasError ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 text-[8px] font-black uppercase">
                                                                        <AlertCircle className="w-3.5 h-3.5" /> Error
                                                                    </span>
                                                                ) : r._isDupe ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 text-[8px] font-black uppercase">
                                                                        <Copy className="w-3.5 h-3.5" /> Tindih
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1">
                                                                <button
                                                                    onClick={() => handleRemoveImportRow(i)}
                                                                    className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                                    title="Abaikan Baris"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                                    <span>Menampilkan {importPreview.length} total baris</span>
                                    {filterIssuesOnly && <span className="text-red-500 animate-pulse">Filter "Hanya Error" Aktif</span>}
                                </div>
                            </div>

                            {/* Validation issues list log */}
                            {importIssues.length > 0 && (
                                <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]/20 text-left">
                                    <button
                                        type="button"
                                        onClick={() => setImportValidationOpen(v => !v)}
                                        className="w-full px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between hover:bg-[var(--color-border)]/30 transition-colors cursor-pointer"
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <ChevronDown className={`w-3 h-3 transition-transform ${importValidationOpen ? '' : '-rotate-90'}`} />
                                            Catatan Log Validasi ({importIssues.length} Isu Terdeteksi)
                                        </span>
                                    </button>
                                    {importValidationOpen && (
                                        <div className="max-h-[120px] overflow-auto divide-y divide-[var(--color-border)]">
                                            {importIssues.map((issue, idx) => (
                                                <div key={idx} className={`flex items-start gap-3 px-3 py-1.5 ${issue.level === 'error' ? 'border-l-2 border-l-red-500 bg-red-500/3' : 'border-l-2 border-l-violet-500 bg-violet-500/3'}`}>
                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${issue.level === 'error' ? 'bg-red-500/15 text-red-600' : 'bg-violet-500/15 text-violet-600'}`}>
                                                        {issue.level}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] font-black text-[var(--color-text-muted)] leading-none mb-0.5">Sheet: {issue.sheet} — Baris {issue.row}</p>
                                                        {issue.messages.map((msg, mi) => (
                                                            <p key={mi} className="text-[10px] font-bold text-[var(--color-text)] leading-tight">{msg}</p>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}
