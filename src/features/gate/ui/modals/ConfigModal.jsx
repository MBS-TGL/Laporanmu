import { useState } from 'react'
import { Settings, Check, Send, Loader2 } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'

export default function ConfigModal({ onSave, onCancel, testNotification }) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key
  const [url, setUrl] = useState(() => localStorage.getItem('GATE_WEBHOOK_URL') || import.meta.env.VITE_GATE_WEBHOOK_URL || '')
  const [testing, setTesting] = useState(false)

  const handleSave = () => {
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim())
    onSave()
  }

  const handleTest = async () => {
    if (!url) return
    setTesting(true)
    localStorage.setItem('GATE_WEBHOOK_URL', url.trim())
    const success = await testNotification()
    setTesting(false)
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={tp('modalConfigTitle')}
      description={tp('modalConfigDesc')}
      icon={Settings}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-500"
      size="sm"
      mobileVariant="bottom-sheet"
      footer={
        <div className="flex items-center w-full gap-3">
          <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0">{tp('modalConfigCancel').toUpperCase()}</button>
          <div className="flex-1" />
          <button onClick={handleSave} className="h-10 px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>{tp('modalConfigSave').toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2 block">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://api.telegram.org/bot<token>/sendMessage?chat_id=<id>"
              className="flex-1 h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-inner"
            />
            <button onClick={handleTest} disabled={testing || !url}
              className="h-10 px-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-[10px] font-black text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 shadow-sm"
              title="Test Kirim Notifikasi">
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{testing ? tp('modalConfigTesting') : tp('modalConfigTest')}</span>
            </button>
          </div>
          {import.meta.env.VITE_GATE_WEBHOOK_URL && !localStorage.getItem('GATE_WEBHOOK_URL') && (
            <p className="mt-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" /> Webhook default aktif (.env)
            </p>
          )}
          <p className="mt-2 text-[9px] text-[var(--color-text-muted)] opacity-60">{tp('modalConfigHelp')}</p>
        </div>
      </div>
    </Modal>
  )
}
