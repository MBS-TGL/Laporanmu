import React from 'react';
import { RAPORT_AR_FONT } from '@features/raport/utils/raportFonts';

export default function SignatureBlock({ label, nama, signatureUrl, mode, isAr = false, labelPrefix }) {
  const isDigital = mode === 'digital' && signatureUrl;
  const labelSize = isAr ? '13pt' : '10.5pt';
  const nameSize = isAr ? '14pt' : '11.5pt';

  return (
    <div
      className="raport-signature-block"
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Label — FIXED height agar semua block sejajar */}
      <div
        className="raport-signature-label"
        style={{
          width: '100%',
          height: isAr ? '42px' : '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: labelSize,
          fontWeight: 700,
          fontFamily: isAr ? RAPORT_AR_FONT : 'inherit',
          whiteSpace: 'pre-line',
          lineHeight: isAr ? 1.2 : 1.15,
          textAlign: 'center',
          color: '#111827',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {labelPrefix && (
          <span style={{ fontSize: '9.5pt', fontWeight: 400, position: 'absolute', bottom: '100%', whiteSpace: 'nowrap' }}>{labelPrefix}</span>
        )}
        {label}
      </div>

      {/* Signature Area — garis + nama, posisi sama untuk semua block */}
      <div
        className="raport-signature-area"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Area tanda tangan — selalu ada 80px untuk basah/digital */}
        <div style={{ height: '80px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDigital && (
            <img src={signatureUrl} alt={`TTD ${label}`} crossOrigin="anonymous" style={{ maxHeight: '80px', objectFit: 'contain' }} />
          )}
        </div>

        {/* Garis tanda tangan */}
        <div style={{ width: isAr ? '148px' : '128px', borderTop: '1px solid rgb(156, 163, 175)' }} />

        {/* Nama penandatangan */}
        <div style={{ width: '100%', fontWeight: 700, fontSize: nameSize, fontFamily: isAr ? RAPORT_AR_FONT : 'inherit', marginTop: '8px', textAlign: 'center', color: '#111827', lineHeight: isAr ? 1.35 : 1.25 }}>
          {nama}
        </div>
      </div>
    </div>
  );
}
