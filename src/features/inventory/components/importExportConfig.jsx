import { Boxes, Calendar, CircleCheck, FileText, Gauge, Hash, Tags, TriangleAlert } from 'lucide-react'

/**
 * Konfigurasi modal Export untuk fitur Inventory (asrama).
 * Hanya sisi export — fitur ini tidak punya import massal.
 */

export const COLUMN_DEFS = [
    { key: 'nama', label: 'Nama Item', icon: Boxes },
    { key: 'total', label: 'Total', icon: Hash },
    { key: 'baik', label: 'Kondisi Baik', icon: CircleCheck },
    { key: 'rusak', label: 'Kondisi Rusak', icon: TriangleAlert },
    { key: 'kondisi', label: 'Kondisi (%)', icon: Gauge },
    { key: 'kategori', label: 'Kategori', icon: Tags },
    { key: 'dicek', label: 'Terakhir Dicek', icon: Calendar },
    { key: 'catatan', label: 'Catatan', icon: FileText },
]

export const EXPORT_CONFIG = {
    title: 'Export Data Inventaris',
    description: 'Cadangkan data inventaris asrama ke format CSV, Excel, atau PDF.',
    entityNoun: 'item',
    columnDefs: COLUMN_DEFS,
    presets: [
        { id: 'all', label: 'Data Lengkap', cols: COLUMN_DEFS.map(c => c.key) },
        { id: 'condition', label: 'Rekap Kondisi', cols: ['nama', 'total', 'baik', 'rusak', 'kondisi'] },
        { id: 'minimal', label: 'Dasar', cols: ['nama', 'total', 'kategori'] },
    ],
    defaultFileName: 'inventaris',
    resetCols: ['nama', 'total'],
}
