/**
 * Build self-contained HTML string for leave permit PDF generation.
 * Used with Browserless.io via Supabase Edge Function (primary)
 * or as reference for html2canvas+jsPDF fallback.
 */
import { fmtDateIndo, fmtDateTimeShort, fmtDateShort } from './leavePermitConstants'

export function buildLeavePermitPDFHtml(permit) {
  const student = permit.student || {}
  const className = student.classes?.name || '-'
  const dormName = student.dorms?.ar || student.dorms?.building || '-'
  const signatureUrl = permit.signature?.signature_url || ''
  const isDigital = permit.signature_type === 'digital' && signatureUrl

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=148mm">
<title>Izin Keluar Pondok - ${student.name || 'Santri'}</title>
<style>
  @page { size: 148mm 210mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
    width: 148mm;
    height: 210mm;
    padding: 10mm 12mm;
  }
  .header { text-align: center; font-weight: bold; margin-bottom: 2mm; }
  .header-title-1 { font-size: 13pt; letter-spacing: 0.02em; }
  .header-title-2 { font-size: 12pt; letter-spacing: 0.02em; margin-top: 1mm; }
  .address-box {
    border: 1.5px solid #000;
    padding: 2mm 4mm;
    text-align: center;
    font-size: 9pt;
    margin-bottom: 5mm;
  }
  .doc-title {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-decoration: underline;
    margin: 5mm 0;
    letter-spacing: 0.03em;
  }
  .intro { margin-bottom: 5mm; text-align: justify; }
  .data-table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; font-size: 11pt; }
  .data-table td { padding: 1.5mm 0; vertical-align: top; }
  .data-table .label { width: 22%; }
  .data-table .colon { width: 3%; }
  .data-table .value { width: 25%; border-bottom: 0.5pt dotted #999; }
  .data-table .spacer { width: 5%; }
  .closing { margin-top: 4mm; margin-bottom: 8mm; text-align: justify; }
  .date-line { text-align: right; margin-bottom: 8mm; font-size: 11pt; }
  .sig-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .sig-block { text-align: center; width: 45%; }
  .sig-label { font-weight: bold; font-size: 11pt; margin-bottom: 2mm; }
  .sig-area { height: 18mm; display: flex; align-items: center; justify-content: center; }
  .sig-area img { max-height: 18mm; object-fit: contain; }
  .sig-line { border-top: 1px solid #000; width: 65%; margin: 0 auto; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-title-1">PENGASUHAN SANTRI</div>
    <div class="header-title-2">MUHAMMADIYAH BOARDING SCHOOL TANGGUL – JEMBER</div>
  </div>

  <div class="address-box">
    Kampus Putra : Jl. Pemandian No.88 RT.002 RW.003 Dusun Krajan II Patemon Tanggul - Jember Jawa Timur 68155
  </div>

  <div class="doc-title">IZIN KELUAR PONDOK</div>

  <p class="intro">
    Dengan ini kami Staf Pengasuhan Santri Muhammadiyah Boarding School Tanggul
    <strong style="text-decoration:underline">Memberikan Izin Keluar Pondok</strong>
    kepada santri yang namanya tertera di bawah ini :
  </p>

  <table class="data-table">
    <tr>
      <td class="label">Nama</td>
      <td class="colon">:</td>
      <td class="value">${student.name || '....................................'}</td>
      <td class="spacer"></td>
      <td class="label">Kelas</td>
      <td class="colon">:</td>
      <td class="value">${className}</td>
    </tr>
    <tr>
      <td class="label">Kamar</td>
      <td class="colon">:</td>
      <td class="value">${dormName}</td>
      <td class="spacer"></td>
      <td class="label">No.Telepon</td>
      <td class="colon">:</td>
      <td class="value">${permit.phone || student.phone || '-'}</td>
    </tr>
    <tr>
      <td class="label">Tujuan</td>
      <td class="colon">:</td>
      <td class="value">${permit.destination || '....................................'}</td>
      <td class="spacer"></td>
      <td class="label">Keperluan</td>
      <td class="colon">:</td>
      <td class="value">${permit.purpose || '....................................'}</td>
    </tr>
    <tr>
      <td class="label">Hari/Tanggal</td>
      <td class="colon">:</td>
      <td class="value">${fmtDateIndo(permit.leave_date)}</td>
      <td class="spacer"></td>
      <td class="label">Batas Waktu</td>
      <td class="colon">:</td>
      <td class="value">${fmtDateTimeShort(permit.return_deadline)}</td>
    </tr>
  </table>

  <p class="closing">
    Demikian surat ini kami buat agar menjadi maklum bagi yang berkepentingan.
  </p>

  <div class="date-line">
    Tanggul, ${fmtDateShort(permit.issued_at || new Date().toISOString())}
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-label">Staf Pengasuhan Santri</div>
      <div class="sig-area">
        ${isDigital ? `<img src="${signatureUrl}" crossOrigin="anonymous" alt="TTD Staf" />` : ''}
      </div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Wali Santri</div>
      <div class="sig-area"></div>
      <div class="sig-line"></div>
    </div>
  </div>
</body>
</html>`
}
