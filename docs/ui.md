# UI Guide — Laporanmu

Design system ringan untuk aplikasi Laporanmu. Prinsipnya satu: **flat, kuah sedikit** —
warna dari token, komponen dari `@shared/components`, tanpa gradient/glass/glow.

## Token Warna (src/index.css)

Token dideklarasikan sebagai CSS var di `:root`/`.dark`, lalu didaftarkan ke Tailwind v4
lewat `@theme inline` sehingga tersedia sebagai utilitas:

| Token | Utilitas | Pakai untuk |
|---|---|---|
| `--color-primary` | `bg-primary`, `text-primary`, `border-primary` | brand, tombol utama, link, fokus |
| `--color-primary-dark` | `bg-primary-dark` | hover primary |
| `--color-success` / `warning` / `danger` (+ `-dark`) | `bg-success`, `text-danger`, … | status semantik |
| `--color-app-bg` | `bg-app-bg` | latar halaman |
| `--color-surface` | `bg-surface` | kartu, sidebar, panel |
| `--color-surface-alt` | `bg-surface-alt` | hover, input dark, tab |
| `--color-text` / `--color-text-muted` | `text-text`, `text-text-muted` | teks primer / sekunder |
| `--color-border` | `border-border` | divider, border kartu/input |

Opacity modifier bekerja: `bg-primary/10`, `border-border/60`, dst.

> **Kenapa `@theme inline`?** Utilitas dikompilasi langsung ke `var(--color-primary)`
> sehingga override `.dark` tetap berlaku dan token tidak di-emit ulang ke `:root`
> (menghindari referensi sirkular).

## Komponen (src/shared/components)

Primitif:

```jsx
import { Button, Badge, Card, Input, Textarea, Select, FieldLabel } from '@shared/components'

<Button variant="primary|secondary|danger|success|warning|outline|ghost" size="sm|md|lg|icon" loading={saving}>
<Button onClick={save}>Simpan</Button>

<Badge variant="primary|success|warning|danger|neutral">Aktif</Badge>

<Card className="p-4">…</Card>          {/* class .card dari index.css */}

<FieldLabel htmlFor="nis">NIS</FieldLabel>
<Input id="nis" error={!!errors.nis} />
<Textarea rows={3} />
<Select>…</Select>                       {/* untuk select sederhana; dropdown kompleks pakai RichSelect */}
```

Komponen yang sudah ada sebelumnya: `Modal`, `ConfirmDialog`, `RichSelect`,
`RichDatePicker/TimePicker/DateTimePicker`, `PageHeader`, `Pagination`, `Skeleton`
(+ varian tabel/kartu), `StatCard`, `DataTable`, `EmptyState`, `Breadcrumb`,
`BulkActionsBar`, `AuditTimeline`, `GlobalErrorBoundary`, ikon brand/gender
(`WhatsAppIcon`, `MarsIcon`, `VenusIcon`, `VenusMarsIcon`).

Showcase lengkap + do/don't ada in-app: **Admin → Playground** (tab *Library → Primitives*).

## Ikon

**Satu library: lucide-react.** FontAwesome sudah dihapus.

```jsx
import { Users, Save } from 'lucide-react'
<Users className="w-4 h-4" />
```

- Ukuran via class `w-* h-*` atau prop `size={n}` — **bukan** `text-*` (itu hanya mengubah warna via `currentColor`).
- Spinner: `<LoaderCircle className="animate-spin" />`.
- Ikon brand/gender yang tidak ada di lucide: `WhatsAppIcon`, `MarsIcon`, `VenusIcon`,
  `VenusMarsIcon` dari `@shared/components/icons/BrandIcons`.

## Skala Chrome & Komponen (wajib konsisten)

Semua nilai di bawah adalah satu-satunya pilihan untuk UI chrome & komponen shared —
tidak ada lagi ukuran arbiter per 1px (`text-[11px]`, `h-[60px]`, dll).

**Tinggi & ritme:**
| Elemen | Nilai |
|---|---|
| Topbar & bagian logo sidebar | `h-14` (56px, sejajar) |
| Icon button chrome (topbar/sidebar) | `w-9 h-9` + `rounded-lg` |
| Item nav sidebar | `h-9` + `rounded-lg` |
| Button | sm `h-8` · md `h-10` · lg `h-11` (shared `Button`) |
| Input/select/textarea | class `.input-field` ≈ h-10 |
| Konten halaman (DashboardLayout main) | `px-3 sm:px-4 lg:px-5` — sejajar tepi dengan topbar |
| Card / modal / dropdown / popover | `rounded-xl` |
| Bottom sheet mobile | `rounded-t-2xl` (desktop `rounded-xl`) |
| Shadow | `shadow-sm` kartu · `shadow-xl` mengambang |

**Tipografi (Plus Jakarta Sans):**
| Peran | Class |
|---|---|
| Judul halaman (`PageHeader`) | `text-xl sm:text-2xl font-bold` |
| Nilai StatCard | `text-2xl font-bold` |
| Teks UI umum | `text-sm font-medium` |
| Label mikro / uppercase / meta | `text-xs font-semibold tracking-wider` |
| Label nav mobile (BottomNav) | `text-xs font-bold` (dengan `truncate`) |
| Ikon toolbar | `w-5 h-5`; ikon inline padat | `w-4.5 h-4.5` |
| Berat di chrome | `font-semibold`/`font-bold` — **dilarang** `font-black`/`font-extrabold` (PJS > 700 terlihat gemuk) |

