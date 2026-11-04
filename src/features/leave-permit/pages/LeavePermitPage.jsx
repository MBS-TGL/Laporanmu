import { useState, useEffect } from 'react'
import {
  Plus, FileText, Printer, Search,
  Trash2, AlertCircle, LogOut, LogIn, Send
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  StatsCarousel, PageHeader, StatCard, EmptyState,
  Modal, Pagination, Button, Input, TableSkeleton
} from '@shared/components'
import { useToast } from '@context/Toast'
import useLeavePermitCore from '../hooks/useLeavePermitCore'
import LeavePermitForm from '../components/LeavePermitForm'
import LeavePermitPrint from '../components/LeavePermitPrint'
import LeavePermitStatusBadge from '../components/LeavePermitStatusBadge'
import { fmtDateTimeShort, fmtDateShort } from '../utils/leavePermitConstants'
import { supabase } from '@lib/supabase'

const PAGE_SIZE = 15

export default function LeavePermitPage() {
  const { addToast } = useToast()
  const {
    permits, loading, stats,
    fetchPermits, fetchStats, createPermit, cancelPermit,
    fetchSignatures,
  } = useLeavePermitCore()

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showPrint, setShowPrint] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [paperMode, setPaperMode] = useState('a4')
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
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Terbitkan Izin
            </Button>
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

        {/* Filter + Search + Tabel — surface card */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
            <div className="flex gap-1 p-1 rounded-xl bg-surface-alt border border-border">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilterStatus(f.key); setPage(1) }}
                  className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    filterStatus === f.key
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari nama santri..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Permit list */}
          <div className="p-4">
            {loading && permits.length === 0 ? (
              <TableSkeleton rows={5} cols={7} />
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
                      <tr className="border-b border-border bg-surface-alt/60">
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">Santri</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted hidden md:table-cell">Kelas</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">Tujuan</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted hidden lg:table-cell">Tanggal</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted hidden lg:table-cell">Batas Waktu</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">Status</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-muted text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pagedPermits.map((permit) => {
                        const student = permit.student || {}
                        const isOverdue = permit.status === 'departed' && new Date(permit.return_deadline) < new Date()
                        return (
                          <tr key={permit.id} className={`hover:bg-surface-alt/60 transition-colors ${isOverdue ? 'bg-danger/5' : ''}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-surface-alt flex items-center justify-center shrink-0 overflow-hidden">
                                  {student.photo_url
                                    ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-xs font-bold text-primary">{student.name?.charAt(0)}</span>
                                  }
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-text leading-tight">{student.name}</p>
                                  <p className="text-xs text-text-muted md:hidden">{student.classes?.name || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-text-muted hidden md:table-cell">{student.classes?.name || '-'}</td>
                            <td className="px-4 py-2.5 text-xs text-text max-w-[140px] truncate">{permit.destination}</td>
                            <td className="px-4 py-2.5 text-xs text-text-muted hidden lg:table-cell">{fmtDateShort(permit.leave_date)}</td>
                            <td className="px-4 py-2.5 text-xs hidden lg:table-cell">
                              <span className={isOverdue ? 'text-danger font-bold' : 'text-text-muted'}>
                                {fmtDateTimeShort(permit.return_deadline)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <LeavePermitStatusBadge status={permit.status} size="xs" />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setShowPrint(permit)}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-surface-alt text-text-muted hover:text-primary transition-colors"
                                  title="Cetak"
                                  aria-label="Cetak surat izin"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {(permit.status === 'issued' || permit.status === 'departed') && (
                                  <button
                                    onClick={() => handleCancel(permit)}
                                    className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                                    title="Batalkan"
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
              paperMode={paperMode}
              onPaperModeChange={setPaperMode}
            />
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
