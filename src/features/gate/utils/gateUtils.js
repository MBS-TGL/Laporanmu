import { fmtDate, fmtTime, fmtDateTime, durasi } from '@features/gate/hooks/useGateCore'
import { translatePurpose } from './gateConstants'
import { buildPrintHTML } from '@shared/utils/printTemplate'

// ─── Base Print Stylesheet ────────────────────────────────────────────────────

export const PRINT_BASE_STYLE = `
html,body{height:100%;margin:0;padding:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:10px;color:#1a1a1a;background:#fff;line-height:1.5}
.page{padding:14mm 16mm;min-height:100vh;display:flex;flex-direction:column;justify-content:space-between}
.content-wrap{flex:1 0 auto}
.footer-wrap{flex-shrink:0;margin-top:auto}

/* ── Letterhead header ── */
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1e3a5f;padding-bottom:14px;margin-bottom:16px}
.header-brand{display:flex;align-items:flex-start;gap:12px}
.header-logo{width:44px;height:44px;background:#1e3a5f;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.header-logo svg{width:26px;height:26px;fill:#fff}
.header-school-name{font-size:13px;font-weight:800;color:#1e3a5f;letter-spacing:0.01em;line-height:1.2}
.header-school-sub{font-size:9px;color:#555;margin-top:2px}
.header-school-addr{font-size:8.5px;color:#888;margin-top:3px}
.header-right{text-align:right;font-size:9px;color:#64748b}
.badge{display:inline-block;background:#1e3a5f;color:#fff;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.07em}
.doc-id{font-size:9px;color:#555;margin-bottom:2px}
.doc-printed{font-size:8.5px;color:#aaa}

/* ── Report title row ── */
.title-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.report-title{font-size:16px;font-weight:800;color:#1a1a1a}
.report-sub{font-size:9px;color:#555;margin-top:2px}
.total-badge{font-size:22px;font-weight:800;color:#1e3a5f;line-height:1;text-align:right}
.total-label{font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:#aaa;text-align:right;margin-top:1px}

/* ── Section divider ── */
.section-label{font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:7px;display:flex;align-items:center;gap:8px}
.section-label::after{content:'';flex:1;height:0.5px;background:#ddd}

/* ── Stats grid ── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat{border:0.5px solid #d4d4d4;border-radius:5px;padding:9px 12px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;bottom:0;width:3px}
.stat.total::before{background:#1e3a5f}
.stat.guru::before{background:#7c3aed}
.stat.karyawan::before{background:#0d9488}
.stat.tamu::before{background:#d97706}
.stat p.l{font-size:8px;text-transform:uppercase;letter-spacing:0.08em;color:#888;font-weight:700;margin-bottom:3px}
.stat p.v{font-size:20px;font-weight:800;color:#1a1a1a;line-height:1}
.stat p.d{font-size:8.5px;color:#bbb;margin-top:2px}

/* ── Info strip ── */
.info-strip{background:#f0f4f8;border:0.5px solid #cdd6e0;border-radius:4px;padding:6px 12px;display:flex;flex-wrap:wrap;gap:4px 20px;margin-bottom:14px;font-size:9px;color:#444}
.info-item{display:flex;gap:5px}
.info-key{color:#888}
.info-val{font-weight:700;color:#1a1a1a}

/* ── Table ── */
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead tr{background:#1e3a5f}
th{font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:#fff;padding:7px 9px;text-align:left}
th:first-child{border-radius:3px 0 0 3px;width:24px;text-align:center}
th:last-child{border-radius:0 3px 3px 0}
td{padding:7px 9px;border-bottom:0.5px solid #eee;vertical-align:middle;color:#1a1a1a;font-size:9.5px}
tr:nth-child(even) td{background:#f8f9fb}
tr{page-break-inside:avoid}
td:first-child{text-align:center;color:#aaa;font-size:9px}

/* ── Badges ── */
.tag-visitor{display:inline-block;padding:2px 7px;border-radius:3px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em}
.tag-visitor.guru{background:#ede9fe;color:#5b21b6}
.tag-visitor.karyawan{background:#ccfbf1;color:#0f766e}
.tag-visitor.tamu{background:#fef3c7;color:#92400e}
.tag-visitor.santri{background:#dbeafe;color:#1d4ed8}
.tag-status{display:inline-block;padding:2px 7px;border-radius:3px;font-size:8.5px;font-weight:700}
.tag-status.warning{background:#fef9c3;color:#713f12;border:0.5px solid #fde047}
.tag-status.success{background:#dcfce7;color:#14532d;border:0.5px solid #86efac}

/* ── Signature ── */
.signature-section{display:flex;justify-content:flex-end;margin-top:24px;page-break-inside:avoid}
.signature-box{text-align:center;border:0.5px solid #ccc;border-radius:4px;padding:8px 24px}
.signature-box p.ttd-title{font-size:8.5px;color:#aaa;margin-bottom:2px}
.signature-box p.ttd-role{font-weight:700;font-size:9.5px;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.03em}
.signature-box .signature-line{height:48px}
.signature-box p.ttd-name{font-weight:700;font-size:10px;color:#1a1a1a;border-top:0.5px solid #bbb;padding-top:4px;margin:0 8px}

/* ── Footer ── */
.footer{margin-top:16px;padding-top:10px;border-top:0.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;color:#bbb;font-size:8.5px}
.footer-app{color:#888;font-weight:600}
.page-num{font-size:8.5px;color:#bbb}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{padding:0;min-height:100vh}
}`

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Auto-generate a document reference number.
 * Format: PREFIX/YYYY/MM/XXXX  e.g. PKM/2026/05/0001
 * The trailing sequence is derived from the current minute+second so it is
 * unique per print session without needing a server counter.
 */