Warna chrome selalu token (`text-text-muted`, `bg-surface-alt`, `text-danger`, …) dan
transisi `duration-150–200` per-properti.

## Konvensi Visual

1. **Warna hanya dari token.** Dilarang hardcode palet (`bg-indigo-600`, `#3b82f6`, …)
   untuk kode baru. Class lama `bg-[var(--color-primary)]` masih valid dan setara `bg-primary`.
2. **Flat.** Tombol solid tanpa gradient; kartu = surface + border + shadow tipis
   (class `.card`). Tanpa glow orbs / ambient blur. `.glass` kini surface solid.
3. **Gradient dilarang untuk dekorasi.** Satu-satunya pengecualian: mask fungsional
   yang fade ke transparent (`to-transparent`) — scrim foto agar teks terbaca,
   fade-edge scrollbar, shimmer/skeleton sweep.
4. **Tanpa backdrop-blur.** Overlay/panel pakai surface solid. Blur = operasi GPU O(r²).
5. **Shadow dua tingkat saja:** `shadow-sm` untuk kartu/panel, `shadow-xl` untuk elemen
   yang benar2 mengambang (modal, dropdown, popover, FAB, toast). Dilarang:
   `shadow-2xl`, glow berwarna (`shadow-indigo-600/20`), glow rgba arbitrary.
6. **Radius:** `rounded-lg` (input/tombol) · `rounded-xl` (kartu/modal) · `rounded-full`
   (badge/avatar). Tidak ada radius arbitrer baru (`rounded-[2rem]` dkk dianggap legacy).
7. **Teks:** skala bawaan Tailwind saja; minimum `text-xs` untuk teks mikro.
   `text-[9px]`/`text-[10px]` adalah legacy — ganti ke `text-xs` saat menyentuh baris itu.
8. **Interaksi:** hover = perubahan warna (`hover:bg-primary-dark`), bukan `translateY`
   atau scale besar. `active:scale-[0.98]` cukup.
9. **Gambar:** setiap `<img>` wajib `loading="lazy" decoding="async"`, kecuali hero
   above-the-fold di halaman publik.
10. **`transition-all` dilarang untuk kode baru** — sebutkan properti spesifik
    (`transition-colors`, `transition-transform`, `transition-opacity`). Ada 2.175
    pemakaian legacy; ganti saat menyentuh baris itu.

## Pola Halaman (template: src/features/suspension)

Struktur halaman dashboard mengikuti pola fitur `suspension` (paling bersih):

```
src/features/<fitur>/
  pages/        → dibungkus DashboardLayout, komposisi PageHeader + DataTable/Pagination
  components/   → modal lokal per aksi (XxxFormModal), konstanta class di level modul
  hooks/        → data supabase
```

- Modal: pakai shared `Modal` (portal, a11y, animasi) — jangan roll overlay sendiri.
- Konstanta class modul: `const inputCls = '...'` di atas file (pola `SuspensionFormModal`),
  atau langsung primitif `Input`/`Button` di atas.
- Status badge: `<Badge variant="...">` — satu sumber warna.

## Catatan Teknis

- **Font** (index.html): **Plus Jakarta Sans** variable `200..800` untuk SEMUA teks
  (body + heading — 1 famili, h1-h6 & `.font-heading` mewarisi body). Konten Arab:
  Cairo `400..900` + Amiri `400;700`. UI RTL memakai Arial system. Karena PJS maksimal
  weight 800, `.font-black` (900) dipetakan ke 800 di index.css — jangan hapus rule itu.
  Sistem print raport (`src/features/raport/utils/raportFonts.js`) memuat PJS sendiri
  untuk jendela print/PDF — samakan bila font utama berganti lagi.
  Jangan tambah famili baru tanpa cek pemakaiannya dulu.
- **Dependencies berat di-load dinamis** — jangan ubah kembali ke static import:
  `xlsx`, `jspdf` (+autotable), `html2canvas`, `jszip` → `await import(...)` di dalam
  fungsi ekspor; `qrcode`/`papaparse` sama; `react-quill-new` via `React.lazy` di
  NewsEditorPage. Efeknya hanya terunduh saat aksi ekspor/editor dijalankan.
- `qrcode.react` juga sudah lazy (`React.lazy`) di StudentsPage/AccessCardModal.
- **Bundle analyzer** opsional: `ANALYZE=1 npx vite build` — tanpa env itu, stats.html
  tidak dibuat (hemat 1,7 MB per build).
- Animasi enter: pakai set `animate-in fade-in zoom-in` yang ada di index.css.
  (Catatan: `animate-fade-in` yang tersebar di beberapa fitur **tidak terdefinisi** —
  legacy no-op; gunakan `animate-in fade-in`.)
- PWA: jangan naikkan `maximumFileSizeToCacheInBytes` di vite.config tanpa alasan;
  deps berat kini berupa chunk terpisah yang tetap ter-cache workbox.
