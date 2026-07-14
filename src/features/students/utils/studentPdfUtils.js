import QRCode from 'qrcode'
import { logAudit } from '@utils/auditLogger'

// ── Helper: Convert image URL to Base64 ──────────────────────────────────
export const getBase64Image = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

// ── Thermal 58mm Receipt Print ───────────────────────────────────────────
export const handlePrintThermal = async (student, { addToast, setGeneratingPdf }) => {
    if (!student) return;
    setGeneratingPdf(true);
    addToast('Menyiapkan struk thermal...', 'info');
    try {
        const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
        const qrDataUrl = await QRCode.toDataURL(qrValue, {
            width: 220, errorCorrectionLevel: 'H', margin: 4
        }).catch(() => null);

        const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
        const thermalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}</title>
<style>
  @page { size: 58mm auto; margin: 2mm 2mm 4mm 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 54mm; font-family: 'Courier New', monospace; font-size: 7.5pt; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { text-align: center; padding: 1.5mm 0; }
  .hdr .t { font-size: 10pt; font-weight: 900; letter-spacing: 0.4mm; }
  .hdr .s { font-size: 6pt; opacity: 0.6; margin-top: 0.5mm; }
  .div { border: none; border-top: 1px dashed #333; margin: 2mm 0; }
  .name { font-size: 9pt; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.3mm; word-break: break-word; padding: 1mm 0 0.3mm; }
  .kls { font-size: 7pt; text-align: center; text-transform: uppercase; opacity: 0.7; }
  .qr { text-align: center; padding: 2mm 0 1mm; }
  .qr img { width: 48mm; height: 48mm; display: block; margin: 0 auto; }
  .cap { font-size: 6pt; text-align: center; opacity: 0.5; margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.5mm 0.5mm; font-size: 7.5pt; vertical-align: top; }
  td.l { font-weight: bold; white-space: nowrap; width: 14mm; }
  td.s { width: 3mm; text-align: center; }
  .ftr { font-size: 5.5pt; text-align: center; opacity: 0.5; padding-top: 1mm; line-height: 1.6; }
</style></head><body>
  <div class="hdr"><div class="t">KARTU PELAJAR</div><div class="s">MBS TANGGUL &bull; LAPORANMU &bull; T.A. 2026/2027</div></div>
  <hr class="div">
  <div class="name">${student.name}</div>
  <div class="kls">${student.className || '-'}</div>
  <hr class="div">
  <div class="qr">
    ${qrDataUrl ? `<img src="${qrDataUrl}" />` : '<p style="opacity:0.4;font-size:6pt;">QR tidak tersedia</p>'}
    <div class="cap">Scan untuk akses portal orang tua</div>
  </div>
  <hr class="div">
  <table>
    <tr><td class="l">ID Reg</td><td class="s">:</td><td><b>${student.code || '-'}</b></td></tr>
    <tr><td class="l">PIN</td><td class="s">:</td><td><b>${student.pin || '-'}</b></td></tr>
    <tr><td class="l">NISN</td><td class="s">:</td><td>${student.nisn || '-'}</td></tr>
    <tr><td class="l">No. WA</td><td class="s">:</td><td>${student.phone || '-'}</td></tr>
  </table>
  <hr class="div">
  <div class="ftr">Diterbitkan: ${dateStr}<br>Laporanmu &bull; MBS Tanggul</div>
</body></html>`;

        const printWin = window.open('', '_blank', 'width=280,height=600,toolbar=0,menubar=0,scrollbars=1');
        if (!printWin) { addToast('Pop-up diblokir. Izinkan pop-up browser untuk fitur ini.', 'warning'); return; }
        printWin.document.open();
        printWin.document.write(thermalHtml);
        printWin.document.close();
        printWin.onload = () => setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
        setTimeout(() => { if (printWin && !printWin.closed) { printWin.focus(); printWin.print(); } }, 900);
        addToast('Struk siap dicetak!', 'success');
        await logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
            recordId: student.id,
            newData: { format: 'THERMAL', via: 'print', name: student.name }
        })
    } catch (e) {
        console.error('Thermal print error:', e);
        addToast('Gagal menyiapkan cetak thermal', 'error');
    } finally { setGeneratingPdf(false); }
};

// ── Save Card as PNG (html2canvas offscreen) ─────────────────────────────
export const handleSavePNG = async (student, { addToast, setGeneratingPdf }) => {
    if (!student) return;
    setGeneratingPdf(true);
    addToast('Menyiapkan gambar kartu...', 'info');
    try {
        const [{ default: html2canvas }] = await Promise.all([
            import('html2canvas'),
        ])
        let photoDataUrl = null;
        if (student.photo_url) photoDataUrl = await getBase64Image(student.photo_url);

        const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
        const qrDataUrl = await QRCode.toDataURL(qrValue, {
            width: 200, errorCorrectionLevel: 'H', margin: 4
        }).catch(() => null);

        // Build offscreen kartu (sama seperti PDF tapi ukuran lebih besar)
        const offscreen = document.createElement('div');
        offscreen.style.cssText = 'position:fixed;top:-9999px;left:-9999px;display:flex;flex-direction:row;gap:10px;align-items:center;padding:8px;background:transparent;';
        const isFemale = student.gender === 'P' || (student.className || '').toLowerCase().includes('putri');
        const grad = isFemale ? 'linear-gradient(135deg,#b43c8c 0%,#7c1a5e 100%)' : 'linear-gradient(135deg,#4f46e5 0%,#3730a3 100%)';
        const frontCard = document.createElement('div');
        frontCard.style.cssText = `width:340px;height:213px;background:${grad};border-radius:18px;position:relative;overflow:hidden;box-shadow:0 20px 40px rgba(79,70,229,0.35);flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;`;
        frontCard.innerHTML = `
              <div style="position:absolute;top:-40px;right:-40px;width:176px;height:176px;background:rgba(255,255,255,0.06);border-radius:50%;filter:blur(20px);"></div>
              <div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:10;">
                <div style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);"><span style="font-weight:900;font-size:10px;color:white;">L</span></div>
                <span style="font-size:8px;font-weight:900;letter-spacing:0.2em;color:rgba(255,255,255,0.85);text-transform:uppercase;">LAPORANMU</span>
              </div>
              <div style="position:absolute;top:38px;left:16px;right:16px;bottom:28px;display:flex;gap:12px;z-index:10;">
                <div style="width:72px;height:90px;border-radius:10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  ${photoDataUrl ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;"/>` : `<span style="font-size:30px;font-weight:900;color:rgba(255,255,255,0.4);">${(student.name || '?').charAt(0)}</span>`}
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:2px 0;">
                  <div>
                    <div style="font-size:13px;font-weight:900;color:white;text-transform:uppercase;line-height:1.2;margin-bottom:4px;word-break:break-word;">${student.name}</div>
                    <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.05em;">${student.className || '-'}</div>
                    <div style="font-size:6px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.18em;margin-top:2px;">MUHAMMADIYAH BOARDING SCHOOL</div>
                  </div>
                  <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
                    <div style="font-size:5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:3px;">NOMOR REGISTRASI</div>
                    <div style="font-size:11px;font-weight:700;color:#c7d2fe;font-family:monospace;letter-spacing:0.08em;">${student.code || '-'}</div>
                  </div>
                </div>
              </div>
              <div style="position:absolute;bottom:8px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;opacity:0.22;">
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
              </div>`;
        const backCard = document.createElement('div');
        backCard.style.cssText = 'width:340px;height:213px;background:white;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;';
        backCard.innerHTML = `
              <div style="padding:8px;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:10px;">
                ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:80px;height:80px;display:block;"/>` : '<div style="width:80px;height:80px;background:#f3f4f6;border-radius:4px;"></div>'}
              </div>
              <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">AKSES PORTAL ORANG TUA</div>
              <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa</div>
              <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;opacity:0.2;">
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
              </div>`;
        offscreen.appendChild(frontCard);
        offscreen.appendChild(backCard);
        document.body.appendChild(offscreen);

        const canvas = await html2canvas(offscreen, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null, logging: false });
        document.body.removeChild(offscreen);

        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            addToast('Kartu berhasil disimpan sebagai PNG!', 'success');
        }, 'image/png');
        await logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
            recordId: student.id,
            newData: { format: 'PNG', via: 'save_image', name: student.name }
        })
    } catch (e) {
        console.error('PNG export error:', e);
        addToast('Gagal menyimpan kartu sebagai gambar', 'error');
    } finally { setGeneratingPdf(false); }
};


/**
 * Fallback: gambar kartu manual dengan jsPDF (dipakai saat bulk print
 * atau ketika elemen DOM tidak tersedia / html2canvas gagal).
 * Mengembalikan tinggi area kartu (mm) agar layout di bawahnya bisa menyesuaikan.
 */
export const drawCardsFallback = async (doc, s, margin, pageWidth, cardY) => {
    const cardW = 82;
    const cardH = 52;
    const cardGap = 6;
    const startX = (pageWidth - (cardW * 2 + cardGap)) / 2;

    // ── Front Card ────────────────────────────────────────────────
    // Gradient simulasi: dua rect warna indigo bertumpuk
    doc.setFillColor(67, 56, 202);
    doc.roundedRect(startX, cardY, cardW, cardH, 3, 3, 'F');
    doc.setFillColor(55, 48, 163);
    doc.roundedRect(startX, cardY + cardH * 0.55, cardW, cardH * 0.45, 0, 3, 'F');

    // Dekorasi lingkaran blur (simulasi)
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.04 }));
    doc.circle(startX + cardW - 5, cardY + 5, 22, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    // Badge "LAPORANMU" kanan atas
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.roundedRect(startX + cardW - 30, cardY + 3, 28, 7, 1.5, 1.5, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORANMU', startX + cardW - 16, cardY + 7.8, { align: 'center' });

    // Foto siswa
    doc.setFillColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.roundedRect(startX + 5, cardY + 10, 18, 22, 2, 2, 'F');
    doc.setGState(doc.GState({ opacity: 1 }));

    if (s.photo_url) {
        try {
            const sPhoto = await getBase64Image(s.photo_url);
            if (sPhoto) doc.addImage(sPhoto, 'JPEG', startX + 6, cardY + 11, 16, 20);
        } catch (_) { }
    } else {
        // Placeholder inisial
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text((s.name || '?').charAt(0), startX + 14, cardY + 24, { align: 'center' });
    }

    // Nama & kelas
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    const nameLines = doc.splitTextToSize(s.name.toUpperCase(), 50);
    doc.text(nameLines, startX + 28, cardY + 16);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(s.className || '-', startX + 28, cardY + 16 + nameLines.length * 4.5);

    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.5 }));
    doc.text('MUHAMMADIYAH BOARDING SCHOOL', startX + 28, cardY + 16 + nameLines.length * 4.5 + 4);
    doc.setGState(doc.GState({ opacity: 1 }));

    // Garis pemisah
    doc.setDrawColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.15 }));
    doc.setLineWidth(0.2);
    doc.line(startX + 28, cardY + 34, startX + cardW - 4, cardY + 34);
    doc.setGState(doc.GState({ opacity: 1 }));

    // Nomor registrasi
    doc.setTextColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.5 }));
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text('NOMOR REGISTRASI', startX + 28, cardY + 38);
    doc.setGState(doc.GState({ opacity: 1 }));

    doc.setFontSize(8.5);
    doc.setFont('courier', 'bold');
    doc.setTextColor(199, 210, 254);
    doc.text(s.code || '-', startX + 28, cardY + 43);

    // Footer kartu depan
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setGState(doc.GState({ opacity: 0.25 }));
    doc.text('KARTU PELAJAR', startX + 5, cardY + cardH - 3);
    doc.text('2026/2027', startX + cardW - 5, cardY + cardH - 3, { align: 'right' });
    doc.setGState(doc.GState({ opacity: 1 }));

    // ── Back Card ─────────────────────────────────────────────────
    const backX = startX + cardW + cardGap;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(230, 230, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(backX, cardY, cardW, cardH, 3, 3, 'FD');

    // Fetch QR dari API eksternal (fallback, pakai URL)
    const qrVal = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(qrVal)}`;
    try {
        const qrImg = await getBase64Image(qrSrc);
        if (qrImg) {
            // Frame putih QR
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(230, 230, 230);
            doc.roundedRect(backX + cardW / 2 - 14, cardY + 7, 28, 28, 1.5, 1.5, 'FD');
            doc.addImage(qrImg, 'PNG', backX + cardW / 2 - 13, cardY + 8, 26, 26);
        }
    } catch (_) { }

    doc.setTextColor(55, 48, 163);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('AKSES PORTAL ORANG TUA', backX + cardW / 2, cardY + 40, { align: 'center' });

    doc.setTextColor(160, 160, 160);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan kode di atas untuk memantau perkembangan siswa', backX + cardW / 2, cardY + 44.5, { align: 'center' });

    doc.setFontSize(4.5);
    doc.setTextColor(200, 200, 210);
    doc.text('TAHUN 2026/2027', backX + 5, cardY + cardH - 3);
    doc.text('MBS TANGGUL', backX + cardW - 5, cardY + cardH - 3, { align: 'right' });

    return cardH; // kembalikan tinggi kartu
};

