import { useState, useEffect } from 'react'
import { Printer, Check, FileText, Layers, Sliders, Users, FileSignature } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { useLanguage } from '@context'
import { PAGE_T } from '@features/gate/utils/gateConstants'

export default function PrintOptionsModal({
  isOpen,
  onClose,
  activeTab,
  rekapView,
  selectedCount = 0,
  onConfirm,
}) {
  const { language } = useLanguage()
  const tp = (key) => PAGE_T[language]?.[key] || PAGE_T["id"]?.[key] || key

  const defaultSigTitle = language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan'

  const [format, setFormat] = useState(rekapView === 'ringkasan' ? 'ringkasan' : 'detail')
  const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'all')
  const [showNip, setShowNip] = useState(true)
  const [showPurpose, setShowPurpose] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const [showVehicle, setShowVehicle] = useState(true)
  const [showSignature, setShowSignature] = useState(false)
  const [sigTitle, setSigTitle] = useState(defaultSigTitle)
  const [sigName, setSigName] = useState('')

  useEffect(() => {
    setSigTitle(language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan')
  }, [language])

  const handlePrint = () => {
    onConfirm({
      format,
      scope,
      showNip,
      showPurpose,
      showDuration,
      showVehicle,
      showSignature,
      signatureTitle: sigTitle,
      signatureName: sigName,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tp('printModalTitle')}
      description={tp('printModalDesc')}
      icon={Printer}
      iconBg="bg-indigo-500/10"
      iconColor="text-indigo-600 dark:text-indigo-400"
      size="sm"
      mobileVariant="bottom-sheet"
      footer={
        <div className="flex items-center w-full gap-3">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0 active:scale-95"
          >
            {tp('modalConfirmCancel').toUpperCase()}
          </button>
          <div className="flex-1" />
          <button
            onClick={handlePrint}
            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{tp('btnCetak').toUpperCase()}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-3">
        {/* Format Laporan */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60 block">
            1 — {tp('printFormatLabel')}
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setFormat('detail')}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${format === 'detail'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 text-[var(--color-text-muted)] hover:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-alt)]/50'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${format === 'detail' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12.5px] font-black block leading-none text-[var(--color-text)]">{tp('printFormatDetail')}</span>
                <span className="text-[9.5px] opacity-75 font-semibold mt-1.5 block leading-none text-[var(--color-text-muted)]">{tp('printFormatDetailSub')}</span>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${format === 'detail' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white scale-105' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
                {format === 'detail' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            <button
              onClick={() => setFormat('ringkasan')}
              className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${format === 'ringkasan'
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 text-[var(--color-text-muted)] hover:border-[var(--color-border)]/80 hover:bg-[var(--color-surface-alt)]/50'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${format === 'ringkasan' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12.5px] font-black block leading-none text-[var(--color-text)]">{tp('printFormatSummary')}</span>
                <span className="text-[9.5px] opacity-75 font-semibold mt-1.5 block leading-none text-[var(--color-text-muted)]">{tp('printFormatSummarySub')}</span>
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${format === 'ringkasan' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white scale-105' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}`}>
                {format === 'ringkasan' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>
        </div>

        {/* Cakup Data (jika ada selection) */}
        {selectedCount > 0 && (
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60 block">
              2 — {tp('printScopeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScope('all')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${scope === 'all'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 text-[var(--color-text-muted)] hover:border-[var(--color-border)]/80'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${scope === 'all' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                  <Sliders className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[12px] font-black block leading-tight">{tp('printScopeAll')}</span>
                  <span className="text-[9px] opacity-70 font-semibold mt-0.5 block">Seluruh data aktif</span>
                </div>
              </button>

              <button
                onClick={() => setScope('selected')}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${scope === 'selected'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 text-[var(--color-text-muted)] hover:border-[var(--color-border)]/80'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${scope === 'selected' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[12px] font-black block leading-tight">{tp('printScopeSelected').replace('{count}', selectedCount)}</span>
                  <span className="text-[9px] opacity-70 font-semibold mt-0.5 block">Hanya baris terpilih</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Kolom yang Ditampilkan */}
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60 block">
            {selectedCount > 0 ? '3 —' : '2 —'} {tp('printColumnsLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'nip', label: tp('printColNip'), val: showNip, set: setShowNip },
              { id: 'purpose', label: tp('printColPurpose'), val: showPurpose, set: setShowPurpose },
              { id: 'duration', label: tp('printColDuration'), val: showDuration, set: setShowDuration },
              format === 'detail' && { id: 'vehicle', label: tp('printColVehicle'), val: showVehicle, set: setShowVehicle }
            ].filter(Boolean).map((col, idx) => (
              <button
                key={col.id}
                onClick={() => col.set(!col.val)}
                className={`h-9 px-3.5 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between group/col ${col.val
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border)]/80'}`}
              >
                <span className="truncate">{col.label}</span>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${col.val ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white scale-105' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}>
                  {col.val ? (
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  ) : (
                    <span className="text-[7.5px] font-extrabold text-[var(--color-text-muted)] opacity-40">{idx + 1}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tanda Tangan */}
        <div className="border-t border-[var(--color-border)]/60 pt-4 space-y-2">
          <button
            type="button"
            onClick={() => setShowSignature(!showSignature)}
            className="flex items-center justify-between w-full text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileSignature className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              {tp('printSigLabel')}
            </span>
            <span className={`w-4 h-4 rounded-xl flex items-center justify-center border transition-all ${showSignature ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`}>
              {showSignature && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
          </button>

          {showSignature && (
            <div className="grid grid-cols-2 gap-3 mt-3 p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                  {tp('printSigTitleLabel')}
                </label>
                <input
                  value={sigTitle}
                  onChange={e => setSigTitle(e.target.value)}
                  placeholder={tp('printSigTitlePlaceholder')}
                  className="w-full h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-wider text-[var(--color-text-muted)] block">
                  {tp('printSigNameLabel')}
                </label>
                <input
                  value={sigName}
                  onChange={e => setSigName(e.target.value)}
                  placeholder={tp('printSigNamePlaceholder')}
                  className="w-full h-8.5 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
