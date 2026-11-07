import { AudioWaveform, Barcode, Calendar, CircleQuestionMark, Hash, House, IdCard, MapPin, School, Shirt, Star, User, Zap } from 'lucide-react'
import { MarsIcon, VenusIcon, VenusMarsIcon, WhatsAppIcon } from '@shared/components'
import { SYSTEM_COLS } from '@features/enrollment/hooks/useImportExport'

/**
 * Konfigurasi modal Import/Export untuk fitur Enrollment (PSB).
 * Logika parse/validasi/commit tetap di useImportExport (hook) — file ini
 * hanya deklarasi UI. Config import dibangun per-render (butuh daftar
 * gelombang untuk entity/reference dan aksi bulk-fix dari hook).
 */

const COLUMN_DEFS = [
    { key: 'id', label: 'ID', icon: Hash },
    { key: 'no_reg', label: 'No. Registrasi', icon: Barcode },
    { key: 'nama', label: 'Nama', icon: User },
    { key: 'gender', label: 'Gender', icon: VenusMarsIcon },
    { key: 'nisn', label: 'NISN', icon: IdCard },
    { key: 'asal_sekolah', label: 'Asal Sekolah', icon: School },
    { key: 'program', label: 'Program', icon: Star },
    { key: 'gelombang', label: 'Gelombang', icon: AudioWaveform },
    { key: 'phone', label: 'Whatsapp', icon: WhatsAppIcon },
    { key: 'birth_place', label: 'Tempat Lahir', icon: MapPin },
    { key: 'birth_date', label: 'Tgl Lahir', icon: Calendar },
    { key: 'father_name', label: 'Ayah', icon: MarsIcon },
    { key: 'mother_name', label: 'Ibu', icon: VenusIcon },
    { key: 'address', label: 'Alamat', icon: House },
    { key: 'uniform_size', label: 'Seragam', icon: Shirt },
    { key: 'status', label: 'Status', icon: CircleQuestionMark },
]

export const EXPORT_CONFIG = {
    title: 'Export Data Pendaftar',
    description: 'Cadangkan atau pindahkan data pendaftaran ke format CSV, Excel, atau PDF.',
    entityNoun: 'pendaftar',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: ['no_reg', 'nama', 'gender', 'asal_sekolah', 'program', 'gelombang', 'phone', 'status', 'uniform_size'] },
        { id: 'contact', label: 'Kontak Wali', cols: ['nama', 'phone', 'father_name', 'mother_name'] },
        { id: 'minimal', label: 'Administrasi', cols: ['no_reg', 'nama', 'program', 'gelombang', 'status'] },
    ],
    defaultFileName: 'export_psb',
    resetCols: ['no_reg', 'nama'],
}

export const buildImportConfig = ({ waves = [], handleBulkFix }) => ({
    title: 'Import Calon Santri Baru',
    description: 'Unggah data pendaftaran secara masal dari Excel/CSV. Sistem memvalidasi kelengkapan data otomatis.',
    size: 'lg',
    systemCols: SYSTEM_COLS,
    requiredKeys: ['name'],
    columns: [
        { key: 'name', label: 'Nama', w: 'w-[20%]', required: true },
        { key: 'gender', label: 'L/P', w: 'w-[12%]', center: true, editor: { type: 'enum', options: [{ id: 'L', name: 'Laki-laki' }, { id: 'P', name: 'Perempuan' }] } },
        { key: 'phone', label: 'Whatsapp', w: 'w-[18%]' },
        { key: 'program', label: 'Program', w: 'w-[15%]', center: true, editor: { type: 'enum', options: [{ id: 'reguler', name: 'Reguler' }, { id: 'tahfidz', name: 'Tahfidz' }, { id: 'kitab', name: 'Kitab' }] } },
        { key: 'wave_id', label: 'Gelombang', w: 'w-[23%]', editor: { type: 'entity', list: waves, labelKey: 'name', displayKey: '_waveName', minWidth: 220 } },
    ],
    template: {
        cols: [
            { l: 'A', k: 'NAMA', n: 'Nama Pendaftar', w: 'w-[25%]' },
            { l: 'B', k: 'GENDER', n: 'L/P', w: 'w-[10%]' },
            { l: 'C', k: 'PHONE', n: 'No. HP/WA', w: 'w-[20%]' },
            { l: 'D', k: 'PROGRAM', n: 'Program', w: 'w-[15%]' },
            { l: 'E', k: 'WAVE', n: 'Gelombang', w: 'w-[15%]' },
            { l: 'F', k: 'SCHOOL', n: 'Asal Sekolah', w: 'w-[15%]' },
        ],
        rows: [
            ['Ahmad Fulan', 'L', '0812345...', 'reguler', 'Gelombang 1', 'SDN 1 Depok'],
            ['Aisyah Fulanah', 'P', '0898765...', 'tahfidz', 'Gelombang 1', 'MI Al-Ikhlas'],
        ],
    },
    reference: {
        icon: Star,
        title: 'Data Gelombang',
        desc: 'Gelombang PSB',
        buttonLabel: 'Daftar Gelombang Valid',
        dropdownLabel: 'Daftar Gelombang (Copy & Paste):',
        items: waves,
        itemKey: 'name',
        hint: '* Harap pastikan penulisan nama Gelombang persis seperti di atas.',
    },
    features: { skipDupes: true, previewCap: 300 },
    // Muncul hanya saat ada baris dengan gelombang yang tidak dikenali
    renderBulkFix: ({ importIssues }) => {
        if (!importIssues.some(iss => iss.messages.some(m => m.includes('Gelombang tidak valid')))) return null
        return (
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Perbaikan Massal Tersedia</p>
                        <p className="text-xs font-bold text-amber-600/80">Beberapa baris memiliki gelombang yang tidak dikenali. Petakan semuanya ke satu gelombang aktif?</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                handleBulkFix('wave_id', e.target.value)
                                e.target.value = ''
                            }
                        }}
                        className="h-9 px-3 rounded-xl bg-[var(--color-surface)] border border-amber-500/30 text-xs font-bold uppercase tracking-wide outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer text-[var(--color-text)]"
                    >
                        <option value="">-- Pilih Gelombang --</option>
                        {waves.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        )
    },
})
