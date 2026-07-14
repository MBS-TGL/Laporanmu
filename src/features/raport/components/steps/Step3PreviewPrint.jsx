import React from 'react'
import {
    Users, CheckCircle2, PieChart, Calendar, ChevronLeft, ChevronRight,
    ChevronDown, AlertCircle, Maximize2, Search, Printer, ArrowLeft
} from 'lucide-react'
import StatsCarousel from '@shared/components/StatsCarousel'
import { StatCard } from '@shared/components/DataDisplay'
import Modal from '@shared/components/Modal'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import RaportLayoutSettings from '@features/raport/components/RaportLayoutSettings'
import { BULAN } from '@utils/reports/raportConstants'
import { isComplete } from '@utils/reports/raportHelpers'

const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
)

import { RAPORT_TYPES } from '@features/raport/utils/raportTypeRegistry'

export default function Step3PreviewPrint({
    students,
    previewStudentId,
    setPreviewStudentId,
    scores,
    extras,
    selectedMonth,
    selectedYear,
    pageSize,
    setPageSize,
    lang,
    setLang,
    previewZoom,
    setPreviewZoom,
    manualZoomRef,
    setIsFullScreenPreview,
    sendWATextOnly,
    openPrintWindow,
    previewContainerRef,
    catatanArabMap,
    settings,
    selectedClass,
    setStep,
    showMobileStudentPicker,
    setShowMobileStudentPicker,
    musyrif,
    reportType = 'bulanan',
    selectedSemester = 1,
    academicYear = '',
    layoutConfig,
    setLayoutConfig,
}) {
    const previewStudent = previewStudentId ? students.find(s => s.id === previewStudentId) : students[0]
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const criteria = rtObj.getCriteria(selectedClass)
    const completeCount = students.filter(s => isComplete(scores[s.id] || {}, criteria)).length
    const totalCount = students.length
    const pct = totalCount ? Math.round((completeCount / totalCount) * 100) : 0
    const currentMonthObj = BULAN.find(b => b.id === selectedMonth)
    const periodValue = reportType === 'bulanan'
        ? `${currentMonthObj?.id_str || ''} ${selectedYear}`
        : `Sem. ${selectedSemester} (${academicYear})`

    const outerWrapperRef = React.useRef(null)
    const innerCardRef = React.useRef(null)
    const zoomLabelRef = React.useRef(null)
    const tempZoomRef = React.useRef(previewZoom)

    React.useEffect(() => {
        tempZoomRef.current = previewZoom
        if (zoomLabelRef.current) {
            zoomLabelRef.current.textContent = `${Math.round(previewZoom * 100)}%`
        }
        const naturalW = pageSize === 'f4' ? 812.6 : 793.7
        const naturalH = pageSize === 'f4' ? 1247 : 1122
        if (outerWrapperRef.current) {
            outerWrapperRef.current.style.width = `${naturalW * previewZoom}px`
            outerWrapperRef.current.style.height = `${naturalH * previewZoom}px`
        }
        if (innerCardRef.current) {
            innerCardRef.current.style.transform = `scale(${previewZoom})`
        }
    }, [previewZoom, pageSize])

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <StatsCarousel count={4} cols={4}>
                <StatCard key="total" label="Total Santri" value={totalCount} icon={Users} color="sky" />
                <StatCard key="progress" label="Progress Lengkap" value={completeCount} icon={CheckCircle2} color="emerald" />
                <StatCard key="pct" label="Persentase" value={pct} suffix="%" icon={PieChart} color="indigo" />
                <StatCard key="periode" label="Periode" value={periodValue} icon={Calendar} color="amber" />
            </StatsCarousel>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Sidebar Navigation */}
                <div className="w-full lg:w-64 xl:w-72 space-y-4 self-start lg:sticky lg:top-6">
                    <div className="p-4 lg:p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                        <div className="flex items-center justify-between mb-3 lg:mb-4 px-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                {window.innerWidth < 1024 ? 'Navigasi Santri' : 'Pilih Santri'}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-black">
                                {totalCount}
                            </span>
                        </div>

                        {/* MOBILE: Smart Navigator */}
                        <div className="lg:hidden flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                    if (idx > 0) setPreviewStudentId(students[idx - 1].id)
                                }}
                                className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => setShowMobileStudentPicker(true)}
                                className="flex-1 h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2 overflow-hidden"
                            >
                                <div className="flex items-center gap-2 truncate min-w-0">
                                    {isComplete(scores[previewStudentId || students[0]?.id] || {}, criteria) ? (
                                        <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />
                                    ) : (
                                        <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                                    )}
                                    <span className="text-[11px] font-bold text-[var(--color-text)] truncate">
                                        {students.find(s => s.id === (previewStudentId || students[0]?.id))?.name || 'Pilih Santri'}
                                    </span>
                                </div>
                                <ChevronDown className="w-3 h-3 text-[var(--color-text-muted)] shrink-0" />
                            </button>

                            <button
                                onClick={() => {
                                    const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                    if (idx < students.length - 1) setPreviewStudentId(students[idx + 1].id)
                                }}
                                className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* MOBILE STUDENT PICKER MODAL */}
                        <Modal
                            isOpen={showMobileStudentPicker}
                            onClose={() => setShowMobileStudentPicker(false)}
                            title="Pilih Santri"
                            size="md"
                        >
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                {students.map(s => {
                                    const active = (previewStudentId || students[0]?.id) === s.id
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setPreviewStudentId(s.id)
                                                setShowMobileStudentPicker(false)
                                            }}
                                            className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${active
                                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text)]'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface)]'}`}>
                                                    <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>
                                                        {s.name.charAt(0)}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-bold truncate">{s.name}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </Modal>

                        {/* DESKTOP: Vertical Sidebar List */}
                        <div className="hidden lg:flex flex-col gap-1.5 h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {students.map(s => {
                                const complete = isComplete(scores[s.id] || {}, criteria)
                                const active = previewStudentId === s.id
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setPreviewStudentId(s.id)}
                                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${active
                                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/15'
                                                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                <span className={`text-[9px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>
                                                    {s.name.charAt(0)}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-bold truncate flex-1">{s.name}</span>
                                            {complete && <CheckCircle2 className={`w-3 h-3 ${active ? 'text-white' : 'text-emerald-500'}`} />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => openPrintWindow(students)}
                            className="w-full h-11 rounded-2xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Semua ({totalCount})
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            className="w-full h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-xs font-black hover:text-[var(--color-text)] transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Kembali ke Input
                        </button>
                    </div>

                    {/* Layout Customization Panel */}
                    {layoutConfig && setLayoutConfig && (
                        <RaportLayoutSettings
                            config={layoutConfig}
                            onChange={setLayoutConfig}
                        />
                    )}
                </div>

                {/* Right: Preview Area */}
                <div className="flex-1 flex flex-col rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                    <div className="px-4 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center justify-between w-full sm:w-auto">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <Search className="w-3 h-3 text-indigo-500" />
                                </div>
                                <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">
                                    Preview Raport
                                </h4>
                            </div>
                            <button
                                onClick={() => setIsFullScreenPreview(true)}
                                className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center sm:hidden"
                            >
                                <Maximize2 className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                    <button
                                        onClick={() => setPageSize('a4')}
                                        className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'a4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        A4
                                    </button>
                                    <button
                                        onClick={() => setPageSize('f4')}
                                        className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'f4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        F4
                                    </button>
                                </div>
                                <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                    <button
                                        onClick={() => setLang('ar')}
                                        className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        AR
                                    </button>
                                    <button
                                        onClick={() => setLang('id')}
                                        className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'
                                            }`}
                                    >
                                        ID
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                    <button
                                        onClick={() => {
                                            manualZoomRef.current = true
                                            setPreviewZoom(p => Math.max(0.3, p - 0.1))
                                        }}
                                        className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"
                                    >
                                        <Search className="w-3 h-3 mr-0.5" />-
                                    </button>
                                    <button
                                        ref={zoomLabelRef}
                                        onClick={() => {
                                            manualZoomRef.current = false
                                            const el = previewContainerRef.current
                                            if (!el) return
                                            const padding = window.innerWidth < 640 ? 24 : 80
                                            const availW = el.clientWidth - padding
                                            const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
                                            setPreviewZoom(Math.min(1, Math.max(0.3, Math.floor((availW / docW) * 100) / 100)))
                                        }}
                                        title="Fit ke lebar layar"
                                        className="text-[9px] font-black w-10 text-center text-indigo-500 tabular-nums hover:text-indigo-700 transition-colors cursor-pointer select-none"
                                    >
                                        {Math.round(previewZoom * 100)}%
                                    </button>
                                    <button
                                        onClick={() => {
                                            manualZoomRef.current = true
                                            setPreviewZoom(p => Math.min(1.5, p + 0.1))
                                        }}
                                        className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"
                                    >
                                        <Search className="w-3 h-3 mr-0.5" />+
                                    </button>
                                </div>

                                {previewStudent?.phone && (
                                    <button
                                        onClick={() => sendWATextOnly(previewStudent)}
                                        className="h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                                    >
                                        <WhatsAppIcon className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">Whatsapp</span>
                                    </button>
                                )}

                                <button
                                    onClick={() => openPrintWindow([previewStudent].filter(Boolean))}
                                    className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-lg shadow-emerald-500/20"
                                >
                                    <Printer className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">Cetak</span>
                                </button>

                                <button
                                    onClick={() => setIsFullScreenPreview(true)}
                                    className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        ref={previewContainerRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-200 dark:bg-slate-700 flex flex-col items-center custom-scrollbar p-3 sm:p-10"
                        style={{ minHeight: window.innerWidth < 768 ? 300 : 600 }}
                        onTouchStart={e => {
                            if (e.touches.length === 2) {
                                e.currentTarget._pinchStartDist = Math.hypot(
                                    e.touches[0].clientX - e.touches[1].clientX,
                                    e.touches[0].clientY - e.touches[1].clientY
                                )
                                e.currentTarget._pinchStartZoom = tempZoomRef.current
                            }
                        }}
                        onTouchMove={e => {
                            if (e.touches.length === 2 && e.currentTarget._pinchStartDist) {
                                e.preventDefault()
                                const dist = Math.hypot(
                                    e.touches[0].clientX - e.touches[1].clientX,
                                    e.touches[0].clientY - e.touches[1].clientY
                                )
                                const ratio = dist / e.currentTarget._pinchStartDist
                                const newZoom = Math.min(1.5, Math.max(0.3, e.currentTarget._pinchStartZoom * ratio))

                                const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                const naturalH = pageSize === 'f4' ? 1247 : 1122
                                if (outerWrapperRef.current) {
                                    outerWrapperRef.current.style.width = `${naturalW * newZoom}px`
                                    outerWrapperRef.current.style.height = `${naturalH * newZoom}px`
                                }
                                if (innerCardRef.current) {
                                    innerCardRef.current.style.transform = `scale(${newZoom})`
                                }
                                if (zoomLabelRef.current) {
                                    zoomLabelRef.current.textContent = `${Math.round(newZoom * 100)}%`
                                }
                                tempZoomRef.current = newZoom
                            }
                        }}
                        onTouchEnd={e => {
                            e.currentTarget._pinchStartDist = null
                            if (tempZoomRef.current !== previewZoom) {
                                manualZoomRef.current = true
                                setPreviewZoom(Math.floor(tempZoomRef.current * 100) / 100)
                            }
                        }}
                    >
                        {/* Animated hint badge - mobile only */}
                        <div className="lg:hidden flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-indigo-500/20 shadow-sm animate-pulse">
                            <Maximize2 className="w-3 h-3 text-indigo-500" />
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                Klik raport untuk memperbesar
                            </span>
                        </div>

                        {(() => {
                            const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                            const naturalH = pageSize === 'f4' ? 1247 : 1122
                            return (
                                <div
                                    ref={outerWrapperRef}
                                    className="mx-auto overflow-hidden"
                                    style={{
                                        width: `${naturalW * previewZoom}px`,
                                        height: `${naturalH * previewZoom}px`,
                                    }}
                                >
                                    <div
                                        ref={innerCardRef}
                                        className="relative shadow-2xl rounded-none overflow-hidden cursor-pointer transition-all group"
                                        style={{
                                            width: pageSize === 'f4' ? '215mm' : '210mm',
                                            transform: `scale(${previewZoom})`,
                                            transformOrigin: 'top left',
                                        }}
                                        onClick={() => setIsFullScreenPreview(true)}
                                    >
                                        {/* Pulse ring on mobile */}
                                        <div className="lg:hidden absolute inset-0 rounded-none ring-2 ring-indigo-400/40 animate-pulse pointer-events-none z-10" />
                                        <div
                                            className="lg:hidden absolute inset-0 rounded-none ring-4 ring-indigo-400/10 animate-pulse pointer-events-none z-10"
                                            style={{ animationDelay: '0.3s' }}
                                        />
                                        {previewStudent && (
                                            <RaportPrintCard
                                                student={previewStudent}
                                                scores={scores[previewStudent.id]}
                                                extra={extras[previewStudent.id]}
                                                bulanObj={currentMonthObj}
                                                tahun={selectedYear}
                                                musyrif={musyrif}
                                                className={selectedClass?.name}
                                                lang={lang}
                                                settings={settings}
                                                pageSize={pageSize}
                                                catatanArab={catatanArabMap[previewStudent.id]}
                                                reportType={reportType}
                                                selectedSemester={selectedSemester}
                                                academicYear={academicYear}
                                                selectedClass={selectedClass}
                                                layoutConfig={layoutConfig}
                                            />
                                        )}
                                    </div>
                                </div>
                            )
                        })()}
                        <div className="hidden sm:block h-8 w-full shrink-0" />
                    </div>
                </div>
            </div>
        </div>
    )
}
