import React, { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle,
    faChevronDown,
    faCopy,
    faDownload,
    faFileLines,
    faGraduationCap,
    faImage,
    faLink,
    faPrint,
    faRotateLeft,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import Modal from '@shared/components/Modal'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

export default function StudentAccessCardModal({
    isOpen,
    onClose,
    selectedStudent: propsSelectedStudent,
    selectedStudents: propsSelectedStudents = [],
    newlyCreatedStudent,
    isPrivacyMode,
    maskInfo,
    addToast,
    cardCaptureRef,
    waTemplate,
    buildWAMessage,
    openWAForStudent,
    handleResetPin,
    resettingPin,
    generatingPdf,
    handlePrintSingle,
    handleSavePNG,
    handlePrintThermal,
    generateStudentPDF
}) {
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Resolve which students to show
    const studentsToShow = useMemo(() => {
        if (propsSelectedStudent) return [propsSelectedStudent]
        return propsSelectedStudents || []
    }, [propsSelectedStudent, propsSelectedStudents])

    const isBulk = studentsToShow.length > 1

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setShowExportMenu(false); onClose?.() }}
            title={newlyCreatedStudent ? "Registrasi Berhasil!" : isBulk ? `Cetak Kartu (${studentsToShow.length} Siswa)` : "Akses & Kartu"}
            description={newlyCreatedStudent ? "Data siswa telah tersimpan. Silakan simpan kode akses atau cetak kartu pelajar di bawah." : "Kelola akses portal orang tua dan cetak kartu identitas siswa."}
            icon={newlyCreatedStudent ? faCheckCircle : faPrint}
            iconBg={newlyCreatedStudent ? "bg-emerald-500/10" : "bg-indigo-500/10"}
            iconColor={newlyCreatedStudent ? "text-emerald-600" : "text-indigo-600"}
            size={isBulk ? "xl" : "lg"}
            mobileVariant="bottom-sheet"
        >
            <div className="space-y-4 py-1">
                {newlyCreatedStudent && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600">
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-[10px]">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest">Registrasi Berhasil! Data akses & kartu tersedia di bawah.</p>
                    </div>
                )}

                {/* Card Container - Scrollable if Bulk */}
                <div className={`flex flex-col gap-6 ${isBulk ? 'max-h-[60vh] overflow-y-auto px-4 py-2' : ''}`}>
                    {studentsToShow.map((student, idx) => (
                        <div key={student.id || idx} className="space-y-4 border-b border-[var(--color-border)]/30 pb-6 last:border-0">
                            {isBulk && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[9px] flex items-center justify-center font-black">{idx + 1}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">{student.name}</span>
                                </div>
                            )}

                            <div
                                id={`card-capture-${student.id}`}
                                className="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
                                style={{ background: 'transparent' }}
                            >
                                {/* Front Card */}
                                <div className={`w-[300px] h-[188px] rounded-xl text-white relative shadow-xl overflow-hidden shrink-0 scale-95 sm:scale-100 origin-center transition-all duration-500 hover:scale-[1.02] ring-1 ring-white/20 ${student.gender === 'P' ? 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/20' : 'bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-indigo-500/20'}`}>
                                    {/* Security Pattern Overlay */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")` }} />

                                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
                                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-xl" />

                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                        <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 shadow-sm">
                                            <span className="font-black text-[9px]">L</span>
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Laporanmu</span>
                                    </div>
                                    <div className="absolute top-9 left-4 right-4 bottom-7 flex gap-3 z-10">
                                        <div className="w-[62px] h-[78px] rounded-lg bg-white/10 border border-white/20 p-1.5 shrink-0 shadow-lg overflow-hidden relative group">
                                            {student.photo_url ? (
                                                <img src={student.photo_url} alt="" className="w-full h-full object-cover rounded-md" />
                                            ) : (
                                                <div className="w-full h-full rounded-md bg-white/5 flex items-center justify-center border border-white/10">
                                                    <span className="text-2xl font-black opacity-30">{isPrivacyMode ? '*' : student.name.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                            <div>
                                                <h3 className="text-[12px] font-black leading-[1.1] uppercase mb-0.5 drop-shadow-md line-clamp-2 tracking-tight">
                                                    {isPrivacyMode ? maskInfo(student.name, 4) : student.name}
                                                </h3>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-black text-white/90 uppercase tracking-tight leading-tight flex items-center gap-1">
                                                        <FontAwesomeIcon icon={faGraduationCap} className="text-[7px] opacity-60" />
                                                        {student.className}
                                                    </p>
                                                    <p className="text-[5.5px] font-bold text-white/40 uppercase tracking-[0.1em] leading-none">MUHAMMADIYAH BOARDING SCHOOL TANGGUL</p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-white/10">
                                                <p className="text-[5px] font-black opacity-40 uppercase tracking-[0.2em] mb-0.5 leading-none">NOMOR REGISTRASI</p>
                                                <p className="text-[10px] font-mono font-black tracking-widest text-white leading-tight">
                                                    {isPrivacyMode ? maskInfo(student.code || student.registration_code, 3) : (student.code || student.registration_code)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between opacity-30">
                                        <span className="text-[6px] font-black uppercase tracking-[0.4em]">KARTU PELAJAR</span>
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white">2026/2027</span>
                                    </div>
                                </div>

                                {/* Back Card / QR */}
                                <div className="w-[300px] h-[188px] bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 relative shadow-lg flex flex-col items-center justify-center text-center shrink-0 p-4 scale-95 sm:scale-100 origin-center transition-all duration-500 hover:scale-[1.02]">
                                    <div className={`p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mb-2 ${isPrivacyMode ? 'blur-md grayscale opacity-50' : ''}`}>
                                        <React.Suspense
                                            fallback={<div className="w-[65px] h-[65px] rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] opacity-30" />}
                                        >
                                            <LazyQRCodeCanvas
                                                value={`${window.location.origin}/check?code=${student.code || student.registration_code}&pin=${student.pin}`}
                                                size={65}
                                                level="H"
                                                imageSettings={{
                                                    src: "/logo.png", // Asumsi ada logo di path ini
                                                    height: 15,
                                                    width: 15,
                                                    excavate: true,
                                                }}
                                            />
                                        </React.Suspense>
                                    </div>
                                    <h4 className="text-[8px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em] mb-1 leading-tight">AKSES PORTAL ORANG TUA</h4>
                                    <p className="text-[6px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[180px]">
                                        Silakan scan kode di atas untuk<br />mengecek perkembangan siswa
                                    </p>
                                    <div className="absolute bottom-3 w-full left-0 px-5 flex justify-between items-center opacity-20">
                                        <span className="text-[5px] font-black uppercase tracking-[0.25em]">TAHUN 2026/2027</span>
                                        <span className="text-[5px] font-black uppercase tracking-[0.25em]">MBS TANGGUL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions Section */}
                <div className={`no-print ${isBulk ? 'sticky bottom-0 z-20 backdrop-blur-xl bg-[var(--color-surface-alt)]/80 border border-[var(--color-border)] rounded-2xl p-4 shadow-2xl shadow-black/10' : ''}`}>
                    {!isBulk && studentsToShow.length > 0 ? (
                        /* Enterprise Unified Control Center - High Density */
                        <div className="bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)] rounded-[1.5rem] overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-md">
                            <div className="p-4 space-y-4">
                                {/* Section Header: Access Status */}
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative flex items-center justify-center">
                                            <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
                                            <div className="absolute w-2 h-4 bg-emerald-500/30 rounded-full animate-pulse" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] flex items-center gap-2">
                                            Status Akses: <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/10">Aktif</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/5 border border-indigo-500/10 shadow-sm">
                                        <FontAwesomeIcon icon={faGraduationCap} className="text-[8px] text-indigo-500 opacity-60" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">{studentsToShow[0].className}</span>
                                    </div>
                                </div>

                                {/* Main Interaction Hub: High Density Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                                    <div className="lg:col-span-5 group relative">
                                        <div className="relative h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm group-hover:border-indigo-500/40 transition-all flex items-center overflow-hidden">
                                            <div className="px-3 h-full bg-[var(--color-surface-alt)]/50 border-r border-[var(--color-border)] flex items-center shrink-0">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">ID</label>
                                            </div>
                                            <div className="flex-1 px-3 flex items-center justify-between gap-2">
                                                <span className="text-[12px] font-black text-indigo-600 font-mono tracking-wider whitespace-nowrap">
                                                    {isPrivacyMode ? maskInfo(studentsToShow[0].code || studentsToShow[0].registration_code, 2) : (studentsToShow[0].code || studentsToShow[0].registration_code)}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (isPrivacyMode) return addToast?.('Nonaktifkan Mode Privasi untuk menyalin', 'warning');
                                                        navigator.clipboard.writeText(studentsToShow[0].code || studentsToShow[0].registration_code);
                                                        addToast?.('ID Berhasil disalin', 'success');
                                                    }}
                                                    title="Salin ID"
                                                    className="shrink-0 w-7 h-7 rounded-lg bg-indigo-500/5 text-indigo-600 text-[10px] hover:bg-indigo-500 hover:text-white transition-all transform active:scale-90 flex items-center justify-center"
                                                >
                                                    <FontAwesomeIcon icon={faCopy} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PIN Box - Col Span 3 */}
                                    <div className="lg:col-span-3 group relative">
                                        <div className="relative h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm group-hover:border-emerald-500/40 transition-all flex items-center overflow-hidden">
                                            <div className="px-2.5 h-full bg-emerald-500/5 border-r border-emerald-500/10 flex items-center shrink-0">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-emerald-600 opacity-70">PIN</label>
                                            </div>
                                            <div className="flex-1 px-2.5 flex items-center justify-between gap-2">
                                                <span className="text-[12px] font-black text-emerald-600 font-mono tracking-[0.15em]">
                                                    {isPrivacyMode ? '••••' : studentsToShow[0].pin}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (isPrivacyMode) return addToast?.('Mode Privasi aktif', 'warning');
                                                        navigator.clipboard.writeText(studentsToShow[0].pin);
                                                        addToast?.('PIN Berhasil disalin', 'success');
                                                    }}
                                                    title="Salin PIN"
                                                    className="shrink-0 w-7 h-7 rounded-lg bg-emerald-500/5 text-emerald-600 text-[10px] hover:bg-emerald-500 hover:text-white transition-all transform active:scale-90 flex items-center justify-center"
                                                >
                                                    <FontAwesomeIcon icon={faCopy} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openWAForStudent?.(studentsToShow[0], buildWAMessage?.(studentsToShow[0], waTemplate))}
                                        className="lg:col-span-4 h-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 px-4 group whitespace-nowrap"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-[13px] transition-transform group-hover:rotate-12 shrink-0" />
                                        <span>Bagikan ke Wali</span>
                                    </button>
                                </div>

                                {/* Section Header: System Management */}
                                <div className="flex items-center gap-2.5 pt-2">
                                    <div className="w-1 h-3.5 bg-slate-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Manajemen Sistem</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--color-border)] to-transparent opacity-40" />
                                </div>

                                {/* Bottom Utility Row - High Density */}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (isPrivacyMode) return addToast?.('Mode Privasi aktif', 'warning');
                                                handleResetPin?.(studentsToShow[0]);
                                            }}
                                            disabled={resettingPin}
                                            className="h-10 px-4 rounded-xl border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 group active:scale-95 whitespace-nowrap"
                                        >
                                            <FontAwesomeIcon icon={resettingPin ? faSpinner : faRotateLeft} className={`${resettingPin ? 'fa-spin' : 'group-hover:-rotate-180 transition-transform duration-300'}`} />
                                            Reset PIN
                                        </button>
                                        <p className="hidden xl:block text-[7px] text-[var(--color-text-muted)] italic opacity-40 leading-none">PIN otomatis digenerate.</p>
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setShowExportMenu(v => !v)}
                                            disabled={generatingPdf}
                                            className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                                        >
                                            {generatingPdf
                                                ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Proses...</>
                                                : <><FontAwesomeIcon icon={faDownload} /> Cetak & Ekspor <FontAwesomeIcon icon={faChevronDown} className={`text-[8px] transition-transform duration-300 ${showExportMenu ? 'rotate-180' : ''}`} /></>
                                            }
                                        </button>
                                        {showExportMenu && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                                <div className="absolute bottom-full mb-2 right-0 z-20 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                    <div className="bg-[var(--color-surface-alt)]/80 px-3 py-2 border-b border-[var(--color-border)]">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] leading-none">Format Ekspor</p>
                                                    </div>
                                                    <div className="p-1 space-y-0.5">
                                                        <button
                                                            onClick={() => { handlePrintSingle?.(studentsToShow[0]); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-3 px-2 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] rounded-lg transition-all text-left group"
                                                        >
                                                            <FontAwesomeIcon icon={faFileLines} className="w-4 text-[var(--color-primary)]" />
                                                            Surat Akses PDF
                                                        </button>
                                                        <button
                                                            onClick={() => { handleSavePNG?.(studentsToShow[0]); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-3 px-2 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-emerald-500/10 hover:text-emerald-600 rounded-lg transition-all text-left group"
                                                        >
                                                            <FontAwesomeIcon icon={faImage} className="w-4 text-emerald-500" />
                                                            Simpan Gambar (PNG)
                                                        </button>
                                                        <button
                                                            onClick={() => { handlePrintThermal?.(studentsToShow[0]); setShowExportMenu(false); }}
                                                            className="w-full flex items-center gap-3 px-2 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-orange-500/10 hover:text-orange-600 rounded-lg transition-all text-left group"
                                                        >
                                                            <FontAwesomeIcon icon={faPrint} className="w-4 text-orange-500" />
                                                            Struk Kasir (Thermal)
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Bulk Mode Sticky Actions */
                        <div className="flex items-center justify-end w-full gap-3">
                            <button
                                onClick={() => generateStudentPDF?.(studentsToShow)}
                                disabled={generatingPdf}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
                            >
                                {generatingPdf
                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Proses...</>
                                    : <><FontAwesomeIcon icon={faPrint} className="text-[11px]" /> Cetak Semua ({studentsToShow.length})</>
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