function _autoDocNumber(prefix, date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(
    (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) % 9999 + 1
  ).padStart(4, '0')
  return `${prefix}/${y}/${m}/${seq}`
}

// ─── Print Translation Dictionary ─────────────────────────────────────────────

export const PRINT_T = {
  id: {
    portalTitle: "Portal Keluar Masuk",
    portalSummaryTitle: "Portal Keluar Masuk · Ringkasan",
    docNo: "No. Dok",
    printed: "Dicetak",
    wib: "WIB",
    dailyReport: "Laporan Harian Portal Keluar Masuk",
    summaryReport: "Laporan Ringkasan Per-Orang",
    totalEntries: "Total Entri",
    totalPeople: "Total Orang",
    summarySection: "Ringkasan",
    detailLogSection: "Detail Log",
    peopleDataSection: "Data Per Orang",

    // Status
    notReturned: "Belum Kembali",
    stillInside: "Masih di Dalam",
    returned: "Sudah Kembali",
    left: "Sudah Keluar",
    activeReport: "Aktif / Belum Ditutup",
    completedReport: "Selesai",

    // Stats cards
    totalEntriesCard: "Total Entri",
    totalPeopleCard: "Total Orang",
    totalExitsCard: "Total Keluar",
    notReturnedCard: "Belum Kembali",
    returnedCard: "Sudah Kembali",
    notReturnedSub: "belum kembali",
    followUpSub: "perlu tindak lanjut",

    // Table headers
    thNo: "#",
    thDate: "Tanggal",
    thName: "Nama",
    thType: "Jenis",
    thPurpose: "Keperluan",
    thExit: "Keluar",
    thEntry: "Masuk / Kembali",
    thDuration: "Durasi",
    thVehicle: "Kendaraan",
    thStatus: "Status",
    thExitCount: "Jml Keluar",
    thTotalDuration: "Total Durasi",
    thAvgDuration: "Rata-rata",

    // Signatures
    knowing: "Mengetahui,",
    pageOf: "Hal.",

    // Info strip
    infoPeriod: "Periode",
    infoShift: "Shift",
    infoOperator: "Operator",
    infoStatus: "Status laporan",
    infoApp: "Aplikasi",
    systemAutomated: "Sistem Otomatis",
  },
  en: {
    portalTitle: "Permits Portal",
    portalSummaryTitle: "Permits Portal · Summary",
    docNo: "Doc. No",
    printed: "Printed",
    wib: "WIB",
    dailyReport: "Daily Permits Portal Report",
    summaryReport: "Summary Report Per Person",
    totalEntries: "Total Entries",
    totalPeople: "Total People",
    summarySection: "Summary",
    detailLogSection: "Log Details",
    peopleDataSection: "Data Per Person",

    // Status
    notReturned: "Not Returned",
    stillInside: "Still Inside",
    returned: "Returned",
    left: "Checked Out",
    activeReport: "Active / Not Closed",
    completedReport: "Completed",

    // Stats cards
    totalEntriesCard: "Total Entries",
    totalPeopleCard: "Total People",
    totalExitsCard: "Total Exits",
    notReturnedCard: "Not Returned",
    returnedCard: "Returned",
    notReturnedSub: "not returned",
    followUpSub: "requires follow-up",

    // Table headers
    thNo: "#",
    thDate: "Date",
    thName: "Name",
    thType: "Type",
    thPurpose: "Purpose",
    thExit: "Exit",
    thEntry: "Entry / Return",
    thDuration: "Duration",
    thVehicle: "Vehicle",
    thStatus: "Status",
    thExitCount: "Exit Count",
    thTotalDuration: "Total Duration",
    thAvgDuration: "Average",

    // Signatures
    knowing: "Acknowledged By,",
    pageOf: "Page",

    // Info strip
    infoPeriod: "Period",
    infoShift: "Shift",
    infoOperator: "Operator",
    infoStatus: "Report status",
    infoApp: "Application",
    systemAutomated: "Automated System",
  },
  ar: {
    portalTitle: "بوابة التصاريح والدخول",
    portalSummaryTitle: "بوابة التصاريح والدخول · الملخص",
    docNo: "رقم المستند",
    printed: "تاريخ الطباعة",
    wib: "WIB",
    dailyReport: "التقرير اليومي لبوابة التصاريح والدخول",
    summaryReport: "تقرير ملخص لكل شخص",
    totalEntries: "إجمالي المدخلات",
    totalPeople: "إجمالي الأشخاص",
    summarySection: "الملخص",
    detailLogSection: "تفاصيل السجل",
    peopleDataSection: "بيانات الأشخاص",

    // Status
    notReturned: "لم يعد بعد",
    stillInside: "ما زال بالداخل",
    returned: "تمت العودة",
    left: "تم المغادرة",
    activeReport: "نشط / غير مغلق",
    completedReport: "مكتمل",

    // Stats cards
    totalEntriesCard: "إجمالي المدخلات",
    totalPeopleCard: "إجمالي الأشخاص",
    totalExitsCard: "إجمالي الخروج",
    notReturnedCard: "لم يعد بعد",
    returnedCard: "تمت العودة",
    notReturnedSub: "لم يعد بعد",
    followUpSub: "بحاجة لمتابعة",

    // Table headers
    thNo: "#",
    thDate: "التاريخ",
    thName: "الاسم",
    thType: "النوع",
    thPurpose: "السبب",
    thExit: "خروج",
    thEntry: "دخول / عودة",
    thDuration: "المدة",
    thVehicle: "المركبة",
    thStatus: "الحالة",
    thExitCount: "مرات الخروج",
    thTotalDuration: "إجمالي المدة",
    thAvgDuration: "المعدل",

    // Signatures
    knowing: "اعتماد،",
    pageOf: "صفحة",

    // Info strip
    infoPeriod: "الفترة",
    infoShift: "المناوبة",
    infoOperator: "المشغل",
    infoStatus: "حالة التقرير",
    infoApp: "التطبيق",
    systemAutomated: "نظام تلقائي",
  }
}

