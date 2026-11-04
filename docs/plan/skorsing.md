# Rencana Modul "Skorsing & Pembinaan di Rumah"

> Lokasi plan: `docs/plan/skorsing.md`. Status: TERIMPLEMENTASI (7 tahap selesai, build hijau, lint modul bersih).

## 0. Koreksi pola aktual LaporanMu (wajib diikuti saat implementasi)

1. Toast = `useToast()` dari `@context/Toast`. `react-hot-toast` tidak ada di `package.json`. Pola: `const { addToast } = useToast(); addToast('...', 'success' | 'error')`.
2. Tidak ada `notificationService`. Yang ada `useNotifications` (`@hooks`, bell polling). Jangan buat service dengan nama itu.
3. Ikon file baru = Lucide only (`lucide-react`). FA hanya legacy/publik. Satu file dilarang campur keduanya.
4. Tidak ada folder `services/` saat ini. Logika Supabase tinggal di `hooks/use*Core.jsx`. Pengecualian yang dibenarkan untuk modul ini: `services/suspensionService.js` + `services/publicSuspensionService.js` agar akses publik terisolasi (satu-satunya file yang boleh panggil RPC token).
5. `useAuth` dari `@context/Auth`, audit = `logAudit()` dari `@utils/auditLogger`, warna via `var(--color-*)`, route lazy via `lazyRetry`, guard `RoleFlagRoute`. File baru maks ~400 baris, pecah halaman besar jadi komponen.
6. PDF Raport primer = Edge Function `generate-raport-pdf` + fallback `html2canvas` + `jspdf` dynamic import. Modul skorsing pakai **jspdf client saja** (`await import('jspdf')` + `await import('jspdf-autotable')` saat tombol diklik).

## 1. Asumsi terkunci

| Keputusan | Nilai |
|---|---|
| Jenjang | Otomatis dari `classes.grade` + override manual SMP/SMA. Heuristik: grade mengandung `7/8/9/VII/VIII/IX/SMP` maka SMP, selainnya SMA. |
| Storage bukti | Bucket baru `suspension-proofs` (buat manual di dashboard Supabase, privat). Upload wali via RPC base64, bukan direct storage. |
| PDF | jspdf + autotable full client, dynamic import. Font Arab Amiri via Google Fonts link + `document.fonts.load`. |
| Kepemilikan tugas guru | `created_by = auth.uid()`. Guru hanya edit/nilai tugas buatannya; `developer`/`admin` bebas semua. Lapis DB via RLS `created_by` check. |

## 2. Migration SQL — 1 file

**Lokasi:** `supabase/migrations/20261103000000_suspension.sql` (jalankan sekali di SQL Editor).

### 2.1 Tabel (7 + 1 rate-limit)

- `suspension_log_templates(block_key, item_key, label_id, input_type[check/choice/text/surah/wafa/tugas_ref], options jsonb, day_type[weekday/weekend/both], monday_thursday_only bool, jenjang[SMP/SMA/both], sort_order, is_active)` — unique `(block_key, item_key, jenjang)`. Seed ±30 baris: 4 blok + varian weekend.
- `suspensions(id, student_id -> students, jenjang, start_date, end_date check end >= start, reason_summary INTERNAL, violation_report_id -> reports nullable, status[aktif/selesai/dibatalkan], created_by, timestamps)`.
- `suspension_tokens(id, suspension_id -> cascade, token_hash sha256 unique, token_prefix 8 char, expires_at = end_date + 1 hari, revoked_at/by, last_used_at, use_count, created_by/at)`.
- `suspension_tasks(id, suspension_id -> cascade, subject, title, description, due_date, attachment_url, target_tahfidz jsonb{surah,ayat}, target_wafa jsonb{jilid,halaman}, created_by, timestamps)`.
- `suspension_task_submissions(id, task_id -> cascade, suspension_id -> cascade, photo_urls text[], note, status[belum/dikerjakan/dinilai], score 0-100, teacher_comment, graded_by/at, submitted/updated_at)` — unique `(task_id, suspension_id)`.
- `suspension_daily_logs(id, suspension_id -> cascade, log_date, entries jsonb{item_key:value}, note_optional, submitted/updated_at)` — unique `(suspension_id, log_date)`.
- `suspension_followups(id, suspension_id -> cascade, contacted_at, method[call/wa/visit], notes, created_by/at)`.
- `suspension_token_attempts(token_prefix, attempted_at)` — rate limit.

