import { Building, Briefcase, Calendar, GraduationCap, School, Users } from 'lucide-react'

/**
 * Konfigurasi modal Import/Export untuk fitur Kelas.
 * Dipakai bersama ImportDataModal/ExportDataModal (@shared/components/import-export).
 * Logika parse/validasi/commit tetap di ClassesPage — file ini hanya deklarasi UI.
 *
 * Catatan: SYSTEM_COLS memakai key `teacher`/`year` untuk mapping file, sedangkan
 * tabel review mengedit row key `homeroom_teacher_id`/`academic_year_id` —
 * konversinya terjadi di buildImportPreview (ClassesPage).
 */

export const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Kelas', synonyms: ['nama kelas', 'kelas', 'name', 'nama', 'class'] },
    { key: 'grade', label: 'Tingkat', synonyms: ['tingkat', 'grade', 'level'] },
    { key: 'program', label: 'Program', synonyms: ['program', 'major', 'boarding', 'reguler'] },
    { key: 'gender_type', label: 'Tipe Gender', synonyms: ['tipe gender', 'gender', 'putra', 'putri', 'l/p', 'jenis kelamin'] },
    { key: 'teacher', label: 'Wali Kelas', synonyms: ['wali kelas', 'wali', 'teacher', 'guru', 'nama guru'] },
    { key: 'year', label: 'Tahun Ajaran', synonyms: ['tahun ajaran', 'tahun', 'year', 'akademik', 'academic year'] },
]

const COLUMN_DEFS = [
    { key: 'nama_kelas', label: 'Nama Kelas', icon: School },
    { key: 'tingkat', label: 'Tingkat / Grade', icon: GraduationCap },
    { key: 'program', label: 'Program / Major', icon: Building },
    { key: 'wali_kelas', label: 'Wali Kelas', icon: Briefcase },
    { key: 'tahun_ajaran', label: 'Tahun Ajaran', icon: Calendar },
    { key: 'jumlah_siswa', label: 'Jumlah Siswa', icon: Users },
]

const LEVELS = ['7', '8', '9', '10', '11', '12']
const PROGRAMS = ['Boarding', 'Reguler']

export { LEVELS, PROGRAMS }

// Config import dibangun per-render karena kolom entity butuh daftar dinamis
// (guru & tahun ajaran). Bungkus dengan useMemo di page.
export const buildImportConfig = ({ teachersList = [], academicYearsList = [] }) => ({
    title: 'Import Data Kelas',
    description: 'Unggah data kelas secara masal dari file Excel atau CSV.',
    size: 'lg',
    systemCols: SYSTEM_COLS,
    requiredKeys: ['name', 'grade'],
    columns: [
        { key: 'name', label: 'Nama Kelas', w: 'w-[20%]', required: true },
        { key: 'grade', label: 'Tingkat', w: 'w-[8%]', center: true, required: true, editor: { type: 'enum', options: LEVELS, clearable: true } },
        { key: 'program', label: 'Program', w: 'w-[12%]', center: true, editor: { type: 'enum', options: ['Boarding', 'Reguler'], clearable: true } },
        { key: 'gender_type', label: 'Gender', w: 'w-[12%]', center: true, editor: { type: 'enum', options: ['Putra', 'Putri'], clearable: true } },
        { key: 'homeroom_teacher_id', label: 'Wali Kelas', w: 'w-[22%]', editor: { type: 'entity', list: teachersList, labelKey: 'name', displayKey: '_teacherRaw', minWidth: 220 } },
        { key: 'academic_year_id', label: 'Tahun Ajaran', w: 'w-[18%]', editor: { type: 'entity', list: academicYearsList, labelKey: 'label', displayKey: '_yearRaw', minWidth: 220 } },
    ],
    template: {
        cols: [
            { l: 'A', k: 'NAME', n: 'Nama Kelas', w: 'w-[18%]' },
            { l: 'B', k: 'GRADE', n: 'Tingkat', w: 'w-[12%]' },
            { l: 'C', k: 'PROGRAM', n: 'Program', w: 'w-[15%]' },
            { l: 'D', k: 'GENDER', n: 'Gender', w: 'w-[15%]' },
            { l: 'E', k: 'TEACHER', n: 'Wali Kelas', w: 'w-[20%]' },
            { l: 'F', k: 'YEAR', n: 'Tahun Ajaran', w: 'w-[20%]' },
        ],
        rows: [
            ['10 MIPA 1', '10', 'Boarding', 'Putra', 'Ahmad, S.Pd', '2023/2024 Genap'],
            ['11 IPS 2', '11', 'Reguler', 'Putri', 'Siti, M.Pd', '2023/2024 Genap'],
        ],
    },
    reference: {
        icon: School,
        title: 'Data Referensi',
        desc: 'Wali Kelas',
        buttonLabel: 'Daftar Guru Valid',
        dropdownLabel: 'Daftar Nama Wali Kelas (Copy & Paste):',
        items: teachersList,
        itemKey: 'name',
        hint: '* Pastikan penulisan di Excel persis seperti di atas untuk pencocokan otomatis.',
    },
    features: { skipDupes: true, previewCap: 300 },
})

export const EXPORT_CONFIG = {
    title: 'Export Data Kelas',
    description: 'Cadangkan atau pindahkan data kelas ke format CSV, Excel, atau PDF.',
    entityNoun: 'kelas',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Semua Kolom', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'basic', label: 'Data Dasar', cols: ['nama_kelas', 'tingkat', 'program'] },
        { id: 'academic', label: 'Akademik & Wali', cols: ['nama_kelas', 'wali_kelas', 'tahun_ajaran'] },
        { id: 'summary', label: 'Rekap Siswa', cols: ['nama_kelas', 'tingkat', 'jumlah_siswa'] },
    ],
    defaultFileName: 'Data Kelas',
    resetCols: ['nama_kelas', 'tingkat'],
}
