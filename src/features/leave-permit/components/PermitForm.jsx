import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, FileText, Smartphone, Pen, Image } from 'lucide-react'
import { FieldLabel, Input, DatePicker, TimePicker } from '@shared/components'
import StudentSearch from './StudentSearch'
import { PURPOSE_PRESETS } from '../utils/permitConstants'

export default function PermitForm({ onSubmit, loading, signatures = [], formId, onCanSubmitChange }) {
  const [student, setStudent] = useState(null)
  const [phone, setPhone] = useState('')
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [returnDateTouched, setReturnDateTouched] = useState(false)
  const [returnTime, setReturnTime] = useState('')
  const [signatureType, setSignatureType] = useState('manual')
  const [selectedSig, setSelectedSig] = useState(null)
  const [showPresets, setShowPresets] = useState(false)

  const returnBeforeLeave = !!leaveDate && !!returnDate && returnDate < leaveDate

  const canSubmit = student && destination.trim() && purpose.trim() && leaveDate && returnDate && returnTime && !returnBeforeLeave && !loading

  // Tanggal kembali ikut tanggal keluar selama belum diubah manual; tidak boleh lebih awal dari tanggal keluar
  const handleLeaveDateChange = (v) => {
    setLeaveDate(v)
    if (!returnDateTouched || (v && returnDate < v)) setReturnDate(v)
  }

  const handleReturnDateChange = (v) => {
    setReturnDate(v)
    setReturnDateTouched(true)
  }

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

    const returnDeadline = new Date(`${returnDate}T${returnTime}:00`).toISOString()

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
    setReturnDate(new Date().toISOString().slice(0, 10))
    setReturnDateTouched(false)
    setReturnTime('')
    setSignatureType('manual')
    setSelectedSig(null)
  }

  const segBtn = (active) =>
    `flex-1 h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${active
      ? 'bg-surface text-primary shadow-sm border border-primary/30'
      : 'text-text-muted hover:text-text border border-transparent'
    }`

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-3">

      {/* Baris 1: Santri (2/3) + Telepon (1/3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 min-w-0">
          <StudentSearch onSelect={handleStudentSelect} disabled={loading} />
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor="lp-phone">
            <Smartphone className="w-3 h-3" /> No. Telepon
          </FieldLabel>
          <Input
            id="lp-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nomor telepon"
            disabled={loading}
          />
        </div>
      </div>

      {/* Info santri terpilih: satu baris ringkas */}
      {student && (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center shrink-0 overflow-hidden border border-border">
            {student.photoUrl
              ? <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-primary">{student.name?.charAt(0)}</span>
            }
          </div>
          <p className="text-sm font-bold text-text truncate">{student.name}</p>
          <p className="text-xs text-text-muted truncate ml-auto text-right">
            {student.className} &middot; {student.dormName}
          </p>
        </div>
      )}

      {/* Baris 2: Tujuan + Keperluan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <FieldLabel htmlFor="lp-destination">
            <MapPin className="w-3 h-3" /> Tujuan *
          </FieldLabel>
          <Input
            id="lp-destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Rumah Orang Tua, Rumah Sakit…"
            disabled={loading}
          />
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor="lp-purpose">
            <FileText className="w-3 h-3" /> Keperluan *
          </FieldLabel>
          <Input
            id="lp-purpose"
            type="text"
            value={purpose}
            onChange={(e) => { setPurpose(e.target.value); setShowPresets(false) }}
            onFocus={() => setShowPresets(true)}
            placeholder="Pilih atau ketik keperluan…"
            disabled={loading}
          />
        </div>
        {showPresets && (
          <div className="sm:col-span-2 flex flex-wrap gap-1.5 -mt-1">
            {PURPOSE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => { setPurpose(preset); setShowPresets(false) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${purpose === preset
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-alt border-border text-text-muted hover:border-primary/50 hover:text-primary'
                  }`}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Baris 3: Tanggal keluar + Tanggal kembali + Jam kembali + Metode tanda tangan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="min-w-0">
          <FieldLabel>
            <Calendar className="w-3 h-3" /> Tanggal Keluar *
          </FieldLabel>
          <DatePicker value={leaveDate} onChange={handleLeaveDateChange} clearable={false} />
        </div>
        <div className="min-w-0">
          <FieldLabel>
            <Calendar className="w-3 h-3" /> Tanggal Kembali *
          </FieldLabel>
          <DatePicker value={returnDate} onChange={handleReturnDateChange} clearable={false} />
        </div>
        <div className="min-w-0">
          <FieldLabel>
            <Clock className="w-3 h-3" /> Jam Kembali *
          </FieldLabel>
          <TimePicker value={returnTime} onChange={setReturnTime} />
        </div>
        <div className="min-w-0">
          <FieldLabel>Tanda Tangan</FieldLabel>
          <div className="flex gap-1 p-1 rounded-lg bg-surface-alt border border-border">
            <button
              type="button"
              onClick={() => setSignatureType('manual')}
              className={segBtn(signatureType === 'manual')}
            >
              <Pen className="w-3.5 h-3.5" />
              Manual
            </button>
            <button
              type="button"
              onClick={() => setSignatureType('digital')}
              className={segBtn(signatureType === 'digital')}
            >
              <Image className="w-3.5 h-3.5" />
              Digital
            </button>
          </div>
        </div>
      </div>
      {returnBeforeLeave && (
        <p className="text-xs text-danger font-medium -mt-1">
          Tanggal kembali tidak boleh lebih awal dari tanggal keluar.
        </p>
      )}

      {/* Pilihan tanda tangan digital */}
      {signatureType === 'digital' && signatures.length > 0 && (
        <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-surface-alt">
          <p className="text-xs text-text-muted shrink-0">Pilih TTD aktif:</p>
          <div className="flex gap-2 flex-wrap">
            {signatures.map((sig) => (
              <button
                key={sig.id}
                type="button"
                onClick={() => setSelectedSig(sig)}
                className={`p-1 rounded-lg border-2 transition-colors ${selectedSig?.id === sig.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                <img src={sig.signature_url} alt="TTD" className="h-8 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
      {signatureType === 'digital' && signatures.length === 0 && (
        <p className="text-xs text-warning font-medium">
          Tidak ada tanda tangan digital aktif. Gunakan mode manual.
        </p>
      )}

      {/* Hidden submit button — actual trigger is the footer button via form= attribute */}
      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  )
}