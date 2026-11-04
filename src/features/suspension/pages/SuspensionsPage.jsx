import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Plus, Search, ExternalLink, Eye,
  Link2, CheckCircle2, XCircle, Ban,
} from 'lucide-react'
import DashboardLayout from '@core/layouts/DashboardLayout'
import {
  PageHeader, DataTable, Pagination, EmptyState, RichSelect,
  TableSkeleton, ConfirmDialog,
} from '@shared/components'
import useSuspensions from '../hooks/useSuspensions'
import SuspensionFormModal from '../components/SuspensionFormModal'
import TokenModal from '../components/TokenModal'
import { formatTanggalPendek } from '../utils/suspensionConstants'

const STATUS_BADGE = {
  aktif: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  selesai: 'bg-slate-500/10 text-[var(--color-text-muted)] border-[var(--color-border)]',
  dibatalkan: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

export default function SuspensionsPage() {
  const nav = useNavigate()
  const {
    items, total, loading, error,
    statusFilter, setStatusFilter, search, setSearch, page, pageSize,
    handlePage, create, updateStatus,
    generateToken, fetchTokens, revokeToken,
    findStudents, findReports, suggestJenjang,
  } = useSuspensions()

  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [tokenSus, setTokenSus] = useState(null)
  const [tokenList, setTokenList] = useState([])
  const [tokenBusy, setTokenBusy] = useState(false)
  const [confirmRow, setConfirmRow] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const refreshTokens = useCallback(async (suspensionId) => {
    const list = await fetchTokens(suspensionId)
    setTokenList(list || [])
    return list
  }, [fetchTokens])

  const handleNewToken = useCallback(async () => {
    if (!tokenSus || tokenBusy) return
    setTokenBusy(true)
    const { token } = await generateToken(tokenSus)
    if (token) {
      setTokenInfo(token)
      await refreshTokens(tokenSus.id)
    }
    setTokenBusy(false)
  }, [tokenSus, tokenBusy, generateToken, refreshTokens])

  const handleRevoke = useCallback(async (tokenId) => {
    if (tokenBusy) return
    if (!window.confirm('Cabut tautan ini? Wali yang memegangnya langsung kehilangan akses.')) return
    setTokenBusy(true)
    const ok = await revokeToken(tokenId)
    if (ok && tokenSus) await refreshTokens(tokenSus.id)
    setTokenBusy(false)
  }, [tokenBusy, revokeToken, tokenSus, refreshTokens])

  const submit = useCallback(async (payload) => {
    setSaving(true)
    const { data, error: err } = await create(payload)
    setSaving(false)
    if (!err && data) {
      setFormOpen(false)
      // Langsung buatkan tautan wali untuk skorsing baru
      const { token } = await generateToken(data)
      if (token) {
        setTokenInfo({ ...token, expires_at: token.expires_at })
        setTokenSus(data)
        setTokenOpen(true)
      }
    }
  }, [create, generateToken])

  const askStatus = (row, status) => {
    setConfirmRow(row)
    setConfirmAction(status)
  }

  const doStatus = async () => {
    if (!confirmRow || !confirmAction) return
    const ok = await updateStatus(confirmRow, confirmAction)
    if (ok) {
      setConfirmRow(null)
      setConfirmAction(null)
    }
  }

  const openTokens = useCallback(async (row) => {
    const list = await fetchTokens(row.id)
    const active = (list || []).find((t) => !t.revoked_at)
    if (active) {
      // Raw token lama tidak tersimpan di DB — tampilkan daftar token supaya
      // admin bisa mencabut atau membuat tautan baru.
      setTokenSus(row)
      setTokenList(list)
      setTokenOpen(true)
    } else {
      const { token } = await generateToken(row)
      if (token) {
        setTokenInfo(token)
        setTokenSus(row)
        setTokenList([])
        setTokenOpen(true)
      }
    }
  }, [fetchTokens, generateToken])

  const columns = [
    {
      header: 'Siswa',
      render: (r) => (
        <button
          type="button"
          onClick={() => nav(`/suspensions/${r.id}`)}
          className="flex items-center gap-2.5 text-left group"
        >
          <span className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-sm font-black shrink-0">
            {r.student?.name?.charAt(0) || '?'}
          </span>
          <span>
            <span className="block text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] group-hover:underline">
              {r.student?.name || '-'}
            </span>
            <span className="block text-[11px] text-[var(--color-text-muted)]">
              {r.student?.classes?.name || '-'} · {r.jenjang}
            </span>
          </span>
        </button>
      ),
    },
    {
      header: 'Periode',
      render: (r) => (
        <span className="text-xs text-[var(--color-text)] tabular-nums whitespace-nowrap">
          {formatTanggalPendek(r.start_date)} – {formatTanggalPendek(r.end_date)}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (r) => (
        <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg border ${STATUS_BADGE[r.status] || ''}`}>
          {r.status === 'aktif' ? <CheckCircle2 className="w-3.5 h-3.5" /> : r.status === 'selesai' ? <Eye className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
          {r.status}
        </span>
      ),
    },
    {
      header: 'Aksi',
      render: (r) => (
        <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => nav(`/suspensions/${r.id}`)}
            aria-label={`Detail ${r.student?.name}`}
            title="Detail & progres"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openTokens(r)}
            aria-label="Tautan wali"
            title="Tautan wali"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10"
          >
            <Link2 className="w-4 h-4" />
          </button>
          {r.status === 'aktif' ? (
            <button
              type="button"
              onClick={() => askStatus(r, 'selesai')}
              aria-label="Selesaikan"
              title="Tandai selesai"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-600 hover:bg-emerald-500/10"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => askStatus(r, 'aktif')}
              aria-label="Aktifkan kembali"
              title="Aktifkan kembali"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-600 hover:bg-amber-500/10"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          {r.status === 'aktif' && (
            <button
              type="button"
              onClick={() => askStatus(r, 'dibatalkan')}
              aria-label="Batalkan"
              title="Batalkan"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-rose-500/10"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Skorsing & Pembinaan di Rumah"
        subtitle="Kelola siswa yang dipulangkan, tautan wali, dan progres harian."
        breadcrumbs={[{ label: 'Kesantrian' }, { label: 'Skorsing' }]}
        actions={(
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="h-10 px-4 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Buat Skorsing
          </button>
        )}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa…"
            aria-label="Cari nama siswa"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>
        <RichSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: 'all', label: 'Semua status' }, { value: 'aktif', label: 'Aktif' }, { value: 'selesai', label: 'Selesai' }, { value: 'dibatalkan', label: 'Dibatalkan' }]}
          compact
          className="sm:w-48"
        />
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : error ? (
        <div className="p-6 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={ShieldAlert}
          title="Belum ada data skorsing"
          description={search ? 'Tidak cocok dengan pencarian.' : 'Buat data skorsing pertama lewat tombol di atas.'}
        />
      ) : (
        <div className="table-container rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-x-auto">
          <DataTable columns={columns} data={items} />
        </div>
      )}

      {!!total && (
        <div className="mt-4">
          <Pagination
            totalRows={total}
            page={page}
            pageSize={pageSize}
            setPage={handlePage}
            setPageSize={() => {}}
          />
        </div>
      )}

      <SuspensionFormModal
        key={formOpen ? 'susform-buka' : 'susform-tutup'}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={submit}
        findStudents={findStudents}
        findReports={findReports}
        suggestJenjang={suggestJenjang}
        saving={saving}
      />

      <TokenModal
        isOpen={tokenOpen}
        onClose={() => { setTokenOpen(false); setTokenInfo(null); setTokenList([]) }}
        tokenInfo={tokenInfo}
        tokenList={tokenList}
        onNewToken={handleNewToken}
        onRevoke={handleRevoke}
        tokenBusy={tokenBusy}
        suspension={tokenSus}
        studentPhone={tokenSus?.student?.phone}
        waliName={tokenSus?.student?.guardian_name}
        schoolName="Kesiswaan MBS Tanggul"
      />

      <ConfirmDialog
        isOpen={!!confirmRow}
        onClose={() => { setConfirmRow(null); setConfirmAction(null) }}
        onConfirm={doStatus}
        title={confirmAction === 'dibatalkan' ? 'Batalkan skorsing?' : `Ubah status menjadi ${confirmAction}?`}
        description={confirmAction === 'dibatalkan'
          ? 'Tautan wali ikut tidak berlaku.'
          : 'Pastikan progres pembinaan sudah sesuai.'}
        confirmText="Ya, lanjutkan"
      />
    </DashboardLayout>
  )
}
