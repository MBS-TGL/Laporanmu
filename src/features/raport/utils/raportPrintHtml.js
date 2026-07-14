import { RAPORT_AR_FONT, RAPORT_FONT_LINKS, RAPORT_SANS, RAPORT_SERIF } from './raportFonts'

/**
 * Base CSS for raport print/PDF — intentionally excludes Tailwind/app CSS
 * so preview, browser print, and Browserless PDF render identically.
 */
export const getRaportPrintBaseCss = (pageSize = 'f4') => {
  const pageW = pageSize === 'f4' ? '215mm' : '210mm'
  const pageH = pageSize === 'f4' ? '330mm' : '297mm'
  const pad = pageSize === 'f4' ? '8mm 10mm 8mm 20mm' : '4mm 10mm 4mm 20mm'

  return `
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${pageW};
      min-height: ${pageH};
      background: #fff;
      color: #000;
      font-family: ${RAPORT_SERIF};
      font-size: 11pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; height: auto; mix-blend-mode: multiply; }
    table { border-collapse: collapse; }
    .raport-card {
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: #fff !important;
      color: #000 !important;
      font-family: ${RAPORT_SERIF} !important;
      font-size: 11pt !important;
      line-height: 1.4 !important;
      width: ${pageW} !important;
      min-width: ${pageW} !important;
      min-height: ${pageH} !important;
      height: ${pageH} !important;
      margin: 0 !important;
      padding: ${pad} !important;
      box-sizing: border-box !important;
      box-shadow: none !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .raport-card-body {
      flex: 1 1 auto;
      min-height: 0;
    }
    .raport-card-footer {
      flex-shrink: 0;
      margin-top: auto;
    }
    .raport-print-metadata {
      font-family: ${RAPORT_SANS} !important;
      position: relative !important;
      left: auto !important;
      right: auto !important;
      bottom: auto !important;
      margin-top: 6mm;
    }
    .school-name-ar,
    .school-subtitle-ar,
    [style*="Amiri"] {
      font-family: ${RAPORT_AR_FONT} !important;
      letter-spacing: normal !important;
    }
    .school-name-ar,
    .school-subtitle-ar,
    [dir="rtl"] {
      direction: rtl;
      unicode-bidi: embed;
    }
    .raport-signature-row {
      display: flex !important;
      flex-direction: row !important;
      justify-content: space-between !important;
      gap: 10px !important;
    }
    .raport-signature-block {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      text-align: center !important;
      flex: 1 !important;
      min-width: 0 !important;
    }
    .raport-signature-label,
    .raport-signature-name {
      width: 100% !important;
      text-align: center !important;
    }
    .raport-signature-label {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .raport-signature-image {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
    }
    @page {
      size: ${pageSize === 'f4' ? '215mm 330mm' : 'A4'};
      margin: 0;
    }
    @media print {
      body { background: #fff; }
      .raport-card {
        box-shadow: none !important;
        border: none !important;
      }
    }
  `
}

/**
 * Build self-contained HTML for Browserless PDF generation.
 * Does NOT include Tailwind/app CSS — only raport-specific rules + inline styles.
 */
export const buildRaportPDFHtml = (cardEl, pageSize = 'f4') => {
  const cardClone = cardEl.cloneNode(true)
  // Pindahkan style dinamis dari card ke <head> (ukuran font header, logo, dll.)
  const cardStyles = Array.from(cardClone.querySelectorAll('style'))
    .map((el) => el.textContent)
    .join('\n')
  cardClone.querySelectorAll('style').forEach((el) => el.remove())

  const cardHTML = cardClone.outerHTML

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${RAPORT_FONT_LINKS}
  <style>
    ${getRaportPrintBaseCss(pageSize)}
    ${cardStyles}
  </style>
</head>
<body>
  ${cardHTML}
</body>
</html>`
}

/**
 * Build HTML for browser print window (one or more cards).
 */
export const buildRaportPrintDocumentHtml = (cardsHtml, pageSize = 'f4', title = 'Raport') => `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  ${RAPORT_FONT_LINKS}
  <style>
    ${getRaportPrintBaseCss(pageSize)}
  </style>
</head>
<body>${cardsHtml}</body>
</html>`
