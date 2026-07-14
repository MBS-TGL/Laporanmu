import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faIdCard, faMars, faEdit, faPhone, faEnvelope,
    faHistory, faChartLine, faClockRotateLeft,
    faChalkboardTeacher, faCalendarAlt, faMapMarkerAlt,
    faInfoCircle, faBolt, faPlus, faMinus,
    faCopy, faNoteSticky, faBriefcase, faFingerprint,
    faCalendarCheck, faCheckCircle, faGraduationCap, faBook
} from '@fortawesome/free-solid-svg-icons'
import { Modal, StatCard, EmptyState, AuditTimeline } from '@shared/components'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const STATUS_CONFIG = {
    active: { label: 'Aktif', color: 'bg-emerald-500 text-white border-white/20' },
    inactive: { label: 'Nonaktif', color: 'bg-rose-500 text-white border-white/20' },
    leave: { label: 'Cuti', color: 'bg-amber-500 text-white border-white/20' }
}

export default memo(function TeacherProfileModal({
    isOpen, onClose, selectedTeacher,
    loadingProfile, profileStats, profileReports = [],
    profileTab, setProfileTab,
    canEdit, handleEdit, addToast, fetchData
}) {
    if (!isOpen || !selectedTeacher) return null

    const copyToClipboard = async (text, label) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            addToast(`${label} berhasil disalin`, 'success')
        } catch (err) {
            addToast('Gagal menyalin ke clipboard', 'error')
        }
    }

    const InfoRow = ({ label, value }) => (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest opacity-80">
                {label}
            </p>
            <p className="text-[12px] font-bold text-[var(--color-text)] truncate">{value || '-'}</p>
        </div>
    )

    const workDaysMap = {
        'Senin': 'Sn', 'Selasa': 'Sl', 'Rabu': 'Rb', 'Kamis': 'Km', 'Jumat': 'Jm', 'Sabtu': 'Sb'
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Profil Guru & Karyawan"
            description="Detail informasi kepegawaian, jadwal kerja, statistik performa, dan jejak aktivitas."
            icon={faChalkboardTeacher}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="lg"
            mobileVariant="bottom-sheet"
            contentClassName="!pb-4"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onClose} className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                        Tutup
                    </button>
                    <div className="flex-1" />
                    {canEdit && (
                        <button
                            onClick={() => {
                                onClose();
                                handleEdit(selectedTeacher);
                            }}
                            className="h-10 px-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                            <FontAwesomeIcon icon={faEdit} className="opacity-70" /> Edit Data Guru
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* ── Header Profile Card ── */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white shadow-xl">
                    <div className="relative flex items-center gap-5">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center text-2xl font-black overflow-hidden shadow-lg">
                                {selectedTeacher.avatar_url || selectedTeacher.photo_url ? (
                                    <img src={selectedTeacher.avatar_url || selectedTeacher.photo_url} className="w-full h-full object-cover rounded-lg" alt="" />
                                ) : (
                                    <span>{selectedTeacher.name?.charAt(0) || '?'}</span>
                                )}
                            </div>
                            <div className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[8px] font-black shadow-lg border border-white/20 ${STATUS_CONFIG[selectedTeacher.status]?.color || 'bg-slate-500 text-white'}`}>
                                {STATUS_CONFIG[selectedTeacher.status]?.label || selectedTeacher.status}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-black tracking-tight truncate mb-1">
                                {selectedTeacher.name}
                            </h2>
                            <div className="flex flex-wrap gap-3 items-center text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faIdCard} className="text-indigo-400" /> {selectedTeacher.nbm || 'Tanpa NBM'}</span>
                                <span className="w-1 h-1 rounded-full bg-white/30" />
                                <span className="flex items-center gap-1.5"><FontAwesomeIcon icon={faBriefcase} className="text-indigo-400" /> {selectedTeacher.type === 'guru' ? 'Guru' : 'Karyawan'}</span>
                                {selectedTeacher.subject && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/30" />
                                        <span className="flex items-center gap-1.5 text-emerald-300"><FontAwesomeIcon icon={faChalkboardTeacher} /> {selectedTeacher.subject}</span>
                                    </>
                                )}
                            </div>

                            {/* Work Days display */}

                        </div>

                        {profileStats && (
                            <div className="shrink-0 text-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Poin</p>
                                <p className={`text-2xl font-black ${profileStats.totalPts >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {profileStats.totalPts > 0 ? '+' : ''}{profileStats.totalPts || 0}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] overflow-x-auto no-scrollbar">
                    {[
                        { id: 'info', label: 'Info', icon: faIdCard },
                        { id: 'stats', label: 'Statistik', icon: faChartLine },
                        { id: 'laporan', label: 'Laporan', icon: faHistory },
                        { id: 'audit', label: 'Audit', icon: faClockRotateLeft }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setProfileTab(t.id)}
                            className={`flex-1 min-w-[80px] h-12 flex flex-col items-center justify-center gap-1 transition-all relative
                                ${profileTab === t.id ? 'text-indigo-500' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={t.icon} className="text-sm mb-1" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
                            {profileTab === t.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full" />}
                        </button>
                    ))}
                </div>

                {/* ── Content Sections ── */}
                {profileTab === 'info' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* ── Section: Identitas & Biodata ── */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                            <div className="flex items-center gap-2.5 pt-1">
                                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                <FontAwesomeIcon icon={faIdCard} className="text-indigo-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Identitas & Biodata</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>
                            <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                                <InfoRow label="NIK (KTP)" value={selectedTeacher.nik} />
                                <InfoRow label="Gender" value={selectedTeacher.gender === 'L' ? 'Laki-laki' : selectedTeacher.gender === 'P' ? 'Perempuan' : '-'} />
                                <InfoRow label="NIP / NUPTK" value={`${selectedTeacher.nip || '-'} / ${selectedTeacher.nuptk || '-'}`} />
                                <InfoRow label="Tempat, Tgl Lahir" value={`${selectedTeacher.birth_place || '-'}${selectedTeacher.birth_date ? `, ${new Date(selectedTeacher.birth_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}`} />
                            </div>
                        </div>

                        {/* ── Section: Kepegawaian ── */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                            <div className="flex items-center gap-2.5 pt-1">
                                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                <FontAwesomeIcon icon={faBriefcase} className="text-emerald-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kepegawaian</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>
                            <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                                <InfoRow label="Status Pegawai" value={selectedTeacher.employment_status || 'GTY'} />
                                <InfoRow label="Mata Pelajaran" value={selectedTeacher.subject} />
                                <InfoRow label="Tgl Bergabung" value={selectedTeacher.join_date ? new Date(selectedTeacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'} />
                                <InfoRow label="Jam Mengajar" value={`${selectedTeacher.teaching_hours || 0} Jam / Minggu`} />
                            </div>
                        </div>

                        {/* ── Section: Pendidikan ── */}
                        <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                            <div className="flex items-center gap-2.5 pt-1">
                                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                <FontAwesomeIcon icon={faGraduationCap} className="text-blue-500 text-[10px] opacity-70" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Pendidikan Terakhir</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                            </div>
                            <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                                <InfoRow label="Tingkat" value={selectedTeacher.last_education} />
                                <InfoRow label="Lulus Tahun" value={selectedTeacher.graduation_year} />
                                <div className="col-span-2">
                                    <InfoRow label="Jurusan / Program Studi" value={selectedTeacher.major} />
                                </div>
                            </div>
                        </div>

                        {/* ── Section: Kontak & Lokasi ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                    <FontAwesomeIcon icon={faPhone} className="text-emerald-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Kontak</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-1 opacity-80">
                                            No. HP / WhatsApp
                                        </p>
                                        <div className="flex items-center justify-between group/wa">
                                            <p className="text-[13px] font-bold text-[var(--color-text)] tracking-wider">
                                                {selectedTeacher.phone || '---'}
                                            </p>
                                            {selectedTeacher.phone && (
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => copyToClipboard(selectedTeacher.phone, 'HP')} className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[11px] hover:bg-[var(--color-border)] transition-colors">
                                                        <FontAwesomeIcon icon={faCopy} className="opacity-40" />
                                                    </button>
                                                    <a
                                                        href={`https://wa.me/${selectedTeacher.phone.replace(/\D/g, '').replace(/^0/, '62')}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[11px] hover:brightness-110 transition-all shadow-sm"
                                                    >
                                                        <FontAwesomeIcon icon={faWhatsapp} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <InfoRow label="Email Institusi" value={selectedTeacher.email} />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    <FontAwesomeIcon icon={faFingerprint} className="text-amber-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Presensi</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="space-y-4">
                                    <InfoRow label="ID Mesin Fingerspot" value={selectedTeacher.fingerspot_name} />
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest mb-1.5 opacity-80">Hari Kerja Aktif</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                                                const isActive = selectedTeacher.work_days?.includes(day)
                                                return (
                                                    <div key={day} className={`px-2 py-1 rounded-lg border text-[9px] font-bold transition-all ${isActive ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40'}`}>
                                                        {workDaysMap[day] || day}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alamat & Catatan */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-blue-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Domisili</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="p-3.5 rounded-xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]/50">
                                    <p className="text-[11px] font-bold leading-relaxed text-[var(--color-text)]">
                                        {selectedTeacher.address || 'Alamat belum dilengkapi.'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                    <FontAwesomeIcon icon={faNoteSticky} className="text-amber-500 text-[10px] opacity-70" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Catatan Internal</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="p-3.5 rounded-xl bg-amber-50/10 border border-amber-200/20">
                                    <p className="text-[11px] font-medium leading-relaxed text-[var(--color-text)]">
                                        {selectedTeacher.notes || 'Tidak ada catatan tambahan.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {profileTab === 'stats' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingProfile ? (
                            <div className="py-20 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-3">
                                <FontAwesomeIcon icon={faChartLine} className="text-2xl opacity-20 animate-pulse" />
                                <p className="text-xs font-bold animate-pulse">Menganalisis data statistik...</p>
                            </div>
                        ) : profileStats ? (
                            <div className="space-y-4">
                                <EmptyState
                                    variant="dashed"
                                    icon={faChartLine}
                                    title="Grafik belum tersedia"
                                    description="Data performa diperlukan untuk memunculkan grafik tren kinerja bulanan."
                                />
                            </div>
                        ) : (
                            <EmptyState
                                variant="dashed"
                                icon={faChartLine}
                                title="Data statistik kosong"
                                description="Belum ada riwayat performa atau poin yang tercatat untuk guru ini."
                            />
                        )}
                    </div>
                )}

                {profileTab === 'laporan' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {loadingProfile ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                            </div>
                        ) : profileReports.length === 0 ? (
                            <EmptyState
                                variant="dashed"
                                icon={faHistory}
                                title="Riwayat laporan kosong"
                                description="Belum ada catatan aktivitas atau laporan log masuk untuk guru ini."
                            />
                        ) : (
                            <div className="space-y-2.5">
                                {profileReports.map((r, i) => {
                                    const pts = r.points || 0
                                    const isPos = pts >= 0
                                    return (
                                        <div key={i} className={`flex items-start gap-4 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)]/50 transition-all group border-l-4 ${isPos ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                {pts > 0 ? '+' : ''}{pts}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-[var(--color-text)] leading-snug">{r.description || 'Laporan Aktivitas'}</p>
                                                <div className="flex items-center gap-3 mt-1.5 opacity-50 text-[8px] font-black uppercase tracking-widest">
                                                    <span>{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    <span className="w-1 h-1 rounded-full bg-current" />
                                                    <span className="text-indigo-500">{r.teacher_name || 'System Audit'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {profileTab === 'audit' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 p-1">
                        <AuditTimeline
                            tableName="teachers"
                            recordId={selectedTeacher.id}
                            onRestored={fetchData}
                        />
                    </div>
                )}
            </div>
        </Modal >
    )
})
