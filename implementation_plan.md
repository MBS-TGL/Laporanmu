# Rencana Implementasi Penataan ULayout Raport Bulanan

Rencana ini bertujuan untuk menyinkronkan predikat penilaian karakter, menambahkan field Catatan Perilaku (Pelanggaran, Prestasi, Sholat), mengubah susunan box data tambahan menjadi dua baris layout, menaikkan tanda tangan Wali Kelas ke samping Catatan Wali Kelas, serta menyederhanakan tanda tangan utama di footer sesuai dengan instruksi gambar referensi.

## User Review Required

> [!IMPORTANT]
> **Perubahan Skema Database**: Kami akan menambahkan 3 kolom baru (`pelanggaran`, `prestasi`, `sholat`) dengan tipe data `TEXT` pada tabel `student_monthly_reports` di database Supabase agar data ini tersimpan secara dinamis dan unik per santri per bulan.

> [!WARNING]
> **Predikat Skala Penilaian Baru**: Predikat di tabel atas (Akhlak, Ibadah, dll) akan disinkronkan dengan skala predikat baru yang diminta sebelumnya:
> - `9` -> **Sangat Baik** (sebelumnya: Istimewa)
> - `8` -> **Baik** (sebelumnya: Sangat Baik)
> - `6 – 7` -> **Cukup** (sebelumnya: Baik)
> - `4 – 5` -> **Kurang** (sebelumnya: Cukup)
> - `0 – 3` -> **Kurang Baik** (sebelumnya: Kurang)

---

## Proposed Changes

### 1. Database Schema
Menjalankan SQL query migrasi berikut di editor Supabase:
```sql
ALTER TABLE student_monthly_reports 
ADD COLUMN IF NOT EXISTS pelanggaran TEXT,
ADD COLUMN IF NOT EXISTS prestasi TEXT,
ADD COLUMN IF NOT EXISTS sholat TEXT;
```

### 2. Frontend React State & Data flow

#### [MODIFY] [useRaportCore.jsx](file:///f:/RzL/Laporanmu/src/features/raport/hooks/useRaportCore.jsx)
- Update state `extras` inisiasi default agar menyertakan:
  - `pelanggaran: rep?.pelanggaran ?? ''`
  - `prestasi: rep?.prestasi ?? ''`
  - `sholat: rep?.sholat ?? ''`
- Di `saveStudent` payload, kirim:
  - `pelanggaran: ex.pelanggaran || null`
  - `prestasi: ex.prestasi || null`
  - `sholat: ex.sholat || null`
- Lakukan hal yang sama untuk fungsi `resetStudent` (set ke string kosong `''`) dan bulk saving `_doSaveAll`.

#### [MODIFY] [RaportInputTable.jsx](file:///f:/RzL/Laporanmu/src/features/raport/components/RaportInputTable.jsx)
- Tambahkan `pelanggaran`, `prestasi`, `sholat` ke array `extraKeys` agar dideteksi sebagai bagian dari modifikasi.
- Sediakan input text field untuk Pelanggaran, Prestasi, dan Sholat pada baris input di bawah kolom Ziyadah/Murojaah.

---

### 3. Layout Rapor Cetak

#### [MODIFY] [raportConstants.js](file:///f:/RzL/Laporanmu/src/features/raport/utils/raportConstants.js)
- Sinkronkan return value fungsi `GRADE(n)` agar memberikan predikat baru:
  ```javascript
  export const GRADE = (n) => {
      const num = Number(n)
      if (num >= 9) return { label: 'ممتاز', id: 'Sangat Baik', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000' }
      if (num >= 8) return { label: 'جيد جدا', id: 'Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000' }
      if (num >= 6) return { label: 'جيد', id: 'Cukup', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000' }
      if (num >= 4) return { label: 'مقبول', id: 'Kurang', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000' }
      return { label: 'راسب', id: 'Kurang Baik', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444' }
  }
  ```

#### [MODIFY] [RaportPrintCard.jsx](file:///f:/RzL/Laporanmu/src/features/raport/components/RaportPrintCard.jsx)
- **Baris 1 Data Tambahan**:
  Render flex-row dengan 3 kolom sejajar (lebar seimbang):
  - **Catatan Perilaku**: Tabel dengan 3 baris (Pelanggaran, Prestasi, Sholat)
  - **Perkembangan Hafalan**: Tabel dengan 2 baris (Ziyadah, Murojaah)
  - **Absensi Sekolah**: Tabel dengan 4 baris (Sakit, Izin, Alpa, Pulang)
- **Baris 2 Data Tambahan**:
  Render flex-row dengan layout:
  - **Perkembangan Fisik** (lebar sama dengan Catatan Perilaku)
  - **Catatan Wali Kelas** (mengisi ruang tengah)
  - **Tanda Tangan Wali Kelas** (di sebelah kanan Catatan Wali Kelas):
    - Render block TTD khusus dengan label "Wali Kelas" dan nama `displayMusyrif` (Husni Abadi).
- **Footer Tanda Tangan Utama**:
  Sederhanakan TTD utama di bagian bawah menjadi hanya 3 kolom:
  1. Wali Santri (kiri)
  2. Mengetahui, Kepala Sekolah - Khoirul Anwar, S.Pd. (tengah)
  3. Pengasuh - Ir. H. M. Ali Maksum (kanan)

---

## Verification Plan

### Manual Verification
1. Lakukan pengisian data Pelanggaran, Prestasi, dan Sholat untuk salah satu santri pada dashboard Raport.
2. Buka preview cetak Raport Bulanan.
3. Pastikan layout data tambahan terbagi menjadi dua baris layout yang rapi dan sejajar sesuai gambar referensi.
4. Periksa apakah predikat di tabel atas (misal nilai 9 menghasilkan predikat "Sangat Baik") sudah sinkron dengan predikat di tabel skala penilaian bawah.
5. Verifikasi bahwa nama Kepala Sekolah fallback tercetak sebagai `Khoirul Anwar, S.Pd.` dan Pengasuh sebagai `Ir. H. M. Ali Maksum`.