Index: `(student_id, status)`, `status where aktif`, `tokens(suspension_id) where revoked null`, `tasks(suspension_id, due_date)`, `logs(suspension_id, log_date)`, `attempts(prefix, attempted_at)`.

### 2.2 RLS — deny-by-default publik

- `enable RLS` semua tabel. **Tanpa policy `anon` sama sekali.**
- `authenticated`: `suspensions`/`logs`/`followups` SELECT semua; INSERT/UPDATE/DELETE `developer,admin` (+ `guru` boleh INSERT followup, pola `database.md` pakai `get_my_role()`).
- `suspension_tasks`: SELECT authenticated; INSERT staff; UPDATE/DELETE hanya `created_by = auth.uid() OR developer/admin`.
- `submissions`: UPDATE kolom nilai (`score, teacher_comment, status`) hanya pemilik task atau admin via fungsi `is_task_owner()`.
- `tokens`/`attempts`: hanya `developer,admin`. `templates`: SELECT authenticated; manage `developer,admin`.

### 2.3 RPC `SECURITY DEFINER` (4 fungsi, `search_path = public`)

| RPC | Validasi | Return |
|---|---|---|
| `validate_suspension_token(p_token)` | sha256 cocok, `revoked_at null`, `now() <= expires_at`, rate-limit ≤30/10 mnt per prefix (insert attempts, error 429 jika lebih) | `{suspension_id, student_name, class_name, jenjang, start_date, end_date, days[]}` — **tanpa** `reason_summary` |
| `get_suspension_day(p_token, p_date)` | token valid + tanggal dalam rentang | `{templates[aktif, filter jenjang/day_type/senin-kamis], tasks, log, submissions}` |
| `save_suspension_log(p_token, p_date, p_entries, p_note)` | sama | upsert `daily_logs`; update `last_used_at`/`use_count`; tulis `audit_logs` actor `wali:<prefix>` |
| `submit_suspension_task(p_token, p_task_id, p_photos_base64[], p_note)` | task milik skorsing tsb, tiap file ≤2MB, total ≤10MB | decode lalu insert `storage.objects` bucket `suspension-proofs`, upsert submission `dikerjakan` |

### 2.4 Langkah manual Supabase

1. Jalankan migration. 2. Buat bucket `suspension-proofs` privat. 3. Insert seed templates. 4. Tambah flag `module.suspension` di `feature_flags`.

## 3. Struktur FSD — `src/features/suspension/` (±23 file)

```
index.js
pages/ SuspensionsPage.jsx | SuspensionDetailPage.jsx | SuspensionTasksPage.jsx | PublicSuspensionPage.jsx
hooks/ useSuspensions.jsx | useSuspensionDetail.jsx | useSuspensionTasks.jsx | usePublicSuspension.jsx
components/ SuspensionFormModal.jsx | TokenModal.jsx | ProgressGrid.jsx | FollowupTimeline.jsx
  TaskFormModal.jsx | GradeModal.jsx | DayNavigator.jsx | LogBlockForm.jsx | TaskUploadCard.jsx
utils/ suspensionConstants.js | imageCompress.js | suspensionPdf.js | suspensionBackupPdf.js
services/ suspensionService.js | publicSuspensionService.js
```

Peran singkat: `SuspensionsPage` = list + buat (tabel di komponen agar <400 baris); `DetailPage` = progres/hari + followup + tombol rekap/backup PDF; `TasksPage` = tugas milik saya + nilai; `PublicSuspensionPage` = tanpa `DashboardLayout`, tema terang paksa, 1 hari/halaman. Hooks: semua fetch pakai `AbortController` + flag `active`, cleanup `removeChannel`/`clearTimeout`/`clearInterval`; autosave 2 dtk + draft `localStorage skorsing:<prefix>:<date>` + antrean offline tersinkron saat online.

## 4. Tahap eksekusi (6 batch, tiap batch file utuh)