// ─── Print HTML Builders ──────────────────────────────────────────────────────

/**
 * Build full-page print HTML for the Detail Log view.
 * @param {Array} src - Array of gate_log records
 * @param {string} title - Page title
 * @param {Object} typeMeta - TYPE_META map { guru, karyawan, santri, tamu }
 * @param {string} language - Current language
 * @param {Object} opts - Print options
 */
export function buildPrintHTMLDetail(src, title, typeMeta, language = 'id', opts = {}) {
  const now = new Date()
  const pt = (key) => PRINT_T[language]?.[key] || PRINT_T["id"]?.[key] || key

  const defaultSigTitle = language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan'

  const {
    showNip = true,
    showPurpose = true,
    showDuration = true,
    showVehicle = true,
    showSignature = false,
    signatureTitle = defaultSigTitle,
    signatureName = '',
    schoolName = 'SMP Muhammadiyah 04 Tanggul',
    schoolSub = 'Muhammadiyah Boarding School',
    schoolAddress = 'Jln. Pemandian No 88, Tanggul, Jember',
    shift = '',
    operator = 'Sistem Otomatis',
    docNumber = _autoDocNumber('PKM', now),
    paperSize = 'A4 portrait',
  } = opts

  const tableHeaders = [
    pt('thNo'),
    pt('thDate'),
    `${pt('thName')}${showNip ? ' / NIP' : ''}`,
    pt('thType'),
    ...(showPurpose ? [pt('thPurpose')] : []),
    pt('thExit'),
    pt('thEntry'),
    ...(showDuration ? [pt('thDuration')] : []),
    ...(showVehicle ? [pt('thVehicle')] : []),
    pt('thStatus')
  ]

  const tableRowsHTML = src.map((l, i) => {
    const isInternal = l.visitor_type !== 'tamu'
    const dur = durasi(l.check_in, l.check_out)
    const statusLabel = !l.check_out
      ? (isInternal ? pt('notReturned') : pt('stillInside'))
      : (isInternal ? pt('returned') : pt('left'))

    const timeExit = isInternal ? l.check_in : l.check_out
    const timeEntry = isInternal ? l.check_out : l.check_in

    return `<tr>
      <td>${i + 1}</td>
      <td style="color:#64748b;font-weight:600">${fmtDate(l.check_in, language)}</td>
      <td style="font-weight:700">
        ${l.visitor_name}
        ${showNip && l.visitor_nip ? `<br><span style="font-size:8px;color:#888;font-weight:400">${l.visitor_nip}</span>` : ''}
      </td>
      <td><span class="tag-visitor ${l.visitor_type}">${typeMeta[l.visitor_type]?.label || l.visitor_type}</span></td>
      ${showPurpose ? `<td style="color:#475569">${translatePurpose(l.purpose, language)}</td>` : ''}
      <td style="color:#dc2626;font-weight:600">${timeExit ? fmtTime(timeExit, language) : '-'}</td>
      <td style="color:#16a34a;font-weight:600">${timeEntry ? fmtTime(timeEntry, language) : '-'}</td>
      ${showDuration ? `<td style="color:#64748b">${dur || '-'}</td>` : ''}
      ${showVehicle ? `<td style="color:#475569">${l.vehicle_plate || '-'}</td>` : ''}
      <td><span class="tag-status ${!l.check_out ? 'warning' : 'success'}">${statusLabel}</span></td>
    </tr>`
  }).join('')

  const belumKembali = src.filter(l => !l.check_out).length

  const stats = [
    { label: pt('totalEntriesCard'), value: src.length, type: 'total', description: `${belumKembali} ${pt('notReturnedSub')}` },
    { label: typeMeta.guru?.label || 'Guru', value: src.filter(l => l.visitor_type === 'guru').length, type: 'avg' },
    { label: typeMeta.karyawan?.label || 'Karyawan', value: src.filter(l => l.visitor_type === 'karyawan').length, type: 'prestasi' },
    { label: typeMeta.tamu?.label || 'Tamu', value: src.filter(l => l.visitor_type === 'tamu').length, type: 'pelanggaran' }
  ]

  const infoStrip = [
    ...(shift ? [{ label: pt('infoShift'), value: shift }] : []),
    ...(operator ? [{ label: pt('infoOperator'), value: operator === 'Sistem Otomatis' ? pt('systemAutomated') : operator }] : []),
    { label: pt('infoStatus'), value: belumKembali > 0 ? pt('activeReport') : pt('completedReport') },
    { label: pt('infoApp'), value: 'LaporanMu' }
  ]

  return buildPrintHTML({
    language,
    schoolName,
    schoolSub,
    schoolAddress,
    schoolLogo: window.location.origin + '/logo-smp.png',
    docBadge: pt('portalTitle'),
    docNumber,
    title,
    subtitle: pt('dailyReport'),
    totalCount: src.length,
    totalLabel: pt('totalEntries'),
    stats,
    infoStrip,
    tableHeaders,
    tableRowsHTML,
    showSignature,
    signaturePlace: 'Tanggul',
    signatureTitle,
    signatureName,
    secondarySignatureTitle: showSignature ? defaultSigTitle : '',
    paperSize,
    colorPrimary: '#1a5c35',
    colorSecondary: '#c8a400',
  })
}

