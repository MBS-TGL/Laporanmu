import React, { useEffect, Suspense, lazy } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRaportContext } from '@features/raport/context/RaportContext'
import { ArrowLeft, Save, Copy, Eye, Loader2, CheckCircle2, Globe, FileSpreadsheet } from 'lucide-react'

const LazyRaportInputTable = lazy(() => import('@features/raport/components/RaportInputTable'))

export default function RaportInputPage({ isAcademic = false }) {
    const { classId } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { core, activeRtObj } = useRaportContext()

    const {
        selectedClass, setSelectedClassId, selectedMonth, setSelectedMonth,
        selectedYear, setSelectedYear, selectedSemester, setSelectedSemester, academicYear, setAcademicYear,
        reportType, setReportType, students, loading, saveAll, savingAll, copyFromLastMonth, copyingLastMonth,
        lang, setLang, hasUnsavedMemo, loadStudents, bulanObj
    } = core

    const basePath = isAcademic ? '/academic/raport' : '/raport'

    const queryMonth = searchParams.get('month')
    const queryYear = searchParams.get('year')
    const queryType = searchParams.get('type')

    useEffect(() => {
        if (classId) setSelectedClassId(classId)
        if (queryMonth) setSelectedMonth(Number(queryMonth))
        if (queryYear) setSelectedYear(Number(queryYear))
        if (queryType) setReportType(queryType)
    }, [classId, queryMonth, queryYear, queryType, setSelectedClassId, setSelectedMonth, setSelectedYear, setReportType])

    useEffect(() => {
        if (classId && students.length === 0 && !loading) {
            loadStudents(classId, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear)
        }
    }, [classId, students.length, loading, selectedMonth, selectedYear, lang, reportType, selectedSemester, academicYear, loadStudents])

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
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`${basePath}/setup/${classId}`)}
                        className="w-8 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-[var(--color-text)] flex items-center gap-2">
                            <span>Input Nilai Kelas {selectedClass.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase">
                                {activeRtObj.name}
                            </span>
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
                            {activeRtObj.periodType === 'monthly'
                                ? `Periode: ${bulanObj?.id_str || ''} ${selectedYear}`
                                : `Semester ${selectedSemester} T.A ${academicYear}`}
                            {' · '}{students.length} Santri
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Language Switcher */}
                    <button
                        onClick={() => setLang(l => l === 'ar' ? 'id' : 'ar')}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black flex items-center gap-1.5 hover:bg-[var(--color-surface)] transition-all"
                        title="Ganti Bahasa Raport"
                    >
                        <Globe className="w-3 h-3 text-indigo-500" />
                        <span>{lang === 'ar' ? 'Bahasa Arab (ar)' : 'Bahasa Indonesia (id)'}</span>
                    </button>

                    {/* Copy Previous Month Button */}
                    {activeRtObj.periodType === 'monthly' && (
                        <button
                            onClick={copyFromLastMonth}
                            disabled={copyingLastMonth}
                            className="h-8 px-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                            title="Salin Catatan & Hadir dari Bulan Lalu"
                        >
                            {copyingLastMonth ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                            <span>Salin Bulan Lalu</span>
                        </button>
                    )}

                    {/* Save All */}
                    <button
                        onClick={saveAll}
                        disabled={savingAll}
                        className="h-8 px-4 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1.5 hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10"
                    >
                        {savingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>{savingAll ? 'Menyimpan...' : 'Simpan Semua'}</span>
                    </button>

                    {/* Preview Button */}
                    <button
                        onClick={() => navigate(`${basePath}/preview/${classId}?month=${selectedMonth}&year=${selectedYear}&type=${reportType}`)}
                        className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                    >
                        <Eye className="w-3 h-3" />
                        <span>Preview & Cetak →</span>
                    </button>
                </div>
            </div>

            {/* Main Input Table */}
            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-bold text-[var(--color-text-muted)]">Memuat data santri & nilai...</p>
                </div>
            ) : (
                <Suspense fallback={
                    <div className="p-8 text-center text-xs font-bold text-[var(--color-text-muted)]">
                        Loading spreadsheet...
                    </div>
                }>
                    <LazyRaportInputTable />
                </Suspense>
            )}
        </div>
    )
}