1. **SQL** — file migration di atas + seed.
2. **service + hooks + constants** — `suspensionConstants.js` (BLOCKS 4 waktu, STATUS, helper tanggal ID, `buildWaMessage()`), `imageCompress.js` (canvas max 1280px q0.7 ke jpeg, pola `useStudentsCore`), 2 service + 4 hooks.
3. **Admin** — `SuspensionsPage`, `DetailPage`, `SuspensionFormModal` (pilih siswa via search `students` limit 20, override jenjang, relasi `reports`), `TokenModal` (tampil raw 1x + salin + `wa.me` template ID), `ProgressGrid` (merah = hari kosong), `FollowupTimeline`.
4. **Guru** — `SuspensionTasksPage`, `TaskFormModal` (mapel/judul/tenggat/target tahfidz & Wafa dari posisi terakhir), `GradeModal`. Tombol edit/nilai hanya jika `task.created_by === user.id || isAdmin`.
5. **Wali publik** — `PublicSuspensionPage`, `DayNavigator`, `LogBlockForm` (checkbox/pilihan per blok, kolom catatan opsional), `TaskUploadCard` (kompres client sebelum kirim, tombol Simpan min 40px).
6. **PDF** — `suspensionPdf.js` (rekap per siswa, kop `school_settings`, `lang='id'`), `suspensionBackupPdf.js` (lembar mingguan 4 blok + kolom paraf wali/pembina). Keduanya pola `generatePDFBlob` ala `useRaportImportExport.jsx` tapi tanpa Edge.

## 5. Router + sidebar

- `App.jsx`: `lazyRetry(import('@features/suspension/pages/...'))` x4; publik `<Route path="/skorsing/:token" element={<PublicSuspensionPage/>} />` di luar `ProtectedRoute`; proteksi `<Route path="/suspensions" element={<RoleFlagRoute roles={DEV_ADMIN} flag="module.suspension">}>` + `/suspensions/:id`; `<Route path="/tugas-skorsing" roles={DEV_ADMIN_TEACHER}>`.
- `navItems.js`: tambah ke `BOARDING_ITEMS` `{ to: '/suspensions', label: 'Skorsing', icon: ShieldAlert, desc: 'Pembinaan di rumah' }` + `ROUTE_FLAG_MAP['/suspensions'] = 'module.suspension'`.
- WA template: `Halo Bapak/Ibu {wali}, ananda {siswa} menjalani pembinaan di rumah {tgl}. Pantau & isi log harian: {link} Berlaku s/d {exp}. — {sekolah}` ke `https://wa.me/{phone}?text={encodeURIComponent(msg)}`.

## 6. Blok waktu log harian (agenda santri)

1. Dini hari & Subuh (03.00–06.30): qiyamul lail, Subuh berjamaah di masjid/musala dekat rumah, ngaji, kultum, olahraga/piket pagi (diganti membantu pekerjaan rumah), puasa Senin/Kamis (field hanya Senin dan Kamis).
2. Pagi & Siang (06.30–14.45): Dhuha, Wafa/BTA (jilid + halaman), tugas KBM per mapel (blok utama: daftar tugas guru + upload foto bukti), Dzuhur + ngaji, setoran tahfidz (surah + ayat).
3. Sore & Maghrib (14.45–19.00): Ashar + ngaji, giat mandiri, kajian sore (catatan singkat), Maghrib.
4. Malam (19.00–03.00): Isya, tahfidz/murajaah, mufrodat, belajar malam, tahajjud.
5. Sabtu dan Ahad: ekstrakurikuler diganti kegiatan bermanfaat di rumah (kerja bakti, membantu usaha orang tua) + tugas ekstra pembina.

## 7. Uji manual (±10)

1. Migration ok, RLS anon ditolak.
2. Buat skorsing (override jenjang tampil benar, `logAudit` muncul di `/admin/logs`).
3. Generate token ≥43 char, raw tidak tersimpan (cek `token_hash`).
4. Buka `/skorsing/:token` incognito: nama + tanggal tampil, **alasan tidak tampil**.
5. Isi 1 hari penuh tersimpan, hari kosong merah di dashboard.
6. Guru B tidak bisa edit/nilai tugas guru A.
7. Upload HP 3MB terkompres <500KB masuk bucket.
8. Offline draft tersimpan lokal lalu sinkron saat online.
9. Ubah `end_date` lewat / revoke → token mati. 35x token salah/10 mnt → error.
10. Rekap + lembar cadangan terunduh, font Arab tampil, kolom paraf ada. `npm run build` hijau + skill `anti-slop-review`/`perf-checklist` lolos.

## 8. Risiko utama

Upload base64 via RPC — jaga limit ketat (2MB/file, 10MB total). Embed Amiri di jsPDF — siapkan fallback helvetica bila TTF gagal. Bucket harus dibuat manual + privat.
