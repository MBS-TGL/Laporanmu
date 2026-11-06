import { Archive, Calendar, CalendarDays, CircleCheck, Clock, GraduationCap, Heading } from 'lucide-react'

/**
 * Konfigurasi modal Import/Export untuk fitur Tahun Pelajaran.
 * Dipakai bersama ImportDataModal/ExportDataModal (@shared/components/import-export).
 * Logika parse/validasi/commit tetap di YearsPage — file ini hanya deklarasi UI.
 */

export const SYSTEM_COLS = [
    { key: 'name', label: 'Tahun Pelajaran', synonyms: ['tahun pelajaran', 'tahun ajaran', 'periode', 'year', 'academic year', 'nama tahun'] },
    { key: 'semester', label: 'Semester', synonyms: ['semester', 'sem', 'ganjil genap'] },
    { key: 'start_date', label: 'Tanggal Mulai', synonyms: ['tanggal mulai', 'mulai', 'start', 'start_date', 'tgl mulai'] },
    { key: 'end_date', label: 'Tanggal Selesai', synonyms: ['tanggal selesai', 'selesai', 'end', 'end_date', 'tanggal berakhir', 'tgl selesai'] },
    { key: 'curriculum', label: 'Kurikulum', synonyms: ['kurikulum', 'curriculum'] },
]

const COLUMN_DEFS = [
    { key: 'name', label: 'Tahun Pelajaran', icon: Calendar },
    { key: 'semester', label: 'Semester', icon: Heading },
    { key: 'start_date', label: 'Mulai', icon: CalendarDays },
    { key: 'end_date', label: 'Selesai', icon: Clock },
    { key: 'curriculum', label: 'Kurikulum', icon: GraduationCap },
    { key: 'is_active', label: 'Status Aktif', icon: CircleCheck },
    { key: 'is_locked', label: 'Status Kunci', icon: Archive },
]

export const IMPORT_CONFIG = {
    title: 'Import Data Tahun Pelajaran',
    description: 'Unggah data periode akademik secara masal dari file Excel atau CSV. Sistem akan memvalidasi tumpang tindih tanggal secara otomatis.',
    icon: Calendar,
    size: 'lg',
    systemCols: SYSTEM_COLS,
    requiredKeys: ['name', 'semester', 'start_date', 'end_date'],
    columns: [
        { key: 'name', label: 'Tahun Pelajaran', w: 'w-[25%]', required: true },
        { key: 'semester', label: 'Semester', w: 'w-[15%]', center: true, required: true, editor: { type: 'enum', options: ['Ganjil', 'Genap'] } },
        { key: 'start_date', label: 'Tanggal Mulai', w: 'w-[20%]', required: true },
        { key: 'end_date', label: 'Tanggal Selesai', w: 'w-[20%]', required: true },
        { key: 'curriculum', label: 'Kurikulum', w: 'w-[12%]', center: true, editor: { type: 'enum', options: ['Merdeka', '2013', 'KTSP'] } },
    ],
    template: {
        cols: [
            { l: 'A', k: 'NAME', n: 'Tahun Pelajaran', w: 'w-[25%]' },
            { l: 'B', k: 'SEMESTER', n: 'Semester', w: 'w-[20%]' },
            { l: 'C', k: 'START', n: 'Tanggal Mulai', w: 'w-[20%]' },
            { l: 'D', k: 'END', n: 'Tanggal Selesai', w: 'w-[20%]' },
            { l: 'E', k: 'CURRICULUM', n: 'Kurikulum', w: 'w-[15%]' },
        ],
        rows: [
            ['2024/2025', 'Ganjil', '2024-07-01', '2024-12-31', 'Merdeka'],
            ['2024/2025', 'Genap', '2025-01-01', '2025-06-30', 'Merdeka'],
        ],
    },
    reference: { icon: Calendar, title: 'Format Data Valid', desc: 'Pastikan format tanggal YYYY-MM-DD' },
    features: { skipDupes: true, previewCap: 300 },
}

export const EXPORT_CONFIG = {
    title: 'Export Data Tahun Pelajaran',
    description: 'Cadangkan atau pindahkan data periode akademik ke format CSV, Excel, atau PDF dengan opsi enterprise.',
    entityNoun: 'periode',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'general', label: 'Umum', cols: ['name', 'semester', 'curriculum', 'is_active'] },
        { id: 'schedule', label: 'Jadwal', cols: ['name', 'semester', 'start_date', 'end_date'] },
    ],
    defaultFileName: 'Data Tahun Pelajaran',
    resetCols: ['name', 'semester'],
}
