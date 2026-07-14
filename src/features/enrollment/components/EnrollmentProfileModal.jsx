import React, { memo, useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faXmark, faPen, faTrash, faArrowRight, faArrowLeft,
    faUser, faMars, faVenus, faSchool, faBookQuran,
    faPhone, faMapMarkerAlt, faHeart, faCheckCircle,
    faXmarkCircle, faClipboardList, faGraduationCap,
    faTShirt, faCalendarDay, faUsers, faBoxArchive,
    faUserGraduate, faHistory, faClock, faSpinner, faStar, faMoneyBillWave, faBell
} from '@fortawesome/free-solid-svg-icons'
import { Modal } from '@shared/components'
import { supabase } from '@lib/supabase'
import {
    getStatusConfig, getQuranLevelConfig, getProgramLabel,
    getTestScoreConfig, formatEnrollmentDate, PIPELINE_STEPS,
    STATUS_CONFIG, REQUIRED_DOCUMENTS
} from '@features/enrollment/utils/enrollmentConstants'

function InfoRow({ icon, label, value, color = '' }) {
    if (!value && value !== 0) return null
    return (
        <div className="flex items-start gap-3 py-2 border-b border-[var(--color-border)]/30 last:border-0">
            <FontAwesomeIcon icon={icon} className={`text-[11px] mt-0.5 ${color || 'text-[var(--color-text-muted)] opacity-40'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">{label}</p>
                <p className="text-[12px] font-medium text-[var(--color-text)] mt-0.5">{value}</p>
            </div>
        </div>
    )
}

function EnrollmentProfileModal({ isOpen, onClose, enrollment, onEdit, onDelete, onStatusChange, onConvertToStudent, onUpdateNotes, onManagePayment, onUpdateOrientation, onSendOrientationNotification, canEdit = true }) {
    if (!enrollment) return null

    const {
        name, gender, registration_number, birth_place, birth_date, nisn,
        school_origin, previous_pesantren, phone, program, quran_level,
        hafalan_quran, health_notes, uniform_size, status, test_score,
        father_name, mother_name, father_phone, mother_phone, father_occupation,
        mother_occupation, address, created_at, wave_id, notes, documents
    } = enrollment

    // Orientation Schedule states
    const [isEditingOrientation, setIsEditingOrientation] = useState(false)
    const [orientationForm, setOrientationForm] = useState({
        date: '',
        time: '',
        location: '',
        notes: ''
    })
    const [savingOrientation, setSavingOrientation] = useState(false)
    const [sendingOrientationWa, setSendingOrientationWa] = useState(false)

    // Reset orientation form when enrollment changes
    useEffect(() => {
        setIsEditingOrientation(false)
        if (enrollment?.metadata?.orientation) {
            setOrientationForm({
                date: enrollment.metadata.orientation.date || '',
                time: enrollment.metadata.orientation.time || '',
                location: enrollment.metadata.orientation.location || '',
                notes: enrollment.metadata.orientation.notes || ''
            })
        } else {
            setOrientationForm({ date: '', time: '', location: '', notes: '' })
        }
    }, [enrollment?.id, isOpen])

    const statusCfg = getStatusConfig(status)
    const quranCfg = getQuranLevelConfig(quran_level)
    const testCfg = getTestScoreConfig(test_score)

    // Notes edit states
    const [isEditingNotes, setIsEditingNotes] = useState(false)
    const [notesText, setNotesText] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    // Reset notes state when enrollment changes
    useEffect(() => {
        setNotesText(notes || '')
        setIsEditingNotes(false)
    }, [enrollment?.id, notes, isOpen])

    // Audit logs state
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingLogs, setLoadingLogs] = useState(false)

    useEffect(() => {
        if (isOpen && enrollment?.id) {
            setLoadingLogs(true)
            supabase.from('audit_logs')
                .select('*')
                .eq('record_id', enrollment.id)
                .order('created_at', { ascending: false })
                .then(({ data, error }) => {
                    if (!error && data) {
                        setAuditLogs(data)
                    }
                    setLoadingLogs(false)
                })
        }
    }, [isOpen, enrollment?.id])

    // Next status based on current
    const getNextStatus = () => {
        if (status === 'mendaftar') return 'verifikasi'
        if (status === 'verifikasi') return 'tes'
        if (status === 'tes') return 'diterima'
        if (status === 'diterima') return 'daftar_ulang'
        return null
    }
    const nextStatus = getNextStatus()

    // Previous status based on current (for rollback support)
    const getPrevStatus = () => {
        if (status === 'verifikasi') return 'mendaftar'
        if (status === 'tes') return 'verifikasi'
        if (status === 'diterima' || status === 'ditolak') return 'tes'
        if (status === 'daftar_ulang') return 'diterima'
        return null
    }
    const prevStatus = getPrevStatus()

    const isConverted = enrollment.metadata?.converted_to_student?.status

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detail Pendaftar"
            description="Detail rincian berkas, identitas, dan data keluarga calon santri"
            icon={faUser}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                canEdit ? (
                    <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
                        {/* Secondary Actions grouped as Icon Buttons */}
                        <div className="flex items-center gap-1 bg-[var(--color-surface-alt)]/50 p-1 rounded-xl border border-[var(--color-border)] mr-auto">
                            <button onClick={() => onEdit(enrollment)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] shadow-sm transition-all" title="Edit Data">
                                <FontAwesomeIcon icon={faPen} className="text-[11px]" />
                            </button>
                            <button onClick={() => onManagePayment?.(enrollment)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-indigo-600 hover:bg-indigo-500/10 shadow-sm transition-all" title="Kelola Keuangan & Pembayaran">
                                <FontAwesomeIcon icon={faMoneyBillWave} className="text-[11px]" />
                            </button>
                            <button onClick={() => alert("Beralih ke pratinjau cetak Kartu Ujian (sedang dikembangkan)")} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-600 hover:bg-purple-500/10 shadow-sm transition-all" title="Cetak Kartu Ujian Seleksi">
                                <FontAwesomeIcon icon={faClipboardList} className="text-[11px]" />
                            </button>
                            <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                            <button onClick={() => onDelete(enrollment)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-600 hover:bg-amber-500/10 shadow-sm transition-all" title="Arsipkan Pendaftar">
                                <FontAwesomeIcon icon={faBoxArchive} className="text-[11px]" />
                            </button>
                        </div>

                        {/* Primary & Destructive Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {prevStatus && !isConverted && (
                                <button
                                    onClick={() => onStatusChange(enrollment, prevStatus)}
                                    className="h-10 px-3 sm:px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition-all flex items-center gap-2"
                                    title={`Kembali ke ${prevStatus}`}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                                    <span className="hidden sm:inline">Mundur</span>
                                </button>
                            )}

                            {status !== 'ditolak' && status !== 'diterima' && status !== 'daftar_ulang' && (
                                <button
                                    onClick={() => onStatusChange(enrollment, 'ditolak')}
                                    className="h-10 px-4 rounded-xl border border-rose-500/30 bg-rose-500/5 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faXmarkCircle} className="text-[10px]" /> Tolak
                                </button>
                            )}

                            {status === 'diterima' && !isConverted && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onConvertToStudent?.(enrollment);
                                    }}
                                    className="h-10 px-4 sm:px-5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-indigo-500/20 hover:shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faUserGraduate} className="text-[10px]" />
                                    <span className="hidden sm:inline">Konversi ke</span> Siswa
                                </button>
                            )}

                            {nextStatus && (
                                <button
                                    onClick={() => onStatusChange(enrollment, nextStatus)}
                                    className="h-10 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-[var(--color-primary)]/20 hover:shadow-lg transition-all flex items-center gap-2"
                                >
                                    {nextStatus === 'verifikasi' ? 'Verifikasi' : nextStatus === 'tes' ? 'Lanjut Tes' : nextStatus === 'diterima' ? 'Terima' : 'Daftar Ulang'}
                                    <FontAwesomeIcon icon={faArrowRight} className="text-[10px] opacity-80" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : null
            }
        >
            <div className="px-1">

                {/* Header Card */}
                <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-5 mb-5 relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start gap-4 relative z-10">
                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${gender === 'L'
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'bg-rose-500/10 text-rose-500'}`}>
                            {name?.charAt(0) || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-[var(--color-text)] leading-tight truncate">{name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-wider">{registration_number}</span>
                                <FontAwesomeIcon icon={gender === 'L' ? faMars : faVenus} className={`text-[9px] ${gender === 'L' ? 'text-blue-400' : 'text-pink-400'}`} />
                                {enrollment?.metadata?.is_waiting_list && status === 'diterima' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Waiting List
                                    </span>
                                ) : (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusCfg.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                        {statusCfg.label}
                                    </span>
                                )}
                                {enrollment?.metadata?.acceptance_confirmed && (status === 'diterima' || status === 'daftar_ulang') && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-fade-in">
                                        Bersedia Bergabung ✓
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Progress */}
                    <div className="flex items-center gap-1 mt-4 pt-4 border-t border-[var(--color-border)]/50">
                        {PIPELINE_STEPS.map((ps, i) => {
                            const currentStep = STATUS_CONFIG[status]?.step || 0
                            const isActive = ps.key === status
                            const isDone = STATUS_CONFIG[ps.key]?.step < currentStep
                            const isRejected = status === 'ditolak'

                            return (
                                <div key={ps.key} className="flex items-center flex-1">
                                    <div className={`flex-1 flex flex-col items-center gap-1 transition-all ${isRejected ? 'opacity-30' : ''}`}>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${isActive
                                            ? `${STATUS_CONFIG[ps.key]?.dot} text-white shadow-sm`
                                            : isDone
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                            {isDone ? <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" /> : i + 1}
                                        </div>
                                        <span className={`text-[8px] font-bold uppercase tracking-wider ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>
                                            {ps.label}
                                        </span>
                                    </div>
                                    {i < PIPELINE_STEPS.length - 1 && (
                                        <div className={`h-px flex-1 mx-1 ${isDone ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Rejected badge */}
                    {status === 'ditolak' && (
                        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            <FontAwesomeIcon icon={faXmarkCircle} className="text-rose-500 text-sm" />
                            <span className="text-[11px] font-bold text-rose-600">Pendaftar ditolak</span>
                        </div>
                    )}

                    {/* Converted badge */}
                    {isConverted && (
                        <div className="mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <FontAwesomeIcon icon={faUserGraduate} className="text-indigo-600 text-sm animate-pulse" />
                            <span className="text-[11px] font-black text-indigo-600">Telah Dikonversi ke Siswa Aktif</span>
                        </div>
                    )}
                </div>

                {/* Content Sections */}
                <div className="space-y-4">

                    {/* Identitas */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <FontAwesomeIcon icon={faUser} className="text-indigo-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Identitas</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faCalendarDay} label="Tempat, Tanggal Lahir" value={`${birth_place || '-'}, ${birth_date || '-'}`} />
                        <InfoRow icon={faGraduationCap} label="NISN" value={nisn} />
                        <InfoRow icon={faSchool} label="Asal Sekolah" value={school_origin} />
                        {previous_pesantren && <InfoRow icon={faSchool} label="Asal Pesantren" value={previous_pesantren} color="text-emerald-500" />}
                        <InfoRow icon={faClipboardList} label="Program" value={getProgramLabel(program)} color="text-indigo-500" />
                    </div>

                    {/* Al-Quran */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            <FontAwesomeIcon icon={faBookQuran} className="text-emerald-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kemampuan Al-Quran</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Bacaan</p>
                                {quranCfg ? (
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-[11px] font-bold ${quranCfg.color}`}>
                                        {quranCfg.name}
                                    </span>
                                ) : <span className="text-[12px] text-[var(--color-text-muted)]">-</span>}
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Hafalan</p>
                                <p className="text-xl font-black text-emerald-600 mt-0.5">{hafalan_quran || 0} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Juz</span></p>
                            </div>
                            {testCfg && (
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Hasil Tes</p>
                                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-[11px] font-bold ${testCfg.color}`}>
                                        {testCfg.name}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Keluarga */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-purple-500 rounded-full" />
                            <FontAwesomeIcon icon={faUsers} className="text-purple-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Data Keluarga</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faUser} label="Ayah" value={`${father_name || '-'}${father_occupation ? ` · ${father_occupation}` : ''}`} />
                        {father_phone && (
                            <div className="flex items-center justify-between group">
                                <div className="flex-1 min-w-0"><InfoRow icon={faPhone} label="HP Ayah" value={father_phone} color="text-emerald-500" /></div>
                                <a href={`https://wa.me/${father_phone.replace(/^0/, '62')}?text=Assalamu'alaikum%20Bapak%20${encodeURIComponent(father_name)},%0A%0ATerkait%20pendaftaran%20ananda%20${encodeURIComponent(name)}...`} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20 active:scale-95 transition-all ml-2">WA</a>
                            </div>
                        )}
                        <InfoRow icon={faUser} label="Ibu" value={`${mother_name || '-'}${mother_occupation ? ` · ${mother_occupation}` : ''}`} />
                        {mother_phone && (
                            <div className="flex items-center justify-between group">
                                <div className="flex-1 min-w-0"><InfoRow icon={faPhone} label="HP Ibu" value={mother_phone} color="text-emerald-500" /></div>
                                <a href={`https://wa.me/${mother_phone.replace(/^0/, '62')}?text=Assalamu'alaikum%20Ibu%20${encodeURIComponent(mother_name)},%0A%0ATerkait%20pendaftaran%20ananda%20${encodeURIComponent(name)}...`} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20 active:scale-95 transition-all ml-2">WA</a>
                            </div>
                        )}
                    </div>

                    {/* Status Keuangan & Pembayaran */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center justify-between pt-1 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                <FontAwesomeIcon icon={faMoneyBillWave} className="text-indigo-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Status Pembayaran & Keuangan</span>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => onManagePayment?.(enrollment)}
                                    className="px-2.5 py-1 rounded-lg border border-indigo-500/20 text-[9px] font-bold text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors flex items-center gap-1"
                                >
                                    <FontAwesomeIcon icon={faPen} className="text-[8px]" /> Kelola Keuangan
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { key: 'registration', label: '1. Pendaftaran', fee: enrollment.wave_metadata?.registration_fee || 0 },
                                { key: 'reregistration', label: '2. Daftar Ulang', fee: enrollment.wave_metadata?.reregistration_fee || 0 },
                                { key: 'equipment', label: '3. Perlengkapan', fee: enrollment.wave_metadata?.equipment_fee || 0 }
                            ].map((item) => {
                                const payMeta = enrollment.metadata?.payment?.[item.key] || {}
                                const status = payMeta.status || 'belum'
                                
                                return (
                                    <div key={item.key} className="p-3 border border-[var(--color-border)]/65 rounded-xl bg-[var(--color-surface-alt)]/25 flex flex-col justify-between min-h-[72px]">
                                        <div>
                                            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60 truncate">{item.label}</p>
                                            <p className="text-xs font-black text-[var(--color-text)] mt-0.5 tabular-nums">
                                                Rp{Number(item.fee).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <div className="mt-2.5">
                                            {status === 'lunas' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Lunas
                                                </span>
                                            )}
                                            {status === 'pending' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                                                </span>
                                            )}
                                            {status === 'belum' && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-border)]/40 opacity-70">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)]" /> Belum
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Tambahan */}
                    <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center gap-2.5 pt-1 mb-4">
                            <div className="w-1 h-4 bg-amber-500 rounded-full" />
                            <FontAwesomeIcon icon={faClipboardList} className="text-amber-500 text-[10px] opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Info Tambahan</span>
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                        </div>
                        <InfoRow icon={faMapMarkerAlt} label="Alamat" value={address} color="text-indigo-500" />
                        {phone ? (
                            <div className="flex items-center justify-between group">
                                <div className="flex-1 min-w-0"><InfoRow icon={faPhone} label="HP Utama" value={phone} color="text-emerald-500" /></div>
                                <a href={`https://wa.me/${phone.replace(/^0/, '62')}?text=Assalamu'alaikum%20Bapak/Ibu%20wali%20dari%20ananda%20${encodeURIComponent(name)},%0A%0ATerkait%20pendaftaran...`} target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 px-2.5 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20 active:scale-95 transition-all ml-2">WA</a>
                            </div>
                        ) : (
                            <InfoRow icon={faPhone} label="HP Utama" value={phone} color="text-emerald-500" />
                        )}
                        <InfoRow icon={faHeart} label="Riwayat Kesehatan" value={health_notes} color="text-rose-500" />
                        <InfoRow icon={faTShirt} label="Ukuran Seragam" value={uniform_size} />
                        <InfoRow icon={faCalendarDay} label="Tanggal Daftar" value={formatEnrollmentDate(created_at)} />

                        {/* Document Checklist Display */}
                        <div className="pt-3 mt-2 border-t border-[var(--color-border)]/50">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-2">Kelengkapan Dokumen</p>
                            <div className="flex flex-col gap-1.5">
                                {REQUIRED_DOCUMENTS.map(doc => {
                                    const isChecked = !!documents?.[doc.id]
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between text-[11px]">
                                            <span className="text-[var(--color-text)] opacity-80">{doc.name}</span>
                                            {isChecked ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                                                    <FontAwesomeIcon icon={faCheckCircle} /> Lengkap
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                                                    <FontAwesomeIcon icon={faXmarkCircle} /> Belum
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Jadwal Orientasi / MOS (Khusus Diterima / Daftar Ulang) */}
                    {(status === 'diterima' || status === 'daftar_ulang' || enrollment.metadata?.orientation) && (
                        <div className="bg-[var(--color-surface)] border border-indigo-500/10 bg-indigo-500/[0.01] shadow-sm rounded-2xl p-4 mt-4">
                            <div className="flex items-center justify-between pt-1 mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <FontAwesomeIcon icon={faCalendarDay} className="text-indigo-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Jadwal Orientasi / MOS</span>
                                </div>
                                {canEdit && !isEditingOrientation && (
                                    <button
                                        onClick={() => {
                                            setOrientationForm({
                                                date: enrollment.metadata?.orientation?.date || '',
                                                time: enrollment.metadata?.orientation?.time || '',
                                                location: enrollment.metadata?.orientation?.location || '',
                                                notes: enrollment.metadata?.orientation?.notes || ''
                                            })
                                            setIsEditingOrientation(true)
                                        }}
                                        className="px-2.5 py-1 rounded-lg border border-indigo-500/20 text-[9px] font-bold text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors flex items-center gap-1"
                                    >
                                        <FontAwesomeIcon icon={faPen} className="text-[8px]" /> {enrollment.metadata?.orientation ? 'Edit Jadwal' : 'Atur Jadwal'}
                                    </button>
                                )}
                            </div>

                            {isEditingOrientation ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tanggal Orientasi</label>
                                            <input
                                                type="date"
                                                value={orientationForm.date}
                                                onChange={(e) => setOrientationForm(prev => ({ ...prev, date: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Waktu / Jam</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 08:00 - Selesai"
                                                value={orientationForm.time}
                                                onChange={(e) => setOrientationForm(prev => ({ ...prev, time: e.target.value }))}
                                                className="w-full mt-1 px-3 py-2 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Lokasi / Tempat</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Aula Utama MBS Tanggul"
                                            value={orientationForm.location}
                                            onChange={(e) => setOrientationForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full mt-1 px-3 py-2 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Catatan Tambahan / Perlengkapan</label>
                                        <textarea
                                            placeholder="e.g. Membawa alat tulis, memakai seragam sekolah asal..."
                                            value={orientationForm.notes}
                                            onChange={(e) => setOrientationForm(prev => ({ ...prev, notes: e.target.value }))}
                                            rows={2}
                                            className="w-full mt-1 px-3 py-2 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:border-indigo-500 outline-none resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingOrientation(false)}
                                            disabled={savingOrientation}
                                            className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setSavingOrientation(true)
                                                const success = await onUpdateOrientation?.(enrollment, orientationForm)
                                                if (success) {
                                                    setIsEditingOrientation(false)
                                                }
                                                setSavingOrientation(false)
                                            }}
                                            disabled={savingOrientation}
                                            className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                        >
                                            {savingOrientation ? (
                                                <>
                                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                                    <span>Menyimpan...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faCheckCircle} />
                                                    <span>Simpan</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : enrollment.metadata?.orientation ? (
                                <div className="space-y-2.5">
                                    <div className="grid grid-cols-2 gap-4 bg-[var(--color-surface-alt)]/40 p-3 rounded-xl border border-[var(--color-border)]/50">
                                        <div>
                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Tanggal & Waktu</p>
                                            <p className="text-xs font-black text-[var(--color-text)] mt-1">
                                                {enrollment.metadata.orientation.date ? new Date(enrollment.metadata.orientation.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </p>
                                            <p className="text-[10px] font-bold text-indigo-600 mt-0.5">{enrollment.metadata.orientation.time || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Lokasi / Tempat</p>
                                            <p className="text-xs font-black text-[var(--color-text)] mt-1 truncate" title={enrollment.metadata.orientation.location}>
                                                {enrollment.metadata.orientation.location || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    {enrollment.metadata.orientation.notes && (
                                        <div className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                                            <span className="font-bold text-[var(--color-text)]">Catatan/Perlengkapan:</span> {enrollment.metadata.orientation.notes}
                                        </div>
                                    )}
                                    
                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]/40">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setSendingOrientationWa(true)
                                                await onSendOrientationNotification?.(enrollment)
                                                setSendingOrientationWa(false)
                                            }}
                                            disabled={sendingOrientationWa}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-sm shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                                        >
                                            {sendingOrientationWa ? (
                                                <>
                                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                                    <span>Mengirim...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FontAwesomeIcon icon={faBell} />
                                                    <span>Kirim Jadwal via WA</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-[11px] text-[var(--color-text-muted)] opacity-60 mb-2.5">Belum ada jadwal Orientasi / MOS yang diatur.</p>
                                    {canEdit && (
                                        <button
                                            onClick={() => {
                                                setOrientationForm({ date: '', time: '', location: '', notes: '' })
                                                setIsEditingOrientation(true)
                                            }}
                                            className="px-4 py-2 rounded-xl border border-dashed border-indigo-500/40 text-[10px] font-bold text-indigo-600 bg-indigo-500/[0.02] hover:bg-indigo-500/[0.06] hover:border-indigo-500/60 transition-all inline-flex items-center gap-1.5"
                                        >
                                            <FontAwesomeIcon icon={faCalendarDay} className="text-[9px]" /> Buat Jadwal Orientasi
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Wawancara & Seleksi */}
                    {enrollment.interview && (
                        <div className="bg-[var(--color-surface)] border border-indigo-500/10 bg-indigo-500/[0.01] shadow-sm rounded-2xl p-4 mt-4">
                            <div className="flex items-center justify-between pt-1 mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <FontAwesomeIcon icon={faStar} className="text-indigo-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Hasil Seleksi & Wawancara</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                                        Rata-rata: {((Number(enrollment.interview.akhlak || 0) + Number(enrollment.interview.kemandirian || 0) + Number(enrollment.interview.motivasi || 0) + Number(enrollment.interview.keislaman || 0)) / 4).toFixed(1)} / 10
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {[
                                    { label: 'Akhlak & Adab', val: enrollment.interview.akhlak },
                                    { label: 'Kesiapan Mandiri', val: enrollment.interview.kemandirian },
                                    { label: 'Motivasi Belajar', val: enrollment.interview.motivasi },
                                    { label: 'Pemahaman Islam', val: enrollment.interview.keislaman }
                                ].map((item, idx) => {
                                    const getColor = (v) => {
                                        if (v <= 4) return 'bg-rose-500'
                                        if (v <= 6) return 'bg-amber-500'
                                        if (v <= 8) return 'bg-sky-500'
                                        return 'bg-emerald-500'
                                    };
                                    return (
                                        <div key={idx} className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-xl p-2.5">
                                            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60 truncate">{item.label}</p>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-sm font-black text-[var(--color-text)]">{item.val || '-'}</span>
                                                <span className="text-[9px] font-bold text-[var(--color-text-muted)]">/10</span>
                                            </div>
                                            <div className="w-full bg-[var(--color-border)]/50 h-1 rounded-full overflow-hidden mt-1.5">
                                                <div className={`h-full ${getColor(item.val || 0)}`} style={{ width: `${(item.val || 0) * 10}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="space-y-2 border-t border-[var(--color-border)]/50 pt-3">
                                {enrollment.interview.interviewer_name && (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="font-bold text-[var(--color-text-muted)] w-24 shrink-0">Pewawancara:</span>
                                        <span className="text-[var(--color-text)] font-semibold">{enrollment.interview.interviewer_name}</span>
                                    </div>
                                )}
                                {enrollment.interview.notes && (
                                    <div className="flex gap-2 text-[11px] items-start">
                                        <span className="font-bold text-[var(--color-text-muted)] w-24 shrink-0 mt-0.5">Catatan Khusus:</span>
                                        <span className="text-[var(--color-text)] italic leading-relaxed">"{enrollment.interview.notes}"</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes Section */}
                    <div className="bg-[var(--color-surface)] border border-amber-500/20 bg-amber-500/[0.02] shadow-sm rounded-2xl p-4 mt-4">
                        <div className="flex items-center justify-between pt-1 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                <FontAwesomeIcon icon={faClipboardList} className="text-amber-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Catatan Internal Panitia</span>
                            </div>
                            {canEdit && !isEditingNotes && notes && (
                                <button
                                    onClick={() => {
                                        setNotesText(notes)
                                        setIsEditingNotes(true)
                                    }}
                                    className="px-2.5 py-1 rounded-lg border border-amber-500/20 text-[9px] font-bold text-amber-600 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
                                >
                                    <FontAwesomeIcon icon={faPen} className="text-[8px]" /> Edit Catatan
                                </button>
                            )}
                        </div>

                        {isEditingNotes ? (
                            <div className="space-y-3">
                                <textarea
                                    value={notesText}
                                    onChange={(e) => setNotesText(e.target.value)}
                                    placeholder="Tulis instruksi khusus, catatan wawancara, atau informasi internal santri ini..."
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 text-xs font-medium text-[var(--color-text)] bg-[var(--color-surface)] border border-amber-500/30 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all outline-none resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingNotes(false)}
                                        disabled={savingNotes}
                                        className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setSavingNotes(true)
                                            const success = await onUpdateNotes?.(enrollment, notesText)
                                            if (success) {
                                                setIsEditingNotes(false)
                                            }
                                            setSavingNotes(false)
                                        }}
                                        disabled={savingNotes}
                                        className="h-8 px-4 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                    >
                                        {savingNotes ? (
                                            <>
                                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                                <span>Menyimpan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FontAwesomeIcon icon={faCheckCircle} />
                                                <span>Simpan</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : notes ? (
                            <p className="text-[12px] text-[var(--color-text)] whitespace-pre-line leading-relaxed">{notes}</p>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] opacity-60 mb-2.5">Belum ada catatan internal untuk pendaftar ini.</p>
                                {canEdit && (
                                    <button
                                        onClick={() => setIsEditingNotes(true)}
                                        className="px-4 py-2 rounded-xl border border-dashed border-amber-500/40 text-[10px] font-bold text-amber-600 bg-amber-500/[0.02] hover:bg-amber-500/[0.06] hover:border-amber-500/60 transition-all inline-flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faClipboardList} className="text-[9px]" /> Tambah Catatan Internal
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Activity Log / Status History */}
                    {enrollment.metadata?.history?.length > 0 && (
                        <div className="bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] rounded-2xl p-4 mt-4">
                            <div className="flex items-center gap-2.5 pt-1 mb-4">
                                <div className="w-1 h-4 bg-sky-500 rounded-full" />
                                <FontAwesomeIcon icon={faHistory} className="text-sky-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Riwayat Aktivitas Status</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>
                            <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-[2px] before:bg-gradient-to-b before:from-[var(--color-border)] before:to-transparent">
                                {enrollment.metadata.history.map((log, i) => {
                                    const fromCfg = getStatusConfig(log.from) || { label: log.from }
                                    const toCfg = getStatusConfig(log.to) || { label: log.to }
                                    return (
                                        <div key={i} className="relative flex items-start gap-3.5 group">
                                            {/* Dot indicator */}
                                            <div className="w-4 h-4 mt-1.5 rounded-full border-[3px] border-[var(--color-surface)] bg-sky-500 shrink-0 z-10 shadow-sm ring-1 ring-sky-500/20" />
                                            
                                            {/* Card content */}
                                            <div className="flex-1 min-w-0 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface)] transition-colors shadow-sm">
                                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 truncate">Perubahan Status</span>
                                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] flex items-center gap-1 opacity-70 shrink-0">
                                                        <FontAwesomeIcon icon={faClock} />
                                                        {new Date(log.timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                                    Status diubah dari <span className="font-bold text-[var(--color-text)]">{fromCfg.label}</span> menjadi <span className="font-bold text-emerald-500">{toCfg.label}</span> oleh <span className="font-bold text-[var(--color-text)]">{log.by}</span>.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}

export default memo(EnrollmentProfileModal)
