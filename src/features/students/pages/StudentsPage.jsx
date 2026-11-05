import React from 'react'
import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Camera, FileInput, FileOutput, Link as LinkIcon, Pencil, RefreshCw, TrendingUp, TrendingDown, CheckCheck, Archive, ArrowDownAZ, ArrowUpNarrowWide, Briefcase, ChartPie, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Crown, DoorOpen, Download, Eye, EyeOff, FileText, GraduationCap, Image, Info, Keyboard, LoaderCircle, PenTool, Plus, Printer, Rocket, RotateCcw, School, Search, Send, ShieldHalf, SlidersHorizontal, SquareCheck, Table, TableProperties, Tags, Trash2, TriangleAlert, Trophy, Users, X, Zap } from 'lucide-react'
import { LIST_KAMAR } from '@utils/reports/raportConstants'

import DashboardLayout from '@core/layouts/DashboardLayout'
import { Breadcrumb, PageHeader, Modal, RichSelect, Button, EmptyState, Pagination, MarsIcon, VenusIcon, WhatsAppIcon, ShortcutsModal } from '@shared/components'
import { usePageShortcuts } from '@shared/hooks/usePageShortcuts'
import { useToast, useFlag, useLanguage } from '@context'
import { supabase } from '@lib/supabase'
import mbsLogo from '@assets/images/logos/logo-mbs.png'
import { SortOptions, RiskThreshold, AvailableTags, getTagColor, calculateCompleteness, maskInfo, formatRelativeDate } from '@features/students/utils/studentsConstants'
import { useImportExport } from '@features/students/hooks/useImportExport'
import { generateStudentPDF as _generateStudentPDF, handlePrintThermal as _handlePrintThermal, handleSavePNG as _handleSavePNG } from '@features/students/utils/pdfUtils'
import { useCore } from '@features/students/hooks/useCore'
import ClassHistory from '@features/students/components/ClassHistory'
import { MobileListSkeleton, MobileCardSkeleton } from '@shared/components/Skeleton'

// NOTE(perf): library import/export di-load on-demand via dynamic import
// NOTE(perf): jsPDF/html2canvas/qrcode/autotable di-load on-demand via dynamic import

// FIX BOTTOM NAV Z-INDEX:
// Di DashboardLayout atau komponen BottomNav, pastikan z-index bottom nav
// lebih tinggi dari backdrop modal (z-[60]). Contoh:
//   <nav className="fixed bottom-0 z-[80] ...">
// Ini mencegah backdrop modal mencover bottom nav sehingga tap nav tetap berfungsi.

import ArchiveModal from '@features/students/components/ArchiveModal'
import { buildImportConfig, buildExportConfig } from '@features/students/components/importExportConfig'
import BulkPhoto from '@features/students/components/BulkPhoto'
import ResetPoints from '@features/students/components/ResetPoints'
import GSheetsModal from '@features/students/components/GSheetsModal'
import FormModal from '@features/students/components/FormModal'
import InlineAdd from '@features/students/components/InlineAdd'
import { StudentRow, StudentMobileCard, StudentMobileListRow, StudentSkeletonRow, StudentSkeletonCard } from '@features/students/components/StudentRow'
import { Kbd } from '@shared/components/ShortcutsModal'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

const LazyAccessCard = React.lazy(() =>
    import('@features/students/components/AccessCard')
)
const LazyProfileModal = React.lazy(() =>
    import('@features/students/components/ProfileModal')
)
const LazyExportModal = React.lazy(() =>
    import('@shared/components/import-export/ExportDataModal')
)
const LazyImportModal = React.lazy(() =>
    import('@shared/components/import-export/ImportDataModal')
)
const LazyTagModal = React.lazy(() =>
    import('@features/students/components/TagModal')
)





// ── Isolated Search Input ────────────────────────────────────────────────────
// State ketikan HARUS di komponen terpisah supaya keystroke tidak
// re-render seluruh StudentsPage (3000+ baris)
const DebouncedSearchInput = memo(({ searchQuery, onSearch, inputRef, isLoading }) => {
    const [value, setValue] = useState(searchQuery)

    // Debounce: propagate ke parent setelah 350ms berhenti mengetik
    useEffect(() => {
        const t = setTimeout(() => onSearch(value), 350)
        return () => clearTimeout(t)
    }, [value])

    // Sync saat di-clear dari luar (resetAllFilters, klik chip ×)
    useEffect(() => {
        if (searchQuery === '' && value !== '') setValue('')
    }, [searchQuery])

    return (
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                {isLoading ? (
                    <LoaderCircle className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
                ) : (
                    <Search className="w-4 h-4" />
                )}
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Cari ..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-all placeholder:text-text-muted"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

// --- REUSABLE UI HELPERS (Isolated to prevent lag) ---
const SelectedStudentsCarousel = memo(({
    selectedStudents,
    removingStudentId,
    setRemovingStudentId,
    toggleSelectStudent,
    isPromoteMode = false,
    bulkClassId = null,
    classesList = []
}) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const scrollRef = useRef(null);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const count = selectedStudents.length;
        if (count <= 1) return;
        const cardWidth = el.scrollWidth / count;
        const idx = Math.round(el.scrollLeft / cardWidth);
        const nextIdx = Math.min(idx, count - 1);
        if (nextIdx !== activeIdx) {
            setActiveIdx(nextIdx);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-2">
                    <Users className="w-4 h-4 opacity-40" /> Siswa Terpilih
                </label>
                <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">{selectedStudents.length} Orang</span>
            </div>
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-2.5 overflow-x-auto pb-4 pt-2 px-1 custom-scrollbar -mx-1 snap-x snap-mandatory"
            >
                {selectedStudents.map(student => {
                    const isRemoving = removingStudentId === student.id;

                    // Default styles
                    let statusColor = 'border-[var(--color-border)] bg-[var(--color-surface)]';
                    let icon = Briefcase;
                    let iconColor = 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';

                    // Promote specific logic
                    if (isPromoteMode && bulkClassId) {
                        const targetClass = classesList.find(cl => cl.id === bulkClassId);
                        const originLevel = parseInt(student.className) || 0;
                        const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;

                        if (targetLevel < originLevel) {
                            statusColor = 'bg-red-50 border-red-200';
                            icon = TriangleAlert;
                            iconColor = 'bg-red-500 text-white shadow-lg';
                        } else if (targetLevel === originLevel) {
                            statusColor = 'bg-amber-50 border-amber-200';
                            icon = RotateCcw;
                            iconColor = 'bg-amber-500 text-white shadow-lg';
                        } else if (targetLevel > originLevel) {
                            statusColor = 'bg-indigo-50 border-indigo-200';
                            icon = Rocket;
                            iconColor = 'bg-indigo-500 text-white shadow-lg';
                        }
                    }

                    const Icon = icon;

                    return (
                        <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                                setRemovingStudentId(student.id);
                                setTimeout(() => {
                                    toggleSelectStudent(student.id);
                                    setRemovingStudentId(null);
                                }, 300);
                            }}
                            className={`flex-shrink-0 flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-300 min-w-[170px] shadow-sm text-left group relative snap-center ${statusColor} ${isRemoving ? 'opacity-0 scale-95 blur-md translate-y-2' : 'hover:border-[var(--color-primary)]/40 hover:shadow-md active:scale-95'}`}
                        >
                            <div className="flex items-center gap-2.5 w-full transition-all duration-300 group-hover:blur-[2px] group-hover:opacity-30">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 transition-all duration-500 group-hover:rotate-6 ${iconColor}`}>
                                    {student.foto ? <img src={student.foto} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : (student.name?.charAt(0) || '?')}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[var(--color-text)] truncate leading-tight tracking-tight">{student.name}</p>
                                    <p className="text-xs truncate font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1 text-[var(--color-text-muted)] opacity-60">
                                        {isPromoteMode && bulkClassId ? <Icon className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                                        {student.className || 'Tanpa Kelas'}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg scale-75 group-hover:scale-110 transition-transform duration-300">
                                    <X className="w-4 h-4" loading="lazy" decoding="async" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            {selectedStudents.length > 1 && (
                <div className="flex justify-center gap-1.5 -mt-2 mb-2 sm:hidden">
                    {selectedStudents.slice(0, 10).map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-300 ${activeIdx === i
                                ? 'w-5 h-1.5 bg-[var(--color-primary)]'
                                : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]/30'
                                }`}
                        />
                    ))}
                    {selectedStudents.length > 10 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]/10" />
                    )}
                </div>
            )}
        </div>
    );
});



// ─── Potongan UI kecil (selaras PermitPage) ────────────────────────────
const CHIP_COLORS = {
    indigo: 'text-indigo-600 bg-indigo-500/10',
    sky: 'text-sky-600 bg-sky-500/10',
    rose: 'text-rose-600 bg-rose-500/10',
    emerald: 'text-emerald-600 bg-emerald-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    orange: 'text-orange-600 bg-orange-500/10',
}

// Chip ringkas: statis (statistik) atau tombol (insight yang bisa memfilter)
function StatChip({ icon: Icon, label, value, color = 'indigo', loading, onClick, active }) {
    const cls = `flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-lg border bg-surface shrink-0 snap-start transition-all ${active ? 'border-primary ring-1 ring-primary' : 'border-border'} ${onClick ? 'hover:bg-surface-alt active:scale-95 cursor-pointer' : ''}`
    const body = (
        <>
            <span className={`w-6 h-6 rounded-md flex items-center justify-center ${CHIP_COLORS[color]}`}>
                <Icon className="w-3.5 h-3.5" />
            </span>
            <span className="text-sm font-semibold tabular-nums text-text max-w-[120px] truncate">{loading ? '–' : value}</span>
            <span className="text-xs text-text-muted whitespace-nowrap">{label}</span>
        </>
    )
    return onClick
        ? <button type="button" onClick={onClick} className={cls}>{body}</button>
        : <div className={cls}>{body}</div>
}

const TH = 'px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted'

