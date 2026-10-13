# AGENTS.md — Laporanmu

Platform manajemen pesantren/sekolah. React 19 + Vite 7 + Tailwind v4 + Supabase JS 2.
UI berbahasa Indonesia. Istilah domain: santri, musyrif, kelas, raport, pelanggaran, prestasi.
Prioritas: ringan, cepat, berguna, konsisten. Jangan menambah hal yang tidak diminta.

## Cara kerja
- Baca file terkait dulu. Cek `src/shared/components/` sebelum membuat komponen baru.
- Ubah seminimal mungkin. Jangan refactor di luar scope tugas; laporkan saja temuannya.
- Jangan tambah dependency tanpa izin. Sebutkan alasan + dampak bundle jika mengusulkan.
- Kalau ragu soal schema DB, baca `database.md`, jangan menebak nama kolom.
- Selesai? Jalankan `npm run build` dan pastikan tidak error.

## Struktur
- `src/features/{fitur}/{pages,hooks,components,ui,utils}/`
- Pages `XxxPage.jsx`, hooks `useXxx.jsx`, utils `xxxUtils.js`
- Import wajib pakai alias di `vite.config.js` (`@features`, `@shared`, `@context`, `@lib`, `@hooks`, `@utils`)
- File baru atau yang kamu ubah banyak: maks ~400 baris. File raksasa yang sudah ada
  (`AttendancePage`, `RaportPage`, `PlaygroundPage`, `use*Core`): JANGAN menambah baris di sana.
  Tambahan masuk ke file/hook baru. Lihat skill `split-large-file`.

## Supabase
- Kolom eksplisit, bukan `select('*')`.
- Query list wajib `.limit()` / `.range()`.
- Selalu cek `error` sebelum pakai `data`.
- Realtime: cleanup `supabase.removeChannel(channel)` di return effect; debounce refetch.
- Mutasi data penting wajib `logAudit()`.
- Jangan pernah pakai service_role key di frontend.
- Detail: skill `supabase-query-safety`.

## UI/UX
- Warna lewat token CSS (`var(--color-*)`), bukan `bg-white`, `text-gray-*`, hex.
- Pakai komponen shared: `Modal`, `ConfirmDialog`, `PageHeader`, `Breadcrumb`, `Skeleton`,
  `EmptyState`, `StatCard`, `RichSelect`, `RichDatePicker`, `Pagination`, `DataTable`, `BulkActionsBar`.
- Setiap halaman data punya 3 state: loading (`Skeleton`), empty (`EmptyState`), error (toast + pesan di UI).
- Ikon baru: Lucide. Jangan campur FontAwesome dan Lucide di satu file. Jangan pakai emoji sebagai ikon.
- `glass` hanya untuk elemen melayang (nav, modal, popover). Card konten pakai surface + border.
- Mobile-first: tombol/target sentuh min 40px, tabel dibungkus `table-container` (scroll-x).
- Setiap input punya `<label htmlFor>` atau `aria-label`. Tombol ikon punya `aria-label`.
- Detail: skill `laporanmu-ui-guide`.

## Performa
- Library berat (`jspdf`, `html2canvas`, `xlsx`, `jszip`) hanya lewat `await import()` saat tombol diklik.
- List panjang: row component pakai `memo`; data turunan pakai `useMemo`, bukan `useState`.
- Route baru wajib lazy-loaded lewat `lazyRetry`.
- Detail: skill `perf-checklist`.

## Dilarang
- `console.log` tersisa, TODO menggantung, dead code, link nav ke route yang belum ada
- Copy-paste blok JSX besar (jadikan komponen)
- Copywriting generik ala AI ("Seamless", "Powerful", "Unlock"), data dummy/lorem di production
- Gradient/blur/animasi dekoratif tanpa fungsi; card di dalam card
- Class CSS duplikat di `index.css` (`.badge`, `.input`, scrollbar sudah pernah duplikat)

## Role & akses
Route terlindungi dibungkus `ProtectedRoute`, lalu `RoleRoute` / `FlagRoute` / `RoleFlagRoute`.
Cek role di UI hanya untuk UX; keamanan sebenarnya di RLS.

## Sebelum bilang "selesai"
Skill `anti-slop-review` dijalankan pada diff kamu sendiri.