import { useState, memo } from 'react'
import { Link2, Copy, Check, MessageCircle, AlertTriangle, Loader2, Ban, Plus } from 'lucide-react'
import { Modal } from '@shared/components'
import { useToast } from '@context/Toast'
import { formatTanggalPendek, buildWaMessage, buildWaLink } from '../utils/suspensionConstants'

// Modal tautan wali. Dua mode:
// - tokenInfo.raw ada: raw token tampil SEKALI + tombol salin/kirim WA.
// - tokenList ada: daftar tautan aktif (prefix + kedaluwarsa) + buat baru / cabut.
function TokenModal({ isOpen, onClose, tokenInfo, tokenList, onNewToken, onRevoke, tokenBusy, suspension, studentPhone, waliName, schoolName }) {
  const { addToast } = useToast()
  const [copied, setCopied] = useState(false)
  const raw = tokenInfo?.raw || ''
  const link = raw ? `${window.location.origin}/skorsing/${raw}` : ''
  const activeList = (tokenList || []).filter((t) => !t.revoked_at)

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // Fallback browser lama
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    addToast('Tautan disalin.', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const waHref = studentPhone && link
    ? buildWaLink(studentPhone, buildWaMessage({
      waliName,
      studentName: suspension?.student?.name || 'ananda',
      start: suspension?.start_date,
      end: suspension?.end_date,
      link,
      expiresAt: tokenInfo?.expires_at,
      school: schoolName,
    }))
    : ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tautan Akses Wali"
      description={raw
        ? 'Raw token tampil sekali ini. Salin sekarang atau kirim via WhatsApp.'
        : 'Kelola tautan akses wali untuk skorsing ini.'}
      icon={Link2}
      size="lg"
      footer={(
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white"
        >
          Selesai
        </button>
      )}
    >
      <div className="space-y-4">
        {raw ? (
          <>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--color-text)] leading-relaxed">
                Tautan ini memberi akses penuh pengisian log selama masa skorsing.
                Jangan disebar selain ke wali yang bersangkutan.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Tautan</p>
              <p className="text-xs font-mono break-all p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)]">
                {link}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex-1 h-11 rounded-xl text-sm font-bold border border-[var(--color-border)] flex items-center justify-center gap-2 hover:bg-[var(--color-surface-alt)] min-h-[44px]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Tersalin' : 'Salin Tautan'}
              </button>
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-11 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Kirim WA
                </a>
              ) : (
                <span className="flex-1 text-[11px] text-[var(--color-text-muted)] self-center">
                  Nomor HP wali kosong — salin manual lalu kirim lewat aplikasi lain.
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Berlaku sampai {formatTanggalPendek(tokenInfo?.expires_at)} (tanggal selesai + 1 hari).
            </p>
          </>
        ) : (
          <>
            {!activeList.length ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Belum ada tautan aktif. Buat tautan baru untuk wali.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeList.map((t) => (
                  <li key={t.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-[var(--color-text)]">
                        …{t.token_prefix}
                        <span className="font-sans font-medium text-[var(--color-text-muted)]"> · dipakai {t.use_count || 0}x</span>
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        Berlaku s/d {formatTanggalPendek(t.expires_at)}
                        {t.last_used_at ? ` · terakhir ${new Date(t.last_used_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ' · belum pernah dibuka'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRevoke?.(t.id)}
                      disabled={tokenBusy}
                      className="shrink-0 h-9 px-3 rounded-xl text-xs font-bold text-[var(--color-danger)] border border-[var(--color-danger)]/30 flex items-center gap-1.5 hover:bg-[var(--color-danger)]/10 disabled:opacity-50"
                    >
                      {tokenBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      Cabut
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={onNewToken}
              disabled={tokenBusy}
              className="w-full h-11 rounded-xl text-sm font-bold bg-emerald-600 text-white flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              {tokenBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Buat Tautan Baru
            </button>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Raw token lama tidak tersimpan di database — hanya tautan baru yang bisa disalin penuh sekali saat dibuat.
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}

export default memo(TokenModal)