// Skeleton memakai struktur kolom yang sama dengan tabel asli
function StudentTableSkeleton({ rows = 8 }) {
    const bar = (w) => <div className={`h-2.5 rounded-full bg-border/70 ${w}`} />
    return (
        <div className="overflow-x-auto animate-pulse">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-border bg-surface-alt/60">
                        <th className={`${TH} w-10`}></th>
                        <th className={TH}>Siswa</th>
                        <th className={TH}>Kelas</th>
                        <th className={`${TH} hidden lg:table-cell`}>Status</th>
                        <th className={`${TH} hidden lg:table-cell`}>Poin</th>
                        <th className={TH}><div className="flex justify-end">Aksi</div></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {Array.from({ length: rows }).map((_, i) => (
                        <tr key={i}>
                            <td className="px-4 py-2.5"><div className="w-4 h-4 rounded bg-border/70" /></td>
                            <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-border/70 shrink-0" />
                                    <div className="space-y-1.5">{bar('w-32')}{bar('w-20')}</div>
                                </div>
                            </td>
                            <td className="px-4 py-2.5">{bar('w-20')}</td>
                            <td className="px-4 py-2.5 hidden lg:table-cell"><div className="h-5 w-14 rounded-md bg-border/70" /></td>
                            <td className="px-4 py-2.5 hidden lg:table-cell">{bar('w-8')}</td>
                            <td className="px-4 py-2.5">
                                <div className="flex justify-end gap-1.5">
                                    <div className="h-8 w-8 rounded-lg bg-border/70" />
                                    <div className="h-8 w-8 rounded-lg bg-border/70" />
                                    <div className="h-8 w-8 rounded-lg bg-border/70" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

const STATUS_STYLE = {
    aktif: 'text-emerald-600 bg-emerald-500/10',
    lulus: 'text-indigo-600 bg-indigo-500/10',
    pindah: 'text-amber-600 bg-amber-500/10',
    keluar: 'text-rose-600 bg-rose-500/10',
}

const STATUS_TABS = [
    { key: '', label: 'Semua' },
    { key: 'aktif', label: 'Aktif' },
    { key: 'lulus', label: 'Lulus' },
    { key: 'pindah', label: 'Pindah' },
    { key: 'keluar', label: 'Keluar' },
]

// ═════════════════════════════════════════════════════════════════════════════
// ActionMenu — dropdown aksi bergrup (dikendalikan lewat data / config)
// ═════════════════════════════════════════════════════════════════════════════
const MENU_WIDTH = 336 // px — satu sumber kebenaran untuk lebar & posisi

/** Ambil (atau buat) container portal berdasarkan id. */
function getPortalContainer(id) {
    let el = document.getElementById(id)
    if (!el) {
        el = document.createElement('div')
        el.id = id
        document.body.appendChild(el)
    }
    return el
}

/**
 * Dropdown aksi bergrup (ala menu Vercel / GitHub) — dikendalikan lewat data.
 *
 * @param {boolean} mounted        menu ada di DOM (untuk animasi keluar)
 * @param {boolean} isOpen         menu tampil
 * @param {DOMRect} rect           getBoundingClientRect() tombol pemicu
 * @param {Function} onClose
 * @param {string} [portalId]     id container portal (dibuat otomatis kalau belum ada)
 * @param {React.RefObject} [triggerRef]  fokus dikembalikan ke sini saat menu ditutup
 * @param {string} [label]         aria-label menu
 * @param {Array<{
 *   title: string,
 *   items: Array<{
 *     id: string,
 *     label: string,
 *     description?: string,
 *     icon: React.ComponentType<{ className?: string }>,
 *     onSelect: Function,
 *     show?: boolean,              // default true
 *     disabled?: boolean,
 *     disabledReason?: string,     // tampil sebagai tooltip saat disabled
 *     tone?: 'default' | 'danger',
 *     shortcut?: string[],         // hint, contoh ['Ctrl', 'E'] (desktop saja)
 *   }>
 * }>} sections
 */
function ActionMenu({
    mounted,
    isOpen,
    rect,
    onClose,
    portalId = 'portal-action-menu',
    triggerRef,
    label = 'Menu aksi',
    sections = [],
}) {
    const menuRef = useRef(null)

    /* Fokus ke item pertama saat dibuka; kembalikan ke tombol saat ditutup */
    useEffect(() => {
        if (!isOpen) return
        const first = menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')
        first?.focus()
        const trigger = triggerRef?.current
        return () => trigger?.focus?.()
    }, [isOpen, triggerRef])

    if (!mounted || !rect) return null

    const visible = sections
        .map(s => ({ ...s, items: s.items.filter(i => i.show !== false) }))
        .filter(s => s.items.length > 0)

    const handleKeyDown = e => {
        const items = [...menuRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')]
        const i = items.indexOf(document.activeElement)
        switch (e.key) {
            case 'ArrowDown': e.preventDefault(); items[(i + 1) % items.length]?.focus(); break
            case 'ArrowUp': e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); break
            case 'Home': e.preventDefault(); items[0]?.focus(); break
            case 'End': e.preventDefault(); items[items.length - 1]?.focus(); break
            case 'Escape': e.preventDefault(); e.stopPropagation(); onClose(); break
            case 'Tab': onClose(); break
            default:
        }
    }

    const handleSelect = item => {
        if (item.disabled) return
        onClose()
        item.onSelect()
    }

    return createPortal(
        <>
            <div
                className={`fixed inset-0 z-[9990] bg-black/5 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            <div
                ref={menuRef}
                role="menu"
                aria-label={label}
                onKeyDown={handleKeyDown}
                className={`fixed z-[9991] rounded-2xl border border-border bg-surface shadow-xl p-2 origin-top-right transition-all duration-200 ease-out
                ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
                style={{
                    width: MENU_WIDTH,
                    maxWidth: 'calc(100vw - 1.25rem)',
                    top: rect.bottom + 8,
                    // Anchor kanan menu ke kanan tombol; di layar sempit clamp ke tepi viewport
                    left: Math.max(10, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 10)),
                }}
            >
                {visible.map((section, si) => (
                    <div key={section.title} role="group" aria-label={section.title}>
                        {si > 0 && <div className="h-px bg-border my-1.5 mx-2" role="separator" />}
                        <p className="px-3 pt-2 pb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                            {section.title}
                        </p>

                        {section.items.map((item, ii) => {
                            const Icon = item.icon
                            const danger = item.tone === 'danger'
                            const prev = section.items[ii - 1]
                            // Aksi berbahaya dipisahkan dari aksi biasa di grup yang sama
                            const needsDivider = danger && prev && prev.tone !== 'danger'

                            return (
                                <React.Fragment key={item.id}>
                                    {needsDivider && <div className="h-px bg-border my-1.5 mx-2" role="separator" />}
                                    <button
                                        type="button"
                                        role="menuitem"
                                        tabIndex={-1}
                                        aria-disabled={item.disabled || undefined}
                                        title={item.disabled ? item.disabledReason : undefined}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left outline-none transition-colors
                                        ${item.disabled
                                                ? 'opacity-40 cursor-not-allowed'
                                                : danger
                                                    ? 'hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/40'
                                                    : 'hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:ring-2 focus-visible:ring-primary/40'
                                            }`}
                                    >
                                        {/* Ukuran tetap + shrink-0 → semua judul sejajar */}
                                        <span
                                            className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border
                                            ${danger
                                                    ? 'border-red-500/20 bg-red-500/10 text-red-500'
                                                    : 'border-border bg-surface-alt text-text-muted'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" aria-hidden="true" />
                                        </span>

                                        <span className="flex-1 min-w-0">
                                            <span className={`block text-sm font-semibold leading-tight ${danger ? 'text-red-500' : 'text-text'}`}>
                                                {item.label}
                                            </span>
                                            {item.description && (
                                                <span className="block text-xs text-text-muted leading-snug mt-0.5">
                                                    {item.description}
                                                </span>
                                            )}
                                        </span>

                                        {item.shortcut && (
                                            <span className="hidden sm:flex items-center gap-1 shrink-0">
                                                {item.shortcut.map((k, i) => <Kbd key={`${k}-${i}`}>{k}</Kbd>)}
                                            </span>
                                        )}
                                    </button>
                                </React.Fragment>
                            )
                        })}
                    </div>
                ))}
            </div>
        </>,
        getPortalContainer(portalId)
    )
}

// ═════════════════════════════════════════════════════════════════════════════
// StudentsHeaderMenu — tombol "Aksi lainnya" + menu Data / Manajemen
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Tombol "Aksi lainnya" + dropdown Data / Manajemen di header halaman Data Siswa.
 * State buka/tutup tetap dimiliki halaman (dipakai juga oleh listener Esc global),
 * sedangkan posisi & animasi keluar diurus di sini.
 *
 * @param {boolean} isOpen
 * @param {(v: boolean | ((prev: boolean) => boolean)) => void} setIsOpen
 * @param {{ canImportCSV, canImportGSheets, canExport, canBulkPhoto, canArchive, canResetPoints, canEdit }} can
 * @param {{ onImport, onGSheets, onExport, onBulkPhoto, onArchive, onResetPoints }} actions
 */
const StudentsHeaderMenu = memo(function StudentsHeaderMenu({ isOpen, setIsOpen, can, actions }) {
    const btnRef = useRef(null)
    const [rect, setRect] = useState(null)
    // Unmount ditunda 200ms setelah tutup supaya animasi keluar sempat jalan
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setMounted(true)
        } else {
            const t = setTimeout(() => setMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isOpen])

    // Jaga menu tetap menempel ke tombol saat scroll / resize
    useEffect(() => {
        if (!isOpen) return
        const update = () => btnRef.current && setRect(btnRef.current.getBoundingClientRect())
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [isOpen])

    const sections = useMemo(() => [
        {
            title: 'Data',
            items: [
                {
                    id: 'import-csv', label: 'Import Excel',
                    description: 'Unggah data murid masal',
                    icon: FileInput, show: can.canImportCSV, onSelect: actions.onImport,
                },
                {
                    id: 'import-gsheets', label: 'Import GSheets',
                    description: 'Sinkronisasi data via Google Sheets',
                    icon: LinkIcon, show: can.canImportGSheets, onSelect: actions.onGSheets,
                },
                {
                    id: 'export', label: 'Export Data',
                    description: 'Cadangkan seluruh database',
                    icon: FileOutput, show: can.canExport, shortcut: ['Ctrl', 'E'], onSelect: actions.onExport,
                },
                {
                    id: 'bulk-photo', label: 'Bulk Foto',
                    description: 'Update foto siswa secara masal via NISN',
                    icon: Camera, show: can.canBulkPhoto, onSelect: actions.onBulkPhoto,
                },
            ],
        },
        {
            title: 'Manajemen',
            items: [
                {
                    id: 'archive', label: 'Arsip Siswa',
                    description: 'Lihat & pulihkan data siswa tidak aktif',
                    icon: Archive, show: can.canArchive, onSelect: actions.onArchive,
                },
                {
                    id: 'reset-points', label: 'Reset Poin',
                    description: 'Bersihkan semua poin untuk semester baru',
                    icon: RotateCcw, show: can.canResetPoints, tone: 'danger',
                    disabled: !can.canEdit, disabledReason: 'Kamu tidak punya izin mengedit',
                    onSelect: actions.onResetPoints,
                },
            ],
        },
    ], [can, actions])

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => {
                    if (!isOpen) setRect(btnRef.current?.getBoundingClientRect())
                    setIsOpen(v => !v)
                }}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Impor, ekspor & manajemen data"
                title="Impor, ekspor & manajemen data"
                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isOpen
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-alt border-border text-text-muted hover:text-text hover:bg-border'
                    }`}
            >
                <SlidersHorizontal className="w-4 h-4" />
            </button>

            <ActionMenu
                mounted={mounted}
                isOpen={isOpen}
                rect={rect}
                onClose={() => setIsOpen(false)}
                portalId="portal-header-menu"
                triggerRef={btnRef}
                label="Aksi data siswa"
                sections={sections}
            />
        </>
    )
})


// ─── Keyboard shortcut halaman: binding + daftar modal dari SATU deklarasi items ───
// (listener global & pengelompokan sections ditangani usePageShortcuts di @shared/hooks)


export default function StudentsPage() {
    const { addToast, addUndoToast } = useToast()
    const { dir, t, language } = useLanguage()
    const { enabled: canEdit } = useFlag('access.teacher_students')
    const navigateLocal = useNavigate()
    const [classSearchQuery, setClassSearchQuery] = useState('')
    const [removingStudentId, setRemovingStudentId] = useState(null)

    const core = useCore({ addToast, addUndoToast })

    // De-structure from core
    const {
        students, classesList, loading, globalStats, totalRows, fetchData, fetchStats,
        searchQuery, setSearchQuery, filterClass, setFilterClass, filterClasses, setFilterClasses,
        filterGender, setFilterGender, filterStatus, setFilterStatus, filterTag, setFilterTag,
        filterMissing, setFilterMissing, sortBy, setSortBy, filterPointMode, setFilterPointMode,
        filterPointMin, setFilterPointMin, filterPointMax, setFilterPointMax,
        showAdvancedFilter, setShowAdvancedFilter, debouncedSearch, activeFilterCount, resetAllFilters,
        isModalOpen, setIsModalOpen, isPrintModalOpen, setIsPrintModalOpen,
        activeModal, setActiveModal, isHeaderMenuOpen, setIsHeaderMenuOpen,
        photoZoom, setPhotoZoom,
        isPrivacyMode, setIsPrivacyMode, isAnyModalOpen,
        selectedStudent, setSelectedStudent, studentToDelete, setStudentToDelete,
        selectedStudentIds, setSelectedStudentIds, submitting, setSubmitting,
        newlyCreatedStudent, setNewlyCreatedStudent,
        bulkClassId, setBulkClassId, bulkTagAction, setBulkTagAction,
        bulkPointValue, setBulkPointValue, bulkPointLabel, setBulkPointLabel,
        bulkRoomId, setBulkRoomId,
        behaviorHistory, setBehaviorHistory, raportHistory, setRaportHistory,
        profileTab, setProfileTab, timelineFilter, setTimelineFilter,
        timelineVisible, setTimelineVisible, auditLogs, setAuditLogs, loadingAudit, setLoadingAudit,
        loadingHistory,
        handleSubmit, handleAdd, handleEdit, confirmDelete, executeDelete, closeModal,
        toggleSelectAll, toggleSelectStudent, handleBulkPromote, handleBulkDelete,
        handleBulkPointUpdate, handleBulkTagApply, handleBulkRoomAssign,
        fetchArchivedStudents, handleRestoreStudent, handlePermanentDelete, setArchivedStudents,
        fetchUsedTags, handleToggleTag, handleGlobalDeleteTag, handleGlobalRenameTag,
        fetchBehaviorHistory, fetchRaportHistory, handleViewProfile,
        handleResetPin, checkDuplicate, fetchAuditLog, fetchClassHistory, handleViewClassHistory,
        handleQuickPoint, handleInlineUpdate, handleTogglePin, handlePhotoUpload,
        handleInlineSubmit, handleViewQR, handleViewPrint, handleBulkWA, buildWAMessage, openWAForStudent, waTemplate,
        generateStudentPDF, handlePrintSingle, handlePrintThermal, handleSavePNG, handleBulkPrint,
        handleBulkPhotoMatch, handleBulkPhotoUpload, handleClassBreakdown, handleBatchResetPoints,
        // State Helpers
        tagToEdit, setTagToEdit, duplicateWarning,
        checkingDuplicate, gSheetsUrl, setGSheetsUrl, fetchingGSheets, setFetchingGSheets,
        page, setPage, pageSize, setPageSize, jumpPage, setJumpPage, generatingPdf,
        studentForTags, setStudentForTags, renameInput, setRenameInput,
        archivePage, setArchivePage, archivePageSize, setArchivePageSize, loadingRaport,
        allSelected, someSelected, lastReportMap,
        allUsedTags, tagStats, loadingArchived, archivedStudents, loadingClassHistory, classHistory,
        isInlineAddOpen, setIsInlineAddOpen, inlineForm, setInlineForm, submittingInline, setSubmittingInline,
        classBreakdownData, loadingBreakdown, resetPointsClassId, setResetPointsClassId, resettingPoints,
        resettingPin, uploadingPhoto, broadcastTemplate, setBroadcastTemplate, customWaMsg, setCustomWaMsg, broadcastIndex, setBroadcastIndex,
        formDataRef, importFileInputRef, photoInputRef, searchInputRef, headerMenuRef, cardCaptureRef,
        selectedStudents, selectedStudentsWithPhone, selectedIdSet, generateCode, handleAddCustomTag,
        bulkPhotoMatches, uploadingBulkPhotos, setBulkPhotoMatches, allStudentsForBulk, matchingPhotos,
    } = core
    const { enabled: canImportCSV } = useFlag('students.import_csv')
    const { enabled: canImportGSheets } = useFlag('students.import_gsheets')
    const { enabled: canExport } = useFlag('students.export')
    const { enabled: canBulkPhoto } = useFlag('students.bulk_photo')
    const { enabled: canArchive } = useFlag('students.archive')
    const { enabled: canResetPoints } = useFlag('students.reset_points')
    const { enabled: canAddStudent } = useFlag('students.add')
    const { enabled: canEditStudent } = useFlag('students.edit')
    const { enabled: canDeleteStudent } = useFlag('students.delete')
    const { enabled: canShowStats } = useFlag('students.stats')
    const { enabled: canPrintCard } = useFlag('students.print_card')
    const { enabled: canPromote } = useFlag('students.promote')
    const { enabled: canBulkTag } = useFlag('students.bulk_tag')
    const { enabled: canPrivacyMode } = useFlag('students.privacy_mode')
    const { enabled: canAdvancedFilter } = useFlag('students.filters_advanced')
    const { enabled: canBulkRoom } = useFlag('students.bulk_room')
    const { enabled: canBulkPoint } = useFlag('students.bulk_point')

    // --- Enterprise Enforcement: Sync flags with state ---
    useEffect(() => {
        if (!canPrivacyMode && core.isPrivacyMode) {
            core.setIsPrivacyMode(false)
        }
    }, [canPrivacyMode, core.isPrivacyMode, core.setIsPrivacyMode])

    // --- Enterprise Logic: Data Fetching ---
    const statsScrollRef = useRef(null)
    const [statsScrollState, setStatsScrollState] = useState({ left: false, right: false })
    const updateStatsScroll = useCallback(() => {
        const el = statsScrollRef.current
        if (!el) return
        setStatsScrollState({
            left: el.scrollLeft > 4,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
        })
    }, [])
    const scrollStats = useCallback((dir) => {
        const el = statsScrollRef.current
        if (!el) return
        el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
    }, [])

    // Ukur ulang saat data stats berubah (jumlah chip bisa bertambah/berkurang)
    useEffect(() => {
        updateStatsScroll()
    }, [updateStatsScroll, globalStats])



    // Import/Export Logic
    const importExport = useImportExport({
        students, classesList, fetchData, fetchStats, addToast, closeModal, importFileInputRef, generateCode,
        filterClasses, filterClass, filterGender, filterStatus, filterTag, filterMissing, debouncedSearch,
        filterPointMode, filterPointMin, filterPointMax, sortBy, selectedStudentIds, selectedStudents, gSheetsUrl,
        setFetchingGSheets, fetchingGSheets, profile: core.profile
    })

    const handleViewTags = useCallback((s) => {
        setStudentForTags(s)
        setActiveModal('tag')
    }, [setStudentForTags, setActiveModal])

    const {
        isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope, exportColumns, setExportColumns,
        importFileName, setImportFileName, importPreview, setImportPreview,
        importIssues, setImportIssues, importing, setImporting,
        importProgress, setImportProgress, importStep, setImportStep,
        importRawData, setImportRawData, importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping, importDuplicates, setImportDuplicates,
        importSkipDupes, setImportSkipDupes, importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen, importLoading, setImportLoading,
        isRevalidating, setIsRevalidating, importEditCell, setImportEditCell,
        importCachedDBStudents, setImportCachedDBStudents, exporting, setExporting,
        importReadyRows, hasImportBlockingErrors, ALL_EXPORT_COLUMNS, SYSTEM_COLS,
        processImportFile, handleImportClick, handleCommitImport,
        handleBulkFix, handleBulkFixClassGroup, validateImportPreview, handleDownloadTemplate,
        handleExportCSV, handleExportExcel, handleExportPDF, handleFetchGSheets,
        fetchFilteredForExport, getExportData, importTab, setImportTab,
        downloadBlob, buildImportPreview, handleImportCellEdit, handleRemoveImportRow
    } = importExport

    // Konfigurasi modal import/export (butuh daftar kelas, t(), dan aksi bulk-fix)
    const importConfig = useMemo(
        () => buildImportConfig({ t, language, classesList, handleBulkFixClassGroup }),
        [t, language, classesList, handleBulkFixClassGroup]
    )
    const exportConfig = useMemo(
        () => buildExportConfig({ students, selectedStudentIds, exportScope, generateStudentPDF, addToast }),
        [students, selectedStudentIds, exportScope, generateStudentPDF, addToast]
    )

    const timelineFiltered = useMemo(() =>
        timelineFilter === 'pos' ? behaviorHistory.filter(i => (i.points ?? 0) > 0)
            : timelineFilter === 'neg' ? behaviorHistory.filter(i => (i.points ?? 0) < 0)
                : behaviorHistory
        , [behaviorHistory, timelineFilter])

    // UI States for Column Visibility
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('students_visible_columns')
            if (saved) return JSON.parse(saved)
        } catch (err) { console.error('Error loading visible columns:', err) }
        return {
            gender: true,
            kelas: true,
            status: true,
            poin: true,
            last_report: false,
            profil: true,
            tags: true,
            aksi: true
        }
    })

    useEffect(() => {
        localStorage.setItem('students_visible_columns', JSON.stringify(visibleColumns))
    }, [visibleColumns])

    const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const [mobileView, setMobileView] = useState(() => {
        try { return localStorage.getItem('students_mobile_view') || 'card' } catch { return 'card' }
    }) // 'card' | 'list'
    const [isViewTransitioning, setIsViewTransitioning] = useState(false)
    const [pendingView, setPendingView] = useState(mobileView)
    const viewTransitionTimer = useRef(null)

    const switchMobileView = useCallback((newView) => {
        if (newView === mobileView || isViewTransitioning) return
        setPendingView(newView) // instant button highlight
        setIsViewTransitioning(true)
        if (viewTransitionTimer.current) clearTimeout(viewTransitionTimer.current)
        viewTransitionTimer.current = setTimeout(() => {
            setMobileView(newView)
            try { localStorage.setItem('students_mobile_view', newView) } catch (e) { }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsViewTransitioning(false)
                })
            })
        }, 280)
    }, [mobileView, isViewTransitioning])

    // Stable callback for DebouncedSearchInput
    const handleSearchChange = useCallback((val) => setSearchQuery(val), [setSearchQuery])

    const quickAddRef = useRef(null)
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, left: 0 })
    const colMenuRef = useRef(null)

    const toggleColumn = (key) => setVisibleColumns(prev => ({
        ...prev,
        [key]: !prev[key]
    }))

    const timelineGroups = useMemo(() =>
        timelineFiltered.reduce((acc, item) => {
            const key = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            if (!acc[key]) acc[key] = []
            acc[key].push(item)
            return acc
        }, {})
        , [timelineFiltered])

    // ---- SHORTCUTS (binding + daftar modal dari satu deklarasi — usePageShortcuts) ----
    const sc = usePageShortcuts({
        isBlocked: isAnyModalOpen || isExportModalOpen || isHeaderMenuOpen,
        items: [
            { section: 'Navigasi', keys: ['Ctrl', 'K'], label: 'Fokus ke search', icon: Search, onSelect: () => searchInputRef.current?.focus() },
            { section: 'Navigasi', keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan', icon: SlidersHorizontal, onSelect: () => setShowAdvancedFilter(v => !v) },
            { section: 'Navigasi', keys: ['Esc'], label: 'Tutup / clear / deselect', icon: X, onSelect: () => { setIsColMenuOpen(false); setIsHeaderMenuOpen(false) } },
            { section: 'Aksi', keys: ['N'], label: 'Tambah siswa baru', icon: Plus, when: canAddStudent && canEdit, onSelect: handleAdd },
            { section: 'Aksi', keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect', icon: CheckCheck, onSelect: toggleSelectAll },
            { section: 'Aksi', keys: ['Ctrl', 'E'], label: 'Buka export', icon: FileOutput, when: canExport, onSelect: () => setIsExportModalOpen(true) },
            { section: 'Tampilan', keys: ['P'], label: 'Toggle privacy mode', icon: EyeOff, when: canPrivacyMode, onSelect: () => setIsPrivacyMode(v => !v) },
            { section: 'Tampilan', keys: ['R'], label: 'Refresh data', icon: RefreshCw, onSelect: () => { fetchData(); fetchStats() } },
            { section: 'Tampilan', keys: ['X'], label: 'Reset semua filter', icon: RotateCcw, onSelect: resetAllFilters },
            { section: 'Tampilan', keys: ['?'], label: 'Tampilkan shortcut ini', icon: Keyboard },
        ],
    })

    // ---- Menu header (Data / Manajemen) ----
    const headerMenuCan = useMemo(
        () => ({ canImportCSV, canImportGSheets, canExport, canBulkPhoto, canArchive, canResetPoints, canEdit }),
        [canImportCSV, canImportGSheets, canExport, canBulkPhoto, canArchive, canResetPoints, canEdit]
    )
    const headerMenuActions = useMemo(() => ({
        onImport: handleImportClick,
        onGSheets: () => setActiveModal('gsheets'),
        onExport: () => setIsExportModalOpen(true),
        onBulkPhoto: () => setActiveModal('bulkPhoto'),
        onArchive: () => { fetchArchivedStudents(); setActiveModal('archived') },
        onResetPoints: () => { setResetPointsClassId(''); setActiveModal('resetPoints') },
    }), [handleImportClick, setActiveModal, setIsExportModalOpen, fetchArchivedStudents, setResetPointsClassId])

    // ---- Click outside: menu kolom ----
    useEffect(() => {
        const handleGlobalClick = (e) => {
            // Klik di luar ikon gear DAN di luar menu portal
            if (colMenuRef.current &&
                !colMenuRef.current.contains(e.target) &&
                !e.target.closest('#portal-column-menu')) {
                setIsColMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleGlobalClick)
        document.addEventListener('touchstart', handleGlobalClick)
        return () => {
            document.removeEventListener('mousedown', handleGlobalClick)
            document.removeEventListener('touchstart', handleGlobalClick)
        }
    }, [setIsColMenuOpen])

    const timelineStats = useMemo(() => {
        const pos = behaviorHistory.filter(i => (i.points ?? 0) > 0)
        const neg = behaviorHistory.filter(i => (i.points ?? 0) < 0)
        const totalPos = pos.reduce((a, i) => a + (i.points ?? 0), 0)
        const totalNeg = neg.reduce((a, i) => a + (i.points ?? 0), 0)
        const thisMonth = new Date()
        const thisMonthCount = behaviorHistory.filter(i => {
            const d = new Date(i.created_at)
            return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
        }).length
        return { pos: pos.length, neg: neg.length, totalPos, totalNeg, thisMonthCount }
    }, [behaviorHistory])

    const navigate = navigateLocal;


    const initialLoading = loading && students.length === 0
    const hasStatChips = canShowStats || globalStats.risk > 0 || globalStats.incompleteCount > 0 || globalStats.avgPointsLastWeek !== null
    const hasInsights = globalStats.topPerformer || (globalStats.worstClass && globalStats.worstClass.avg < 0)
    const classNameById = useMemo(() => {
        const m = {}
            ; (classesList || []).forEach((c) => { m[c.id] = c.name })
        return m
    }, [classesList])
    const allOnPageSelected = students.length > 0 && students.every((s) => selectedIdSet.has(s.id))

    return (
        <DashboardLayout title="Data Siswa" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>
                {isAnyModalOpen ? `
                    .top-nav, .sidebar, .floating-dock { display: none !important; }
                    main { padding-top: 0 !important; }
                ` : ''}
            </style>

            <div className="space-y-4 min-h-[calc(100dvh-6rem)] relative">


                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <EyeOff className="w-4 h-4 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">Mode Read-only —” Edit data siswa dinonaktifkan oleh administrator.</p>
                    </div>
                )}


                {/* Header */}
                <PageHeader
                    badge="Kesantrian"
                    breadcrumbs={['Student Directory']}
                    title="Data Siswa"
                    subtitle={`Kelola ${globalStats.total} data siswa aktif dalam sistem laporan.`}
                    actions={
                        <>
                            <button
                                onClick={() => { fetchData(); fetchStats() }}
                                disabled={loading}
                                title="Muat ulang data (R)"
                                aria-label="Muat ulang data"
                                className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all bg-surface-alt border-border text-text-muted enabled:hover:text-text enabled:active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <StudentsHeaderMenu
                                isOpen={isHeaderMenuOpen}
                                setIsOpen={setIsHeaderMenuOpen}
                                can={headerMenuCan}
                                actions={headerMenuActions}
                            />

                            {/* Keyboard Shortcuts Button - hidden on mobile */}
                            <button
                                onClick={sc.toggle}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-colors active:scale-95
                                ${sc.isOpen
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-surface-alt border-border text-text-muted hover:text-text'
                                    }`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <Keyboard className="w-4 h-4" />
                            </button>

                            <ShortcutsModal
                                isOpen={sc.isOpen}
                                onClose={sc.close}
                                sections={sc.sections}
                            />

                            {canPrivacyMode && (
                                <button
                                    onClick={() => {
                                        const next = !isPrivacyMode
                                        setIsPrivacyMode(next)
                                        addToast(next ? 'Mode privasi diaktifkan — Data sensitif disembunyikan' : 'Mode privasi dinonaktifkan', next ? 'info' : 'success')
                                    }}
                                    className={`h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                                    title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                                >
                                    {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    <span className="text-xs font-bold uppercase tracking-wide hidden md:inline">
                                        Privasi
                                    </span>
                                </button>
                            )}


                            {canAddStudent && (
                                <Button onClick={handleAdd} disabled={!canEdit}>
                                    <Plus className="w-4 h-4" /> {canEdit ? 'Tambah Siswa' : 'Read-only'}
                                </Button>
                            )}
                        </>
                    }
                />

                {/* Stats: chip angka ringkas, 1 row — scroll horizontal + panah saat layar sempit */}
                {hasStatChips && (
                    <div className="relative">
                        <div
                            ref={statsScrollRef}
                            onScroll={updateStatsScroll}
                            className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                        >
                        {canShowStats && (
                            <>
                                <StatChip icon={Users} label="Total Siswa" value={globalStats.total} color="indigo" loading={initialLoading} />
                                <StatChip icon={MarsIcon} label="Putra" value={globalStats.boys} color="sky" loading={initialLoading} />
                                <StatChip icon={VenusIcon} label="Putri" value={globalStats.girls} color="rose" loading={initialLoading} />
                                <StatChip
                                    icon={Trophy}
                                    label="Rata-rata Poin"
                                    value={globalStats.avgPoints}
                                    color="emerald"
                                    loading={initialLoading}
                                    onClick={() => { setFilterPointMode('positive'); resetAllFilters({ filterPointMode: 'positive' }) }}
                                />
                            </>
                        )}

                        {globalStats.risk > 0 && (
                            <StatChip
                                icon={TriangleAlert} label="Berisiko" value={globalStats.risk} color="rose"
                                active={filterPointMode === 'risk'}
                                onClick={() => { setFilterPointMode(filterPointMode === 'risk' ? '' : 'risk'); setShowAdvancedFilter(true) }}
                            />
                        )}

                        {globalStats.incompleteCount > 0 && (
                            <StatChip
                                icon={CircleAlert} label="Tidak Lengkap" value={globalStats.incompleteCount} color="amber"
                                active={filterMissing === 'all'}
                                onClick={() => { setFilterMissing(filterMissing === 'all' ? '' : 'all'); setShowAdvancedFilter(true) }}
                            />
                        )}

                        {globalStats.avgPointsLastWeek !== null && (
                            <StatChip
                                icon={globalStats.avgPointsLastWeek >= 0 ? TrendingUp : TrendingDown}
                                label="Tren 7 hari / siswa"
                                value={`${globalStats.avgPointsLastWeek > 0 ? '+' : ''}${globalStats.avgPointsLastWeek}`}
                                color={globalStats.avgPointsLastWeek >= 0 ? 'emerald' : 'rose'}
                            />
                        )}
                        </div>

                        {/* Panah carousel — hanya muncul saat konten overflow */}
                        {statsScrollState.left && (
                            <button
                                type="button"
                                aria-label="Geser stats ke kiri"
                                onClick={() => scrollStats(-1)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border border-border bg-surface/90 backdrop-blur shadow-sm flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-all active:scale-90"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}
                        {statsScrollState.right && (
                            <button
                                type="button"
                                aria-label="Geser stats ke kanan"
                                onClick={() => scrollStats(1)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border border-border bg-surface/90 backdrop-blur shadow-sm flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-all active:scale-90"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Insight strip: highlight terbaik & kelas dengan rata terendah */}
                {hasInsights && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface-alt/50 text-xs">
                        {globalStats.topPerformer && (
                            <span className="flex items-center gap-1.5 font-semibold text-text" title={`Poin tertinggi: +${globalStats.topPerformer.points}`}>
                                <Crown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                Terbaik:
                                <span className="font-bold max-w-[180px] truncate">{globalStats.topPerformer.name}</span>
                                <span className="font-bold text-emerald-600 tabular-nums">+{globalStats.topPerformer.points}</span>
                            </span>
                        )}
                        {globalStats.worstClass && globalStats.worstClass.avg < 0 && (
                            <button
                                type="button"
                                onClick={() => { setFilterClass(globalStats.worstClass.id); setFilterClasses([]); setPage(1); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-1.5 font-semibold rounded-lg transition-all active:scale-95 ${filterClass === globalStats.worstClass.id ? 'text-primary ring-1 ring-primary px-2 -mx-2 py-0.5' : 'text-text hover:text-primary'}`}
                                title="Klik untuk filter kelas ini"
                            >
                                <School className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                Terendah:
                                <span className="font-bold max-w-[180px] truncate">{globalStats.worstClass.name}</span>
                                <span className="font-bold text-rose-600 tabular-nums">({globalStats.worstClass.avg})</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Filter + Search + Tabel: satu kartu */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">

                    {/* Filter bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-3 py-3 border-b border-border">
                        {/* Tab status */}
                        <div className="flex items-stretch gap-1 p-1 h-10 rounded-xl bg-surface-alt border border-border overflow-x-auto scrollbar-hide lg:w-fit shrink-0">
                            {STATUS_TABS.map((f) => {
                                const on = filterStatus === f.key
                                return (
                                    <button
                                        key={f.key || 'all'}
                                        onClick={() => { setFilterStatus(f.key); setPage(1) }}
                                        className={`h-full px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${on ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
                                    >
                                        {f.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Gender */}
                        <div className="flex items-stretch gap-1 p-1 h-10 rounded-xl bg-surface-alt border border-border lg:w-fit shrink-0">
                            {[
                                { id: 'L', label: 'Putra', icon: MarsIcon },
                                { id: 'P', label: 'Putri', icon: VenusIcon },
                            ].map((g) => {
                                const on = filterGender === g.id
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => { setFilterGender(on ? '' : g.id); setPage(1) }}
                                        className={`h-full px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${on ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
                                    >
                                        <g.icon className="w-3.5 h-3.5" />
                                        {g.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Search */}
                        <div className="flex-1 min-w-[180px] [&_input]:h-10">
                            <DebouncedSearchInput
                                searchQuery={searchQuery}
                                onSearch={handleSearchChange}
                                inputRef={searchInputRef}
                                isLoading={loading}
                            />
                        </div>

                        {/* Pilih + filter lanjutan */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={toggleSelectAll}
                                className={`h-10 px-3 rounded-lg border text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${selectedStudentIds.length > 0 ? 'bg-primary border-primary text-white' : 'border-border text-text-muted hover:text-text hover:bg-surface-alt'}`}
                                title="Pilih Semua / Batal (Ctrl A)"
                            >
                                {selectedStudentIds.length > 0 ? <CheckCheck className="w-4 h-4" /> : <SquareCheck className="w-4 h-4" />}
                                <span className="hidden sm:inline">{selectedStudentIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedStudentIds.length > 0 && (
                                    <span className="px-1.5 rounded-full bg-white/20 text-white tabular-nums">{selectedStudentIds.length}</span>
                                )}
                            </button>

                            {canAdvancedFilter && (
                                <button
                                    onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                                    className={`h-10 px-3 rounded-lg border text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-primary border-primary text-white' : 'border-border text-text-muted hover:text-text hover:bg-surface-alt'}`}
                                    title="Filter lanjutan (Ctrl F)"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    <span className="hidden sm:inline">Lainnya</span>
                                    {activeFilterCount > 0 && (
                                        <span className="px-1.5 rounded-full bg-white/20 text-white tabular-nums">{activeFilterCount}</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Filter Chips */}
                    {(searchQuery || filterClass || filterGender || filterStatus || filterTag || filterMissing || filterPointMode) && (
                        <div className="px-3 py-3 border-b border-border">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-xs font-bold text-[var(--color-text)]" title="Hapus pencarian">
                                        <Search className="w-4 h-4 opacity-60" />
                                        <span className="max-w-[180px] truncate">"{searchQuery}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterClass && (
                                    <button type="button" onClick={() => { setFilterClass(''); setFilterClasses([]) }}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-xs font-bold text-[var(--color-primary)]" title="Hapus filter kelas">
                                        <School className="w-4 h-4 opacity-70" />
                                        {classesList.find(c => c.id === filterClass)?.name || 'Kelas'}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterGender && (
                                    <button type="button" onClick={() => setFilterGender('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-xs font-bold text-[var(--color-text)]" title="Hapus filter gender">
                                        {filterGender === 'L' ? <MarsIcon className="w-4 h-4 opacity-70" /> : <VenusIcon className="w-4 h-4 opacity-70" />}
                                        Gender: {filterGender === 'L' ? 'Putra' : 'Putri'}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterStatus && (
                                    <button type="button" onClick={() => setFilterStatus('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-600" title="Hapus filter status">
                                        Status: {(filterStatus?.charAt(0).toUpperCase() || '') + (filterStatus?.slice(1) || '')}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterTag && (
                                    <button type="button" onClick={() => setFilterTag('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-600" title="Hapus filter label">
                                        <Tags className="w-4 h-4 opacity-70" />
                                        {filterTag}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center text-indigo-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterMissing && (
                                    <button type="button" onClick={() => setFilterMissing('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-600" title="Hapus filter data hilang">
                                        {filterMissing === 'photo' ? 'Foto Kosong' : filterMissing === 'wa' ? 'Tanpa WA' : filterMissing === 'all' ? 'Data Tidak Lengkap' : filterMissing}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-orange-500/20 flex items-center justify-center text-orange-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                {filterPointMode && (
                                    <button type="button" onClick={() => { setFilterPointMode(''); setFilterPointMin(''); setFilterPointMax('') }}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs font-bold text-emerald-600" title="Hapus filter poin">
                                        Poin: {filterPointMode === 'risk' ? 'Risiko' : filterPointMode === 'positive' ? 'Positif' : filterPointMode === 'custom' ? `${filterPointMin || '∞'}—${filterPointMax || '∞'}` : filterPointMode}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-emerald-500/20 flex items-center justify-center text-emerald-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <X className="w-4 h-4" />
                                        </span>
                                    </button>
                                )}
                                <button type="button" onClick={resetAllFilters}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs font-bold text-red-600" title="Reset semua filter">
                                    <RotateCcw className="w-4 h-4" />
                                    Reset semua
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filter lanjutan: satu baris ramping, scroll horizontal di layar sempit */}
                    {showAdvancedFilter && (
                        <div className="border-b border-border px-3 py-2 bg-surface-alt/40 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
                                <RichSelect
                                    value={filterClass}
                                    onChange={(val) => { setFilterClass(val); setFilterClasses([]); setPage(1) }}
                                    options={classesList.map(c => ({ id: c.id, name: c.name }))}
                                    extraOption={{ id: '', name: 'Semua Kelas' }}
                                    placeholder="Semua Kelas"
                                    icon={School}
                                    small
                                    searchable
                                    className="shrink-0 w-44"
                                />
                                <RichSelect
                                    value={sortBy}
                                    onChange={(val) => setSortBy(val)}
                                    options={SortOptions.map(opt => ({ id: opt.value, name: opt.label }))}
                                    icon={ArrowDownAZ}
                                    small
                                    className="shrink-0 w-40"
                                />
                                <RichSelect
                                    value={filterPointMode}
                                    onChange={(val) => { setFilterPointMode(val); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                    options={[
                                        { id: '', name: 'Semua Poin' },
                                        { id: 'risk', name: 'Berisiko (poin −)' },
                                        { id: 'positive', name: 'Poin Positif' },
                                    ]}
                                    icon={Trophy}
                                    small
                                    className="shrink-0 w-40"
                                />
                                <RichSelect
                                    value={filterMissing}
                                    onChange={(val) => { setFilterMissing(val); setPage(1) }}
                                    options={[
                                        { id: '', name: 'Semua Data' },
                                        { id: 'photo', name: 'Tanpa Foto' },
                                        { id: 'wa', name: 'Tanpa WA' },
                                    ]}
                                    icon={CircleAlert}
                                    small
                                    className="shrink-0 w-40"
                                />

                                </div>

                                <div className="flex items-center gap-1.5 pl-1 shrink-0">
                                    <button
                                        onClick={resetAllFilters}
                                        title="Reset semua filter (X)"
                                        className="h-8 w-8 rounded-lg text-danger hover:bg-danger/10 transition-colors flex items-center justify-center"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setShowAdvancedFilter(false)}
                                        title="Tutup filter lanjutan (Ctrl F)"
                                        className="h-8 w-8 rounded-lg border border-border bg-surface text-text-muted hover:text-text transition-colors flex items-center justify-center"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Daftar siswa */}
                    {initialLoading && !isMobile ? (
                        <StudentTableSkeleton rows={8} />
                    ) : (
                        <div className={`transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}>
                            {/* Desktop: tabel ringkas */}
                            {!isMobile && (
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-border bg-surface-alt/60">
                                                <th className={`${TH} w-10`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={allOnPageSelected}
                                                        onChange={toggleSelectAll}
                                                        aria-label="Pilih semua di halaman ini"
                                                        className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                                                    />
                                                </th>
                                                <th className={TH}>Siswa</th>
                                                <th className={TH}>Kelas</th>
                                                <th className={`${TH} hidden lg:table-cell`}>Status</th>
                                                <th className={`${TH} hidden lg:table-cell`}>Poin</th>
                                                <th className={TH}><div className="flex justify-end">Aksi</div></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {students.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-4">
                                                        <EmptyState
                                                            variant="plain"
                                                            color="slate"
                                                            icon={activeFilterCount > 0 || searchQuery ? Search : Users}
                                                            title={activeFilterCount > 0 || searchQuery ? 'Tidak ada siswa yang cocok' : 'Belum ada data siswa'}
                                                            description={activeFilterCount > 0 || searchQuery
                                                                ? 'Coba ganti filter atau kata kunci pencarian.'
                                                                : "Klik 'Tambah Siswa' untuk menambahkan data baru"}
                                                            action={
                                                                (activeFilterCount > 0 || searchQuery) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={resetAllFilters}
                                                                        className="h-8 px-4 rounded-xl border border-border text-xs font-bold text-text-muted hover:text-text transition-all"
                                                                    >
                                                                        Reset Filter
                                                                    </button>
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ) : students.map((student) => {
                                                const selected = selectedIdSet.has(student.id)
                                                const pts = student.total_points || 0
                                                const isRisk = pts <= RiskThreshold
                                                const className = classNameById[student.class_id] || student.classes?.name || '-'
                                                const genderLabel = student.gender === 'L' ? 'Putra' : student.gender === 'P' ? 'Putri' : null
                                                const idLabel = isPrivacyMode ? '••••••' : (student.nisn || student.registration_code || '-')
                                                return (
                                                    <tr
                                                        key={student.id}
                                                        className={`transition-colors ${selected ? 'bg-primary/5' : 'hover:bg-surface-alt/60'}`}
                                                    >
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={() => toggleSelectStudent(student.id)}
                                                                aria-label={`Pilih ${student.name}`}
                                                                className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => student.photo_url && setPhotoZoom(student)}
                                                                    className={`w-8 h-8 rounded-xl bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden ${student.photo_url ? 'cursor-zoom-in' : 'cursor-default'}`}
                                                                    aria-label="Lihat foto"
                                                                >
                                                                    {student.photo_url
                                                                        ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                                        : <span className="text-xs font-bold text-primary">{student.name?.charAt(0)}</span>}
                                                                </button>
                                                                <div className="min-w-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleViewProfile(student)}
                                                                        className="text-sm font-bold text-text leading-tight truncate max-w-[260px] block text-left hover:text-primary transition-colors"
                                                                    >
                                                                        {student.name}
                                                                    </button>
                                                                    <p className="text-xs text-text-muted truncate">
                                                                        {genderLabel && <span>{genderLabel} · </span>}
                                                                        <span className="tabular-nums">{idLabel}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="inline-flex items-center h-5 px-2 rounded-md text-[11px] font-semibold bg-primary/10 text-primary whitespace-nowrap">
                                                                {className}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 hidden lg:table-cell">
                                                            <span className={`inline-flex items-center h-5 px-2 rounded-md text-[11px] font-semibold capitalize ${STATUS_STYLE[student.status] || 'text-text-muted bg-surface-alt'}`}>
                                                                {student.status || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 hidden lg:table-cell">
                                                            <span className={`text-sm font-semibold tabular-nums ${isRisk ? 'text-rose-600' : pts > 0 ? 'text-emerald-600' : 'text-text-muted'}`}>
                                                                {pts > 0 ? `+${pts}` : pts}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => handleViewProfile(student)}
                                                                    className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
                                                                    title="Lihat profil"
                                                                    aria-label="Lihat profil"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                {student.phone && (
                                                                    <button
                                                                        onClick={() => openWAForStudent(student, buildWAMessage(student, waTemplate))}
                                                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-emerald-500/10 text-text-muted hover:text-emerald-600 transition-colors"
                                                                        title="Kirim WhatsApp ke wali"
                                                                        aria-label="Kirim WhatsApp"
                                                                    >
                                                                        <WhatsAppIcon className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {canEdit && canEditStudent && (
                                                                    <button
                                                                        onClick={() => handleEdit(student)}
                                                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
                                                                        title="Ubah data"
                                                                        aria-label="Ubah data"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {canEdit && canDeleteStudent && (
                                                                    <button
                                                                        onClick={() => confirmDelete(student)}
                                                                        className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                                                                        title="Hapus siswa"
                                                                        aria-label="Hapus siswa"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Mobile View Selection Header */}
                            {isMobile && selectedStudentIds.length > 0 && (
                                <div className="sticky top-0 z-40 -mx-3 sm:-mx-4 mb-4 px-3 sm:px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                                            {selectedStudentIds.length}
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Siswa Terpilih</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs font-bold uppercase tracking-wide text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
                                        >
                                            {selectedStudentIds.length === students.length ? 'Batal Semua' : 'Pilih Semua'}
                                        </button>
                                        <button
                                            onClick={() => setSelectedStudentIds([])}
                                            className="h-8 w-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isMobile && (
                                <div
                                    className="md:hidden px-3 pb-3 space-y-3"
                                    style={{
                                        paddingBottom:
                                            selectedStudentIds.length > 0
                                                ? `calc(var(--floating-bar-bottom, 16px) + 64px + env(safe-area-inset-bottom))`
                                                : `calc(var(--floating-bar-bottom, 16px) + env(safe-area-inset-bottom))`,
                                    }}
                                >

                                    {initialLoading ? (
                                        <div className="space-y-4 pt-2">
                                            {mobileView === 'card' ? (
                                                Array.from({ length: 5 }).map((_, i) => (
                                                    <StudentSkeletonCard key={i} />
                                                ))
                                            ) : (
                                                <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] divide-y divide-[var(--color-border)]/50 overflow-hidden shadow-sm">
                                                    {Array.from({ length: 8 }).map((_, i) => (
                                                        <div key={i} className="animate-pulse flex items-center gap-4 px-4 py-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)]" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="w-3/4 h-3 bg-[var(--color-surface-alt)] rounded" />
                                                                <div className="w-1/2 h-2 bg-[var(--color-surface-alt)]/60 rounded" />
                                                            </div>
                                                            <div className="w-10 h-6 bg-[var(--color-surface-alt)] rounded-lg" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : students.length === 0 ? (
                                        <div className="py-12">
                                            <EmptyState
                                                variant="plain"
                                                icon={activeFilterCount > 0 || searchQuery ? Search : Users}
                                                title={activeFilterCount > 0 || searchQuery ? "Pencarian Tidak Ditemukan" : "Belum Ada Data Siswa"}
                                                description={activeFilterCount > 0 || searchQuery
                                                    ? "Maaf, kami tidak menemukan siswa dengan kriteria tersebut. Coba ubah kata kunci atau reset filter."
                                                    : "Database siswa Anda masih kosong. Mulai tambahkan siswa baru untuk mulai mengelola."
                                                }
                                                action={
                                                    activeFilterCount > 0 || searchQuery ? (
                                                        <button
                                                            onClick={resetAllFilters}
                                                            className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                        >
                                                            Reset Semua Filter
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setIsModalOpen(true); setActiveModal('add'); }}
                                                            className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide bg-[var(--color-primary)] text-white shadow-lg active:scale-95 transition-all flex items-center gap-2"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            Tambah Siswa Pertama
                                                        </button>
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Mobile View Switcher */}
                                            <div className="pt-3 pb-2 px-1 mb-1 flex items-center justify-between bg-[var(--color-surface)]/20 rounded-2xl -mx-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                                                        {totalRows} Data ditemukan
                                                    </span>
                                                </div>
                                                <div className="flex items-center bg-[var(--color-surface)] shadow-inner p-1 rounded-[1.2rem] border border-[var(--color-border)]">
                                                    <button
                                                        onClick={() => switchMobileView('card')}
                                                        className={`h-8 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all duration-200 ${pendingView === 'card' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                                    >
                                                        <Table className="w-4 h-4" />
                                                        Card
                                                    </button>
                                                    <button
                                                        onClick={() => switchMobileView('list')}
                                                        className={`h-8 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all duration-200 ${pendingView === 'list' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                                    >
                                                        <TableProperties className="w-4 h-4" />
                                                        List
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 relative">
                                                {/* Skeleton Transition Overlay */}
                                                {isViewTransitioning && (
                                                    <div className="animate-in fade-in duration-150 z-10 relative">
                                                        {mobileView === 'card'
                                                            ? <MobileListSkeleton count={7} />
                                                            : <MobileCardSkeleton count={3} />
                                                        }
                                                    </div>
                                                )}

                                                {/* Card View Container */}
                                                {mobileView === 'card' && (
                                                    <div
                                                        className="space-y-3 transition-all duration-300 ease-in-out"
                                                        style={{
                                                            opacity: !isViewTransitioning ? 1 : 0,
                                                            transform: !isViewTransitioning ? 'translateY(0)' : 'translateY(-8px)',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {students.map(student => {
                                                            const isRisk = (student.total_points || 0) <= RiskThreshold
                                                            return (
                                                                <div
                                                                    key={student.id}
                                                                    className={`relative rounded-2xl transition-all ${isRisk ? 'ring-1 ring-red-500/40 ring-offset-0' : ''}`}
                                                                >
                                                                    {isRisk && (
                                                                        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-red-500 z-10 pointer-events-none" />
                                                                    )}
                                                                    <StudentMobileCard
                                                                        student={student}
                                                                        isSelected={selectedIdSet.has(student.id)}
                                                                        hasSelection={selectedIdSet.size > 0}
                                                                        onToggleSelect={toggleSelectStudent}
                                                                        onViewProfile={handleViewProfile}
                                                                        onEdit={canEdit ? handleEdit : null}
                                                                        onConfirmDelete={canEdit ? confirmDelete : null}
                                                                        onTogglePin={handleTogglePin}
                                                                        onQuickPoint={handleQuickPoint}
                                                                        isPrivacyMode={isPrivacyMode}
                                                                        RiskThreshold={RiskThreshold}
                                                                        buildWAMessage={buildWAMessage}
                                                                        openWAForStudent={openWAForStudent}
                                                                        waTemplate={waTemplate}
                                                                    />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* List View Container */}
                                                {mobileView === 'list' && (
                                                    <div
                                                        className="flex flex-col gap-2 transition-all duration-300 ease-in-out"
                                                        style={{
                                                            opacity: !isViewTransitioning ? 1 : 0,
                                                            transform: !isViewTransitioning ? 'translateY(0)' : 'translateY(8px)',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {students.length > 0 && canEdit && (
                                                            <div className="text-xs font-bold text-[var(--color-text-muted)] opacity-50 text-center uppercase tracking-wide flex items-center justify-center gap-2 pb-1 animate-pulse">
                                                                <Info className="w-4 h-4" />
                                                                Ketuk baris siswa untuk menu cepat & poin
                                                            </div>
                                                        )}
                                                        <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] divide-y divide-[var(--color-border)]/40 overflow-hidden shadow-sm">
                                                            {students.map((student) => (
                                                                <StudentMobileListRow
                                                                    key={student.id}
                                                                    student={student}
                                                                    isSelected={selectedIdSet.has(student.id)}
                                                                    hasSelection={selectedIdSet.size > 0}
                                                                    onToggleSelect={toggleSelectStudent}
                                                                    onViewProfile={handleViewProfile}
                                                                    onEdit={canEdit ? handleEdit : null}
                                                                    onTogglePin={handleTogglePin}
                                                                    onQuickPoint={handleQuickPoint}
                                                                    isPrivacyMode={isPrivacyMode}
                                                                    RiskThreshold={RiskThreshold}
                                                                    canEdit={canEdit}
                                                                    onConfirmDelete={canEdit ? confirmDelete : null}
                                                                    buildWAMessage={buildWAMessage}
                                                                    openWAForStudent={openWAForStudent}
                                                                    waTemplate={waTemplate}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quick Add trigger — stays below list */}
                                                {!isInlineAddOpen && canEdit && canAddStudent && (
                                                    <button
                                                        onClick={() => {
                                                            setIsInlineAddOpen(true)
                                                            setTimeout(() => quickAddRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
                                                        }}
                                                        className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-primary)] bg-[var(--color-primary)]/[0.04] hover:bg-[var(--color-primary)]/10 active:scale-[0.98] transition-all border-2 border-[var(--color-primary)]/20 hover:border-[var(--color-primary)]/40 border-dashed rounded-2xl mt-4 mb-2 shadow-sm"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Quick Add Siswa
                                                    </button>
                                                )}

                                                {/* Quick Add form — BELOW the list (correct position) */}
                                                {isInlineAddOpen && canEdit && canAddStudent && (
                                                    <div ref={quickAddRef} className="p-3 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.02] shadow-sm mt-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
                                                        <div className="flex items-center justify-between gap-3 mb-2">
                                                            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Quick Add Siswa</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsInlineAddOpen(false)}
                                                                className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault()
                                                                handleInlineSubmit()
                                                            }}
                                                            className="grid grid-cols-1 gap-2.5"
                                                        >
                                                            <input
                                                                type="text"
                                                                value={inlineForm.name}
                                                                onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                                placeholder="Nama siswa..."
                                                                autoFocus
                                                                required
                                                                className="input-field text-sm h-11 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full font-bold"
                                                            />

                                                            <div className="grid grid-cols-[1fr_112px] gap-2">
                                                                <RichSelect
                                                                    value={inlineForm.class_id}
                                                                    onChange={val => setInlineForm(p => ({ ...p, class_id: val }))}
                                                                    options={classesList.map(c => ({ id: c.id, name: c.name }))}
                                                                    placeholder="Pilih kelas"
                                                                    small
                                                                    searchable
                                                                />
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {['L', 'P'].map(g => (
                                                                        <button
                                                                            key={g}
                                                                            type="button"
                                                                            onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                                            className={`h-11 flex-1 rounded-xl text-xs font-bold border transition-all ${inlineForm.gender === g
                                                                                ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg' : 'bg-pink-500 text-white border-pink-500 shadow-lg')
                                                                                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                                                        >
                                                                            {g}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <input
                                                                type="tel"
                                                                value={inlineForm.phone}
                                                                onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                                placeholder="No. HP/WA (opsional)"
                                                                className="input-field text-xs h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full font-bold"
                                                            />

                                                            <button
                                                                type="submit"
                                                                disabled={submittingInline || !canEdit || !inlineForm.name.trim()}
                                                                className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wide hover:brightness-110 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                            >
                                                                {submittingInline ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Simpan</>}
                                                            </button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer: rentang data + pagination */}
                    {totalRows > 0 && (
                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label="Siswa"
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    )}
                </div>

                {/* IMPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isImportModalOpen && (
                        <LazyImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => {
                                if (importing) return
                                setIsImportModalOpen(false)
                                setImportPreview([])
                                setImportIssues([])
                                setImportDuplicates([])
                                setImportFileName('')
                                setImportDragOver(false)
                                setImportStep(1)
                            }}
                            importing={importing}
                            importStep={importStep}
                            setImportStep={setImportStep}
                            importPreview={importPreview}
                            importFileName={importFileName}
                            fileInputRef={importFileInputRef}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
                            handleDownloadTemplate={handleDownloadTemplate}
                            importFileHeaders={importFileHeaders}
                            importColumnMapping={importColumnMapping}
                            setImportColumnMapping={setImportColumnMapping}
                            importRawData={importRawData}
                            importLoading={importLoading}
                            setImportLoading={setImportLoading}
                            buildImportPreview={buildImportPreview}
                            importIssues={importIssues}
                            importValidationOpen={importValidationOpen}
                            setImportValidationOpen={setImportValidationOpen}
                            importProgress={importProgress}
                            handleCommitImport={handleCommitImport}
                            hasImportBlockingErrors={hasImportBlockingErrors}
                            importReadyRows={importReadyRows}
                            handleImportCellEdit={handleImportCellEdit}
                            importEditCell={importEditCell}
                            setImportEditCell={setImportEditCell}
                            handleRemoveImportRow={handleRemoveImportRow}
                            importSkipDupes={importSkipDupes}
                            setImportSkipDupes={setImportSkipDupes}
                            config={importConfig}
                        />
                    )}
                </React.Suspense>

                {/* (old inline Import Modal JSX removed; now lazy-loaded) */}
                {/* dead-code Import modal block deleted */}

                {/* ===================== */}
                {/* Fitur 2 - Batch Reset Poin Modal */}
                <ResetPoints
                    isOpen={activeModal === 'resetPoints'}
                    onClose={closeModal}
                    classesList={classesList}
                    resetPointsClassId={resetPointsClassId}
                    setResetPointsClassId={setResetPointsClassId}
                    resettingPoints={resettingPoints}
                    handleBatchResetPoints={handleBatchResetPoints}
                />

                {/* BULK PHOTO MATCHER MODAL */}
                <BulkPhoto
                    isOpen={activeModal === 'bulkPhoto'}
                    onClose={closeModal}
                    uploadingBulkPhotos={uploadingBulkPhotos}
                    bulkPhotoMatches={bulkPhotoMatches}
                    handleBulkPhotoMatch={handleBulkPhotoMatch}
                    handleBulkPhotoUpload={handleBulkPhotoUpload}
                    setBulkPhotoMatches={setBulkPhotoMatches}
                    allStudentsForBulk={allStudentsForBulk}
                    matchingPhotos={matchingPhotos}
                />

                {/* ===================== */}
                {/* GUARDIAN BROADCAST HUB */}
                {/* ===================== */}
                {
                    activeModal === 'bulkWA' && (
                        <Modal
                            isOpen={activeModal === 'bulkWA'}
                            onClose={() => closeModal()}
                            title="Guardian Broadcast Hub"
                            description="Kirim pesan massal ke wali murid menggunakan template otomatis."
                            icon={WhatsAppIcon}
                            iconBg="bg-emerald-500/10"
                            iconColor="text-emerald-600"
                            size="lg"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="p-0 bg-[var(--color-surface)] flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
                                            <span>Kemajuan Hub</span>
                                            <span>{broadcastIndex + 1} / {selectedStudentsWithPhone.length}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                                style={{ width: `${selectedStudentsWithPhone.length ? ((broadcastIndex + 1) / selectedStudentsWithPhone.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => closeModal()}
                                            className="h-11 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Tutup
                                        </button>
                                        <button
                                            onClick={() => {
                                                selectedStudentsWithPhone.forEach((s, i) => {
                                                    setTimeout(() => {
                                                        setBroadcastIndex(i);
                                                        openWAForStudent(s, buildWAMessage(s, broadcastTemplate));
                                                    }, i * 1200);
                                                });
                                            }}
                                            className="h-11 px-6 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                                        >
                                            <Send className="w-4 h-4" />
                                            Mulai Siaran Massal
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Selector Section */}
                                <div className="lg:col-span-4 space-y-4">
                                    <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-3">
                                        <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Pilih Template Pesan</label>
                                        {[
                                            { id: 'summary', label: 'Laporan Akademik Lengkap', icon: FileText },
                                            { id: 'points', label: 'Ringkasan Poin Perilaku', icon: Trophy },
                                            { id: 'security', label: 'Akses Portal (ID & PIN)', icon: ShieldHalf },
                                            { id: 'custom', label: 'Pesan Kustom Sekolah', icon: PenTool },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setBroadcastTemplate(t.id)}
                                                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${broadcastTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${broadcastTemplate === t.id ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <t.icon className="text-xs" />
                                                </div>
                                                <span className="text-xs font-bold leading-tight">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {broadcastTemplate === 'custom' && (
                                        <textarea
                                            value={customWaMsg}
                                            onChange={(e) => setCustomWaMsg(e.target.value)}
                                            placeholder="Tulis pesan kustom di sini... Gunakan {nama}, {poin}, {kelas} sebagai tag otomatis."
                                            className="w-full h-32 p-3 text-xs rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
                                        />
                                    )}
                                </div>

                                {/* Preview & Action Section */}
                                <div className="lg:col-span-8 flex flex-col">
                                    <div className="flex-1 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                                        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center justify-between">
                                            <h5 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Antrean Siaran ({selectedStudentsWithPhone.length} Wali)</h5>
                                            {broadcastIndex >= 0 && (
                                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-xs font-bold animate-pulse">SIARAN BERJALAN...</div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-auto p-4 space-y-3 max-h-[350px] scrollbar-none">
                                            {selectedStudentsWithPhone.map((s, idx) => (
                                                <div key={idx} className={`p-3 rounded-xl border transition-all ${broadcastIndex === idx ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70'}`}>
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className="text-xs font-bold leading-none">{s.name}</p>
                                                            <p className="text-xs text-[var(--color-text-muted)] mt-1 font-bold">Wali: {s.guardian_name || '---'} ({s.phone})</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openWAForStudent(s, buildWAMessage(s, broadcastTemplate))}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-xs"
                                                        >
                                                            <WhatsAppIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="p-2.5 rounded-lg bg-[var(--color-surface-alt)]/50 border border-black/5 text-xs font-medium leading-relaxed line-clamp-2">
                                                        {buildWAMessage(s, broadcastTemplate)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* ===================== */}
                {/* EXPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isExportModalOpen && (
                        <LazyExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                            items={students}
                            selectedIds={selectedStudentIds}
                            exportScope={exportScope}
                            setExportScope={setExportScope}
                            exportColumns={exportColumns}
                            setExportColumns={setExportColumns}
                            exporting={exporting}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportPDF={handleExportPDF}
                            config={exportConfig}
                        />
                    )}
                </React.Suspense>

                {
                    isModalOpen && (
                        <FormModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            selectedStudent={selectedStudent}
                            classesList={classesList}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                            onPhotoUpload={handlePhotoUpload}
                            uploadingPhoto={uploadingPhoto}
                        />
                    )
                }

                {/* Modal Cetak Kartu & Akses Siswa (lazy-loaded) */}
                <React.Suspense fallback={null}>
                    {isPrintModalOpen && (
                        <LazyAccessCard
                            isOpen={isPrintModalOpen}
                            onClose={() => {
                                setIsPrintModalOpen(false);
                                if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                            }}
                            selectedStudent={selectedStudent}
                            selectedStudents={selectedStudents}
                            newlyCreatedStudent={newlyCreatedStudent}
                            isPrivacyMode={isPrivacyMode}
                            maskInfo={maskInfo}
                            addToast={addToast}
                            cardCaptureRef={cardCaptureRef}
                            waTemplate={waTemplate}
                            buildWAMessage={buildWAMessage}
                            openWAForStudent={openWAForStudent}
                            handleResetPin={handleResetPin}
                            resettingPin={resettingPin}
                            generatingPdf={generatingPdf}
                            handlePrintSingle={handlePrintSingle}
                            handleSavePNG={handleSavePNG}
                            handlePrintThermal={handlePrintThermal}
                            generateStudentPDF={generateStudentPDF}
                        />
                    )}
                </React.Suspense>
                {/* Modal Detail Profil Siswa —” lazy loaded */}
                {
                    activeModal === 'profile' && selectedStudent && (
                        <React.Suspense fallback={null}>
                            <LazyProfileModal
                                isOpen={activeModal === 'profile'}
                                onClose={closeModal}
                                selectedStudent={selectedStudent}
                                isPrivacyMode={isPrivacyMode}
                                maskInfo={maskInfo}
                                calculateCompleteness={calculateCompleteness}
                                behaviorHistory={behaviorHistory}
                                loadingHistory={loadingHistory}
                                RiskThreshold={RiskThreshold}
                                canEdit={canEdit}
                                handleEdit={handleEdit}
                                profileTab={profileTab}
                                setProfileTab={setProfileTab}
                                timelineStats={timelineStats}
                                timelineFilter={timelineFilter}
                                setTimelineFilter={setTimelineFilter}
                                timelineVisible={timelineVisible}
                                setTimelineVisible={setTimelineVisible}
                                timelineFiltered={timelineFiltered}
                                raportHistory={raportHistory}
                                loadingRaport={loadingRaport}
                                addToast={addToast}
                                onOpenTagModal={() => { setStudentForTags(selectedStudent); setActiveModal('tag') }}
                                buildWAMessage={buildWAMessage}
                                openWAForStudent={openWAForStudent}
                            />
                        </React.Suspense>
                    )
                }

                {/* Bulk Promote Modal - ENTERPRISE EDITION */}
                {
                    activeModal === 'bulkPromote' && (
                        <Modal
                            isOpen={activeModal === 'bulkPromote'}
                            onClose={() => { closeModal(); setClassSearchQuery('') }}
                            title="Kenaikan Kelas Massal"
                            description="Pindahkan rombongan siswa ke tingkat kelas berikutnya."
                            icon={GraduationCap}
                            iconBg="bg-[var(--color-primary)]/10"
                            iconColor="text-[var(--color-primary)]"
                            size="md"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={() => { closeModal(); setClassSearchQuery('') }}
                                        className="flex-1 h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkPromote}
                                        disabled={submitting || !bulkClassId}
                                        className="flex-[2] h-12 rounded-2xl bg-[var(--color-primary)] text-white text-xs md:text-xs font-bold uppercase tracking-wide hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 md:gap-3 shadow-xl active:scale-[0.98] whitespace-nowrap px-2"
                                    >
                                        {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <GraduationCap className="w-4 h-4 md:" />
                                                <span>Proses Kenaikan <span className="hidden sm:inline">({selectedStudentIds.length} Siswa)</span></span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {/* Selected Students Summary */}
                                <SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                    isPromoteMode={true}
                                    bulkClassId={bulkClassId}
                                    classesList={classesList}
                                />

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                {/* Smart Level Safety Banners */}
                                {(() => {
                                    const results = selectedStudentIds.map(id => {
                                        const s = students.find(st => st.id === id);
                                        const targetClass = classesList.find(cl => cl.id === bulkClassId);
                                        const originLevel = parseInt(s?.className) || 0;
                                        const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;
                                        if (!bulkClassId) return null;
                                        if (targetLevel < originLevel) return 'downgrade';
                                        if (targetLevel === originLevel) return 'stay';
                                        if (targetLevel > originLevel + 1) return 'skip';
                                        return 'normal';
                                    });

                                    const hasDowngrade = results.includes('downgrade');
                                    const hasStay = results.includes('stay');
                                    const hasSkip = results.includes('skip');

                                    const removeBatch = (condition) => {
                                        const idsToRemove = selectedStudentIds.filter(id => {
                                            const s = students.find(st => st.id === id);
                                            const targetClass = classesList.find(cl => cl.id === bulkClassId);
                                            const originLevel = parseInt(s?.className) || 0;
                                            const targetLevel = targetClass ? (parseInt(targetClass.name) || 0) : 0;

                                            if (!bulkClassId) return false;
                                            if (condition === 'downgrade') return targetLevel < originLevel;
                                            if (condition === 'stay') return targetLevel === originLevel;
                                            return false;
                                        });

                                        if (idsToRemove.length > 0) {
                                            idsToRemove.forEach((id, index) => {
                                                setTimeout(() => toggleSelectStudent(id), index * 50);
                                            });
                                            addToast(`${idsToRemove.length} siswa berhasil dikeluarkan`, 'success');
                                        }
                                    };

                                    return (
                                        <div className="space-y-2">
                                            {hasDowngrade && (
                                                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="flex gap-2.5 items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                                                            <TriangleAlert className="w-4 h-4 animate-pulse" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide leading-none">Kritis: Penurunan Kelas!</p>
                                                            <p className="text-xs text-red-600/80 font-bold mt-1 leading-tight">Ada siswa yang dipindahkan ke level yang lebih rendah.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBatch('downgrade')}
                                                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-md active:scale-95 shrink-0"
                                                    >
                                                        Keluarkan Siswa
                                                    </button>
                                                </div>
                                            )}
                                            {hasStay && (
                                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="flex gap-2.5 items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                                                            <RotateCcw className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide leading-none">Peringatan: Tetap di Kelas</p>
                                                            <p className="text-xs text-amber-600/80 font-bold mt-1 leading-tight">Siswa ini akan tetap berada di tingkat yang sama.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBatch('stay')}
                                                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-amber-700 transition-all shadow-md active:scale-95 shrink-0"
                                                    >
                                                        Keluarkan Siswa
                                                    </button>
                                                </div>
                                            )}
                                            {hasSkip && (
                                                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex gap-3 items-center animate-in fade-in slide-in-from-top-1 duration-300">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg">
                                                        <Rocket className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide leading-none">Info: Loncatan Kelas</p>
                                                        <p className="text-xs text-indigo-600/80 font-bold mt-1 leading-tight">Ada siswa yang meloncat 1 tingkat atau lebih.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Class Selection Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                                        <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-2 shrink-0">
                                            <GraduationCap className="w-4 h-4 opacity-40" /> Pilih Kelas Tujuan
                                        </label>

                                        {/* Quick Search Classes */}
                                        <div className="relative w-full sm:max-w-[200px]">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                                            <input
                                                type="text"
                                                placeholder="Cari kelas..."
                                                value={classSearchQuery}
                                                onChange={(e) => setClassSearchQuery(e.target.value)}
                                                className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-xs font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                                        {classesList.filter(c => c.name.toLowerCase().includes(classSearchQuery.toLowerCase())).length === 0 ? (
                                            <div className="col-span-full py-12 text-center space-y-3 bg-[var(--color-surface-alt)] rounded-3xl border-2 border-dashed border-[var(--color-border)]">
                                                <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/5 text-[var(--color-primary)] flex items-center justify-center mx-auto opacity-20">
                                                    <Search className="w-5 h-5" />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] opacity-40">Kelas tidak ditemukan</p>
                                            </div>
                                        ) : classesList
                                            .filter(c => c.name.toLowerCase().includes(classSearchQuery.toLowerCase()))
                                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                                            .map(c => {
                                                const isSelected = bulkClassId === c.id;
                                                const isPutra = c.name.toUpperCase().includes('PUTRA');
                                                const isPutri = c.name.toUpperCase().includes('PUTRI');

                                                return (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setBulkClassId(bulkClassId === c.id ? '' : c.id)}
                                                        className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] group relative overflow-hidden ${isSelected
                                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-sm z-10'
                                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)] shadow-sm'
                                                            }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${isSelected ? 'bg-white/20 text-white rotate-[360deg]' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white'
                                                            }`}>
                                                            <GraduationCap className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-10">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-xs uppercase tracking-wider truncate leading-tight">{c.name}</p>
                                                                {/* Inline Gender Icon */}
                                                                {(isPutra || isPutri) && (isPutra
                                                                    ? <MarsIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-500'} opacity-70`} />
                                                                    : <VenusIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-pink-500'} opacity-70`} />)}
                                                            </div>
                                                            <p className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-white/60' : 'text-[var(--color-text-muted)]'}`}>Pilih sebagai tujuan</p>
                                                        </div>

                                                        {/* Selection Indicator */}
                                                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        </div>

                                                        {/* Bottom Gender Badge */}
                                                        {(isPutra || isPutri) && !isSelected && (
                                                            <div className={`absolute bottom-0 right-0 px-2 py-0.5 rounded-tl-xl text-[7px] font-bold uppercase tracking-tighter ${isPutra ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                                                }`}>
                                                                {isPutra ? 'Putra' : 'Putri'}
                                                            </div>
                                                        )}

                                                        {/* Subtle Shine Effect */}
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Information Alert */}
                                <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                                        <Info className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide">Informasi Sistem</p>
                                        <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                                            Proses ini akan memperbarui status kelas siswa secara permanen. Pastikan Anda telah melakukan verifikasi terhadap daftar siswa dan kelas tujuan sebelum menekan tombol konfirmasi.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Delete (Arsip) Modal */}
                {
                    activeModal === 'delete' && (
                        <Modal
                            isOpen={activeModal === 'delete'}
                            onClose={() => closeModal()}
                            title="Konfirmasi Arsip"
                            description="Siswa akan dipindahkan ke folder Arsip"
                            icon={Archive}
                            iconBg="bg-amber-500/10"
                            iconColor="text-amber-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex items-center w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={() => closeModal()}
                                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all shrink-0"
                                    >
                                        Batal
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={executeDelete}
                                        className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <Archive className="w-4 h-4 opacity-70" />
                                        Arsipkan
                                    </button>
                                </div>
                            }
                        >
                            <div className="px-1">
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Siswa <span className="text-amber-600 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{studentToDelete?.name}</span> akan diarsipkan. Riwayat laporan & poin tetap tersimpan dengan aman.
                                </p>
                            </div>
                        </Modal>
                    )
                }

                {/* Bulk Delete Modal */}
                {
                    activeModal === 'bulkDelete' && (
                        <Modal
                            isOpen={activeModal === 'bulkDelete'}
                            onClose={() => closeModal()}
                            title="Konfirmasi Hapus"
                            description={`${selectedStudentIds.length} siswa akan dihapus secara permanen`}
                            icon={Trash2}
                            iconBg="bg-red-500/10"
                            iconColor="text-red-500"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex items-center w-full gap-3">
                                    <button
                                        type="button"
                                        onClick={() => closeModal()}
                                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all shrink-0"
                                    >
                                        Batal
                                    </button>
                                    <div className="flex-1" />
                                    <button
                                        type="button"
                                        onClick={handleBulkDelete}
                                        disabled={submitting}
                                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                                    >
                                        {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (
                                            <>
                                                <Trash2 className="w-4 h-4 opacity-70" />
                                                Hapus Permanen
                                            </>
                                        )}
                                    </button>
                                </div>
                            }
                        >
                            <div className="px-1">
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Anda akan menghapus <span className="text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">{selectedStudentIds.length} siswa</span>. Tindakan ini tidak dapat dibatalkan. Riwayat behavior mereka akan hilang.
                                </p>
                            </div>
                        </Modal>
                    )
                }
                {/* Modal Arsip Siswa */}
                <ArchiveModal
                    isOpen={activeModal === 'archived'}
                    onClose={closeModal}
                    archivedStudents={archivedStudents}
                    loadingArchived={loadingArchived}
                    setArchivedStudents={setArchivedStudents}
                    fetchArchivedStudents={fetchArchivedStudents}
                    fetchData={fetchData}
                    fetchStats={fetchStats}
                    addToast={addToast}
                />

                {/* Modal Riwayat Kelas */}
                <ClassHistory
                    isOpen={activeModal === 'classHistory'}
                    onClose={() => closeModal()}
                    selectedStudent={selectedStudent}
                    loading={loadingClassHistory}
                    history={classHistory}
                />

                {/* Fitur 1 - Class Breakdown Modal */}
                {
                    activeModal === 'classBreakdown' && (
                        <Modal
                            isOpen={activeModal === 'classBreakdown'}
                            onClose={() => closeModal()}
                            title={`Statistik Kelas — ${classBreakdownData?.className || ''}`}
                            description="Ringkasan data, demografi, dan performa poin per kelas."
                            icon={ChartPie}
                            iconBg="bg-indigo-500/10"
                            iconColor="text-indigo-600"
                            size="md"
                            mobileVariant="bottom-sheet"
                        >
                            {loadingBreakdown ? (
                                <div className="text-center py-10 text-[var(--color-text-muted)]">
                                    <LoaderCircle className="w-6 h-6 animate-spin mb-2 block" />
                                    <p className="text-sm">Memuat statistik...</p>
                                </div>
                            ) : classBreakdownData && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Total Siswa', value: classBreakdownData.total, color: 'text-[var(--color-primary)]' },
                                            { label: 'Putra', value: classBreakdownData.boys, color: 'text-blue-500' },
                                            { label: 'Putri', value: classBreakdownData.girls, color: 'text-pink-500' },
                                            { label: 'Rata-rata Poin', value: classBreakdownData.avgPoints, color: classBreakdownData.avgPoints >= 0 ? 'text-emerald-500' : 'text-red-500' },
                                        ].map(item => (
                                            <div key={item.label} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-center">
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">{item.label}</p>
                                                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                                        <TriangleAlert className="w-4 h-4 text-red-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Siswa Risiko (â‰¤ {RiskThreshold})</p>
                                            <p className="text-lg font-bold text-red-500">{classBreakdownData.riskCount} siswa</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Trophy className="w-4 h-4 text-amber-500" />
                                            Top 3 Poin Tertinggi
                                        </p>
                                        <div className="space-y-2">
                                            {classBreakdownData.topStudents.map((s, idx) => (
                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                                                        idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                                                            'bg-orange-400/20 text-orange-600'
                                                        }`}>#{idx + 1}</span>
                                                    <span className="flex-1 text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                                                    <span className={`text-sm font-bold ${s.total_points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.total_points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={() => { closeModal(); setFilterClass(''); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
                                            className="btn bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 h-9 px-5 text-xs font-bold uppercase tracking-wide rounded-lg hover:bg-[var(--color-primary)]/20 transition">
                                            Filter Kelas Ini
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }


                {/* Modal Kelola Label —” lazy loaded */}
                {
                    activeModal === 'tag' && (
                        <React.Suspense fallback={null}>
                            <LazyTagModal
                                isOpen={activeModal === 'tag'}
                                onClose={closeModal}
                                student={studentForTags}
                                allUsedTags={allUsedTags}
                                handleToggleTag={handleToggleTag}
                                tagToEdit={tagToEdit}
                                setTagToEdit={setTagToEdit}
                                renameInput={renameInput}
                                setRenameInput={setRenameInput}
                                handleGlobalRenameTag={handleGlobalRenameTag}
                                handleGlobalDeleteTag={handleGlobalDeleteTag}
                            />
                        </React.Suspense>
                    )
                }

                {/* Fitur 12 - Google Sheets Import Modal */}
                <GSheetsModal
                    isOpen={activeModal === 'gsheets'}
                    onClose={closeModal}
                    gSheetsUrl={gSheetsUrl}
                    setGSheetsUrl={setGSheetsUrl}
                    fetchingGSheets={fetchingGSheets}
                    handleFetchGSheets={handleFetchGSheets}
                    onDownloadTemplate={handleDownloadTemplate}
                />

                {/* Fitur 13 - Photo Zoom Overlay */}
                {/* Photo Zoom Modal */}
                {
                    photoZoom && (
                        <Modal
                            isOpen={!!photoZoom}
                            onClose={() => setPhotoZoom(null)}
                            title="Foto Profil"
                            description="Preview foto profil siswa"
                            icon={Image}
                            iconBg="bg-[var(--color-primary)]/10"
                            iconColor="text-[var(--color-primary)]"
                            size="md"
                            noPadding={true}
                            contentClassName="flex flex-col bg-[var(--color-surface-alt)]"
                            footer={
                                <div className="flex items-center justify-between w-full gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-bold shrink-0">
                                            {(photoZoom.name || '?').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-[var(--color-text)] truncate">{photoZoom.name}</p>
                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider truncate">
                                                {[photoZoom.registrationCode, photoZoom.className].filter(Boolean).join(' • ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(photoZoom.url)
                                                    const blob = await res.blob()
                                                    const url = URL.createObjectURL(blob)
                                                    const a = document.createElement('a')
                                                    a.href = url
                                                    a.download = `${(photoZoom.name || 'foto').replace(/\s+/g, '_')}.jpg`
                                                    document.body.appendChild(a)
                                                    a.click()
                                                    document.body.removeChild(a)
                                                    URL.revokeObjectURL(url)
                                                } catch { }
                                            }}
                                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center gap-2 border border-[var(--color-primary)]/20"
                                        >
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="relative w-full aspect-[3/4] sm:aspect-auto sm:h-[55vh] flex items-center justify-center p-6">
                                <img
                                    src={photoZoom.url}
                                    alt={photoZoom.name}
                                    className="max-w-full max-h-full rounded-2xl object-contain shadow-xl ring-1 ring-white/10"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '' }}
                                    loading="lazy" decoding="async" />
                            </div>
                        </Modal>
                    )
                }

                {/* CSS Print Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    /* Reset everything */
                    body > *:not(#portal-root) {
                        position: absolute !important;
                        left: -9999px !important;
                        visibility: hidden !important;
                    }
                    #portal-root {
                        display: block !important;
                        position: static !important;
                        visibility: visible !important;
                    }

                    /* Background Colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Portal Content Positioning */
                    .modal-overlay {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 100vw !important; height: 100vh !important;
                        background: white !important;
                        display: block !important;
                        visibility: visible !important;
                        z-index: 9999999 !important;
                        padding: 0 !important; margin: 0 !important;
                        backdrop-filter: none !important;
                    }

                    .modal-content {
                        position: relative !important;
                        top: 0 !important; left: 0 !important;
                        width: 100% !important; max-width: none !important;
                        height: auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 20mm 0 !important; margin: 0 !important;
                        display: block !important;
                        visibility: visible !important;
                        background: white !important;
                    }

                    /* Hide Non-Card Elements */
                    .modal-content > div:first-child,
                    .no-print,
                    button {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Card Container for Print */
                    #printable-cards {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 15mm !important;
                        justify-content: center !important;
                        align-items: center !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        transform: none !important;
                        scale: 1 !important;
                        margin: 0 auto !important;
                    }

                    #printable-cards * {
                        visibility: visible !important;
                    }

                    /* Layout Setup */
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                }
            `}} />
                {/* ===================== */}
                {/* FLOATING BULK ACTION BAR - SaaS STYLE */}
                {/* ===================== */}
                {
                    selectedStudentIds.length > 0 && createPortal(
                        <div
                            className="fixed -translate-x-1/2 z-[250] w-[95%] md:w-max max-w-[95%] animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)"
                            style={{
                                left: dir === 'rtl'
                                    ? 'calc(50vw - (var(--sidebar-width, 0px) / 2))'
                                    : 'calc(50vw + (var(--sidebar-width, 0px) / 2))',
                                bottom: 'var(--floating-bar-bottom, 16px)'
                            }}
                        >
                            <div className="relative">
                                <div className="relative bg-gray-900 dark:bg-gray-800 border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-4 text-white overflow-hidden shadow-xl">
                                    {/* Animated scanline */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                                    {/* Left: count badge + label */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-sm shrink-0">
                                            {selectedStudentIds.length}
                                        </div>
                                        <div className="hidden md:block">
                                            <p className="text-xs font-bold uppercase tracking-wide opacity-50 leading-none">Terpilih</p>
                                            <p className="text-xs font-bold leading-none mt-0.5">Aksi Massal</p>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-6 bg-white/10 shrink-0 hidden md:block" />

                                    {/* Center: action buttons */}
                                    <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto no-scrollbar">
                                        <button
                                            onClick={handleBulkWA}
                                            className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                            title="Broadcast WA"
                                        >
                                            <WhatsAppIcon className="w-4 h-4" />
                                            <span className="hidden md:inline">Whatsapp</span>
                                        </button>

                                        {canPrintCard && (
                                            <button
                                                onClick={handleBulkPrint}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                                title="Cetak Kartu"
                                            >
                                                <Printer className="w-4 h-4" />
                                                <span className="hidden md:inline">Cetak</span>
                                            </button>
                                        )}

                                        {canBulkTag && (
                                            <button
                                                onClick={() => setActiveModal('bulkTag')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                                title="Beri Label"
                                            >
                                                <Tags className="w-4 h-4" />
                                                <span className="hidden md:inline">Label</span>
                                            </button>
                                        )}

                                        {canPromote && (
                                            <button
                                                onClick={() => setActiveModal('bulkPromote')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                                title="Naik Kelas"
                                            >
                                                <GraduationCap className="w-4 h-4" />
                                                <span className="hidden md:inline">Naik</span>
                                            </button>
                                        )}

                                        {canBulkPoint && (
                                            <button
                                                onClick={() => setActiveModal('bulkPoint')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                                title="Beri Poin"
                                            >
                                                <Zap className="w-4 h-4" />
                                                <span className="hidden md:inline">Poin</span>
                                            </button>
                                        )}
                                        {canBulkRoom && (
                                            <button
                                                onClick={() => setActiveModal('bulkRoom')}
                                                className="h-8 w-8 md:w-auto md:px-3 shrink-0 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-white transition-all duration-200 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-wide"
                                                title="Tetapkan Kamar"
                                            >
                                                <DoorOpen className="w-4 h-4" />
                                                <span className="hidden md:inline">Kamar</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Right: dismiss */}
                                    <div className="w-px h-6 bg-white/10 shrink-0" />
                                    <button
                                        onClick={() => setSelectedStudentIds([])}
                                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all text-white/50 shrink-0"
                                        title="Batal Pilih"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }
                {/* ===================== */}
                {/* BULK TAG MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    activeModal === 'bulkTag' && (
                        <Modal
                            isOpen={activeModal === 'bulkTag'}
                            onClose={() => closeModal()}
                            title={`Aksi Label Massal — ${selectedStudentIds.length} Siswa`}
                            description="Tambah atau hapus label untuk rombongan siswa terpilih."
                            icon={Tags}
                            iconBg="bg-indigo-500/10"
                            iconColor="text-indigo-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => closeModal()}
                                        className="h-11 px-8 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wide rounded-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg"
                                    >
                                        Selesai
                                    </button>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                {/* Mode Toggle */}
                                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <button
                                        onClick={() => setBulkTagAction('add')}
                                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${bulkTagAction === 'add' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Tambah Label
                                    </button>
                                    <button
                                        onClick={() => setBulkTagAction('remove')}
                                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${bulkTagAction === 'remove' ? 'bg-red-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Hapus Label
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Pilih Label untuk Diaplikasikan</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleBulkTagApply(tag)}
                                                disabled={submitting}
                                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between group hover:scale-[1.02] active:scale-95 ${bulkTagAction === 'add'
                                                    ? 'hover:border-indigo-500 hover:bg-indigo-500/5'
                                                    : 'hover:border-red-500 hover:bg-red-500/5'
                                                    } border-[var(--color-border)] bg-[var(--color-surface)]`}
                                            >
                                                <span className="flex items-center gap-2 truncate">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${getTagColor(tag).split(' ')[0]}`} />
                                                    <span className="truncate">{tag}</span>
                                                </span>
                                                {bulkTagAction === 'add' ? <Plus className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${bulkTagAction === 'add' ? 'text-indigo-500' : 'text-red-500'}`} /> : <Trash2 className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${bulkTagAction === 'add' ? 'text-indigo-500' : 'text-red-500'}`} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
                                        {bulkTagAction === 'add'
                                            ? `* Memilih label akan MENAMBAHKAN label tersebut ke SEMUA (${selectedStudentIds.length}) siswa yang Anda pilih.`
                                            : `* Memilih label akan MENGHAPUS label tersebut dari SEMUA (${selectedStudentIds.length}) siswa yang memiliki label itu.`}
                                    </p>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* ===================== */}
                {/* BULK POINT MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    canBulkPoint && activeModal === 'bulkPoint' && (
                        <Modal
                            isOpen={activeModal === 'bulkPoint'}
                            onClose={() => closeModal()}
                            title={`Aksi Poin Massal — ${selectedStudentIds.length} Siswa`}
                            description="Berikan poin positif atau negatif ke seluruh siswa terpilih."
                            icon={Zap}
                            iconBg="bg-orange-500/10"
                            iconColor="text-orange-500"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="space-y-3">
                                    <div className="flex p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 gap-3 items-start">
                                        <CircleAlert className="w-4 h-4 text-amber-500 mt-0.5" />
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                                            Poin akan ditambahkan ke total poin masing-masing siswa. Pastikan jumlah dan alasan sudah benar sebelum memproses.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => closeModal()}
                                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkPointUpdate}
                                            disabled={submitting || !bulkPointValue}
                                            className="flex-[2] h-11 rounded-xl bg-orange-500 text-white text-xs font-bold uppercase tracking-wide hover:brightness-110 transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (
                                                <>
                                                    <Zap className="w-4 h-4" />
                                                    Proses Poin Massal
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] block mb-2">Jumlah Poin</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={bulkPointValue}
                                                onChange={e => setBulkPointValue(Number(e.target.value))}
                                                placeholder="Contoh: 10 atau -10"
                                                className="input-field w-full h-12 px-4 pr-24 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                                <button onClick={() => setBulkPointValue(10)} className="h-7 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all">+10</button>
                                                <button onClick={() => setBulkPointValue(-10)} className="h-7 px-2 rounded-lg bg-red-500/10 text-red-600 text-xs font-bold hover:bg-red-500 hover:text-white transition-all">-10</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] block mb-2">Alasan / Keterangan</label>
                                        <input
                                            type="text"
                                            value={bulkPointLabel}
                                            onChange={e => setBulkPointLabel(e.target.value)}
                                            placeholder="Contoh: Hadiah Lomba Kebersihan"
                                            className="input-field w-full h-11 px-4 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* ===================== */}
                {/* BULK ROOM MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    canBulkRoom && activeModal === 'bulkRoom' && (
                        <Modal
                            isOpen={activeModal === 'bulkRoom'}
                            onClose={() => closeModal()}
                            title={`Penetapan Kamar Massal — ${selectedStudentIds.length} Siswa`}
                            description="Pindahkan santri terpilih ke kamar asrama secara sekaligus."
                            icon={DoorOpen}
                            iconBg="bg-teal-500/10"
                            iconColor="text-teal-600"
                            size="sm"
                            mobileVariant="bottom-sheet"
                            footer={
                                <div className="space-y-3">
                                    {bulkRoomId && (
                                        <div className="flex p-3 rounded-2xl bg-teal-500/5 border border-teal-500/15 gap-3 items-start">
                                            <CircleAlert className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                                            <p className="text-xs text-teal-700 dark:text-teal-400 font-bold leading-relaxed">
                                                {selectedStudentIds.length} siswa akan ditetapkan ke kamar
                                                <span className="font-bold mx-1">
                                                    {bulkRoomId === '-' ? 'Lainnya / Kosong' : bulkRoomId}
                                                </span>.
                                                Kamar sebelumnya akan ditimpa.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => closeModal()}
                                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkRoomAssign}
                                            disabled={submitting || !bulkRoomId}
                                            className="flex-[2] h-11 rounded-xl bg-teal-500 text-white text-xs font-bold uppercase tracking-wide hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : (
                                                <><DoorOpen className="w-4 h-4" /> Tetapkan Kamar</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            }
                        >
                            <div className="space-y-4 md:space-y-6">
                                {<SelectedStudentsCarousel
                                    selectedStudents={selectedStudents}
                                    removingStudentId={removingStudentId}
                                    setRemovingStudentId={setRemovingStudentId}
                                    toggleSelectStudent={toggleSelectStudent}
                                />}

                                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
                                <label className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] block mb-3">Pilih Kamar Tujuan</label>

                                {/* Opsi Kosongkan */}
                                <button
                                    type="button"
                                    onClick={() => setBulkRoomId(bulkRoomId === '-' ? '' : '-')}
                                    className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-3 hover:scale-[1.01] active:scale-95 ${bulkRoomId === '-'
                                        ? 'bg-amber-500/10 border-amber-500 text-amber-700'
                                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-amber-500/40 hover:bg-amber-500/5'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bulkRoomId === '-' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <DoorOpen className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-xs">Lainnya / Kosongkan</p>
                                        <p className="text-xs opacity-60 mt-0.5">Hapus penugasan kamar untuk siswa terpilih</p>
                                    </div>
                                    {bulkRoomId === '-' && <Check className="w-4 h-4 ml-auto text-amber-600" />}
                                </button>

                                <div className="h-px bg-[var(--color-border)] my-1" />

                                {/* Daftar Kamar */}
                                {LIST_KAMAR.map(kamar => (
                                    <button
                                        key={kamar.id}
                                        type="button"
                                        onClick={() => setBulkRoomId(bulkRoomId === kamar.id ? '' : kamar.id)}
                                        className={`w-full p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-3 hover:scale-[1.01] active:scale-95 ${bulkRoomId === kamar.id
                                            ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-teal-500/40 hover:bg-teal-500/5'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bulkRoomId === kamar.id ? 'bg-teal-500 text-white' : 'bg-teal-500/10 text-teal-600'}`}>
                                            <DoorOpen className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs">{kamar.id}</p>
                                            <p className="text-xs opacity-50 mt-0.5 font-medium" dir="rtl">{kamar.ar}</p>
                                        </div>
                                        {bulkRoomId === kamar.id && <Check className="w-4 h-4 ml-auto text-teal-600 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </Modal>
                    )
                }
            </div >
        </DashboardLayout >
    )
}
