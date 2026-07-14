import React from 'react';
import { RAPORT_AR_FONT } from '@features/raport/utils/raportFonts';

const blockStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

export default function SignatureBlock({ label, nama, signatureUrl, mode, isAr = false }) {
  const isDigital = mode === 'digital' && signatureUrl;
  const labelSize = isAr ? '13pt' : '10.5pt';
  const nameSize = isAr ? '14pt' : '11.5pt';
  const labelHeight = isAr ? '56px' : '48px';

  return (
    <div className="raport-signature-block" style={blockStyle}>
      {/* Label Jabatan (support newlines) */}
      <div
        className="raport-signature-label"
        style={{
          minHeight: labelHeight,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: labelSize,
          fontWeight: 700,
          fontFamily: isAr ? RAPORT_AR_FONT : 'inherit',
          whiteSpace: 'pre-line',
          lineHeight: isAr ? 1.35 : 1.25,
          marginBottom: '8px',
          textAlign: 'center',
          color: '#111827',
        }}
      >
        {label}
      </div>

      {/* Signature Area (height fixed 64px) */}
      <div
        className="raport-signature-image"
        style={{
          height: '64px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDigital && (
          <img
            src={signatureUrl}
            alt={`TTD ${label}`}
            crossOrigin="anonymous"
            style={{ maxHeight: '64px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Unified Signature Line Divider */}
      <div
        className="raport-signature-line"
        style={{
          width: isAr ? '148px' : '128px',
          borderTop: '1px solid rgb(156, 163, 175)',
          marginTop: '8px',
        }}
      />

      {/* Penandatangan Name */}
      <div
        className="raport-signature-name"
        style={{
          width: '100%',
          fontWeight: 700,
          fontSize: nameSize,
          fontFamily: isAr ? RAPORT_AR_FONT : 'inherit',
          marginTop: '8px',
          textAlign: 'center',
          color: '#111827',
          lineHeight: isAr ? 1.35 : 1.25,
        }}
      >
        {nama}
      </div>
    </div>
  );
}
