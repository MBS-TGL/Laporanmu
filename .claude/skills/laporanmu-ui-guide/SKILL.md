---
name: laporanmu-ui-guide
description: Gunakan saat membuat atau mengubah halaman, komponen, tabel, atau form di Laporanmu agar UI konsisten, mobile-friendly, dan aksesibel.
---

# Laporanmu UI Guide

## Sebelum membuat komponen
Cek `src/shared/components/` dulu. Pakai yang ada: Modal, ConfirmDialog, PageHeader, Breadcrumb,
Skeleton, EmptyState, StatCard, DataTable, Pagination, RichSelect, RichDatePicker, BulkActionsBar.
Butuh variasi? Perluas komponen shared lewat props, jangan fork.

## Token
- Warna: `--color-primary/-surface/-surface-alt/-text/-text-muted/-border`, semantik `--color-success/-warning/-danger`.
- Dilarang `bg-white`, `text-gray-900`, `border-gray-200`, hex, rgb. Dark mode otomatis lewat token.
- Skala font: 10px (label kecil), 11px (caption), `text-xs`, `text-sm` (default isi), `text-base`.
  Tidak ada 8px/9px. Jangan buat ukuran baru.
- Radius dan shadow: pakai yang sudah ada di `index.css`. Jangan menambah definisi `.badge`, `.input`, scrollbar baru; ubah yang ada.

## Permukaan
- Card konten: surface + border, tanpa blur.
- `glass` hanya untuk elemen melayang (nav, modal, popover). Satu layar maksimal beberapa elemen glass.
- Dilarang card di dalam card, gradient dekoratif, glow blur bundar, emoji sebagai ikon.
- Halaman status (akses ditolak, modul nonaktif, maintenance, 404): satu komponen `StatusPage`, bukan copy-paste.

## Halaman data: wajib 3 state
loading `Skeleton` → empty `EmptyState` (teks spesifik, ada aksi bila relevan) → error (pesan jelas + coba lagi).

## Tabel
- `DataTable` atau `table-container` (overflow-x-auto). Kolom penting di kiri.
- Mobile: pertimbangkan tampilan kartu untuk data yang sering dilihat di HP (musyrif/guru banyak pakai HP).
- Aksi per baris: tombol ikon min 40px, ada `aria-label`.

## Form
- Setiap input: `<label htmlFor>` terlihat (atau `aria-label`), bukan hanya placeholder.
- Validasi di util bersama (`validators.js`), pesan error di bawah field, bahasa Indonesia yang manusiawi.
- Tombol submit: disabled + indikator saat proses; jangan bisa double submit.

## Copywriting
Bahasa Indonesia, spesifik domain ("Santri belum punya data raport bulan ini"), bukan slogan.
Tanpa emoji di pesan toast.

## Ikon
Lucide untuk yang baru. Tombol ikon tanpa teks wajib `aria-label`.
