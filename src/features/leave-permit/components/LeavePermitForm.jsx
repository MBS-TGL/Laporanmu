import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, FileText, Smartphone, Pen, Image } from 'lucide-react'
import RichDatePicker from '@shared/components/RichDatePicker'
import RichTimePicker from '@shared/components/RichTimePicker'
import StudentSearch from './StudentSearch'
import { PURPOSE_PRESETS } from '../utils/leavePermitConstants'

export default function LeavePermitForm({ onSubmit, loading, signatures = [], formId, onCanSubmitChange }) {
  const [student, setStudent] = useState(null)
  const [phone, setPhone] = useState('')
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [returnTime, setReturnTime] = useState('')
  const [signatureType, setSignatureType] = useState('manual')
  const [selectedSig, setSelectedSig] = useState(null)
  const [showPresets, setShowPresets] = useState(false)

  const canSubmit = student && destination.trim() && purpose.trim() && leaveDate && returnTime && !loading

  // Notify parent whenever canSubmit changes (for footer button disabled state)
  useEffect(() => {
    onCanSubmitChange?.(canSubmit)
  }, [canSubmit])

  const handleStudentSelect = (s) => {
    setStudent(s)
    if (s?.phone) setPhone(s.phone)
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!canSubmit) return

    const returnDeadline = new Date(`${leaveDate}T${returnTime}:00`).toISOString()

    onSubmit({
      studentId: student.id,
      phone,
      destination: destination.trim(),
      purpose: purpose.trim(),
      leaveDate,
      returnDeadline,
      signatureType,
      signatureId: signatureType === 'digital' ? selectedSig?.id : null,
    })

    // Reset form
    setStudent(null)
    setPhone('')
    setDestination('')
    setPurpose('')
    setLeaveDate(new Date().toISOString().slice(0, 10))
    setReturnTime('')
    setSignatureType('manual')
    setSelectedSig(null)
  }

  const inputCls = () =>
    'w-full h-10 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all'

  const labelCls = 'text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70 mb-1.5 flex items-center gap-1.5'

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">

      {/* Student Search */}
      <StudentSearch onSelect={handleStudentSelect} disabled={loading} />

      {/* Student Info (if selected) */}
      {student && (
        <div className="p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--color-border)]">
              {student.photoUrl
                ? <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-black text-[var(--color-primary)]">{student.name?.charAt(0)}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black text-[var(--color-text)] truncate">{student.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {student.className} &middot; {student.dormName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Phone */}
      <div>
        <label className={labelCls}>
          <Smartphone className="w-3 h-3" /> No. Telepon
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Nomor telepon santri"
          disabled={loading}
          className={inputCls()}
        />
      </div>

      {/* Destination */}
      <div>
        <label className={labelCls}>
          <MapPin className="w-3 h-3" /> Tujuan *
        </label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Contoh: Rumah Orang Tua, Rumah Sakit"
          disabled={loading}
          className={inputCls()}
        />
      </div>

      {/* Purpose */}
      <div>
        <label className={labelCls}>
          <FileText className="w-3 h-3" /> Keperluan *
        </label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => { setPurpose(e.target.value); setShowPresets(false) }}
          onFocus={() => setShowPresets(true)}
          placeholder="Pilih atau ketik keperluan..."
          disabled={loading}
          className={inputCls()}
        />
        {showPresets && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PURPOSE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setPurpose(preset); setShowPresets(false) }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                  purpose === preset
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            <Calendar className="w-3 h-3" /> Tanggal Keluar *
          </label>
          <RichDatePicker value={leaveDate} onChange={setLeaveDate} clearable={false} />
        </div>
        <div>
          <label className={labelCls}>
            <Clock className="w-3 h-3" /> Batas Waktu Kembali *
          </label>
          <RichTimePicker value={returnTime} onChange={setReturnTime} />
        </div>
      </div>

      {/* Signature Method */}
      <div>
        <label className={`${labelCls} mb-2`}>
          Metode Tanda Tangan
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSignatureType('manual')}
            className={`flex-1 h-10 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 border transition-all ${
              signatureType === 'manual'
                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Manual
          </button>
          <button
            type="button"
            onClick={() => setSignatureType('digital')}
            className={`flex-1 h-10 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 border transition-all ${
              signatureType === 'digital'
                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Digital
          </button>
        </div>
        {signatureType === 'digital' && signatures.length > 0 && (
          <div className="mt-2 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5">Pilih tanda tangan aktif:</p>
            <div className="flex gap-2 flex-wrap">
              {signatures.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  onClick={() => setSelectedSig(sig)}
                  className={`p-1 rounded-lg border-2 transition-all ${
                    selectedSig?.id === sig.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <img src={sig.signature_url} alt="TTD" className="h-10 object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}
        {signatureType === 'digital' && signatures.length === 0 && (
          <p className="text-[10px] text-amber-600 mt-1.5 font-medium">
            Tidak ada tanda tangan digital aktif. Gunakan mode manual.
          </p>
        )}
      </div>

      {/* Hidden submit button — actual trigger is the footer button via form= attribute */}
      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  )
}
