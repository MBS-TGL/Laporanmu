import { useState, useEffect, useRef } from 'react'
import {
  Plus, FileText, Printer, Search,
  Loader2, Trash2, AlertCircle, LogOut, LogIn, Send
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  StatsCarousel, PageHeader, StatCard, EmptyState,
  Modal, Pagination
} from '@shared/components'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import useLeavePermitCore from '../hooks/useLeavePermitCore'
import LeavePermitForm from '../components/LeavePermitForm'
import LeavePermitPrint from '../components/LeavePermitPrint'
import LeavePermitStatusBadge from '../components/LeavePermitStatusBadge'
import { STATUS_MAP, fmtDateIndo, fmtDateTimeShort, fmtDateShort } from '../utils/leavePermitConstants'
import { buildLeavePermitPDFHtml } from '../utils/leavePermitPdfHtml'
import { supabase } from '@lib/supabase'

const PAGE_SIZE = 15

export default function LeavePermitPage() {
  const { addToast } = useToast()
  const { user } = useAuth()
  const {
    permits, loading, stats,
    fetchPermits, fetchStats, createPermit, cancelPermit,
    fetchSignatures,
  } = useLeavePermitCore()

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showPrint, setShowPrint] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [signatures, setSignatures] = useState([])
  const [formCanSubmit, setFormCanSubmit] = useState(false)

  // Load data
  useEffect(() => {
    fetchPermits({ status: filterStatus !== 'all' ? filterStatus : undefined, search })
    fetchStats()
  }, [filterStatus, search])

  useEffect(() => {
    fetchSignatures().then(setSignatures)
  }, [])

  // Filtered + paginated
  const filteredPermits = permits
  const totalPages = Math.ceil(filteredPermits.length / PAGE_SIZE)
  const pagedPermits = filteredPermits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Handlers
  const handleCreate = async (payload) => {
    const result = await createPermit(payload)
    if (!result.error && result.data) {
      setShowForm(false)
      // Fetch full permit with student join before showing print
      const { data: fullPermit } = await supabase
        .from('leave_permits')
        .select(`
          *,
          student:students ( id, name, phone, photo_url, class_id, dorm_id,
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
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Cetak Izin Keluar Pondok</title>
      <style>@page{size:148mm 210mm;margin:0}body{margin:0;padding:0}</style>
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

      // A5 dimensions in mm
      const pdf = new jsPDF({ unit: 'mm', format: [148, 210], orientation: 'portrait' })
      pdf.addImage(imgData, 'PNG', 0, 0, 148, 210)

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

  const handleCancel = async (permit) => {
    if (!confirm(`Batalkan izin untuk ${permit.student?.name}?`)) return
    await cancelPermit(permit.id)
  }

  const statusFilters = [
    { key: 'all', label: 'Semua', count: permits.length },
    { key: 'issued', label: 'Diterbitkan', count: stats.issuedToday },
    { key: 'departed', label: 'Berangkat', count: stats.active },
    { key: 'returned', label: 'Kembali', count: stats.returnedToday },
    { key: 'overdue', label: 'Terlambat', count: stats.overdue },
  ]

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5">

        <PageHeader
          badge="Kesantrian"
          breadcrumbs={['Izin Keluar Pondok']}
          title="Izin Keluar Pondok"
          subtitle="Surat izin keluar pondok untuk santri"
          actions={
            <button
              onClick={() => setShowForm(true)}
              className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 bg-[var(--color-primary)] text-white hover:opacity-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Terbitkan Izin
            </button>
          }
        />

        {/* Stats */}
        <StatsCarousel count={4}>
          <StatCard
            icon={FileText}
            label="Diterbitkan Hari Ini"
            value={stats.issuedToday}
            color="primary"
          />
          <StatCard
            icon={LogOut}
            label="Sedang Keluar"
            value={stats.active}
            color="amber"
          />
          <StatCard
            icon={AlertCircle}
            label="Terlambat"
            value={stats.overdue}
            color="rose"
          />
          <StatCard
            icon={LogIn}
            label="Kembali Hari Ini"
            value={stats.returnedToday}
            color="emerald"
          />
        </StatsCarousel>

        {/* Filter + Search + Tabel — glass card */}
        <div className="glass rounded-[1.5rem] overflow-hidden">

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
            <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilterStatus(f.key); setPage(1) }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    filterStatus === f.key
                      ? 'bg-[var(--color-primary)] text-white shadow-sm shadow-[var(--color-primary)]/20'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari nama santri..."
                className="w-full h-9 pl-9 pr-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-[11px] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 transition-all"
              />
            </div>
          </div>

          {/* Permit list */}
          <div className="p-4">
            {loading && permits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                <p className="text-[11px] text-[var(--color-text-muted)]">Memuat data...</p>
              </div>
            ) : pagedPermits.length === 0 ? (
              <EmptyState
                variant="plain"
                color="slate"
                icon={FileText}
                title="Belum ada data izin"
                description="Klik 'Terbitkan Izin' untuk membuat surat izin baru"
              />
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto -mx-4 -mt-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/60">
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Santri</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hidden md:table-cell">Kelas</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Tujuan</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hidden lg:table-cell">Tanggal</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hidden lg:table-cell">Batas Waktu</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {pagedPermits.map((permit) => {
                        const student = permit.student || {}
                        const isOverdue = permit.status === 'departed' && new Date(permit.return_deadline) < new Date()
                        return (
                          <tr key={permit.id} className={`hover:bg-[var(--color-surface-alt)]/60 transition-colors ${isOverdue ? 'bg-red-500/5' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center shrink-0 overflow-hidden">
                                  {student.photo_url
                                    ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-[10px] font-black text-[var(--color-primary)]">{student.name?.charAt(0)}</span>
                                  }
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-[var(--color-text)]">{student.name}</p>
                                  <p className="text-[9px] text-[var(--color-text-muted)] md:hidden">{student.classes?.name || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] hidden md:table-cell">{student.classes?.name || '-'}</td>
                            <td className="px-4 py-3 text-[11px] text-[var(--color-text)] max-w-[140px] truncate">{permit.destination}</td>
                            <td className="px-4 py-3 text-[11px] text-[var(--color-text-muted)] hidden lg:table-cell">{fmtDateShort(permit.leave_date)}</td>
                            <td className="px-4 py-3 text-[11px] hidden lg:table-cell">
                              <span className={isOverdue ? 'text-red-500 font-black' : 'text-[var(--color-text-muted)]'}>
                                {fmtDateTimeShort(permit.return_deadline)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <LeavePermitStatusBadge status={permit.status} size="xs" />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setShowPrint(permit)}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                                  title="Cetak"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {(permit.status === 'issued' || permit.status === 'departed') && (
                                  <button
                                    onClick={() => handleCancel(permit)}
                                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-500 transition-all"
                                    title="Batalkan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Terbitkan Surat Izin Keluar"
        description="Isi form berikut untuk menerbitkan surat izin keluar pondok"
        icon={FileText}
        size="lg"
        footer={
          <button
            type="submit"
            form="leave-permit-form"
            disabled={!formCanSubmit || loading}
            className="w-full h-11 rounded-2xl text-[12px] font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 active:scale-[0.98] text-white shadow-lg shadow-[var(--color-primary)]/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Terbitkan Surat Izin
          </button>
        }
      >
        <LeavePermitForm
          formId="leave-permit-form"
          onSubmit={handleCreate}
          loading={loading}
          signatures={signatures}
          onCanSubmitChange={setFormCanSubmit}
        />
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
            <LeavePermitPrint
              permit={showPrint}
              onPrint={handlePrint}
              onPdf={handlePdf}
              generatingPdf={generatingPdf}
            />
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
