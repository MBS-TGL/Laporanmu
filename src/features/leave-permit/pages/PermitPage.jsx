import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Plus, FileText, Printer, Search, Trash2,
  ClipboardList, Send, RefreshCw, X
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  PageHeader, EmptyState, Modal, Pagination, Button
} from '@shared/components'
import { useToast } from '@context/Toast'
import useCore from '../hooks/useCore'
import PermitForm from '../components/PermitForm'
import PermitPrint from '../components/PermitPrint'
import StatusBadge from '../components/StatusBadge'
import { fmtDateTimeShort, fmtDateShort } from '../utils/permitConstants'
import { supabase } from '@lib/supabase'

const PAGE_SIZE = 15
const SEARCH_DEBOUNCE_MS = 300

// Izin yang masih bisa dibatalkan (status lama 'departed'/'overdue' dari data sebelum GatePage dinonaktifkan)
const CANCELLABLE = ['issued', 'departed', 'overdue']

// ─── Potongan UI kecil (selaras GatePage / Pusat Tugas) ─────────────────────
const CHIP_COLORS = {
  indigo: 'text-indigo-600 bg-indigo-500/10',
  rose: 'text-rose-600 bg-rose-500/10',
  emerald: 'text-emerald-600 bg-emerald-500/10',
  amber: 'text-amber-600 bg-amber-500/10'
}

