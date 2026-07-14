import { useCallback } from 'react'
import { logAudit } from '@utils/auditLogger'
import {
  buildPrintHTMLDetail, buildPrintHTMLRingkasan,
  buildCSVRingkasan, buildCSVDetail,
  downloadCSV, openPrintWindow,
} from '@features/gate/utils/gateUtils'
import { fmtDate } from '@features/gate/hooks/useGateCore'

export function useGateImportExport({
  language,
  activeTab,
  rekapMode,
  rekapDate,
  rekapLabel,
  rekapView,
  rekapRingkasan,
  filteredRekapData,
  todayLogs,
  filteredLogs,
  selectedIds,
  TYPE_META,
  addToast,
  t,
  tNum,
  tp
}) {
  const handleExportCSV = useCallback((source = 'rekap') => {
    const periodLabel = (rekapMode === 'harian' ? fmtDate(rekapDate, language) : rekapLabel).replace(/\s/g, '_')
    const label = source === 'rekap' ? periodLabel : fmtDate(new Date(), language).replace(/\s/g, '_')

    if (source === 'rekap' && rekapView === 'ringkasan') {
      const { csv, filename, count } = buildCSVRingkasan(rekapRingkasan, label, TYPE_META, language)
      downloadCSV(csv, filename)
      addToast(`${t('toastCsvSummarySuccess')} (${tNum(count)} ${t('toastPeopleCount')})`, 'success')
      logAudit({ action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { format: 'CSV', source, view: 'ringkasan', count, period: label } })
      return
    }

    const src = source === 'rekap' ? filteredRekapData : filteredLogs
    const { csv, filename, count } = buildCSVDetail(src, label, TYPE_META, language)
    downloadCSV(csv, filename)
    addToast(`${t('toastCsvSuccess')} (${tNum(count)} ${t('toastRowCount')})`, 'success')
    logAudit({ action: 'EXPORT', source: 'OPERATIONAL', tableName: 'gate_logs', newData: { format: 'CSV', source, view: 'rekapView', count, period: label } })
  }, [rekapView, rekapRingkasan, filteredRekapData, filteredLogs, rekapMode, rekapDate, rekapLabel, addToast, TYPE_META, language, t, tNum])

  const executePrint = useCallback((opts) => {
    const periodLabel = rekapMode === 'harian' ? fmtDate(rekapDate, language) : rekapMode === 'bulanan' ? rekapLabel : `${tp('modeMingguan')} ${rekapLabel}`
    const title = activeTab === 'rekap' ? `${tp('tabRekap')} ${periodLabel}` : `${tp('tabLogHariIni')} — ${fmtDate(new Date(), language)}`

    let src = activeTab === 'rekap' ? filteredRekapData : todayLogs
    if (opts.scope === 'selected' && selectedIds.length > 0) {
      src = src.filter(log => selectedIds.includes(log.id))
    }

    if (opts.format === 'ringkasan') {
      let ringkasanData = rekapRingkasan
      if (opts.scope === 'selected' && selectedIds.length > 0) {
        const map = new Map()
        src.forEach(l => {
          const isInternal = l.visitor_type !== 'tamu'
          const key = l.student_id || l.teacher_id || l.visitor_name
          if (!map.has(key)) {
            map.set(key, { id: key, name: l.visitor_name, nip: l.visitor_nip || '-', type: l.visitor_type, count: 0, totalMs: 0, belumKembali: 0, purposes: [] })
          }
          const entry = map.get(key)
          entry.count++
          if (isInternal && l.check_out) {
            const ms = new Date(l.check_out) - new Date(l.check_in)
            if (ms > 0) entry.totalMs += ms
          }
          if (isInternal && !l.check_out) entry.belumKembali++
          if (l.purpose && !entry.purposes.includes(l.purpose)) entry.purposes.push(l.purpose)
        })
        ringkasanData = Array.from(map.values()).sort((a, b) => b.totalMs - a.totalMs)
      }
      openPrintWindow(buildPrintHTMLRingkasan(ringkasanData, `${tp('titleSummary')} ${periodLabel}`, periodLabel, TYPE_META, language, opts))
    } else {
      openPrintWindow(buildPrintHTMLDetail(src, title, TYPE_META, language, opts))
    }

    logAudit({
      action: 'PRINT', source: 'OPERATIONAL', tableName: 'gate_logs',
      newData: { tab: activeTab, view: opts.format, count: src.length, period: periodLabel, opts }
    })
  }, [activeTab, rekapRingkasan, filteredRekapData, todayLogs, rekapMode, rekapDate, rekapLabel, TYPE_META, language, selectedIds, tp])

  return {
    handleExportCSV,
    executePrint
  }
}