/**
 * Generate formal PDF document with student card and info.
 * This is the main PDF generation function used for single/bulk print.
 *
 * @param {Array}  targets          - array of student objects to print
 * @param {Object} captureRef       - React ref to card-capture-target in modal (optional)
 * @param {Object} callbacks        - { addToast, setGeneratingPdf }
 */
export const generateStudentPDF = async (targets, captureRef = null, { addToast, setGeneratingPdf }) => {
    setGeneratingPdf(true);
    addToast('Menyiapkan dokumen resmi...', 'info');
    try {
        const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
            import('jspdf'),
            import('html2canvas'),
        ])
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageWidth = 210;
        const margin = 20;

        for (let i = 0; i < targets.length; i++) {
            const s = targets[i];
            if (i > 0) doc.addPage();

            // ════════════════════════════════════════════
            // WARNA AKSEN — berdasarkan gender siswa
            // Putra/L = biru indigo | Putri/P = mauve/rose
            // ════════════════════════════════════════════
            const isFemale = s.gender === 'P' || s.gender === 'Perempuan' ||
                (s.className || '').toLowerCase().includes('putri');
            const accentR = isFemale ? 180 : 67;
            const accentG = isFemale ? 60 : 56;
            const accentB = isFemale ? 140 : 202;
            // helper set accent color
            const setAccent = () => doc.setTextColor(accentR, accentG, accentB);
            const setAccentDraw = () => doc.setDrawColor(accentR, accentG, accentB);
            const setAccentFill = () => doc.setFillColor(accentR, accentG, accentB);

            // ════════════════════════════════════════════
            // WATERMARK — teks diagonal samar di tengah halaman
            // ════════════════════════════════════════════
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.045 }));
            doc.setFontSize(38);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(accentR, accentG, accentB);
            // Rotasi 45° dari tengah halaman
            const wmCX = pageWidth / 2;
            const wmCY = 148; // tengah A4
            for (let wy = 60; wy < 260; wy += 55) {
                for (let wx = 30; wx < 200; wx += 80) {
                    doc.text('RESMI', wx, wy, { angle: 45 });
                }
            }
            doc.restoreGraphicsState();

            // ════════════════════════════════════════════
            // 1. JUDUL & TEKS PENGANTAR
            // ════════════════════════════════════════════
            const kopCenterX = pageWidth / 2;
            const garisBawahY = 0;
            const judulY = 16;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(13);
            doc.setFont('times', 'bold');
            doc.text('INFORMASI AKSES DIGITAL & KARTU PELAJAR', kopCenterX, judulY, { align: 'center' });

            // Garis dekoratif bawah judul — pakai warna aksen gender
            setAccentDraw();
            doc.setLineWidth(0.6);
            doc.line(kopCenterX - 52, judulY + 2.5, kopCenterX + 52, judulY + 2.5);

            // Teks pengantar — 2 kalimat ringkas
            doc.setFontSize(9);
            doc.setFont('times', 'normal');
            doc.setTextColor(50, 50, 50);
            const introText = `Yth. Orang Tua/Wali dari Ananda ${s.name}, dengan hormat kami sampaikan informasi akses digital dan kartu pelajar resmi yang diterbitkan oleh sistem Laporanmu. Dokumen ini memuat data akses portal pemantauan perkembangan akademik serta perilaku putera/puteri Bapak/Ibu — harap simpan dengan baik dan segera hubungi sekolah apabila terdapat kendala.`;
            const splitIntro = doc.splitTextToSize(introText, pageWidth - margin * 2);
            doc.text(splitIntro, margin, judulY + 12);

            // ════════════════════════════════════════════
            // 2. INFO SISWA — strip biru tipis di bawah intro
            // ════════════════════════════════════════════
            const infoY = judulY + 12 + (splitIntro.length * 4.5) + 5;

            doc.setFillColor(245, 246, 255);
            doc.setDrawColor(210, 214, 245);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, infoY, pageWidth - margin * 2, 18, 3, 3, 'FD');

            // Garis aksen kiri — warna gender
            setAccentFill();
            doc.rect(margin, infoY, 2.5, 18, 'F');

            const infoColW = (pageWidth - margin * 2 - 2.5) / 3;
            const infoCols = [
                { label: 'NAMA SISWA', val: s.name },
                { label: 'KELAS', val: s.className || '-' },
                { label: 'NISN', val: s.nisn || '-' },
            ];
            infoCols.forEach(({ label, val }, idx) => {
                const cx = margin + 2.5 + infoColW * idx + infoColW / 2;
                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(120, 120, 140);
                doc.text(label, cx, infoY + 6, { align: 'center' });
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(20, 20, 50);
                doc.text(String(val), cx, infoY + 13, { align: 'center' });
            });

            // ════════════════════════════════════════════
            // 3. KARTU DIGITAL
            // ════════════════════════════════════════════
            const cardAreaY = infoY + 20;
            let cardAreaH = 55;

            if (targets.length === 1) {
                try {
                    // Ambil foto siswa sebagai dataURL dulu (agar tidak CORS issue saat render)
                    let photoDataUrl = null;
                    if (s.photo_url) {
                        photoDataUrl = await getBase64Image(s.photo_url);
                    }

                    const qrValue = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;

                    // ── Buat kontainer offscreen (di luar viewport) ──────────────
                    const offscreen = document.createElement('div');
                    offscreen.style.cssText = `
                        position: fixed;
                        top: -9999px; left: -9999px;
                        display: flex; flex-direction: row; gap: 10px;
                        align-items: center;
                        background: transparent;
                        padding: 8px;
                    `;

                    // ── FRONT CARD (inline styles, no Tailwind) ──────────────────
                    const frontCard = document.createElement('div');
                    frontCard.style.cssText = `
                        width: 300px; height: 188px;
                        background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                        border-radius: 16px;
                        position: relative;
                        overflow: hidden;
                        box-shadow: 0 20px 40px rgba(79,70,229,0.35);
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    `;
                    frontCard.innerHTML = `
                        <!-- dekorasi lingkaran blur -->
                        <div style="
                            position:absolute; top:-40px; right:-40px;
                            width:176px; height:176px;
                            background:rgba(255,255,255,0.06);
                            border-radius:50%; filter:blur(20px);
                        "></div>
                        <!-- badge LAPORANMU -->
                        <div style="
                            position:absolute; top:12px; right:12px;
                            display:flex; align-items:center; gap:6px; z-index:10;
                        ">
                            <div style="
                                width:22px; height:22px; border-radius:6px;
                                background:rgba(255,255,255,0.15);
                                display:flex; align-items:center; justify-content:center;
                                border:1px solid rgba(255,255,255,0.2);
                            ">
                                <span style="font-weight:900; font-size:9px; color:white;">L</span>
                            </div>
                            <span style="font-size:8px; font-weight:900; letter-spacing:0.2em; color:rgba(255,255,255,0.85); text-transform:uppercase;">LAPORANMU</span>
                        </div>
                        <!-- isi kartu -->
                        <div style="
                            position:absolute; top:36px; left:16px; right:16px; bottom:28px;
                            display:flex; gap:12px; z-index:10;
                        ">
                            <!-- foto -->
                            <div style="
                                width:66px; height:82px; border-radius:10px;
                                background:rgba(255,255,255,0.12);
                                border:1.5px solid rgba(255,255,255,0.25);
                                overflow:hidden; flex-shrink:0;
                                display:flex; align-items:center; justify-content:center;
                            ">
                                ${photoDataUrl
                            ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;" />`
                            : `<span style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.4);">${(s.name || '?').charAt(0)}</span>`
                        }
                            </div>
                            <!-- teks -->
                            <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between; padding:2px 0;">
                                <div>
                                    <div style="font-size:12px; font-weight:900; color:white; text-transform:uppercase; line-height:1.2; margin-bottom:4px; word-break:break-word;">
                                        ${s.name}
                                    </div>
                                    <div style="font-size:8px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.05em;">
                                        ${s.className || '-'}
                                    </div>
                                    <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.18em; margin-top:2px;">
                                        MUHAMMADIYAH BOARDING SCHOOL
                                    </div>
                                </div>
                                <div style="padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
                                    <div style="font-size:5px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">
                                        NOMOR REGISTRASI
                                    </div>
                                    <div style="font-size:10px; font-weight:700; color:#c7d2fe; font-family:monospace; letter-spacing:0.08em;">
                                        ${s.code || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- footer -->
                        <div style="
                            position:absolute; bottom:8px; left:16px; right:16px;
                            display:flex; justify-content:space-between; align-items:center;
                            opacity:0.22;
                        ">
                            <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                            <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
                        </div>
                    `;

                    // ── BACK CARD (QR) ───────────────────────────────────────────
                    const backCard = document.createElement('div');
                    backCard.style.cssText = `
                        width: 300px; height: 188px;
                        background: white;
                        border-radius: 16px;
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                        display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        position: relative;
                        flex-shrink: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    `;

                    // Render QR ke dataURL langsung — tanpa React root
                    const qrDataUrl = await QRCode.toDataURL(qrValue, {
                        width: 200, errorCorrectionLevel: 'H', margin: 4
                    }).catch(() => null);

                    backCard.innerHTML = `
                        <div style="
                            padding:8px; background:white;
                            border-radius:10px; border:1px solid #e5e7eb;
                            box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:10px;
                        ">
                            ${qrDataUrl
                            ? `<img src="${qrDataUrl}" style="width:70px;height:70px;display:block;" />`
                            : `<div style="width:70px;height:70px;background:#f3f4f6;border-radius:4px;"></div>`
                        }
                        </div>
                        <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">
                            AKSES PORTAL ORANG TUA
                        </div>
                        <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">
                            Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa
                        </div>
                        <div style="
                            position:absolute; bottom:10px; left:0; right:0;
                            display:flex; justify-content:space-between;
                            padding:0 16px; opacity:0.2;
                        ">
                            <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                            <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
                        </div>
                    `;

                    offscreen.appendChild(frontCard);
                    offscreen.appendChild(backCard);
                    document.body.appendChild(offscreen);

                    // ── Capture dengan html2canvas ───────────────────────────────
                    const canvas = await html2canvas(offscreen, {
                        scale: 3,
                        useCORS: true,
                        allowTaint: false,
                        backgroundColor: null,
                        logging: false,
                    });

                    document.body.removeChild(offscreen);

                    const imgData = canvas.toDataURL('image/png');
                    const maxCardW = pageWidth - margin * 2;
                    const ratio = canvas.height / canvas.width;
                    const cardImgW = maxCardW;
                    const cardImgH = maxCardW * ratio;
                    const cardImgX = (pageWidth - cardImgW) / 2;

                    doc.addImage(imgData, 'PNG', cardImgX, cardAreaY, cardImgW, cardImgH);
                    cardAreaH = cardImgH;
                } catch (captureErr) {
                    console.warn('Capture kartu gagal, fallback ke jsPDF manual:', captureErr);
                    cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
                }
            } else {
                // Bulk print → pakai fallback
                cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
            }

            // ════════════════════════════════════════════
            // 4. KOTAK DETAIL AKSES + INFO TAMBAHAN
            // ════════════════════════════════════════════
            const detailY = cardAreaY + cardAreaH + 5;
            const detailH = 58;

            doc.setFillColor(248, 249, 252);
            doc.setDrawColor(220, 225, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, detailY, pageWidth - margin * 2, detailH, 4, 4, 'FD');

            // Header kiri: DETAIL DATA AKSES
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            setAccent();
            doc.text('DETAIL DATA AKSES', margin + 6, detailY + 10);

            // Header kanan: PETUNJUK — geser ke tengah kotak
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            setAccent();
            doc.text('PETUNJUK', margin + 90, detailY + 10);

            // Garis pemisah internal
            doc.setDrawColor(215, 220, 240);
            doc.setLineWidth(0.3);
            doc.line(margin + 6, detailY + 13, pageWidth - margin - 6, detailY + 13);
            // Garis vertikal pemisah — di tengah kotak (170mm / 2 = 85mm)
            doc.line(margin + 85, detailY + 13, margin + 85, detailY + detailH - 6);

            // Data kiri — 5 baris
            const rows = [
                ['ID Registrasi', s.code || '-'],
                ['PIN Akses', s.pin || '-'],
                ['Tahun Ajaran', s.academic_year || '2026/2027'],
                ['Status', s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Aktif'],
                ['Portal', `${window.location.origin}/check`],
            ];
            rows.forEach(([label, val], idx) => {
                const rowY = detailY + 20 + idx * 8;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(130, 130, 150);
                doc.text(label, margin + 6, rowY);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(label === 'Portal' ? 7 : 8.5);
                doc.setTextColor(20, 20, 50);
                doc.text(String(val), margin + 38, rowY);
            });

            // Petunjuk kanan — 4 tips (mulai dari center divider + padding)
            const tips = [
                '1. Simpan dokumen ini dengan baik.',
                '2. Akses portal melalui URL di kolom kiri.',
                '3. Masukkan PIN apabila diminta sistem.',
                '4. Hubungi sekolah jika ada kendala akses.',
            ];
            tips.forEach((tip, idx) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(70, 70, 90);
                doc.text(tip, margin + 90, detailY + 20 + idx * 8);
            });

            // ════════════════════════════════════════════
            // 5. INFO WALI MURID (selalu tampil)
            // ════════════════════════════════════════════
            const waliY = detailY + detailH + 4;
            const waliBoxH = 26;

            doc.setFillColor(250, 250, 255);
            doc.setDrawColor(220, 225, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, waliY, pageWidth - margin * 2, waliBoxH, 3, 3, 'FD');

            // Judul section
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            setAccent();
            doc.text('DATA WALI MURID', margin + 6, waliY + 8);

            // Garis bawah judul
            doc.setDrawColor(215, 220, 240);
            doc.setLineWidth(0.3);
            doc.line(margin + 6, waliY + 11, pageWidth - margin - 6, waliY + 11);

            // 3 kolom rata tengah: Nama Wali | Hubungan | No. Handphone
            const waliCols = [
                { label: 'Nama Wali', val: s.guardian_name || '-' },
                { label: 'Hubungan', val: s.guardian_relation || '-' },
                { label: 'No. Handphone', val: s.phone || '-' },
            ];
            const waliColW = (pageWidth - margin * 2) / 3;
            waliCols.forEach(({ label, val }, idx) => {
                const wx = margin + waliColW * idx + waliColW / 2;
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(130, 130, 150);
                doc.text(label, wx, waliY + 17, { align: 'center' });
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(20, 20, 50);
                doc.text(String(val), wx, waliY + 23, { align: 'center' });
            });

            // ════════════════════════════════════════════
            // 6. FOOTER & TANDA TANGAN
            // ════════════════════════════════════════════
            const signBaseY = waliY + waliBoxH + 6;
            const signY = Math.max(signBaseY, 225);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            const dateStr = 'Jember, ' + new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
            doc.text(dateStr, pageWidth - margin - 55, signY);
            doc.text('Admin Laporanmu', pageWidth - margin - 55, signY + 22);

            // Garis tanda tangan
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.3);
            doc.line(pageWidth - margin - 55, signY + 18, pageWidth - margin, signY + 18);

            // Catatan kecil di kiri (sejajar ttd)
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(150, 150, 150);
            doc.text('* Dokumen ini diterbitkan secara digital oleh sistem Laporanmu.', margin, signY + 5);
            doc.text('  Harap simpan dokumen ini dengan baik dan jangan disebarluaskan.', margin, signY + 10);

            // Footer bawah halaman
            doc.setDrawColor(220, 220, 230);
            doc.setLineWidth(0.2);
            doc.line(margin, 283, pageWidth - margin, 283);

            doc.setFontSize(6.5);
            doc.setTextColor(180, 180, 180);
            const docSerial = `DOC-${s.code}-${Date.now().toString(36).toUpperCase()}`;
            doc.text(`No. Seri: ${docSerial}`, margin, 287);
            doc.text('Dokumen Digital Otomatis · MBS Tanggul · Laporanmu', pageWidth / 2, 287, { align: 'center' });
        }

        doc.save(`${targets.length > 1 ? 'Kartu Akses - Massal' : 'Kartu Akses - ' + targets[0].name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
        addToast('Kartu akses berhasil dibuat!', 'success');
        await logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'students',
            recordId: targets.length === 1 ? targets[0].id : null,
            newData: { format: 'PDF', via: 'print_card', count: targets.length }
        })
    } catch (e) {
        console.error(e);
        addToast('Gagal membuat dokumen PDF', 'error');
    } finally {
        setGeneratingPdf(false);
    }
};

// ── Print Single (convenience wrapper) ───────────────────────────────────
export const handlePrintSingle = (student, captureRef, callbacks) => {
    if (!student) return;
    generateStudentPDF([student], captureRef, callbacks);
};