export function buildPrintHTMLRingkasan(ringkasan, title, periodLabel, typeMeta, language = 'id', opts = {}) {
  const now = new Date()
  const pt = (key) => PRINT_T[language]?.[key] || PRINT_T["id"]?.[key] || key
  const defaultSigTitle = language === 'en' ? 'Security Officer' : language === 'ar' ? 'ضابط الأمن' : 'Petugas Keamanan'

  const {
    showNip = true,
    showPurpose = true,
    showDuration = true,
    showSignature = false,
    signatureTitle = defaultSigTitle,
    signatureName = '',
    schoolName = 'SMP Muhammadiyah 4 Tanggul',
    schoolSub = 'Muhammadiyah Boarding School',
    schoolAddress = 'Jln. Pemandian No 88, Tanggul, Jember',
    shift = '',
    operator = 'Sistem Otomatis',
    docNumber = _autoDocNumber('RKP', now),
    paperSize = 'A4 portrait',
  } = opts

  const tableHeaders = [
    pt('thNo'),
    `${pt('thName')}${showNip ? ' / NIP' : ''}`,
    pt('thType'),
    pt('thExitCount'),
    ...(showDuration ? [pt('thTotalDuration'), pt('thAvgDuration')] : []),
    pt('thStatus'),
    ...(showPurpose ? [pt('thPurpose')] : [])
  ]

  const hrLabel = language === 'en' ? 'h' : language === 'ar' ? 'س' : 'j'
  const minLabel = language === 'en' ? 'm' : language === 'ar' ? 'د' : 'm'

  const tableRowsHTML = ringkasan.map((r, i) => {
    const meta = typeMeta[r.type] || typeMeta.tamu
    const totalH = Math.floor(r.totalMs / 3600000)
    const totalM = Math.floor((r.totalMs % 3600000) / 60000)
    const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}${hrLabel} ${totalM}${minLabel}` : `${totalM}${minLabel}`) : '-'
    const completedCount = r.count - r.belumKembali
    const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
    const avgH = Math.floor(avgMs / 3600000)
    const avgM = Math.floor((avgMs % 3600000) / 60000)
    const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}${hrLabel} ${avgM}${minLabel}` : `${avgM}${minLabel}`) : '-'
    const belumBadge = r.belumKembali > 0
      ? `<span class="tag-status warning">${r.belumKembali}×</span>`
      : '-'
    const cleanPurposes = r.purposes.slice(0, 4).map(p => translatePurpose(p, language)).join(', ')
    const othersLabel = language === 'en' ? 'others' : language === 'ar' ? 'أخرى' : 'lainnya'
    const countRemaining = r.purposes.length > 4 ? ` +${r.purposes.length - 4} ${othersLabel}` : ''

    return `<tr>
      <td>${i + 1}</td>
      <td style="font-weight:700">
        ${r.name}
        ${showNip && r.nip !== '-' ? `<br><span style="font-size:8px;color:#888;font-weight:400">${r.nip}</span>` : ''}
      </td>
      <td><span class="tag-visitor ${r.type}">${meta.label}</span></td>
      <td style="font-weight:700;font-size:11px">${r.count}×</td>
      ${showDuration ? `
        <td style="color:#dc2626;font-weight:600">${totalStr}</td>
        <td style="color:#64748b">${avgStr}</td>
      ` : ''}
      <td>${belumBadge}</td>
      ${showPurpose ? `<td style="color:#475569">${cleanPurposes}${countRemaining}</td>` : ''}
    </tr>`
  }).join('')

  const totalBelum = ringkasan.reduce((s, r) => s + r.belumKembali, 0)
  const totalKeluar = ringkasan.reduce((s, r) => s + r.count, 0)

  const stats = [
    { label: pt('totalPeopleCard'), value: ringkasan.length, type: 'total' },
    { label: pt('totalExitsCard'), value: totalKeluar, type: 'avg' },
    { label: pt('notReturnedCard'), value: totalBelum, type: 'pelanggaran', description: pt('followUpSub') },
    { label: pt('returnedCard'), value: totalKeluar - totalBelum, type: 'prestasi' }
  ]

  const infoStrip = [
    { label: pt('infoPeriod'), value: periodLabel },
    ...(shift ? [{ label: pt('infoShift'), value: shift }] : []),
    ...(operator ? [{ label: pt('infoOperator'), value: operator === 'Sistem Otomatis' ? pt('systemAutomated') : operator }] : []),
    { label: pt('infoApp'), value: 'LaporanMu' }
  ]

  return buildPrintHTML({
    language,
    schoolName,
    schoolSub,
    schoolAddress,
    schoolLogo: window.location.origin + '/logo-smp.png',
    docBadge: pt('portalSummaryTitle'),
    docNumber,
    title,
    subtitle: `${pt('summaryReport')} · ${pt('infoPeriod')}: ${periodLabel}`,
    totalCount: ringkasan.length,
    totalLabel: pt('totalPeople'),
    stats,
    infoStrip,
    tableHeaders,
    tableRowsHTML,
    showSignature,
    signaturePlace: 'Tanggul',
    signatureTitle,
    signatureName,
    secondarySignatureTitle: showSignature ? defaultSigTitle : '',
    paperSize,
    colorPrimary: '#1a5c35',
    colorSecondary: '#c8a400',
  })
}