function StatChip({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-lg border border-border bg-surface shrink-0">
      <span className={`w-6 h-6 rounded-md flex items-center justify-center ${CHIP_COLORS[color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="text-sm font-semibold tabular-nums text-text">{loading ? '–' : value}</span>
      <span className="text-xs text-text-muted whitespace-nowrap">{label}</span>
    </div>
  )
}

const TH = 'px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted'

// Skeleton memakai struktur & lebar kolom yang sama dengan tabel asli
function PermitTableSkeleton({ rows = 6 }) {
  const bar = (w) => <div className={`h-2.5 rounded-full bg-border/70 ${w}`} />
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-surface-alt/60">
            <th className={TH}>Santri</th>
            <th className={`${TH} hidden md:table-cell`}>Kelas</th>
            <th className={TH}>Tujuan</th>
            <th className={`${TH} hidden lg:table-cell`}>Tanggal</th>
            <th className={`${TH} hidden lg:table-cell`}>Batas Waktu</th>
            <th className={TH}>Status</th>
            <th className={TH}>
              <div className="flex justify-end">Aksi</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-border/70 shrink-0" />
                  {bar('w-28')}
                </div>
              </td>
              <td className="px-4 py-2.5 hidden md:table-cell">{bar('w-20')}</td>
              <td className="px-4 py-2.5">{bar('w-24')}</td>
              <td className="px-4 py-2.5 hidden lg:table-cell">{bar('w-20')}</td>
              <td className="px-4 py-2.5 hidden lg:table-cell">{bar('w-32')}</td>
              <td className="px-4 py-2.5">
                <div className="h-5 w-20 rounded-md bg-border/70" />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-1.5">
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

export default function PermitPage() {
  const { addToast } = useToast()
  const {
    permits, loading, stats,
    fetchPermits, fetchStats, createPermit, cancelPermit,
    fetchSignatures,
  } = useCore()

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showPrint, setShowPrint] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [paperMode, setPaperMode] = useState('a4')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [signatures, setSignatures] = useState([])
  const [formCanSubmit, setFormCanSubmit] = useState(false)

  // Baris ringan tanpa filter: sumber angka tab & kartu "Terlambat"
  const [countRows, setCountRows] = useState(null)

  const searchRef = useRef(null)

  // Debounce pencarian (hindari query per ketikan)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  const fetchCounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('leave_permits')
      .select('id, status, return_deadline')
      .limit(2000)
    if (!error) setCountRows(data || [])
  }, [])

  const serverStatus = filterStatus === 'all' ? undefined : filterStatus

  // Load data
  useEffect(() => {
    fetchPermits({ status: serverStatus, search: debouncedSearch })
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, debouncedSearch])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    fetchSignatures().then(setSignatures)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAll = useCallback(() => {
    fetchPermits({ status: serverStatus, search: debouncedSearch })
    fetchStats()
    fetchCounts()
  }, [fetchPermits, fetchStats, fetchCounts, serverStatus, debouncedSearch])

  // Pintasan: "/" fokus ke kolom cari
  const anyModalOpen = showForm || !!showPrint || !!cancelTarget
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || anyModalOpen) return
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        if (e.key === 'Escape') document.activeElement.blur()
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [anyModalOpen])

  // ── Angka tab ──────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    if (!countRows) return null
    return {
      all: countRows.length,
      issued: countRows.filter((p) => p.status === 'issued').length,
      cancelled: countRows.filter((p) => p.status === 'cancelled').length
    }
  }, [countRows])

  // ── Daftar tampil: terbaru di atas + halaman ───────────────────────────────
  const sortedPermits = useMemo(
    () => [...permits].sort((a, b) => new Date(b.leave_date || 0) - new Date(a.leave_date || 0)),
    [permits]
  )

  const totalPages = Math.max(1, Math.ceil(sortedPermits.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedPermits = sortedPermits.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeStart = sortedPermits.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedPermits.length)

  const initialLoading = loading && permits.length === 0
  const hasFilter = filterStatus !== 'all' || search.trim() !== ''

  const statusFilters = [
    { key: 'all', label: 'Semua', count: counts?.all },
    { key: 'issued', label: 'Diterbitkan', count: counts?.issued },
    { key: 'cancelled', label: 'Dibatalkan', count: counts?.cancelled },
  ]

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = async (payload) => {
    const result = await createPermit(payload)
    if (!result.error && result.data) {
      setShowForm(false)
      fetchCounts()
      // Fetch full permit with student join before showing print
      const { data: fullPermit } = await supabase
        .from('leave_permits')
        .select(`
          *,
          student:students ( id, name, phone, photo_url, class_id, dorm_id, metadata,
            classes ( id, name ),
            dorms ( id, ar, building, gender )
          ),
          issuer:profiles ( id, name ),
          signature:signatures ( id, signature_url )
        `)
        .eq('id', result.data.id)
        .single()
      setShowPrint(fullPermit || result.data)
    }
  }

  const handlePrint = (printEl) => {
    if (!printEl) return
    // A4 portrait (2 letters, cut in half) vs A5 landscape (1 letter)
    const pageCss = paperMode === 'a4' ? 'size:210mm 297mm' : 'size:210mm 148mm'
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Cetak Izin Keluar Pondok</title>
      <style>@page{${pageCss};margin:0}body{margin:0;padding:0}</style>
      </head><body></body></html>
    `)
    printWindow.document.body.appendChild(printEl.cloneNode(true))
    printWindow.document.close()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  const handlePdf = async (printEl) => {
    if (!printEl || !showPrint) return
    setGeneratingPdf(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ])

      // Clone for capture
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'position:absolute;left:-99999px;top:-99999px;background:#fff;z-index:-9999'
      const clone = printEl.cloneNode(true)
      wrapper.appendChild(clone)
      document.body.appendChild(wrapper)

      const canvas = await html2canvas(clone, { scale: 3, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')

      // A4 portrait (2 letters) or A5 landscape (1 letter), both in mm
      const isA4 = paperMode === 'a4'
      const pageW = 210
      const pageH = isA4 ? 297 : 148
      const pdf = isA4
        ? new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
        : new jsPDF({ unit: 'mm', format: [210, 148], orientation: 'landscape' })
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH)

      const studentName = showPrint.student?.name || 'Santri'
      const safeName = studentName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
      pdf.save(`Izin_Keluar_${safeName}_${showPrint.leave_date}.pdf`)

      document.body.removeChild(wrapper)
      addToast('PDF berhasil diunduh', 'success')
    } catch (err) {
      console.error('PDF generation error:', err)
      addToast('Gagal generate PDF', 'error')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelPermit(cancelTarget.id)
      fetchCounts()
      setCancelTarget(null)
    } finally {
      setCancelling(false)
    }
  }

  const resetFilters = () => {
    setFilterStatus('all')
    setSearch('')
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">

        <PageHeader
          badge="Kesantrian"
          breadcrumbs={['Izin Keluar Pondok']}
          title="Izin Keluar Pondok"
          subtitle="Surat izin keluar pondok untuk santri"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={refreshAll}
                disabled={loading}
                title="Muat ulang data"
                aria-label="Muat ulang data"
                className="h-9 w-9 rounded-lg border flex items-center justify-center transition-all bg-surface-alt border-border text-text-muted enabled:hover:text-text enabled:active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> Terbitkan Izin
              </Button>
            </div>
          }
        />

        {/* Stats: ringkas, karena fitur ini dipakai untuk cetak surat */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <StatChip icon={FileText} label="Diterbitkan Hari Ini" value={stats.issuedToday} color="indigo" loading={initialLoading} />
          <StatChip icon={ClipboardList} label="Total Izin" value={counts?.all ?? 0} color="emerald" loading={!counts} />
        </div>

        {/* Filter + Search + Tabel */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">

          {/* Filter bar */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-3 py-3 border-b border-border">
            <div className="flex gap-1 p-1 rounded-xl bg-surface-alt border border-border overflow-x-auto scrollbar-hide lg:w-fit shrink-0">
              {statusFilters.map((f) => {
                const on = filterStatus === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => { setFilterStatus(f.key); setPage(1) }}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${on ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'
                      }`}
                  >
                    {f.label}
                    {f.count !== undefined && (
                      <span
                        className={`px-1.5 rounded-full tabular-nums ${on
                          ? 'bg-white/20 text-white'
                          : 'bg-primary/10 text-primary'
                          }`}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari nama santri…  ( / )"
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-text-muted hover:text-text"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Daftar izin */}
          {initialLoading ? (
            <PermitTableSkeleton rows={6} />
          ) : pagedPermits.length === 0 ? (
            <div className="p-4">
              <EmptyState
                variant="plain"
                color="slate"
                icon={FileText}
                title={hasFilter ? 'Tidak ada izin yang cocok' : 'Belum ada data izin'}
                description={
                  hasFilter
                    ? 'Coba ganti filter status atau kata kunci pencarian.'
                    : "Klik 'Terbitkan Izin' untuk membuat surat izin baru"
                }
                action={
                  hasFilter && (
                    <button
                      onClick={resetFilters}
                      className="h-8 px-4 rounded-xl border border-border text-xs font-bold text-text-muted hover:text-text transition-all"
                    >
                      Reset Filter
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt/60">
                      <th className={TH}>Santri</th>
                      <th className={`${TH} hidden md:table-cell`}>Kelas</th>
                      <th className={TH}>Tujuan</th>
                      <th className={`${TH} hidden lg:table-cell`}>Tanggal</th>
                      <th className={`${TH} hidden lg:table-cell`}>Batas Waktu</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>
                        <div className="flex justify-end">Aksi</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedPermits.map((permit) => {
                      const student = permit.student || {}
                      return (
                        <tr
                          key={permit.id}
                          className="hover:bg-surface-alt/60 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden">
                                {student.photo_url
                                  ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-xs font-bold text-primary">{student.name?.charAt(0)}</span>
                                }
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-text leading-tight truncate">{student.name}</p>
                                <p className="text-xs text-text-muted md:hidden">{student.classes?.name || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-text-muted hidden md:table-cell">{student.classes?.name || '-'}</td>
                          <td className="px-4 py-2.5 text-xs text-text max-w-[160px] truncate" title={permit.destination}>
                            {permit.destination}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-text-muted hidden lg:table-cell whitespace-nowrap">
                            {fmtDateShort(permit.leave_date)}
                          </td>
                          <td className="px-4 py-2.5 text-xs hidden lg:table-cell whitespace-nowrap">
                            <span className="text-text-muted">
                              {fmtDateTimeShort(permit.return_deadline)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={permit.status} size="xs" />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setShowPrint(permit)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
                                title="Cetak surat izin"
                                aria-label="Cetak surat izin"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {CANCELLABLE.includes(permit.status) && (
                                <button
                                  onClick={() => setCancelTarget(permit)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                                  title="Batalkan izin"
                                  aria-label="Batalkan izin"
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

              {/* Footer: rentang data + pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
                <p className="text-xs text-text-muted tabular-nums">
                  Menampilkan {rangeStart}–{rangeEnd} dari {sortedPermits.length} izin
                </p>
                {totalPages > 1 && (
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Terbitkan Surat Izin Keluar"
        description="Isi form berikut untuk menerbitkan surat izin keluar pondok"
        icon={FileText}
        size="xl"
        footer={
          <Button
            type="submit"
            form="leave-permit-form"
            size="lg"
            disabled={!formCanSubmit || loading}
            loading={loading}
            className="w-full"
          >
            {!loading && <Send className="w-4 h-4" />}
            Terbitkan Surat Izin
          </Button>
        }
      >
        <PermitForm
          formId="leave-permit-form"
          onSubmit={handleCreate}
          loading={loading}
          signatures={signatures}
          onCanSubmitChange={setFormCanSubmit}
        />
      </Modal>

      {/* Konfirmasi batalkan izin */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => !cancelling && setCancelTarget(null)}
        title="Batalkan Izin Keluar?"
        description={cancelTarget ? `${cancelTarget.student?.name || 'Santri'} · ${cancelTarget.destination || '-'}` : ''}
        icon={Trash2}
        footer={
          <div className="flex w-full gap-2">
            <button
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-semibold text-text-muted hover:text-text transition-all disabled:opacity-50"
            >
              Kembali
            </button>
            <button
              onClick={confirmCancel}
              disabled={cancelling}
              className="flex-1 h-10 rounded-xl bg-danger text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60"
            >
              {cancelling ? 'Membatalkan…' : 'Ya, Batalkan'}
            </button>
          </div>
        }
      >
        <p className="text-sm text-text-muted leading-relaxed">
          Surat izin yang dibatalkan tidak bisa digunakan lagi. Tindakan ini tidak dapat diurungkan dari halaman ini.
        </p>
      </Modal>

      {/* Print Modal */}
      <Modal
        isOpen={!!showPrint}
        onClose={() => setShowPrint(null)}
        title="Cetak Surat Izin Keluar Pondok"
        description={showPrint ? `${showPrint.student?.name || 'Santri'} · ${showPrint.student?.classes?.name || '-'}` : ''}
        icon={Printer}
        size="xl"
        noPadding
      >
        {showPrint && (
          <div className="p-6 md:p-8">
            <PermitPrint
              permit={showPrint}
              onPrint={handlePrint}
              onPdf={handlePdf}
              generatingPdf={generatingPdf}
              paperMode={paperMode}
              onPaperModeChange={setPaperMode}
            />
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}