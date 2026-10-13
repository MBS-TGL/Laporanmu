---
name: supabase-query-safety
description: Gunakan setiap kali menulis atau mengubah query Supabase, realtime subscription, atau mutasi data di Laporanmu.
---

# Supabase Query Safety

## Checklist query
1. Kolom eksplisit: `.select('id, name, class_id')`. Tidak ada `select('*')`.
2. List: `.limit(n)` atau `.range(from, to)` + `Pagination`. Tabel besar (`gate_logs`, `audit_logs`) tidak boleh tanpa batas.
3. Filter di server (`.eq`, `.in`, `.gte`), bukan fetch semua lalu `.filter()` di JS.
4. Join lewat relasi (`select('id, class:classes(name)')`), hindari loop query (N+1).
5. Cek `error` dulu, baru pakai `data`. Error ditampilkan via `addToast` dan state error di UI. Jangan silent fail.
6. Nama kolom/tabel dicek di `database.md`, jangan menebak.

## Realtime
- Satu channel per kebutuhan nyata. Cleanup: `return () => supabase.removeChannel(channel)`.
- Event beruntun: debounce refetch (mis. 500ms) atau update state incremental dari payload.

## Mutasi
- Pakai `upsert` + `onConflict` bila idempoten.
- Mutasi penting: `logAudit({ action, source, tableName, recordId, newData })`.
- Operasi massal: batch, bukan loop satu-satu.

## Keamanan
- Frontend hanya anon key. RLS adalah penjaga sebenarnya; role check di UI cuma untuk UX.
- Tabel baru: tulis juga policy RLS di migration, dan sebutkan di laporan.

## Template
```js
const { data, error } = await supabase
  .from('students')
  .select('id, name, class_id')
  .eq('class_id', classId)
  .order('name')
  .range(from, to);
if (error) { addToast({ type: 'error', message: 'Gagal memuat santri' }); return; }
```
