---
name: split-large-file
description: Gunakan saat harus mengubah atau menambah fitur di file raksasa (AttendancePage, RaportPage, PlaygroundPage, useStudentsCore, useRaportCore, useEnrollmentCore) atau file mana pun mendekati 400 baris.
---

# Split Large File

Tujuan: fitur baru tidak memperbesar file raksasa, dan pecahan dilakukan bertahap tanpa mengubah perilaku.

## Aturan utama
1. Fitur baru → file/hook/komponen baru, diimpor ke file lama. Jangan menambah blok besar di file lama.
2. Pemecahan = refactor murni: tanpa mengubah perilaku, tanpa perbaikan lain di commit yang sama.
3. Satu pecahan per langkah, lalu `npm run build`; cek halaman terkait tetap jalan.

## Urutan memecah
1. Konstanta/helper murni → `xxxUtils.js`
2. Blok state + efek yang berkaitan → custom hook per concern (mis. `useStudentsList`, `useStudentForm`, `useStudentImport`)
3. Bagian JSX mandiri (toolbar, modal, tabel, panel) → komponen di `components/`
4. Modal/form besar → komponen sendiri, state lokal dipindah ke dalamnya
5. Efek yang saling memicu → satukan atau ubah jadi handler event

## Setelah memecah
- Page akhir bertugas merangkai hook + komponen (target < 400 baris).
- Dependency array `useEffect` dicek ulang; tidak ada stale closure atau loop.
- Laporkan: file asal, file baru, baris sebelum/sesudah, dan apa yang sengaja tidak disentuh.
