import React, { useRef } from 'react'
import { Printer, Download, Loader2 } from 'lucide-react'
import { fmtDateIndo, fmtDateTimeShort, fmtDateShort } from '../utils/leavePermitConstants'

/**
 * A5 print layout (148mm x 210mm) for leave permit.
 * Renders a self-contained block that can be captured for PDF.
 */
export default function LeavePermitPrint({ permit, onPrint, onPdf, generatingPdf }) {
  const printRef = useRef(null)

  if (!permit) return null

  const student = permit.student || {}
  const className = student.classes?.name || student.class?.name || '-'
  // Handle both singular (dorm) and plural (dorms) Supabase join alias
  const dormData = student.dorms || student.dorm || {}
  const dormName = dormData.ar || dormData.building || student.dorm_name || '-'
  const signatureUrl = permit.signature?.signature_url || null
  const isDigital = permit.signature_type === 'digital' && signatureUrl

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPrint?.(printRef.current)}
          className="h-9 flex items-center gap-2 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-[var(--color-primary)]/20"
        >
          <Printer className="w-3.5 h-3.5" /> Cetak
        </button>
        {onPdf && (
          <button
            onClick={() => onPdf(printRef.current)}
            disabled={generatingPdf}
            className="h-9 flex items-center gap-2 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black uppercase tracking-wider text-[var(--color-text)] hover:bg-[var(--color-border)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
        )}
      </div>

      {/* Print preview / capture target */}
      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-white">
        <div
          ref={printRef}
          style={{
            width: '148mm',
            minHeight: '210mm',
            padding: '10mm 12mm',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '11pt',
            lineHeight: '1.4',
            color: '#000',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '2mm' }}>
            <div style={{ fontSize: '13pt', letterSpacing: '0.02em' }}>PENGASUHAN SANTRI</div>
            <div style={{ fontSize: '12pt', letterSpacing: '0.02em', marginTop: '1mm' }}>
              MUHAMMADIYAH BOARDING SCHOOL TANGGUL – JEMBER
            </div>
          </div>

          {/* Address box */}
          <div style={{
            border: '1.5px solid #000',
            padding: '2mm 4mm',
            textAlign: 'center',
            fontSize: '9pt',
            marginBottom: '5mm',
          }}>
            Kampus Putra : Jl. Pemandian No.88 RT.002 RW.003 Dusun Krajan II Patemon Tanggul - Jember Jawa Timur 68155
          </div>

          {/* Title */}
          <div style={{
            textAlign: 'center',
            fontSize: '14pt',
            fontWeight: 'bold',
            textDecoration: 'underline',
            margin: '5mm 0',
            letterSpacing: '0.03em',
          }}>
            IZIN KELUAR PONDOK
          </div>

          {/* Intro paragraph */}
          <p style={{ marginBottom: '5mm', textAlign: 'justify', textIndent: '0' }}>
            Dengan ini kami Staf Pengasuhan Santri Muhammadiyah Boarding School Tanggul{' '}
            <strong style={{ textDecoration: 'underline' }}>Memberikan Izin Keluar Pondok</strong>{' '}
            kepada santri yang namanya tertera di bawah ini :
          </p>

          {/* 2-column data table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', fontSize: '11pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '22%', padding: '1.5mm 0', verticalAlign: 'top' }}>Nama</td>
                <td style={{ width: '3%', padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ width: '25%', padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {student.name || '....................................'}
                </td>
                <td style={{ width: '5%' }}></td>
                <td style={{ width: '18%', padding: '1.5mm 0', verticalAlign: 'top' }}>Kelas</td>
                <td style={{ width: '3%', padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {className}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>Kamar</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {dormName}
                </td>
                <td></td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>No.Telepon</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {permit.phone || student.phone || '-'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>Tujuan</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {permit.destination || '....................................'}
                </td>
                <td></td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>Keperluan</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {permit.purpose || '....................................'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>Hari/Tanggal</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {fmtDateIndo(permit.leave_date)}
                </td>
                <td></td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>Batas Waktu</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top' }}>:</td>
                <td style={{ padding: '1.5mm 0', verticalAlign: 'top', borderBottom: '0.5pt dotted #999' }}>
                  {fmtDateTimeShort(permit.return_deadline)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Closing */}
          <p style={{ marginTop: '4mm', marginBottom: '8mm', textAlign: 'justify' }}>
            Demikian surat ini kami buat agar menjadi maklum bagi yang berkepentingan.
          </p>

          {/* Date line */}
          <div style={{ textAlign: 'right', marginBottom: '8mm', fontSize: '11pt' }}>
            Tanggul, {fmtDateShort(permit.issued_at || new Date().toISOString())}
          </div>

          {/* Signature boxes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Staff Pengasuhan Santri */}
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '2mm' }}>
                Staf Pengasuhan Santri
              </div>
              <div style={{ height: '18mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isDigital && (
                  <img
                    src={signatureUrl}
                    alt="TTD Staf"
                    crossOrigin="anonymous"
                    style={{ maxHeight: '18mm', objectFit: 'contain' }}
                  />
                )}
              </div>
              <div style={{ borderTop: '1px solid #000', width: '65%', margin: '0 auto' }} />
            </div>

            {/* Wali Santri */}
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '2mm' }}>
                Wali Santri
              </div>
              <div style={{ height: '18mm' }}>{/* Blank for manual signature */}</div>
              <div style={{ borderTop: '1px solid #000', width: '65%', margin: '0 auto' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
