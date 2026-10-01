import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { ArrowLeft, Printer, Download, Search, Check, FileArchive, SlidersHorizontal, Sparkles } from 'lucide-react'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import RaportSummaryPage from '@features/raport/components/RaportSummaryPage'
import RaportLayoutSettings from '@features/raport/components/RaportLayoutSettings'
import { BULAN } from '@utils/reports/raportConstants'
import Modal from '@shared/components/Modal'
import { WaBlastConfirmContent, WaBlastProgressContent, ZipBlastProgressContent } from '@features/raport/components/RaportModals'

export default function RaportPreviewPage({ isAcademic = false }) {
    const { classId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { core, importExport, pageSize, setPageSize, layoutConfig, setLayoutConfig } = useRaportContext()

    const {
        selectedClass, setSelectedClassId, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, selectedSemester, setSelectedSemester, academicYear, setAcademicYear,
        reportType, setReportType, students, scores, extras, musyrif, bulanObj, lang,
        previewStudentId, setPreviewStudentId, selectedStudentIds, setPrintQueue, behaviorReports,
        loadStudents, catatanArabMap, handleDownloadPdf, generatingPdfIds
    } = core

    const {
        handlePrintAll, runZipBlast, setWaBlastConfirm, waBlastConfirm,
        waBlast, setWaBlast, zipBlast, setZipBlast, waBlastAbortRef, zipAbortRef,
        runWaBlast, buildWaMessage, signMode, handleToggleSignMode, signatures
    } = importExport

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    const [tabView, setTabView] = useState('card') // 'card' | 'rekap'
    const [searchStudent, setSearchStudent] = useState('')
    const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false)

    useEffect(() => {
        if (classId) setSelectedClassId(classId)
    }, [classId, setSelectedClassId])

    useEffect(() => {
        if (classId && students.length === 0) {
            loadStudents(classId, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear)
        }
    }, [classId, students.length, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear, loadStudents])

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchStudent.toLowerCase())
    )

    const currentStudent = students.find(s => s.id === previewStudentId) || students[0]
    const studentIdx = currentStudent ? students.findIndex(s => s.id === currentStudent.id) + 1 : 1

    if (!selectedClass) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-sm font-bold text-[var(--color-text-muted)]">Kelas tidak ditemukan.</p>
                <button onClick={() => navigate(basePath)} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-black">
                    Kembali ke Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`${basePath}/input/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)}
                        className="w-8 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-[var(--color-text)]">
                            Preview & Cetak — Kelas {selectedClass.name}
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
                            {bulanObj?.id_str || ''} {selectedYear} · {students.length} Santri
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Switch View (Kartu / Rekap) */}
                    <div className="flex items-center p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        <button
                            onClick={() => setTabView('card')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${tabView === 'card' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Kartu Raport
                        </button>
                        <button
                            onClick={() => setTabView('rekap')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${tabView === 'rekap' ? 'bg-[var(--color-surface)] text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)]'}`}
                        >
                            Rekapitulasi Kelas
                        </button>
                    </div>

                    {/* Page Size Switcher */}
                    <button
                        onClick={() => setPageSize(s => s === 'f4' ? 'a4' : 'f4')}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black uppercase hover:bg-[var(--color-surface)] transition-all"
                    >
                        {pageSize}
                    </button>

                    {/* Layout Settings Toggle */}
                    <button
                        onClick={() => setIsLayoutSettingsOpen(true)}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black flex items-center gap-1.5 hover:bg-[var(--color-surface)] transition-all"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Layout</span>
                    </button>

                    {/* Print All */}
                    <button
                        onClick={handlePrintAll}
                        className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Massal</span>
                    </button>
                </div>
            </div>

            {/* Layout Settings Drawer/Modal */}
            <RaportLayoutSettings
                isOpen={isLayoutSettingsOpen}
                onClose={() => setIsLayoutSettingsOpen(false)}
                layoutConfig={layoutConfig}
                setLayoutConfig={setLayoutConfig}
            />

            {/* Main Preview Content */}
            {tabView === 'rekap' ? (
                <div className="overflow-x-auto p-4 bg-[var(--color-surface-alt)] rounded-2xl border border-[var(--color-border)] flex justify-center">
                    <RaportSummaryPage
                        students={students}
                        scores={scores}
                        extras={extras}
                        bulanObj={bulanObj}
                        tahun={selectedYear}
                        musyrif={musyrif}
                        className={selectedClass.name}
                        reportType={reportType}
                        selectedSemester={selectedSemester}
                        academicYear={academicYear}
                        selectedClass={selectedClass}
                        behaviorReports={behaviorReports}
                        pageSize={pageSize}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Left: Student Selector Sidebar */}
                    <div className="lg:col-span-1 space-y-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                            <input
                                type="text"
                                value={searchStudent}
                                onChange={e => setSearchStudent(e.target.value)}
                                placeholder="Cari santri..."
                                className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto space-y-1 pr-1">
                            {filteredStudents.map((s, idx) => {
                                const isSel = (currentStudent?.id === s.id)
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setPreviewStudentId(s.id)}
                                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${isSel ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 shadow-sm' : 'border-[var(--color-border)]/50 hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]'}`}
                                    >
                                        <div className="truncate pr-2">
                                            <p className="text-[11px] font-bold truncate leading-tight">{s.name}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Santri #{idx + 1}</p>
                                        </div>
                                        {isSel && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Print Card Preview */}
                    <div className="lg:col-span-3 overflow-x-auto p-4 bg-[var(--color-surface-alt)] rounded-2xl border border-[var(--color-border)] flex justify-center min-h-[80vh]">
                        {currentStudent ? (
                            <RaportPrintCard
                                student={currentStudent}
                                scores={scores[currentStudent.id]}
                                extra={extras[currentStudent.id]}
                                bulanObj={bulanObj}
                                tahun={selectedYear}
                                musyrif={musyrif}
                                className={selectedClass.name}
                                lang={lang}
                                pageSize={pageSize}
                                catatanArab={catatanArabMap[currentStudent.id]}
                                studentIndex={studentIdx}
                                reportType={reportType}
                                selectedSemester={selectedSemester}
                                academicYear={academicYear}
                                selectedClass={selectedClass}
                                layoutConfig={layoutConfig}
                                signMode={signMode}
                                signatures={signatures}
                                behaviorReports={behaviorReports[currentStudent.id]}
                            />
                        ) : (
                            <div className="p-8 text-center text-xs text-[var(--color-text-muted)] font-bold">
                                Pilih santri di sebelah kiri untuk melihat preview kartu raport.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
