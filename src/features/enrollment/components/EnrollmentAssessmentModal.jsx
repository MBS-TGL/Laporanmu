import React, { useState, useEffect } from 'react'
import { Modal, RichSelect } from '@shared/components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookQuran, faClipboardCheck, faSave, faUser, faComments, faStar } from '@fortawesome/free-solid-svg-icons'
import { QURAN_LEVELS, TEST_SCORES } from '@features/enrollment/utils/enrollmentConstants'

function ScoreSlider({ label, value, onChange }) {
    const getLabel = (val) => {
        if (val <= 4) return 'Kurang'
        if (val <= 6) return 'Cukup'
        if (val <= 8) return 'Baik'
        return 'Mumtaz'
    }
    const getColor = (val) => {
        if (val <= 4) return 'text-rose-600 bg-rose-500/10 border border-rose-500/20'
        if (val <= 6) return 'text-amber-600 bg-amber-500/10 border border-amber-500/20'
        if (val <= 8) return 'text-sky-600 bg-sky-500/10 border border-sky-500/20'
        return 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20'
    }

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-60">
                <span>{label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getColor(value)}`}>
                    {value} · {getLabel(value)}
                </span>
            </div>
            <div className="flex items-center gap-3 h-10 px-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-alt)]/20 overflow-hidden focus-within:border-[var(--color-primary)] transition-all">
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="min-w-0 w-full flex-1 accent-[var(--color-primary)] h-1 rounded-lg cursor-pointer"
                />
            </div>
        </div>
    )
}

export default function EnrollmentAssessmentModal({ isOpen, onClose, onSubmit, enrollment, submitting }) {
    const [form, setForm] = useState({
        quran_level: 'belum',
        hafalan_quran: 0,
        test_score: '',
        interview: {
            akhlak: 7,
            kemandirian: 7,
            motivasi: 7,
            keislaman: 7,
            interviewer_name: '',
            notes: ''
        }
    })

    useEffect(() => {
        if (isOpen && enrollment) {
            setForm({
                quran_level: enrollment.quran_level || 'belum',
                hafalan_quran: enrollment.hafalan_quran || 0,
                test_score: enrollment.test_score || '',
                interview: enrollment.interview || {
                    akhlak: 7,
                    kemandirian: 7,
                    motivasi: 7,
                    keislaman: 7,
                    interviewer_name: '',
                    notes: ''
                }
            })
        }
    }, [isOpen, enrollment])

    if (!isOpen || !enrollment) return null

    const handleInterviewChange = (key, val) => {
        setForm(prev => ({
            ...prev,
            interview: {
                ...prev.interview,
                [key]: val
            }
        }))
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Penilaian Seleksi & Wawancara"
            description={`Masukkan hasil evaluasi komprehensif untuk: ${enrollment.name}`}
            icon={faClipboardCheck}
            size="xl"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-1">
                {/* Column 1: Quran & Kelulusan */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]/50">
                        <FontAwesomeIcon icon={faBookQuran} className="text-emerald-500 text-xs opacity-75" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Evaluasi Al-Qur'an & Seleksi</span>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Tingkat Bacaan Quran</label>
                        <RichSelect
                            value={form.quran_level}
                            onChange={v => setForm(prev => ({ ...prev, quran_level: v }))}
                            options={QURAN_LEVELS}
                            placeholder="Pilih tingkat bacaan..."
                            icon={faBookQuran}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Jumlah Hafalan (Juz)</label>
                        <div className="flex items-center gap-3 h-11 px-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface-alt)]/20 overflow-hidden focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
                            <input
                                type="range"
                                min="0"
                                max="30"
                                value={form.hafalan_quran}
                                onChange={e => setForm(prev => ({ ...prev, hafalan_quran: Number(e.target.value) }))}
                                className="min-w-0 w-full flex-1 accent-emerald-500 h-1 rounded-lg cursor-pointer"
                            />
                            <span className="text-sm font-black text-emerald-600 w-6 text-right tabular-nums shrink-0">{form.hafalan_quran}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Nilai Akhir Kelulusan</label>
                        <RichSelect
                            value={form.test_score}
                            onChange={v => setForm(prev => ({ ...prev, test_score: v }))}
                            options={TEST_SCORES}
                            placeholder="Pilih nilai tes..."
                            icon={faClipboardCheck}
                        />
                    </div>

                    {!form.test_score && (
                        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 px-3 py-2.5 rounded-xl text-xs flex items-start gap-2">
                            <span className="font-bold shrink-0 mt-0.5">Peringatan:</span>
                            <span className="opacity-80 leading-snug">Nilai akhir kelulusan wajib ditentukan agar dapat meluluskan pendaftar!</span>
                        </div>
                    )}
                </div>

                {/* Column 2: Wawancara Digital */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]/50">
                        <FontAwesomeIcon icon={faStar} className="text-indigo-500 text-xs opacity-75" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Skoring Aspek Kepribadian</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <ScoreSlider
                            label="Akhlak & Adab"
                            value={form.interview.akhlak}
                            onChange={v => handleInterviewChange('akhlak', v)}
                        />
                        <ScoreSlider
                            label="Kesiapan Mandiri"
                            value={form.interview.kemandirian}
                            onChange={v => handleInterviewChange('kemandirian', v)}
                        />
                        <ScoreSlider
                            label="Motivasi Belajar"
                            value={form.interview.motivasi}
                            onChange={v => handleInterviewChange('motivasi', v)}
                        />
                        <ScoreSlider
                            label="Pemahaman Islam"
                            value={form.interview.keislaman}
                            onChange={v => handleInterviewChange('keislaman', v)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Penguji / Pewawancara</label>
                        <div className="flex items-center gap-2 px-3 h-10 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                            <FontAwesomeIcon icon={faUser} className="text-[10px] text-[var(--color-text-muted)] opacity-40 shrink-0" />
                            <input
                                type="text"
                                value={form.interview.interviewer_name}
                                onChange={e => handleInterviewChange('interviewer_name', e.target.value)}
                                placeholder="Cth: Ustadz Faris"
                                className="w-full text-xs font-medium text-[var(--color-text)] outline-none bg-transparent"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider ml-1 opacity-50">Catatan Wawancara</label>
                        <div className="flex items-start gap-2 p-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] focus-within:border-[var(--color-primary)] transition-all">
                            <FontAwesomeIcon icon={faComments} className="text-[10px] text-[var(--color-text-muted)] opacity-40 shrink-0 mt-0.5" />
                            <textarea
                                value={form.interview.notes}
                                onChange={e => handleInterviewChange('notes', e.target.value)}
                                placeholder="Catatan khusus dari penguji mengenai kepribadian & kelayakan calon santri..."
                                rows={2}
                                className="w-full text-xs font-medium text-[var(--color-text)] outline-none bg-transparent resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                <button
                    onClick={onClose}
                    disabled={submitting}
                    className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 disabled:opacity-50"
                >
                    Batal
                </button>
                <button
                    onClick={() => onSubmit(form)}
                    disabled={!form.test_score || submitting}
                    className="h-10 px-6 sm:px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 border border-white/10 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? (
                        <>
                            <FontAwesomeIcon icon={faSave} className="fa-spin" />
                            <span>Menyimpan...</span>
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faSave} className="opacity-80 shrink-0" />
                            <span>Simpan & Luluskan</span>
                        </>
                    )}
                </button>
            </div>
        </Modal>
    )
}
