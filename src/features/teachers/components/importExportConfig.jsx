import {
    Barcode, Book, BookOpen, Briefcase, Calendar, CalendarCheck, CircleCheck,
    CircleQuestionMark, Clock, GraduationCap, Hash, IdCard, Mail, MapPin, School, User
} from 'lucide-react'
import { VenusMarsIcon, WhatsAppIcon } from '@shared/components'
import { STATUS_CONFIG } from './TeacherRow'

/**
 * Konfigurasi modal Import/Export untuk fitur Teachers.
 * Logika parse/validasi/commit tetap di TeachersPage — file ini hanya deklarasi UI.
 * Config import dibangun per-render karena kolom entity butuh daftar mapel dinamis.
 */

export const SYSTEM_COLS = [
    { key: 'name', label: 'Nama Lengkap', synonyms: ['nama', 'name', 'nama lengkap', 'nama guru', 'guru'] },
    { key: 'nbm', label: 'NBM', synonyms: ['nbm', 'nomor baku muhammadiyah', 'no. btm', 'btm'] },
    { key: 'subject', label: 'Mata Pelajaran', synonyms: ['mapel', 'mata pelajaran', 'subject', 'bidang studi'] },
    { key: 'gender', label: 'Jenis Kelamin', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex', 'l/p'] },
    { key: 'phone', label: 'No. WhatsApp', synonyms: ['wa', 'no. hp/wa', 'phone', 'whatsapp', 'no hp', 'no telp'] },
    { key: 'email', label: 'Email', synonyms: ['email', 'surel', 'e-mail'] },
    { key: 'status', label: 'Status', synonyms: ['status', 'aktif', 'status aktif'] },
    { key: 'type', label: 'Jenis Pegawai', synonyms: ['jenis', 'type', 'jenis pegawai', 'tipe', 'peran'] },
    { key: 'nik', label: 'NIK', synonyms: ['nik', 'nomor induk kependudukan', 'no ktp', 'ktp'] },
    { key: 'nip', label: 'NIP', synonyms: ['nip', 'nomor induk pegawai'] },
    { key: 'nuptk', label: 'NUPTK', synonyms: ['nuptk'] },
    { key: 'birth_place', label: 'Tempat Lahir', synonyms: ['tempat lahir', 'birth_place', 'birthplace', 'tmp lahir'] },
    { key: 'birth_date', label: 'Tanggal Lahir', synonyms: ['tanggal lahir', 'birth_date', 'tgl lahir', 'tanggal_lahir'] },
    { key: 'address', label: 'Alamat', synonyms: ['alamat', 'address', 'alamat tinggal'] },
    { key: 'employment_status', label: 'Status Kepegawaian', synonyms: ['status kepegawaian', 'status pegawai', 'kepegawaian', 'status kerja'] },
    { key: 'teaching_hours', label: 'Jam Mengajar', synonyms: ['jam mengajar', 'teaching_hours', 'jam', 'teaching hours'] },
    { key: 'last_education', label: 'Pendidikan Terakhir', synonyms: ['pendidikan terakhir', 'pendidikan', 'last_education', 'last education', 'pendidikan_terakhir'] },
    { key: 'major', label: 'Jurusan', synonyms: ['jurusan', 'major', 'program studi', 'prodi'] },
    { key: 'graduation_year', label: 'Tahun Lulus', synonyms: ['tahun lulus', 'graduation_year', 'tahun_lulus', 'lulus tahun'] },
]

const COLUMN_DEFS = [
    { key: 'nama', label: 'Nama Lengkap', icon: User },
    { key: 'nbm', label: 'NBM', icon: Barcode },
    { key: 'subject', label: 'Mata Pelajaran', icon: Book },
    { key: 'gender', label: 'Jenis Kelamin', icon: VenusMarsIcon },
    { key: 'phone', label: 'No. WhatsApp', icon: WhatsAppIcon },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'status', label: 'Status', icon: CircleQuestionMark },
    { key: 'type', label: 'Jenis Pegawai', icon: IdCard },
    { key: 'nik', label: 'NIK', icon: IdCard },
    { key: 'nip', label: 'NIP', icon: IdCard },
    { key: 'nuptk', label: 'NUPTK', icon: Hash },
    { key: 'birth_place', label: 'Tempat Lahir', icon: MapPin },
    { key: 'birth_date', label: 'Tanggal Lahir', icon: Calendar },
    { key: 'address', label: 'Alamat', icon: MapPin },
    { key: 'employment_status', label: 'Status Kepegawaian', icon: Briefcase },
    { key: 'teaching_hours', label: 'Jam Mengajar', icon: Clock },
    { key: 'last_education', label: 'Pendidikan Terakhir', icon: GraduationCap },
    { key: 'major', label: 'Jurusan', icon: BookOpen },
    { key: 'graduation_year', label: 'Tahun Lulus', icon: CalendarCheck },
    { key: 'join_date', label: 'Tgl Bergabung', icon: Calendar },
]

