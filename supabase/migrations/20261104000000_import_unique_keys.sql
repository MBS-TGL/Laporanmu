-- Indeks unik: pengaman import Excel (termasuk export daftar_pd Dapodik)
-- agar file yang sama di-upload dua kali tidak menduplikat data.
-- Ini backstop DB — dedup utama tetap di UI import (cek nama/NISN/NIPD).

-- NOTE: jika sudah ada data duplikat, CREATE UNIQUE INDEX akan gagal.
-- Cek dulu dengan:
--   SELECT nisn, count(*) FROM students
--    WHERE nisn IS NOT NULL AND nisn <> '' AND deleted_at IS NULL
--    GROUP BY nisn HAVING count(*) > 1;

-- NISN santri (abaikan yang kosong & yang sudah soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS students_nisn_unique_idx
  ON public.students (nisn)
  WHERE nisn IS NOT NULL AND nisn <> '' AND deleted_at IS NULL;

-- Identitas PTK (NIP/NUPTK/NIK) guru
CREATE UNIQUE INDEX IF NOT EXISTS teachers_nip_unique_idx
  ON public.teachers (nip)
  WHERE nip IS NOT NULL AND nip <> '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_nuptk_unique_idx
  ON public.teachers (nuptk)
  WHERE nuptk IS NOT NULL AND nuptk <> '' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_nik_unique_idx
  ON public.teachers (nik)
  WHERE nik IS NOT NULL AND nik <> '' AND deleted_at IS NULL;

-- Satu nama kelas per tahun ajaran.
-- Cek duplikat dulu bila gagal:
--   SELECT academic_year_id, name, count(*) FROM classes
--    GROUP BY academic_year_id, name HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS classes_year_name_unique_idx
  ON public.classes (academic_year_id, name);
