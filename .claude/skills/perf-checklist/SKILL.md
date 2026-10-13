---
name: perf-checklist
description: Gunakan sebelum menyelesaikan fitur baru atau perubahan besar di Laporanmu, untuk mengecek dampak bundle, query, dan re-render.
---

# Perf Checklist

Jalankan untuk setiap perubahan, laporkan hasilnya singkat.

## Bundle
- [ ] Import `jspdf`, `jspdf-autotable`, `html2canvas`, `xlsx`, `jszip`, `papaparse`, `qrcode` di level module? Pindahkan ke `await import()` di handler.
- [ ] Route baru lazy-loaded via `lazyRetry`.
- [ ] Tidak menambah dependency baru tanpa izin.
- [ ] Import ikon per-nama (`import { Plus } from 'lucide-react'`), bukan namespace.
- [ ] Bila perubahan besar: `npm run build` dan perhatikan chunk terbesar.

## Data
- [ ] Tidak ada `select('*')`, query list punya limit/range.
- [ ] Fetch tidak diulang tanpa perlu (efek dengan dependency stabil, tidak ada fetch di dalam render).
- [ ] Realtime: cleanup ada, refetch di-debounce.
- [ ] Filter/sort/search lokal pakai `useMemo`; input pencarian di-debounce.

## Render
- [ ] Row komponen di list panjang pakai `memo`; callback dari parent distabilkan (`useCallback`) bila perlu.
- [ ] Tidak ada state yang bisa dihitung dari state lain (derived data → `useMemo`).
- [ ] Tidak ada rantai `useEffect` yang saling memicu; sederhanakan jadi satu handler/hook.
- [ ] Tidak menaruh state global di level terlalu tinggi bila hanya dipakai satu halaman.

## Gambar
- Foto santri dari Supabase Storage: pakai ukuran transform kecil untuk thumbnail, `loading="lazy"`, `width`/`height` eksplisit.
