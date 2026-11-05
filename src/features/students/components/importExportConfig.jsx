import { Barcode, ChartPie, CircleQuestionMark, Hash, IdCard, School, ShieldCheck, Star, Tags, User, Users } from 'lucide-react'
import { MarsIcon, VenusIcon, VenusMarsIcon, WhatsAppIcon } from '@shared/components'
import { SYSTEM_COLS } from '@features/students/hooks/useImportExport'
import ImportBulkFixGroup from './ImportBulkFixGroup'

/**
 * Konfigurasi modal Import/Export untuk fitur Students.
 * Logika parse/validasi/commit tetap di useImportExport (hook) — file ini
 * hanya deklarasi UI. Dibangun lewat builder karena butuh data dinamis:
 * daftar kelas (entity/reference/slot bulk-fix) dan t()/language (template).
 */

export const buildImportConfig = ({ t, language, classesList = [], handleBulkFixClassGroup }) => ({
    title: 'Import Data Siswa',
    description: 'Unggah data siswa secara masal dari file Excel atau CSV. Sistem akan memvalidasi data secara otomatis.',
    size: 'xl',
    systemCols: SYSTEM_COLS,
    requiredKeys: ['name', 'class_name'],
    columns: [
        { key: 'name', label: 'Nama', w: 'w-[18%]', required: true },
        { key: 'class_id', label: 'Kelas', w: 'w-[18%]', required: true, editor: { type: 'entity', list: classesList, labelKey: 'name', displayKey: '_className', minWidth: 220 } },
        { key: 'gender', label: 'L/P', w: 'w-[12%]', center: true, editor: { type: 'enum', options: [{ id: 'L', name: 'Laki-laki' }, { id: 'P', name: 'Perempuan' }] } },
        { key: 'phone', label: 'Whatsapp', w: 'w-[20%]' },
        { key: 'nisn', label: 'NISN', w: 'w-[20%]' },
    ],
    template: {
        cols: [
            { l: 'A', k: 'NAME', n: 'Nama Lengkap', w: 'w-[21%]' },
            { l: 'B', k: 'GENDER', n: 'L/P', w: 'w-[13%]' },
            { l: 'C', k: 'CLASS', n: 'Nama Kelas', w: 'w-[21%]' },
            { l: 'D', k: 'WA', n: 'WhatsApp', w: 'w-[14%]' },
            { l: 'E', k: 'NIS', n: 'NIS', w: 'w-[13%]' },
            { l: 'F', k: 'WALI', n: 'Wali', w: 'w-[18%]' },
        ],
        rows: [
            [t('behavior.tplStudent1'), language === 'en' ? 'M' : 'L', t('behavior.tplClass1'), '08123...', '2024001', language === 'en' ? 'James Smith' : language === 'ar' ? 'محمد' : 'Ahmad'],
            [t('behavior.tplStudent2'), language === 'en' ? 'F' : 'P', t('behavior.tplClass2'), '08567...', '2024002', language === 'en' ? 'Mary Doe' : language === 'ar' ? 'علي' : 'Aminah'],
        ],
    },
    reference: {
        icon: School,
        title: 'Data Referensi',
        desc: 'Siswa & Kelas',
        buttonLabel: 'Daftar Kelas Valid',
        dropdownLabel: 'Daftar Kelas (Copy & Paste):',
        items: classesList,
        itemKey: 'name',
    },
    features: { skipDupes: true, previewCap: 300 },
    renderBulkFix: ({ importPreview }) => (
        <ImportBulkFixGroup
            importPreview={importPreview}
            classesList={classesList}
            onFix={handleBulkFixClassGroup}
        />
    ),
})

export const buildExportConfig = ({ students = [], selectedStudentIds = [], exportScope, generateStudentPDF, addToast }) => ({
    title: 'Export Data Siswa',
    description: 'Cadangkan atau pindahkan data siswa ke format CSV, Excel, atau PDF dengan opsi enterprise.',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning-dark',
    entityNoun: 'siswa',
    columnDefs: [
        { key: 'id', label: 'ID', icon: Hash },
        { key: 'kode', label: 'Kode Registrasi', icon: Barcode },
        { key: 'nisn', label: 'NISN', icon: IdCard },
        { key: 'nama', label: 'Nama', icon: User },
        { key: 'gender', label: 'Gender', icon: VenusMarsIcon },
        { key: 'kelas', label: 'Kelas', icon: School },
        { key: 'father_name', label: 'Ayah', icon: MarsIcon },
        { key: 'mother_name', label: 'Ibu', icon: VenusIcon },
        { key: 'guardian_name', label: 'Wali', icon: ShieldCheck },
        { key: 'poin', label: 'Poin', icon: Star },
        { key: 'phone', label: 'Whatsapp', icon: WhatsAppIcon },
        { key: 'status', label: 'Status', icon: CircleQuestionMark },
        { key: 'tags', label: 'Label/Tag', icon: Tags },
        { key: 'kelengkapan', label: 'Data', icon: ChartPie },
    ],
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: ['kode', 'nisn', 'nama', 'gender', 'kelas', 'poin', 'phone', 'status', 'tags', 'kelengkapan'] },
        { id: 'contact', label: 'Kontak Wali', cols: ['nama', 'kelas', 'phone'] },
        { id: 'academic', label: 'Akademik', cols: ['nama', 'kelas', 'nisn', 'poin'] },
        { id: 'minimal', label: 'Presensi', cols: ['nama', 'kelas'] },
    ],
    defaultFileName: 'Data Siswa',
    resetCols: ['nama', 'kelas'],
    extraFormats: [
        {
            label: 'PDF Kartu',
            icon: IdCard,
            desc: 'Cetak Kartu',
            onClick: () => {
                // Scope 'selected' cetak hanya siswa terpilih; scope lain pakai daftar students di page
                const targets = exportScope === 'selected' && selectedStudentIds.length > 0
                    ? students.filter(s => selectedStudentIds.includes(s.id))
                    : students
                if (!targets.length) return addToast?.('Tidak ada siswa untuk dicetak', 'warning')
                generateStudentPDF?.(targets)
            },
            color: 'hover:border-orange-400 hover:bg-orange-50 text-orange-700',
            iconColor: 'text-orange-500',
        },
    ],
})
