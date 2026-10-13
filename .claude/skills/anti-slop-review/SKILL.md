---
name: anti-slop-review
description: Gunakan untuk me-review diff sendiri atau PR di Laporanmu sebelum dinyatakan selesai; mendeteksi pola "AI slop" dan pelanggaran konvensi.
---

# Anti-Slop Review

Periksa diff (`git diff`), bukan seluruh repo. Laporkan hanya yang ditemukan, dengan file:baris.

## Kode
- [ ] `console.log`, TODO menggantung, kode mati, import tidak terpakai
- [ ] Komentar yang cuma mengulang kode ("// set state")
- [ ] Abstraksi berlebihan: komponen/hook dipakai satu tempat, props > ~8, wrapper tanpa fungsi
- [ ] Blok JSX hampir identik diulang (≥2x) → jadikan komponen
- [ ] File yang diubah melewati ~400 baris, atau menambah baris ke file raksasa
- [ ] Logika bisnis di dalam JSX

## UI
- [ ] Warna hardcode (`bg-white`, hex, `text-gray-*`)
- [ ] Gradient/blur/glow/animasi dekoratif, card di dalam card, badge/pill tanpa fungsi
- [ ] Emoji sebagai ikon atau di pesan toast
- [ ] Copywriting generik, lorem, data dummy
- [ ] Ukuran font di luar skala, radius/shadow baru
- [ ] Komponen shared yang sebenarnya sudah ada dibuat ulang
- [ ] Salah satu dari loading/empty/error state hilang
- [ ] Input tanpa label, tombol ikon tanpa `aria-label`, target sentuh < 40px

## Data
- [ ] `select('*')`, query tanpa limit, error tidak ditangani
- [ ] Mutasi penting tanpa `logAudit`
- [ ] Link nav ke route yang belum ada

## Format laporan
Tabel: | Temuan | file:baris | Perbaikan |. Bila bersih, tulis "bersih". Perbaiki yang kecil langsung; yang besar cukup dilaporkan.
