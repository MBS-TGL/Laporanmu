-- Bersih-bersih kolom mati di tabel master data (tidak pernah dipakai UI).
-- Aman terhadap fungsi aplikasi: tidak ada komponen yang membaca/menulis
-- kolom-kolom ini (terverifikasi lewat penelusuran kode).

-- Buku penanda import yang tidak pernah dirujuk frontend
ALTER TABLE public.students DROP COLUMN IF EXISTS import_id;

-- Counter poin guru yang tidak pernah dipakai (poin hanya untuk santri)
ALTER TABLE public.teachers DROP COLUMN IF EXISTS total_points;

-- Metadata jsonb guru yang tidak pernah disentuh
ALTER TABLE public.teachers DROP COLUMN IF EXISTS metadata;

-- Relasi wali kelas yang terbukti mati: UI memakai classes.homeroom_teacher_id
-- (ClassFormModal menyetelnya, ParentCheckPage menampilkannya).
-- FK teachers_class_id_fkey ikut ter-drop bersama kolomnya.
ALTER TABLE public.teachers DROP COLUMN IF EXISTS class_id;

-- Kolom opsional academic_years yang tidak pernah dipakai UI
ALTER TABLE public.academic_years DROP COLUMN IF EXISTS notes;
ALTER TABLE public.academic_years DROP COLUMN IF EXISTS description;

-- CATATAN (tidak dieksekusi di sini):
-- teachers.photo_url adalah mirror dari teachers.avatar_url (form menulis
-- keduanya dengan nilai sama). Kolom dipertahankan dulu sebagai masa
-- transisi; hapus setelah TeacherFormModal berhenti menulis photo_url.