// ─── CSV Builders ─────────────────────────────────────────────────────────────

/**
 * Build CSV string for Ringkasan (per-person summary) view.
 * @returns {{ csv: string, filename: string, count: number }}
 */
export function buildCSVRingkasan(ringkasan, label, typeMeta, language = 'id') {
  const header = ['No', 'Nama', 'NIP', 'Jenis', 'Jml Keluar', 'Total Durasi Keluar', 'Rata-rata Durasi', 'Belum Kembali', 'Keperluan']
  const rows = ringkasan.map((r, i) => {
    const totalH = Math.floor(r.totalMs / 3600000)
    const totalM = Math.floor((r.totalMs % 3600000) / 60000)
    const totalStr = r.totalMs > 0 ? (totalH > 0 ? `${totalH}j ${totalM}m` : `${totalM}m`) : '-'
    const completedCount = r.count - r.belumKembali
    const avgMs = completedCount > 0 ? r.totalMs / completedCount : 0
    const avgH = Math.floor(avgMs / 3600000)
    const avgM = Math.floor((avgMs % 3600000) / 60000)
    const avgStr = avgMs > 0 ? (avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`) : '-'
    const cleanPurposes = r.purposes.map(p => translatePurpose(p, language)).join(', ')
    return [
      i + 1, r.name, r.nip,
      typeMeta[r.type]?.label || r.type,
      `${r.count}x`, totalStr, avgStr, r.belumKembali,
      `"${cleanPurposes.replace(/"/g, '""')}"`,
    ].join(',')
  })
  return {
    csv: [header.join(','), ...rows].join('\n'),
    filename: `Ringkasan ${label}.csv`,
    count: ringkasan.length,
  }
}

