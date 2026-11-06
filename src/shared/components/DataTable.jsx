import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { EmptyState } from './DataDisplay'

const ALIGN = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
}

/** Ikon indikator sort: 'asc' → panah atas, 'desc' → panah bawah, selain itu netral. */
function SortIcon({ active }) {
    if (active === 'asc') return <ArrowUp className="w-3.5 h-3.5" />
    if (active === 'desc') return <ArrowDown className="w-3.5 h-3.5" />
    return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
}

/**
 * Tabel data reusable — menerapkan house style yang sebelumnya copy-paste di berbagai halaman:
 * wrapper `border rounded-xl bg-surface`, `thead bg-surface-alt` uppercase muted, row hover,
 * kolom checkbox opsional, highlight selection, skeleton loading, dan EmptyState.
 *
 * Responsif:
 *  - `mobileCard` diberikan → tabel `hidden md:block` + fallback kartu `md:hidden` (pola halaman penuh).
 *  - `mobileCard` tidak diberikan → tabel selalu tampil dengan `overflow-x-auto` (cocok untuk konten modal).
 *
 * Contoh:
 *   <DataTable
 *       columns={[
 *           { key: 'name', header: 'Nama', sortable: true, sortActive: 'asc', onSort: fn },
 *           { key: 'role', header: 'Peran', align: 'center', render: (row) => <Badge>{row.role}</Badge> },
 *       ]}
 *       data={rows}
 *       selectable
 *       selectedIds={selectedIds}
 *       onToggleSelect={(row) => ...}
 *       onToggleSelectAllPage={(allSelected) => ...}
 *       empty={{ icon: Users, title: 'Belum ada data' }}
 *       mobileCard={(row) => <MobileRowCard item={row} />}
 *   />
 *
 * Pagination tidak diurus di sini — compose dengan <Pagination /> di halaman.
 */
export default function DataTable({
    columns = [],
    data = [],
    keyField = 'id',
    loading = false,
    empty,
    selectable = false,
    selectedIds,
    onToggleSelect,
    onToggleSelectAllPage,
    onRowClick,
    rowClassName,
    minWidth,
    stickyHeader = false,
    dense = true,
    mobileCard,
    skeletonRows = 5,
}) {
    const pad = dense ? 'px-3 py-2.5' : 'px-4 py-3'
    const textSize = dense ? 'text-xs' : 'text-sm'
    const totalCols = columns.length + (selectable ? 1 : 0)

    const isSelected = (row) => {
        if (!selectable || !selectedIds) return false
        const id = row[keyField]
        return selectedIds instanceof Set ? selectedIds.has(id) : selectedIds.includes(id)
    }
    const allSelected = selectable && data.length > 0 && data.every(isSelected)

    const headCell = (col, i) => {
        const sortable = col.sortable && col.onSort
        const sortState = col.sortActive === 'asc' ? 'asc' : col.sortActive === 'desc' ? 'desc' : null
        return (
            <th
                key={col.key || i}
                className={`${pad} ${ALIGN[col.align] || ''} whitespace-nowrap ${col.headerClassName || ''}`}
            >
                {sortable ? (
                    <button
                        onClick={col.onSort}
                        className={`flex items-center gap-1.5 uppercase tracking-wide font-bold hover:text-[var(--color-text)] transition-colors ${col.align === 'center' ? 'mx-auto' : col.align === 'right' ? 'ml-auto' : ''}`}
                    >
                        {col.header}
                        <SortIcon active={sortState} />
                    </button>
                ) : col.header}
            </th>
        )
    }

    const skeletonBody = (
        <tbody>
            {Array.from({ length: skeletonRows }).map((_, r) => (
                <tr key={r} className="border-b last:border-0 border-[var(--color-border)]">
                    {selectable && (
                        <td className={pad}>
                            <div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" />
                        </td>
                    )}
                    {columns.map((col, j) => (
                        <td key={col.key || j} className={`${pad} ${ALIGN[col.align] || ''}`}>
                            <div className="h-3.5 rounded bg-[var(--color-border)] animate-pulse" style={{ width: `${70 + ((r * 13 + j * 7) % 25)}%` }} />
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    )

    const table = (body) => (
        <div
            className={`border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] shadow-sm ${mobileCard && !loading ? 'hidden md:block' : ''}`}
        >
            <div className="overflow-x-auto">
                <table className={`w-full ${textSize}`} style={minWidth ? { minWidth } : undefined}>
                    <thead className={`bg-[var(--color-surface-alt)] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
                        <tr className="text-left text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                            {selectable && (
                                <th className={`${pad} w-10`}>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={() => onToggleSelectAllPage?.(allSelected)}
                                        aria-label="Pilih semua di halaman ini"
                                        className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                                    />
                                </th>
                            )}
                            {columns.map(headCell)}
                        </tr>
                    </thead>
                    {body}
                </table>
            </div>
        </div>
    )

    // ---- Loading: skeleton mengikuti konfigurasi kolom ----
    if (loading) return table(skeletonBody)

    // ---- Empty: EmptyState reusable ----
    if (!data || data.length === 0) {
        const emptyProps = typeof empty === 'string' ? { description: empty } : (empty || {})
        return <EmptyState title="Tidak ada data" description="Belum ada data untuk ditampilkan." {...emptyProps} />
    }

    // ---- Data ----
    const body = (
        <tbody>
            {data.map((row, idx) => {
                const selected = isSelected(row)
                const extra = typeof rowClassName === 'function' ? rowClassName(row) : (rowClassName || '')
                return (
                    <tr
                        key={row[keyField] ?? idx}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        className={`border-b last:border-0 border-[var(--color-border)] transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'} ${extra}`}
                    >
                        {selectable && (
                            <td className={pad} onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => onToggleSelect?.(row)}
                                    aria-label={`Pilih baris ${idx + 1}`}
                                    className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                                />
                            </td>
                        )}
                        {columns.map((col, j) => (
                            <td key={col.key || j} className={`${pad} ${ALIGN[col.align] || ''} ${col.className || ''}`}>
                                {col.render ? col.render(row) : row[col.key]}
                            </td>
                        ))}
                    </tr>
                )
            })}
        </tbody>
    )

    if (mobileCard) {
        return (
            <>
                {table(body)}
                <div className="md:hidden space-y-2">
                    {data.map((row, idx) => (
                        <div key={row[keyField] ?? idx}>{mobileCard(row, idx)}</div>
                    ))}
                </div>
            </>
        )
    }

    return table(body)
}
