import React, { memo } from 'react'
import { Briefcase, ChartLine, CircleAlert, Copy, DoorOpen, FileText, GraduationCap, Heart, History, IdCard, Info, MapPin, Minus, Plus, SquarePen, Tags, Users, Zap } from 'lucide-react'
import Modal from '@shared/components/Modal'
import { AuditTimeline, MarsIcon, WhatsAppIcon } from '@shared/components'
import { EmptyState, StatCard } from '@shared/components/DataDisplay'

export default memo(function ProfileModal({
    isOpen, onClose, selectedStudent, isPrivacyMode, maskInfo, calculateCompleteness,
    behaviorHistory = [], loadingHistory, canEdit, handleEdit, profileTab, setProfileTab,
    timelineStats, timelineFilter, setTimelineFilter, timelineVisible, setTimelineVisible,
    timelineFiltered = [], raportHistory = [], loadingRaport, addToast, onOpenTagModal,
    buildWAMessage, openWAForStudent
}) {
    if (!isOpen || !selectedStudent) return null

    const copyToClipboard = async (text, label) => {
        if (isPrivacyMode) return addToast('Mode privasi aktif', 'warning')
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            addToast(`${label} berhasil disalin`, 'success')
        } catch (err) {
            addToast('Gagal menyalin ke clipboard', 'error')
        }
    }

    const InfoRow = ({ label, value, icon: Icon }) => (
        <div className="space-y-1">
            <p className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide flex items-center gap-1.5 opacity-80">
                {Icon && <Icon className="w-4 h-4 opacity-50" />} {label}
            </p>
            <p className="text-xs font-bold text-[var(--color-text)] truncate">{value || '-'}</p>
        </div>
    )

    const SectionEmptyState = ({ label, icon: Icon = CircleAlert }) => (
        <div className="py-4 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-surface-alt)]/30">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] shadow-sm">
                {Icon && <Icon className="w-4 h-4 opacity-40" />}
            </div>
            <div className="space-y-0.5">
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Data {label} belum tersedia</p>
                {canEdit && !isPrivacyMode && (
                    <button onClick={() => { onClose(); handleEdit(selectedStudent); }} className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                        Lengkapi Data <Plus className="w-4 h-4 ml-1" />
                    </button>
                )}
            </div>
        </div>
    )

    const handleSaveContact = () => {
        if (isPrivacyMode) return addToast('Mode privasi aktif', 'warning')
        if (!selectedStudent.phone) return addToast('Nomor WA kosong', 'error')

        const guardianName = selectedStudent.guardian_name || 'Ortu'
        const studentName = selectedStudent.name || 'Siswa'
        const cleanPhone = selectedStudent.phone.replace(/\D/g, '')
        const phoneNum = cleanPhone.startsWith('0') ? `+62${cleanPhone.substring(1)}` : `+${cleanPhone}`

        const vCardData = `BEGIN:VCARD\nVERSION:3.0\nFN:Wali - ${studentName} (${guardianName})\nTEL;TYPE=CELL:${phoneNum}\nEND:VCARD`
        const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Wali_${studentName.replace(/\s+/g, '_')}.vcf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        addToast('Kontak VCF berhasil diunduh', 'success')
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Profil Siswa"
            description="Detail informasi akademik, statistik perilaku, histori laporan perizinan, dan rekapan raport siswa."
            icon={Briefcase}
            iconBg="bg-[var(--color-primary)]/10"
            iconColor="text-[var(--color-primary)]"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onOpenTagModal} className="h-9 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors flex items-center justify-center gap-2 shrink-0">
                        <Tags className="w-4 h-4 opacity-70" /> Label
                    </button>

                    <div className="flex-1" />

                    <button onClick={onClose} className="h-9 px-5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap transition-colors shrink-0">
                        Tutup
                    </button>

                    {canEdit && !isPrivacyMode && (
                        <button
                            onClick={() => {
                                onClose();
                                handleEdit(selectedStudent);
                            }}
                            className="h-9 px-6 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs font-bold uppercase tracking-wide leading-none whitespace-nowrap shadow-sm transition-colors flex items-center justify-center gap-2 shrink-0"
                        >
                            <SquarePen className="w-4 h-4 opacity-70" /> Edit Data
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
                    <div className="relative flex items-center gap-5">
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center text-2xl font-bold overflow-hidden shadow-lg">
                                {selectedStudent.photo_url && !isPrivacyMode ? (
                                    <img src={selectedStudent.photo_url} className="w-full h-full object-cover rounded-lg" alt="" onError={(e) => { e.target.onerror = null; e.target.parentElement.innerHTML = `<span>${selectedStudent.name?.charAt(0) || '?'}</span>` }} loading="lazy" decoding="async" />
                                ) : (
                                    <span>{isPrivacyMode ? maskInfo(selectedStudent.name, 1) : (selectedStudent.name?.charAt(0) || '?')}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-[var(--color-primary)] text-white rounded-md text-xs font-bold shadow-lg border border-white/20">
                                {calculateCompleteness(selectedStudent)}%
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold tracking-tight truncate mb-1">
                                {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                            </h2>
                            <div className="flex flex-wrap gap-3 items-center text-xs font-bold text-white/70 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5"><IdCard className="w-4 h-4 text-indigo-300" /> {selectedStudent.registration_code}</span>
                                <span className="w-1 h-1 rounded-full bg-white/30" />
                                <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-indigo-300" /> {selectedStudent.className}</span>
                            </div>

                            {/* Tags display */}
                            {selectedStudent.tags && selectedStudent.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedStudent.tags.map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[7px] font-bold uppercase tracking-wider">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 text-center px-4 py-2 bg-white/10 rounded-2xl border border-white/10">
                            <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-1">Poin</p>
                            <p className={`text-2xl font-bold ${(selectedStudent.total_points ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(selectedStudent.total_points ?? 0) > 0 ? '+' : ''}{selectedStudent.total_points ?? 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] overflow-x-auto no-scrollbar">
                    {['info', 'stats', 'log', 'raport', 'audit'].map(t => (
                        <button
                            key={t}
                            onClick={() => setProfileTab(t)}
                            aria-selected={profileTab === t}
                            className={`flex-1 min-w-[70px] h-12 flex flex-col items-center justify-center gap-1 transition-all relative
                                ${profileTab === t ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            {t === 'info' ? <IdCard className="w-4 h-4 mb-1" /> : t === 'stats' ? <ChartLine className="w-4 h-4 mb-1" /> : t === 'log' ? <History className="w-4 h-4 mb-1" /> : t === 'audit' ? <History className="w-4 h-4 mb-1" /> : <FileText className="w-4 h-4 mb-1" />}
                            <span className="text-xs font-bold uppercase tracking-wide">{t === 'log' ? 'Perilaku' : t === 'raport' ? 'Raport' : t}</span>
                            {profileTab === t && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />}

                            {t === 'stats' && behaviorHistory.length > 0 && <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-danger rounded-full border border-white" />}
                            {t === 'raport' && raportHistory.length > 0 && <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-success rounded-full border border-white" />}
                        </button>
                    ))}
                </div>

                <div>
                    {profileTab === 'info' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                    <IdCard className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Profil Pribadi</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                                    <div className="col-span-2">
                                        <p className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide mb-1 opacity-80 text-[var(--color-primary)]/70">NISN</p>
                                        <p className="text-sm font-bold text-[var(--color-text)] tracking-wider">
                                            {isPrivacyMode ? maskInfo(selectedStudent.nisn, 4) : (selectedStudent.nisn || '---')}
                                        </p>
                                    </div>
                                    <InfoRow label="Jenis Kelamin" value={selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'} icon={MarsIcon} />
                                    <InfoRow label="Status" value={selectedStudent.status ? (selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1)) : 'Aktif'} icon={IdCard} />
                                </div>
                            </div>

                            {/* ── Data Orang Tua & Wali (Unified Grid) ── */}
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-6">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-[var(--color-primary)] rounded-full" />
                                    <Users className="w-4 h-4 text-[var(--color-primary)] opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Data Orang Tua & Wali</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Kolom Ayah */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                                            <Briefcase className="w-4 h-4 text-[var(--color-primary)]/60" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Ayah</span>
                                        </div>
                                        {selectedStudent.metadata?.father?.name || selectedStudent.metadata?.father?.nik ? (
                                            <div className="space-y-3 px-1">
                                                <InfoRow label="Nama Ayah" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.father?.name, 4) : (selectedStudent.metadata?.father?.name || '-')} />
                                                <InfoRow label="NIK Ayah" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.father?.nik, 4) : (selectedStudent.metadata?.father?.nik || '-')} />
                                                <InfoRow label="Pekerjaan" value={selectedStudent.metadata?.father?.job || '-'} />
                                            </div>
                                        ) : (
                                            <SectionEmptyState label="Ayah" icon={Briefcase} />
                                        )}
                                    </div>

                                    {/* Kolom Ibu */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                                            <Heart className="w-4 h-4 text-pink-500/60" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Ibu</span>
                                        </div>
                                        {selectedStudent.metadata?.mother?.name || selectedStudent.metadata?.mother?.nik ? (
                                            <div className="space-y-3 px-1">
                                                <InfoRow label="Nama Ibu" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.mother?.name, 4) : (selectedStudent.metadata?.mother?.name || '-')} />
                                                <InfoRow label="NIK Ibu" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.mother?.nik, 4) : (selectedStudent.metadata?.mother?.nik || '-')} />
                                                <InfoRow label="Pekerjaan" value={selectedStudent.metadata?.mother?.job || '-'} />
                                            </div>
                                        ) : (
                                            <SectionEmptyState label="Ibu" icon={Heart} />
                                        )}
                                    </div>

                                    {/* Kolom Wali / Kontak */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                                            <IdCard className="w-4 h-4 text-success/60" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Kontak Wali Utama</span>
                                        </div>
                                        <div className="space-y-1 px-1">
                                            <InfoRow label="Nama Wali / Ortu" value={isPrivacyMode ? maskInfo(selectedStudent.guardian_name, 4) : (selectedStudent.guardian_name || '-')} />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold uppercase text-[var(--color-text-muted)] tracking-wide mb-1 flex items-center gap-1.5 opacity-80">
                                                    <WhatsAppIcon className="w-4 h-4 text-success" /> No. HP / WhatsApp
                                                </p>
                                                <div className="flex items-center justify-between group/wa">
                                                    <p className="text-xs font-bold text-[var(--color-text)] tracking-wider">
                                                        {isPrivacyMode ? maskInfo(selectedStudent.phone, 4) : (selectedStudent.phone || '---')}
                                                    </p>
                                                    {selectedStudent.phone && !isPrivacyMode && (
                                                        <div className="flex gap-1.5 opacity-0 group-hover/wa:opacity-100 transition-opacity">
                                                            <button onClick={() => copyToClipboard(selectedStudent.phone, 'HP')} className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-xs hover:bg-[var(--color-border)] transition-colors">
                                                                <Copy className="w-4 h-4 opacity-40" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (openWAForStudent && buildWAMessage) {
                                                                        openWAForStudent(selectedStudent, buildWAMessage(selectedStudent, 'general'))
                                                                    } else {
                                                                        const cleanPhone = (selectedStudent.phone || '').replace(/\D/g, '')
                                                                        const waPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.substring(1)}` : cleanPhone
                                                                        const text = encodeURIComponent(`Assalamualaikum Wr. Wb.\n\nBapak/Ibu Wali dari Ananda *${selectedStudent.name}*.\n\n`)
                                                                        window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank')
                                                                    }
                                                                }}
                                                                className="w-6 h-6 rounded-lg bg-success text-white flex items-center justify-center text-xs hover:brightness-110 transition-all shadow-sm"
                                                            >
                                                                <WhatsAppIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {!isPrivacyMode && selectedStudent.phone && (
                                                <button onClick={handleSaveContact} className="w-full mt-2 h-8 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[var(--color-primary)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center gap-2">
                                                    <IdCard className="w-4 h-4" /> Simpan Kontak VCF
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-success rounded-full" />
                                    <MapPin className="w-4 h-4 text-success opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Alamat & Domisili</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                {selectedStudent.metadata?.address_detail?.rt || selectedStudent.metadata?.address?.rt ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                            <InfoRow label="RT / RW" value={isPrivacyMode ? '***' : `${selectedStudent.metadata?.address_detail?.rt || selectedStudent.metadata?.address?.rt || '-'}/${selectedStudent.metadata?.address_detail?.rw || selectedStudent.metadata?.address?.rw || '-'}`} />
                                            <InfoRow label="Dusun / Desa" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.address_detail?.village || selectedStudent.metadata?.address?.village, 3) : (selectedStudent.metadata?.address_detail?.village || selectedStudent.metadata?.address?.village || '-')} />
                                            <InfoRow label="Kecamatan" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.address_detail?.district || selectedStudent.metadata?.address?.district, 3) : (selectedStudent.metadata?.address_detail?.district || selectedStudent.metadata?.address?.district || '-')} />
                                            <InfoRow label="Kabupaten/Kota" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.address_detail?.city || selectedStudent.metadata?.address?.city, 3) : (selectedStudent.metadata?.address_detail?.city || selectedStudent.metadata?.address?.city || '-')} />
                                            <InfoRow label="Provinsi" value={isPrivacyMode ? maskInfo(selectedStudent.metadata?.address_detail?.province || selectedStudent.metadata?.address?.province, 3) : (selectedStudent.metadata?.address_detail?.province || selectedStudent.metadata?.address?.province || '-')} />
                                            <InfoRow label="Kamar / Rayon" value={selectedStudent.metadata?.kamar || '-'} icon={DoorOpen} />
                                        </div>
                                    </div>
                                ) : (
                                    <SectionEmptyState label="Alamat" icon={MapPin} />
                                )}
                            </div>

                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-5">
                                <div className="flex items-center gap-2.5 pt-1">
                                    <div className="w-1 h-4 bg-warning rounded-full" />
                                    <IdCard className="w-4 h-4 text-warning opacity-70" />
                                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Dokumen Sipil</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>
                                {selectedStudent.metadata?.documents?.no_kk || selectedStudent.metadata?.docs?.no_kk || selectedStudent.metadata?.documents?.no_akta || selectedStudent.metadata?.docs?.no_akta ? (
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-[7px] font-bold uppercase text-[var(--color-text-muted)] tracking-wide mb-1">No. Kartu Keluarga</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-[var(--color-text)] tracking-wider">
                                                    {isPrivacyMode ? maskInfo(selectedStudent.metadata?.documents?.no_kk || selectedStudent.metadata?.docs?.no_kk, 4) : (selectedStudent.metadata?.documents?.no_kk || selectedStudent.metadata?.docs?.no_kk || '---')}
                                                </p>
                                                {(selectedStudent.metadata?.documents?.no_kk || selectedStudent.metadata?.docs?.no_kk) && !isPrivacyMode && (
                                                    <button onClick={() => copyToClipboard(selectedStudent.metadata?.documents?.no_kk || selectedStudent.metadata?.docs?.no_kk, 'No. KK')} className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-xs hover:bg-[var(--color-border)] transition-colors">
                                                        <Copy className="w-4 h-4 opacity-40" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-[7px] font-bold uppercase text-[var(--color-text-muted)] tracking-wide mb-1">No. Registrasi Akta</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-bold text-[var(--color-text)] tracking-wider">
                                                    {isPrivacyMode ? maskInfo(selectedStudent.metadata?.documents?.no_akta || selectedStudent.metadata?.docs?.no_akta, 4) : (selectedStudent.metadata?.documents?.no_akta || selectedStudent.metadata?.docs?.no_akta || '---')}
                                                </p>
                                                {(selectedStudent.metadata?.documents?.no_akta || selectedStudent.metadata?.docs?.no_akta) && !isPrivacyMode && (
                                                    <button onClick={() => copyToClipboard(selectedStudent.metadata?.documents?.no_akta || selectedStudent.metadata?.docs?.no_akta, 'No. Akta')} className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-xs hover:bg-[var(--color-border)] transition-colors">
                                                        <Copy className="w-4 h-4 opacity-40" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <SectionEmptyState label="Dokumen Sipil" icon={IdCard} />
                                )}
                            </div>

                            {(() => {
                                const entries = Object.entries(selectedStudent.metadata || {})
                                    .filter(([key, val]) => {
                                        const excludedKeys = ['father', 'mother', 'address', 'address_detail', 'docs', 'documents', 'kamar']
                                        return !excludedKeys.includes(key) && val !== null && val !== '' && typeof val !== 'object'
                                    })
                                if (entries.length === 0) return null
                                return (
                                    <div className="p-3.5 rounded-2xl border border-violet-500/10 bg-[var(--color-surface)] shadow-sm space-y-4">
                                        <div className="flex items-center gap-2.5 pt-1 mb-2">
                                            <div className="w-1 h-4 bg-violet-500 rounded-full" />
                                            <Info className="w-4 h-4 text-violet-500 opacity-70" />
                                            <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text)]">Info Khusus</span>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-[120px] overflow-auto custom-scrollbar">
                                            {entries.map(([key, val]) => (
                                                <div key={key} className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col min-w-[80px]">
                                                    <span className="text-[7px] font-bold uppercase text-[var(--color-text-muted)] tracking-wide mb-0.5">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-xs font-bold text-[var(--color-text)]">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}

                    {profileTab === 'stats' && (
                        <div className="space-y-4">
                            {behaviorHistory.length > 0 ? (
                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                                    <div className="flex gap-2 items-end h-32 px-1 mb-4">
                                        {(() => {
                                            const months = []
                                            for (let i = 5; i >= 0; i--) {
                                                const d = new Date()
                                                d.setDate(1)
                                                d.setMonth(d.getMonth() - i)
                                                months.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), pos: 0, neg: 0 })
                                            }
                                            behaviorHistory.forEach(item => {
                                                const d = new Date(item.created_at)
                                                const bucket = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
                                                if (!bucket) return
                                                const pts = item.points ?? 0
                                                if (pts > 0) bucket.pos += pts;
                                                else if (pts < 0) bucket.neg += Math.abs(pts)
                                            })
                                            const maxVal = Math.max(...months.map(m => Math.max(m.pos, m.neg)), 1)
                                            return months.map((m, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                                                    {/* Custom Tooltip */}
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl border border-white/10">
                                                        <span className="text-emerald-400">+{m.pos}</span> / <span className="text-rose-400">-{m.neg}</span>
                                                    </div>
                                                    <div className="w-full flex flex-col gap-0.5 items-stretch justify-end h-full relative">
                                                        {m.pos > 0 && <div className="w-full rounded-t-sm bg-success/40 group-hover:bg-success transition-all" style={{ height: `${(m.pos / maxVal) * 100}%` }} />}
                                                        {m.neg > 0 && <div className="w-full rounded-b-sm bg-danger/40 group-hover:bg-danger transition-all" style={{ height: `${(m.neg / maxVal) * 100}%` }} />}
                                                        {m.pos === 0 && m.neg === 0 && <div className="w-full h-1 bg-[var(--color-border)] opacity-20" />}
                                                    </div>
                                                    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">{m.label}</span>
                                                </div>
                                            ))
                                        })()}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatCard
                                            icon={Zap} label="Total Poin" value={selectedStudent.total_points} color={selectedStudent.total_points >= 0 ? 'emerald' : 'rose'}
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={History} label="Total Log" value={behaviorHistory.length} color="indigo"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={Plus} label="Positif" value={timelineStats?.totalPos || 0} color="emerald"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                        <StatCard
                                            icon={Minus} label="Negatif" value={timelineStats?.totalNeg || 0} color="rose"
                                            className="!w-full !rounded-2xl !p-3 !min-h-0" valueClassName="text-lg"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    variant="dashed"
                                    icon={ChartLine}
                                    title="Grafik belum tersedia"
                                    description="Data histori perilaku diperlukan untuk memunculkan grafik tren."
                                />
                            )}
                        </div>
                    )}

                    {profileTab === 'log' && (
                        <div className="space-y-2">
                            {loadingHistory ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-[var(--color-surface-alt)] rounded-lg" />)}
                                </div>
                            ) : timelineFiltered.length === 0 ? (
                                <EmptyState
                                    variant="dashed"
                                    icon={History}
                                    title="Belum ada Kedisiplinan & Poin"
                                    description="Siswa ini belum memiliki catatan histori perilaku di sistem."
                                />
                            ) : (
                                <>
                                    <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-1">
                                        {[
                                            { id: 'all', label: 'Semua', active: 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg' },
                                            { id: 'pos', label: 'Positif', active: 'bg-success text-white border-success shadow-lg' },
                                            { id: 'neg', label: 'Negatif', active: 'bg-danger text-white border-danger shadow-sm' }
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setTimelineFilter(f.id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border shrink-0
                                                    ${timelineFilter === f.id
                                                        ? f.active
                                                        : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-border)]'}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    {timelineFiltered.slice(0, timelineVisible).map(item => {
                                        const pts = item.points ?? 0
                                        const isPos = pts > 0
                                        const isNeg = pts < 0
                                        return (
                                            <div key={item.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 flex items-start gap-3 hover:bg-[var(--color-surface-alt)]/30 transition-all">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${isPos ? 'bg-success/10 text-success' : isNeg ? 'bg-danger/10 text-danger' : 'bg-slate-500/10 text-slate-500'}`}>
                                                    {pts > 0 ? '+' : ''}{pts}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="text-xs font-bold text-[var(--color-text)] leading-tight">{item.description || item.notes}</p>
                                                    <div className="flex items-center gap-3 mt-1.5 opacity-50 text-xs font-bold uppercase tracking-wider">
                                                        <span>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                        <span className="w-1 h-1 rounded-full bg-current" />
                                                        <span>{item.teacher_name || 'Admin'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {timelineFiltered.length > timelineVisible && (
                                        <button onClick={() => setTimelineVisible(v => v + 5)} className="w-full py-2.5 rounded-xl border border-dashed border-[var(--color-border)] text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Muat Lagi</button>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {profileTab === 'audit' && (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 p-1 custom-scrollbar">
                            <AuditTimeline tableName="students" recordId={selectedStudent.id} />
                        </div>
                    )}

                    {profileTab === 'raport' && (
                        <div className="space-y-4">
                            {loadingRaport ? (
                                <div className="animate-pulse space-y-2">
                                    {[1, 2].map(i => <div key={i} className="h-20 bg-[var(--color-surface-alt)] rounded-lg" />)}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <EmptyState
                                    variant="dashed"
                                    icon={FileText}
                                    title="Arsip raport kosong"
                                    description="Data raport bulanan untuk siswa ini belum tersedia."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {raportHistory.map(r => {
                                        const values = [r.nilai_akhlak, r.nilai_ibadah, r.nilai_kebersihan, r.nilai_quran, r.nilai_bahasa].filter(v => v != null && v !== '')
                                        const avg = values.length ? (values.reduce((a, b) => a + Number(b), 0) / values.length).toFixed(1) : '---'
                                        return (
                                            <div key={r.id} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] text-white flex flex-col items-center justify-center font-bold">
                                                            <span className="text-[7px] uppercase leading-none opacity-60">Bln</span>
                                                            <span className="text-[14px] leading-none">{r.month}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold">Raport Bulanan {r.year}</p>
                                                            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase">{r.musyrif_name || '---'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-[var(--color-primary)]">{avg}</p>
                                                        <p className="text-[7px] font-bold uppercase opacity-50">Rerata</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                    {[
                                                        { l: 'Akhlak', v: r.nilai_akhlak, c: 'bg-warning' },
                                                        { l: 'Ibadah', v: r.nilai_ibadah, c: 'bg-[var(--color-primary)]' },
                                                        { l: 'Bersih', v: r.nilai_kebersihan, c: 'bg-success' },
                                                        { l: 'Quran', v: r.nilai_quran, c: 'bg-[var(--color-primary)]' },
                                                        { l: 'Bhs', v: r.nilai_bahasa, c: 'bg-violet-600' },
                                                    ].map(k => (
                                                        <div key={k.l} className="flex flex-col p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <span className="text-xs font-bold text-[var(--color-text)]">{k.v || '-'}</span>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${k.c}`} />
                                                            </div>
                                                            <span className="text-[7px] font-bold uppercase text-[var(--color-text-muted)] tracking-wider mb-1.5">{k.l}</span>
                                                            <div className="w-full h-1 bg-[var(--color-border)]/50 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${k.c} opacity-80 transition-all duration-1000`}
                                                                    style={{ width: `${(Number(k.v) / 10) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
})