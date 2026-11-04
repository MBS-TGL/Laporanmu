// PDF rekap + lembar cadangan modul Skorsing — full client via jspdf.
// Dynamic import saat tombol diklik (ikuti pola performa repo).
// Bahasa dokumen Indonesia; font Arab Amiri untuk kop sekolah.
import { LOG_BLOCKS, formatTanggalPanjang, formatTanggalPendek, eachDay } from './suspensionConstants'

async function ensureFonts() {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load('700 16px Amiri'),
      document.fonts.load('400 12px "Times New Roman"'),
    ])
    await document.fonts.ready
  } catch {
    // fallback helvetica/serif tetap jalan
  }
}

function headerBlock(doc, school) {
  doc.setFont('times', 'bold')
  doc.setFontSize(13)
  doc.text(school?.nameAr || 'المحاسبة', 105, 14, { align: 'center' })
  doc.setFontSize(11)
  doc.text(school?.name || 'MUHAMMADIYAH BOARDING SCHOOL TANGGUL - JEMBER', 105, 21, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.text(school?.address || 'Jl. Pemandian No.88 Tanggul - Jember, Jawa Timur 68155', 105, 26, { align: 'center' })
  doc.line(14, 29, 196, 29)
}

function identityBlock(doc, suspension, y) {
  const s = suspension.student || {}
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  const rows = [
    ['Nama', `:  ${s.name || '-'}`],
    ['Kelas / Jenjang', `:  ${s.classes?.name || '-'} / ${suspension.jenjang}`],
    ['Periode', `:  ${formatTanggalPanjang(suspension.start_date)} – ${formatTanggalPanjang(suspension.end_date)}`],
    ['Status', `:  ${suspension.status}`],
  ]
  rows.forEach(([k, v], i) => {
    doc.text(k, 14, y + i * 6)
    doc.text(v, 48, y + i * 6)
  })
  return y + rows.length * 6 + 4
}

function signatureRow(doc, y, left, right) {
  const yy = Math.min(y, 265)
  doc.setFontSize(10)
  doc.text('Mengetahui,', 30, yy, { align: 'center' })
  doc.text('Pembina', 30, yy + 5, { align: 'center' })
  doc.text(left || '( .............................. )', 30, yy + 25, { align: 'center' })
  doc.text('Tanggul, ..............................', 150, yy, { align: 'center' })
  doc.text('Wali Murid', 150, yy + 5, { align: 'center' })
  doc.text(right || '( .............................. )', 150, yy + 25, { align: 'center' })
  return yy + 30
}

// ─── Rekap per siswa: progres harian + tugas + followup ─────
export async function generateRekapPdf({ suspension, days, logByDate, tasks, subByTask, followups }) {
  const [{ default: jsPDF }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  await ensureFonts()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  doc.setLanguage('id')

  const dayList = days?.length ? days : eachDay(suspension.start_date, suspension.end_date)
  headerBlock(doc)
  doc.setFont('times', 'bold')
  doc.setFontSize(12)
  doc.text('REKAP PEMBINAAN DI RUMAH', 105, 35, { align: 'center' })
  let y = identityBlock(doc, suspension, 41)

  // 1. Progres harian
  doc.autoTable({
    startY: y,
    head: [['No', 'Tanggal', 'Status', 'Catatan wali']],
    body: dayList.map((d, i) => {
      const log = logByDate?.[d]
      const filled = Object.keys(log?.entries || {}).length
      return [
        String(i + 1),
        formatTanggalPendek(d),
        log ? `Terisi (${filled} item)` : 'Kosong',
        (log?.note_optional || '-').slice(0, 60),
      ]
    }),
    styles: { fontSize: 9, font: 'times' },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // 2. Tugas
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.text('Tugas KBM & Penilaian', 14, y)
  y += 3
  doc.autoTable({
    startY: y,
    head: [['Mapel', 'Judul', 'Status', 'Nilai', 'Komentar guru']],
    body: (tasks || []).map((t) => {
      const sub = subByTask?.[t.id]
      return [
        t.subject,
        (t.title || '').slice(0, 50),
        sub?.status || 'belum',
        sub?.score != null ? String(sub.score) : '-',
        (sub?.teacher_comment || '-').slice(0, 50),
      ]
    }),
    styles: { fontSize: 9, font: 'times' },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 8

  // 3. Verifikasi pembina
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.text('Verifikasi Pembina', 14, y)
  y += 3
  doc.autoTable({
    startY: y,
    head: [['Tanggal', 'Metode', 'Hasil']],
    body: (followups || []).map((f) => [
      new Date(f.contacted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      f.method,
      (f.notes || '').slice(0, 80),
    ]),
    styles: { fontSize: 9, font: 'times' },
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
  })
  y = doc.lastAutoTable.finalY + 10

  signatureRow(doc, y + 6, null, suspension.student?.guardian_name ? `( ${suspension.student.guardian_name} )` : null)
  return doc.output('blob')
}

// ─── Lembar cadangan mingguan (untuk wali tanpa smartphone) ──
// 4 blok waktu per hari + kolom paraf wali dan pembina.
export async function generateBackupPdf({ suspension, days, templates }) {
  const [{ default: jsPDF }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  await ensureFonts()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  doc.setLanguage('id')

  const dayList = days?.length ? days : eachDay(suspension.start_date, suspension.end_date)
  const tpl = templates || {}
  // Satu halaman per 3 hari agar muat
  const chunks = []
  for (let i = 0; i < dayList.length; i += 3) chunks.push(dayList.slice(i, i + 3))

  chunks.forEach((group, gi) => {
    if (gi > 0) doc.addPage()
    headerBlock(doc)
    doc.setFont('times', 'bold')
    doc.setFontSize(12)
    doc.text('LEMBAR LOG HARIAN — PEMBINAAN DI RUMAH', 105, 35, { align: 'center' })
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(`${suspension.student?.name || '-'} · ${suspension.student?.classes?.name || '-'} · ${suspension.jenjang}`, 105, 40, { align: 'center' })
    let y = 45

    group.forEach((d) => {
      if (y > 200) { doc.addPage(); y = 14 }
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.text(formatTanggalPanjang(d), 14, y)
      y += 2
      const body = []
      LOG_BLOCKS.forEach((block) => {
        body.push([{ content: `${block.label} (${block.time})`, colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }])
        const items = tpl[block.key] || []
        if (!items.length) {
          body.push(['—', 'Tidak ada item aktif', '☐'])
        } else {
          items.forEach((t) => body.push(['☐', t.label_id, '']))
        }
      })
      doc.autoTable({
        startY: y,
        head: [['✓', 'Kegiatan', 'Ket']],
        body,
        styles: { fontSize: 8, font: 'times' },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 3
      doc.setFont('times', 'normal')
      doc.setFontSize(9)
      doc.text('Paraf wali: (...........)        Paraf pembina: (...........)', 14, y)
      y += 8
    })
  })

  return doc.output('blob')
}