export const buildImportConfig = ({ subjectsList = [] }) => ({
    title: 'Import Data Guru',
    description: 'Unggah data guru secara masal dari file Excel atau CSV. Sistem akan memvalidasi data secara otomatis.',
    size: 'lg',
    systemCols: SYSTEM_COLS,
    requiredKeys: ['name'],
    columns: [
        { key: 'name', label: 'Nama', w: 'w-[20%]', required: true },
        { key: 'subject', label: 'Mapel', w: 'w-[20%]', editor: { type: 'entity', list: subjectsList, minWidth: 200 } },
        { key: 'gender', label: 'L/P', w: 'w-[10%]', center: true, editor: { type: 'enum', options: [{ id: 'L', name: 'Laki-laki' }, { id: 'P', name: 'Perempuan' }] } },
        { key: 'phone', label: 'Kontak', w: 'w-[18%]' },
        { key: 'status', label: 'Status', w: 'w-[15%]', center: true, editor: { type: 'enum', options: Object.entries(STATUS_CONFIG).map(([k, v]) => ({ id: k, name: v.label })) } },
    ],
    template: {
        cols: [
            { l: 'A', k: 'NAME', n: 'Nama Lengkap', w: 'w-[20%]' },
            { l: 'B', k: 'NBM', n: 'NBM', w: 'w-[11%]' },
            { l: 'C', k: 'SUBJECT', n: 'Mata Pelajaran', w: 'w-[17%]' },
            { l: 'D', k: 'GENDER', n: 'L/P', w: 'w-[10%]' },
            { l: 'E', k: 'WA', n: 'WhatsApp', w: 'w-[13%]' },
            { l: 'F', k: 'EMAIL', n: 'Email', w: 'w-[17%]' },
            { l: 'G', k: 'STATUS', n: 'Status', w: 'w-[12%]' },
        ],
        rows: [
            ['Ahmad Fauzi, S.Pd', '12345678', 'Bahasa Indonesia', 'L', '08123...', 'ahmad@school.com', 'active'],
            ['Siti Aminah, M.Pd', '87654321', 'Matematika', 'P', '08567...', 'siti@school.com', 'active'],
        ],
    },
    reference: {
        icon: School,
        title: 'Data Referensi',
        desc: 'Guru & Mapel',
        buttonLabel: 'Daftar Mapel Valid',
        dropdownLabel: 'Daftar Mapel (Copy & Paste):',
        items: subjectsList,
    },
    features: { skipDupes: true, previewCap: 0 },
})

export const EXPORT_CONFIG = {
    title: 'Export Data Guru',
    description: 'Cadangkan atau pindahkan data guru & pegawai ke format CSV, Excel, atau PDF.',
    entityNoun: 'guru',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'contact', label: 'Kontak', cols: ['nama', 'phone', 'email', 'address'] },
        { id: 'employment', label: 'Kepegawaian', cols: ['nama', 'nbm', 'status', 'type', 'employment_status', 'join_date', 'teaching_hours'] },
        { id: 'academic', label: 'Akademik', cols: ['nama', 'subject', 'last_education', 'major', 'graduation_year'] },
        { id: 'personal', label: 'Pribadi', cols: ['nama', 'gender', 'birth_place', 'birth_date', 'nik', 'nip', 'nuptk'] },
    ],
    defaultFileName: 'Data Guru',
    resetCols: ['nama', 'nbm'],
}
