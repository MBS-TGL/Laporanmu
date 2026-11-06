import { useState } from 'react'
import { CircleAlert, Copy, LoaderCircle } from 'lucide-react'
import RichSelect from '@shared/components/RichSelect'

/**
 * CopyMonthPanel — isi tab "Salin Bulan Lain" pada wizard import laporan
 * perilaku. Menyalin seluruh laporan bulan sumber ke bulan tujuan dengan
 * tanggal yang disesuaikan. State pemilihan bulan hidup di sini (lokal).
 *
 * Props:
 * - tp(key)              : translator namespace behavior
 * - language             : 'id' | 'en' | 'ar'
 * - copyingData          : true saat proses salin berjalan
 * - copyDataFromMonth(sMonth, sYear, tMonth, tYear) : aksi dari hook
 * - onClose()            : tutup modal setelah salin sukses
 */
export default function CopyMonthPanel({ tp, language, copyingData, copyDataFromMonth, onClose }) {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const defaultSourceMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const defaultSourceYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const [copySourceMonth, setCopySourceMonth] = useState(defaultSourceMonth)
    const [copySourceYear, setCopySourceYear] = useState(defaultSourceYear)
    const [copyTargetMonth, setCopyTargetMonth] = useState(currentMonth)
    const [copyTargetYear, setCopyTargetYear] = useState(currentYear)

    const BULAN = [
        { id: 1, name: language === 'ar' ? 'يناير' : language === 'en' ? 'January' : 'Januari' },
        { id: 2, name: language === 'ar' ? 'فبراير' : language === 'en' ? 'February' : 'Februari' },
        { id: 3, name: language === 'ar' ? 'مارس' : language === 'en' ? 'March' : 'Maret' },
        { id: 4, name: language === 'ar' ? 'أبريل' : language === 'en' ? 'April' : 'April' },
        { id: 5, name: language === 'ar' ? 'مايو' : language === 'en' ? 'May' : 'Mei' },
        { id: 6, name: language === 'ar' ? 'يونيو' : language === 'en' ? 'June' : 'Juni' },
        { id: 7, name: language === 'ar' ? 'يوليو' : language === 'en' ? 'July' : 'Juli' },
        { id: 8, name: language === 'ar' ? 'أغسطس' : language === 'en' ? 'August' : 'Agustus' },
        { id: 9, name: language === 'ar' ? 'سبتمبر' : language === 'en' ? 'September' : 'September' },
        { id: 10, name: language === 'ar' ? 'أكتوبر' : language === 'en' ? 'October' : 'Oktober' },
        { id: 11, name: language === 'ar' ? 'نوفمبر' : language === 'en' ? 'November' : 'November' },
        { id: 12, name: language === 'ar' ? 'ديسمبر' : language === 'en' ? 'December' : 'Desember' },
    ]
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

    const monthYearFields = (month, setMonth, year, setYear) => (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    {tp('month') || 'Bulan'}
                </label>
                <RichSelect
                    small
                    value={month}
                    onChange={setMonth}
                    options={BULAN.map(b => ({ id: b.id, name: b.name }))}
                    placeholder="Pilih Bulan"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    {tp('year') || 'Tahun'}
                </label>
                <RichSelect
                    small
                    value={year}
                    onChange={setYear}
                    options={years.map(y => ({ id: y, name: String(y) }))}
                    placeholder="Pilih Tahun"
                />
            </div>
        </div>
    )

    return (
        <div className="space-y-4 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] shadow-sm space-y-4">
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                        {tp('copySourceTitle') || 'SUMBER DATA BULANAN'}
                    </h4>
                    {monthYearFields(copySourceMonth, setCopySourceMonth, copySourceYear, setCopySourceYear)}
                </div>

                <div className="h-px bg-[var(--color-border)]/65" />

                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                        {tp('copyTargetTitle') || 'TUJUAN DATA BULANAN'}
                    </h4>
                    {monthYearFields(copyTargetMonth, setCopyTargetMonth, copyTargetYear, setCopyTargetYear)}
                </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2.5 text-xs text-amber-600 font-bold leading-normal">
                <CircleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                    {tp('copyWarning') || 'Seluruh data laporan perilaku dari bulan sumber akan disalin ke bulan tujuan. Proses ini akan menduplikasi laporan dengan tanggal yang disesuaikan ke bulan tujuan.'}
                </div>
            </div>

            <button
                type="button"
                onClick={async () => {
                    const success = await copyDataFromMonth(copySourceMonth, copySourceYear, copyTargetMonth, copyTargetYear)
                    if (success) onClose()
                }}
                disabled={copyingData}
                className="w-full h-10 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-xs font-bold uppercase tracking-wide disabled:opacity-40 shadow-lg transition-all flex items-center justify-center gap-2"
            >
                {copyingData
                    ? <><LoaderCircle className="w-4 h-4 animate-spin" /> {tp('copyingText') || 'Menyalin Laporan...'}</>
                    : <><Copy className="w-4 h-4" /> {tp('copyActionText') || 'Salin & Impor Laporan'}</>}
            </button>
        </div>
    )
}
