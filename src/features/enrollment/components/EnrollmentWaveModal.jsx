import React, { useState, memo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faWaveSquare, faPlus, faCalendarAlt, faUsers,
    faToggleOn, faToggleOff, faPen, faCheckCircle, faSpinner, faSave, faTimes, faChevronRight,
    faTrash, faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@shared/components'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

const inputClass = "w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none"

function EnrollmentWaveModal({ isOpen, onClose, waves = [], addToast, onRefresh }) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingWave, setEditingWave] = useState(null)
    const [waveToDelete, setWaveToDelete] = useState(null)
    const [form, setForm] = useState({
        name: '',
        academic_year: '2026/2027',
        start_date: '',
        end_date: '',
        quota: 40,
        registration_fee: 0,
        reregistration_fee: 0,
        equipment_fee: 0
    })
    const [touched, setTouched] = useState({})
    const [submitting, setSubmitting] = useState(false)

    const setField = useCallback((key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const handleAdd = useCallback(async () => {
        setTouched({ name: true, start_date: true, end_date: true })
        if (!form.name.trim() || !form.start_date || !form.end_date) {
            addToast?.('Nama, tanggal buka, dan tanggal tutup wajib diisi', 'warning')
            return
        }
        
        setSubmitting(true)
        try {
            const isEdit = !!editingWave
            const payload = {
                name: form.name,
                academic_year: form.academic_year,
                start_date: form.start_date,
                end_date: form.end_date,
                quota: form.quota !== '' ? Number(form.quota) : null,
                metadata: {
                    ...(isEdit ? (editingWave.metadata || {}) : {}),
                    registration_fee: form.registration_fee ? Number(form.registration_fee) : 0,
                    reregistration_fee: form.reregistration_fee ? Number(form.reregistration_fee) : 0,
                    equipment_fee: form.equipment_fee ? Number(form.equipment_fee) : 0,
                }
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('enrollment_waves')
                    .update(payload)
                    .eq('id', editingWave.id)
                if (error) throw error

                await logAudit({
                    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollment_waves', recordId: editingWave.id,
                    oldData: editingWave,
                    newData: { ...editingWave, ...payload }
                })

                addToast?.(`Gelombang "${form.name}" berhasil diperbarui`, 'success')
            } else {
                payload.is_active = false
                const { error } = await supabase
                    .from('enrollment_waves')
                    .insert([payload])
                if (error) throw error

                await logAudit({
                    action: 'INSERT', source: 'OPERATIONAL', tableName: 'enrollment_waves',
                    newData: payload
                })

                addToast?.(`Gelombang "${form.name}" berhasil ditambahkan`, 'success')
            }

            setForm({ name: '', academic_year: '2026/2027', start_date: '', end_date: '', quota: 40, registration_fee: 0, reregistration_fee: 0, equipment_fee: 0 })
            setIsAdding(false)
            setEditingWave(null)
            setTouched({})
            onRefresh?.()
        } catch (err) {
            console.error('[EnrollmentWaveModal] Error saving wave:', err)
            addToast?.('Gagal menyimpan gelombang', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [form, editingWave, addToast, onRefresh])

    const handleEditClick = useCallback((wave) => {
        setEditingWave(wave)
        setIsAdding(false) // Tutup form tambah baru jika terbuka
        setForm({
            name: wave.name || '',
            academic_year: wave.academic_year || '2026/2027',
            start_date: wave.start_date || '',
            end_date: wave.end_date || '',
            quota: wave.quota ?? '',
            registration_fee: wave.metadata?.registration_fee || 0,
            reregistration_fee: wave.metadata?.reregistration_fee || 0,
            equipment_fee: wave.metadata?.equipment_fee || 0
        })
    }, [])

    const handleDeleteClick = useCallback((wave) => {
        setWaveToDelete(wave)
    }, [])

    const executeDelete = useCallback(async () => {
        if (!waveToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('enrollment_waves')
                .delete()
                .eq('id', waveToDelete.id)
            if (error) throw error

            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'enrollment_waves', recordId: waveToDelete.id,
                oldData: waveToDelete
            })

            addToast?.(`Gelombang "${waveToDelete.name}" berhasil dihapus`, 'success')
            setWaveToDelete(null)
            onRefresh?.()
        } catch (err) {
            console.error('[EnrollmentWaveModal] Error deleting wave:', err)
            addToast?.('Gagal menghapus gelombang', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [waveToDelete, addToast, onRefresh])

    const toggleActive = useCallback(async (wave) => {
        const nextActiveState = !wave.is_active
        try {
            if (nextActiveState) {
                const { error: err1 } = await supabase
                    .from('enrollment_waves')
                    .update({ is_active: false })
                    .neq('id', wave.id)
                if (err1) throw err1

                const { error: err2 } = await supabase
                    .from('enrollment_waves')
                    .update({ is_active: true })
                    .eq('id', wave.id)
                if (err2) throw err2
            } else {
                const { error } = await supabase
                    .from('enrollment_waves')
                    .update({ is_active: false })
                    .eq('id', wave.id)
                if (error) throw error
            }

            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'enrollment_waves', recordId: wave.id,
                newData: { ...wave, is_active: nextActiveState }
            })

            addToast?.(`Gelombang "${wave.name}" berhasil ${nextActiveState ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
            onRefresh?.()
        } catch (err) {
            console.error('[EnrollmentWaveModal] Error toggling active:', err)
            addToast?.('Gagal mengubah status aktif gelombang', 'error')
        }
    }, [addToast, onRefresh])

    const handleCloseForm = useCallback(() => {
        setIsAdding(false)
        setEditingWave(null)
        setForm({ name: '', academic_year: '2026/2027', start_date: '', end_date: '', quota: 40, registration_fee: 0, reregistration_fee: 0, equipment_fee: 0 })
        setTouched({})
    }, [])

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manajemen Gelombang"
            description="Atur periode pendaftaran, kuota, dan status gelombang masuk santri baru"
            icon={faWaveSquare}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">
                        {waves.length} Gelombang Terdaftar
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Tutup
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Wave List */}
                <div className="grid grid-cols-1 gap-3">
                    {waves.map(wave => {
                        const isExpired = new Date(wave.end_date) < new Date()
                        const isActive = wave.is_active && !isExpired
                        const isEditingThis = editingWave?.id === wave.id
                        
                        if (isEditingThis) {
                            // Render Form Edit Inline langsung di posisi kartu gelombang ini!
                            return (
                                <div
                                    key={wave.id}
                                    className="rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.01] p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200"
                                >
                                    <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                                            Edit Gelombang: {wave.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCloseForm}
                                            className="p-1 text-[var(--color-text-muted)] hover:text-rose-500 rounded-lg transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2 relative group">
                                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Gelombang</label>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={e => setField('name', e.target.value)}
                                                placeholder="Cth: Gelombang 3"
                                                className={`w-full px-3.5 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                                ${touched.name && !form.name.trim() ? 'border-rose-500/50 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Buka</label>
                                            <div className="relative h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                                                <div className={`absolute inset-0 flex items-center pl-3.5 pointer-events-none text-[13px] ${form.start_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                                    {form.start_date ? (() => {
                                                        const parts = form.start_date.split('-')
                                                        if (parts.length === 3) {
                                                            const [y, m, d] = parts
                                                            return `${d}/${m}/${y}`
                                                        }
                                                        return form.start_date
                                                    })() : 'dd/mm/yyyy'}
                                                </div>
                                                <input
                                                    type="date"
                                                    value={form.start_date}
                                                    onChange={e => setField('start_date', e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Tutup</label>
                                            <div className="relative h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                                                <div className={`absolute inset-0 flex items-center pl-3.5 pointer-events-none text-[13px] ${form.end_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                                    {form.end_date ? (() => {
                                                        const parts = form.end_date.split('-')
                                                        if (parts.length === 3) {
                                                            const [y, m, d] = parts
                                                            return `${d}/${m}/${y}`
                                                        }
                                                        return form.end_date
                                                    })() : 'dd/mm/yyyy'}
                                                </div>
                                                <input
                                                    type="date"
                                                    value={form.end_date}
                                                    onChange={e => setField('end_date', e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kuota Penerimaan</label>
                                            <input
                                                type="number"
                                                value={form.quota}
                                                onChange={e => setField('quota', e.target.value !== '' ? Number(e.target.value) : '')}
                                                placeholder="Kosongkan jika Tanpa Batas"
                                                className="w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-sm text-[var(--color-text)] transition-all"
                                                min={1}
                                            />
                                        </div>
                                        <div className="relative group">
                                            <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tahun Pelajaran</label>
                                            <input
                                                type="text"
                                                value={form.academic_year}
                                                onChange={e => setField('academic_year', e.target.value)}
                                                className="w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-sm text-[var(--color-text)] transition-all"
                                            />
                                        </div>

                                        {/* Biaya Section */}
                                        <div className="sm:col-span-2 p-3.5 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-alt)]/30 space-y-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faMoneyBillWave} className="opacity-60 text-[10px]" />
                                                Biaya Gelombang (Opsional)
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="relative group">
                                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pendaftaran Awal</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={form.registration_fee || ''}
                                                            onChange={e => setField('registration_fee', e.target.value ? Number(e.target.value) : 0)}
                                                            placeholder="0"
                                                            className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                            min={0}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="relative group">
                                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Daftar Ulang</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={form.reregistration_fee || ''}
                                                            onChange={e => setField('reregistration_fee', e.target.value ? Number(e.target.value) : 0)}
                                                            placeholder="0"
                                                            className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                            min={0}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="relative group">
                                                    <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Perlengkapan</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={form.equipment_fee || ''}
                                                            onChange={e => setField('equipment_fee', e.target.value ? Number(e.target.value) : 0)}
                                                            placeholder="0"
                                                            className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                            min={0}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]/50">
                                        <button
                                            type="button"
                                            onClick={handleCloseForm}
                                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAdd}
                                            disabled={submitting}
                                            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 border border-white/10"
                                        >
                                            {submitting ? (
                                                <>
                                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                                    <span>Menyimpan...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faSave} className="text-[10px]" />
                                                    <span>Simpan Perubahan</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        // Render Card Gelombang biasa (read-only)
                        return (
                            <div
                                key={wave.id}
                                className={`rounded-2xl border p-4 transition-all duration-300 relative overflow-hidden group ${isActive
                                    ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]/20'}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive
                                                ? 'bg-emerald-500/10 text-emerald-600'
                                                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] opacity-60'}`}
                                        >
                                            <FontAwesomeIcon icon={faWaveSquare} className="text-sm" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-bold text-[var(--color-text)]">{wave.name}</p>
                                                {isActive ? (
                                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-lg bg-[var(--color-border)] text-[var(--color-text-muted)] text-[8px] font-black uppercase tracking-widest border border-[var(--color-border)] opacity-60">
                                                        Selesai
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-medium">
                                                Tahun Pelajaran {wave.academic_year} · Kuota: <span className="font-bold text-[var(--color-text)]">{wave.quota ? `${wave.quota} santri` : 'Tanpa Batas'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleEditClick(wave)}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-all"
                                            title="Edit Gelombang"
                                        >
                                            <FontAwesomeIcon icon={faPen} className="text-xs" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteClick(wave)}
                                            className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                            title="Hapus Gelombang"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleActive(wave)}
                                            className={`p-2 rounded-xl transition-all relative ${wave.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                            title={wave.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        >
                                            <FontAwesomeIcon icon={wave.is_active ? faToggleOn : faToggleOff} className="text-xl" />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 mt-3.5 pt-3 border-t border-[var(--color-border)]/50">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="opacity-40" />
                                        <span>
                                            {new Date(wave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            {" – "}
                                            {new Date(wave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    
                                    {/* Fees display if exists */}
                                    {wave.metadata && (Number(wave.metadata.registration_fee) > 0 || Number(wave.metadata.reregistration_fee) > 0 || Number(wave.metadata.equipment_fee) > 0) && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-alt)]/40 p-2 rounded-xl border border-[var(--color-border)]/50">
                                            {Number(wave.metadata.registration_fee) > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="opacity-60">Daftar:</span>
                                                    <span className="font-bold text-indigo-500">Rp{Number(wave.metadata.registration_fee).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            {Number(wave.metadata.reregistration_fee) > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="opacity-60">Daftar Ulang:</span>
                                                    <span className="font-bold text-emerald-500">Rp{Number(wave.metadata.reregistration_fee).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                            {Number(wave.metadata.equipment_fee) > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="opacity-60">Perlengkapan:</span>
                                                    <span className="font-bold text-amber-500">Rp{Number(wave.metadata.equipment_fee).toLocaleString('id-ID')}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Add Form / Toggle Button */}
                {isAdding && !editingWave ? (
                    <div className="border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/[0.01] rounded-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                                Tambah Gelombang Baru
                            </span>
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="p-1 text-[var(--color-text-muted)] hover:text-rose-500 rounded-lg transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xs" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Nama Gelombang</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    placeholder="Cth: Gelombang 3"
                                    className={`w-full px-3.5 h-11 rounded-xl border bg-[var(--color-surface)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 
                                    ${touched.name && !form.name.trim() ? 'border-rose-500/50 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'}`}
                                />
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Buka</label>
                                <div className="relative h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                                    <div className={`absolute inset-0 flex items-center pl-3.5 pointer-events-none text-[13px] ${form.start_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                        {form.start_date ? (() => {
                                            const parts = form.start_date.split('-')
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts
                                                return `${d}/${m}/${y}`
                                            }
                                            return form.start_date
                                        })() : 'dd/mm/yyyy'}
                                    </div>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={e => setField('start_date', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tanggal Tutup</label>
                                <div className="relative h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                                    <div className={`absolute inset-0 flex items-center pl-3.5 pointer-events-none text-[13px] ${form.end_date ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-40'}`}>
                                        {form.end_date ? (() => {
                                            const parts = form.end_date.split('-')
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts
                                                return `${d}/${m}/${y}`
                                            }
                                            return form.end_date
                                        })() : 'dd/mm/yyyy'}
                                    </div>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        onChange={e => setField('end_date', e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none bg-transparent date-input-hidden z-10"
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Kuota Penerimaan</label>
                                <input
                                    type="number"
                                    value={form.quota}
                                    onChange={e => setField('quota', e.target.value !== '' ? Number(e.target.value) : '')}
                                    placeholder="Kosongkan jika Tanpa Batas"
                                    className="w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-sm text-[var(--color-text)] transition-all"
                                    min={1}
                                />
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Tahun Pelajaran</label>
                                <input
                                    type="text"
                                    value={form.academic_year}
                                    onChange={e => setField('academic_year', e.target.value)}
                                    className="w-full px-3.5 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-sm text-[var(--color-text)] transition-all"
                                />
                            </div>

                            {/* Biaya Section */}
                            <div className="sm:col-span-2 p-3.5 border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-alt)]/30 space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faMoneyBillWave} className="opacity-60 text-[10px]" />
                                    Biaya Gelombang (Opsional)
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Pendaftaran Awal</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                            <input
                                                type="number"
                                                value={form.registration_fee || ''}
                                                onChange={e => setField('registration_fee', e.target.value ? Number(e.target.value) : 0)}
                                                placeholder="0"
                                                className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Daftar Ulang</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                            <input
                                                type="number"
                                                value={form.reregistration_fee || ''}
                                                onChange={e => setField('reregistration_fee', e.target.value ? Number(e.target.value) : 0)}
                                                placeholder="0"
                                                className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 mb-1 block opacity-50">Perlengkapan</label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-muted)] opacity-50">Rp</span>
                                            <input
                                                type="number"
                                                value={form.equipment_fee || ''}
                                                onChange={e => setField('equipment_fee', e.target.value ? Number(e.target.value) : 0)}
                                                placeholder="0"
                                                className="w-full pl-9 pr-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] outline-none text-xs font-medium text-[var(--color-text)] transition-all"
                                                min={0}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]/50">
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-black uppercase tracking-wider transition-all"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleAdd}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 border border-white/10"
                            >
                                {submitting ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSave} className="text-[10px]" />
                                        <span>Simpan Gelombang</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    // Tampilkan tombol "+ Tambah Gelombang" hanya jika kita TIDAK sedang melakukan inline editing
                    !editingWave && (
                        <button
                            type="button"
                            onClick={() => setIsAdding(true)}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/[0.02] transition-all flex items-center justify-center gap-2 group"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-xs group-hover:scale-110 transition-transform" />
                            <span>Tambah Gelombang</span>
                        </button>
                    )
                )}
            </div>

            {/* Custom confirmation Modal instead of native window.confirm */}
            <Modal
                isOpen={!!waveToDelete}
                onClose={() => setWaveToDelete(null)}
                title="Konfirmasi Hapus"
                description="Gelombang pendaftaran akan dihapus permanen"
                icon={faTrash}
                iconBg="bg-rose-500/10"
                iconColor="text-rose-600"
                size="sm"
                mobileVariant="bottom-sheet"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button
                            type="button"
                            onClick={() => setWaveToDelete(null)}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                            Batal
                        </button>
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={executeDelete}
                            disabled={submitting}
                            className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                        >
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[11px]" />
                            ) : (
                                <FontAwesomeIcon icon={faTrash} className="text-[11px] opacity-70" />
                            )}
                            <span>Hapus</span>
                        </button>
                    </div>
                }
            >
                <div className="px-1">
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        Gelombang <span className="text-rose-600 font-black px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">{waveToDelete?.name}</span> akan dihapus secara permanen. Pastikan tidak ada pendaftar yang masih aktif di gelombang ini.
                    </p>
                </div>
            </Modal>
        </Modal>
    )
}

export default memo(EnrollmentWaveModal)
