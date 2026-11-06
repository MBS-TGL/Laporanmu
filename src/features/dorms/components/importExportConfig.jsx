import { ChevronDown, Zap } from 'lucide-react'

/**
 * Konfigurasi modal Import untuk fitur Dorms (plotting kamar santri).
 * Logika parse/validasi/commit tetap di useDormsData — file ini hanya deklarasi UI.
 * Config dibangun per-render: kolom entity butuh daftar santri & kamar dinamis,
 * dan slot perbaikan massal butuh aksi handleBulkFix dari hook.
 */

export const buildImportConfig = ({ students = [], dorms = [], handleBulkFix }) => ({
    title: 'Import Plotting Kamar',
    description: 'Unggah file spreadsheet (.csv / .xlsx) untuk memplotting kamar santri secara massal.',
    size: 'lg',
    systemCols: [
        { key: 'student_name', label: 'Nama Siswa', synonyms: ['nama', 'student', 'siswa', 'student_name', 'nama siswa', 'name', 'nama lengkap'] },
        { key: 'class_name', label: 'Nama Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombongan belajar', 'rombel', 'nama kelas'] },
        { key: 'room_name', label: 'Nama Kamar', synonyms: ['kamar', 'room', 'room_name', 'nama kamar', 'asrama', 'kamar asrama'] },
    ],
    requiredKeys: ['student_name', 'room_name'],
    columns: [
        { key: 'no', label: 'No', w: 'w-[6%]', static: 'index' },
        {
            key: 'student_id', label: 'Nama Santri', w: 'w-[32%]', required: true,
            editor: {
                type: 'entity',
                list: students,
                labelKey: 'name',
                displayKey: '_studentName',
                searchKeys: ['name', 'classes.name'],
                minWidth: 240,
                renderOption: (s) => (
                    <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{s.name}</span>
                        {s.classes?.name && <span className="text-xs text-[var(--color-text-muted)] font-normal">{s.classes.name}</span>}
                    </div>
                ),
            },
        },
        // Kelas tampil read-only (turunan dari santri yang dipilih)
        { key: 'class_display', label: 'Kelas', w: 'w-[20%]', static: '_className' },
        {
            key: 'room_id', label: 'Kamar Target', w: 'w-[32%]', required: true,
            editor: {
                type: 'entity',
                list: dorms,
                labelKey: 'id',
                displayKey: '_roomName',
                minWidth: 220,
                renderOption: (d) => (
                    <div className="flex flex-col truncate pr-2">
                        <span className="truncate">Kamar {d.id}</span>
                        <span className="text-xs text-[var(--color-text-muted)] font-normal uppercase">{d.building} · {d.gender}</span>
                    </div>
                ),
            },
        },
    ],
    reference: {
        title: 'Gunakan Template File Asrama',
        desc: 'Pastikan dokumen berisi kolom minimal: Nama Siswa, Kelas, dan Nama Kamar agar terpetakan otomatis.',
    },
    features: { previewCap: 0 },
    // Muncul saat ada baris bermasalah: petakan massal ke satu kamar
    renderBulkFix: ({ importPreview }) => {
        if (!importPreview.some(r => r._hasError)) return null
        return (
            <div className="p-3.5 rounded-2xl border border-danger/10 bg-danger/5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">Perbaikan Cepat Massal</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-bold">Petakan semua rekod yang bermasalah langsung ke satu nilai kamar yang sama di bawah.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 min-w-[200px] max-w-xs w-full relative">
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                handleBulkFix('room_id', e.target.value)
                                e.target.value = ''
                            }
                        }}
                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide outline-none focus:border-danger/40 appearance-none pr-8 text-[var(--color-text)]"
                    >
                        <option value="">-- Peta Massal Kamar --</option>
                        {dorms.map(d => (
                            <option key={d.id} value={d.id}>KAMAR {d.id}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
            </div>
        )
    },
})