export function buildCSVDetail(src, label, typeMeta, language = 'id') {
  const header = ['No', 'Tanggal', 'Nama', 'NIP', 'Jenis', 'Keperluan', 'Keluar', 'Masuk / Kembali', 'Durasi', 'Kendaraan', 'Status']
  const rows = src.map((l, i) => {
    const isInternal = l.visitor_type !== 'tamu'
    const dur = durasi(l.check_in, l.check_out) || '-'
    const stat = !l.check_out
      ? (isInternal ? 'Belum Kembali' : 'Masih di Dalam')
      : (isInternal ? 'Sudah Kembali' : 'Sudah Keluar')
    const cleanPurpose = translatePurpose(l.purpose, language)
    const timeExit = isInternal ? l.check_in : l.check_out
    const timeEntry = isInternal ? l.check_out : l.check_in
    return [
      i + 1,
      fmtDate(l.check_in, language),
      l.visitor_name,
      l.visitor_nip || '-',
      typeMeta[l.visitor_type]?.label || l.visitor_type,
      `"${cleanPurpose.replace(/"/g, '""')}"`,
      timeExit ? fmtTime(timeExit, language) : '-',
      timeEntry ? fmtTime(timeEntry, language) : '-',
      dur, l.vehicle_plate || '-', stat,
    ].join(',')
  })
  return {
    csv: [header.join(','), ...rows].join('\n'),
    filename: `Gate Log ${label}.csv`,
    count: src.length,
  }
}

/**
 * Trigger a CSV file download in the browser.
 * @param {string} csv - CSV content
 * @param {string} filename - Download filename
 */
export function downloadCSV(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Open a new browser window and write HTML for print/PDF.
 * @param {string} html - Full HTML string
 */
export function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=1200,height=750')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}