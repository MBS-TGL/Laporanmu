-- =============================================================
-- Migration: Modul Skorsing & Pembinaan di Rumah
-- File: supabase/migrations/20261103000000_suspension.sql
-- Cara pakai: jalankan SEKALI di Supabase Dashboard > SQL Editor.
-- Idempotent: aman dijalankan ulang (IF NOT EXISTS / DROP IF EXISTS /
-- ON CONFLICT DO NOTHING), kecuali data yang sudah diubah admin.
--
-- Langkah manual setelah migration:
--   1. (Opsional, migrasi kelak) buat bucket Storage `suspension-proofs`
--      PRIVATE. v1 menyimpan foto bukti sebagai base64 terkompresi di
--      kolom photo_data (kolom photo_urls disiapkan untuk path bucket).
--   2. Pastikan flag `module.suspension` aktif (di-insert di bawah).
-- =============================================================

-- ─── 0. Ekstensi (uuid + sha256) ─────────────────────────────
create extension if not exists pgcrypto;


-- ─── 1. Helper role (dipakai policy RLS) ─────────────────────
create or replace function is_suspension_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles
  where id = auth.uid() and role in ('developer', 'admin')
) $$;

create or replace function is_suspension_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles
  where id = auth.uid() and role in ('developer', 'admin', 'pengurus', 'guru')
) $$;

create or replace function is_suspension_task_owner(p_task_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from suspension_tasks
  where id = p_task_id and created_by = auth.uid()
) $$;


-- ─── 2. Tabel ────────────────────────────────────────────────

-- 2a. Template checklist harian (dikonfigurasi admin, bukan hardcode)
create table if not exists suspension_log_templates (
  id uuid primary key default gen_random_uuid(),
  block_key text not null check (block_key in ('dinihari', 'pagi', 'sore', 'malam')),
  item_key text not null,
  label_id text not null,
  input_type text not null default 'check'
    check (input_type in ('check', 'choice', 'text', 'surah', 'wafa', 'tugas_ref')),
  options jsonb not null default '[]',
  day_type text not null default 'both'
    check (day_type in ('weekday', 'weekend', 'both')),
  monday_thursday_only boolean not null default false,
  jenjang text not null default 'both'
    check (jenjang in ('SMP', 'SMA', 'both')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (block_key, item_key, jenjang)
);

-- 2b. Data skorsing. reason_summary INTERNAL, tidak pernah dikirim ke wali.
create table if not exists suspensions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id),
  jenjang text not null check (jenjang in ('SMP', 'SMA')),
  start_date date not null,
  end_date date not null,
  reason_summary text not null,
  violation_report_id uuid references reports(id),
  status text not null default 'aktif'
    check (status in ('aktif', 'selesai', 'dibatalkan')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
comment on column suspensions.reason_summary is 'INTERNAL kesiswaan/BK. Tidak boleh dikembalikan oleh RPC publik mana pun.';

-- 2c. Token akses wali. Hanya HASH yang disimpan, raw token tidak pernah disimpan.
create table if not exists suspension_tokens (
  id uuid primary key default gen_random_uuid(),
  suspension_id uuid not null references suspensions(id) on delete cascade,
  token_hash text not null unique,
  token_prefix text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid,
  last_used_at timestamptz,
  use_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 2d. Tugas dari guru mapel / tahfidz / koordinator Wafa
create table if not exists suspension_tasks (
  id uuid primary key default gen_random_uuid(),
  suspension_id uuid not null references suspensions(id) on delete cascade,
  subject text not null,
  title text not null,
  description text,
  due_date date,
  attachment_url text,
  target_tahfidz jsonb,
  target_wafa jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2e. Bukti pengerjaan tugas oleh wali/siswa + penilaian guru.
-- v1: foto disimpan sebagai base64 terkompresi (<500 KB/foto hasil kompres
-- client) di photo_data. photo_urls disiapkan untuk migrasi ke bucket privat.
create table if not exists suspension_task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references suspension_tasks(id) on delete cascade,
  suspension_id uuid not null references suspensions(id) on delete cascade,
  photo_urls text[] not null default '{}',
  photo_data text[] not null default '{}',
  note text,
  status text not null default 'dikerjakan'
    check (status in ('belum', 'dikerjakan', 'dinilai')),
  score int check (score between 0 and 100),
  teacher_comment text,
  graded_by uuid,
  graded_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, suspension_id)
);

-- 2f. Log harian wali (satu baris per skorsing per tanggal)
create table if not exists suspension_daily_logs (
  id uuid primary key default gen_random_uuid(),
  suspension_id uuid not null references suspensions(id) on delete cascade,
  log_date date not null,
  entries jsonb not null default '{}',
  note_optional text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (suspension_id, log_date)
);

-- 2g. Verifikasi pembina (telepon / WA / kunjungan mingguan)
create table if not exists suspension_followups (
  id uuid primary key default gen_random_uuid(),
  suspension_id uuid not null references suspensions(id) on delete cascade,
  contacted_at timestamptz not null default now(),
  method text not null check (method in ('call', 'wa', 'visit')),
  notes text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 2h. Rate limiting RPC publik (per prefix token per 10 menit)
create table if not exists suspension_token_attempts (
  token_prefix text not null,
  attempted_at timestamptz not null default now()
);

-- ─── 3. Index ────────────────────────────────────────────────
create index if not exists idx_sus_student on suspensions (student_id, status);
create index if not exists idx_sus_active on suspensions (status) where status = 'aktif';
create index if not exists idx_sustok_sus on suspension_tokens (suspension_id) where revoked_at is null;
create index if not exists idx_sustask_sus on suspension_tasks (suspension_id, due_date);
create index if not exists idx_suslog_sus on suspension_daily_logs (suspension_id, log_date);
create index if not exists idx_susatt_prefix on suspension_token_attempts (token_prefix, attempted_at);

-- ─── 4. Trigger updated_at ───────────────────────────────────
create or replace function _suspension_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_sus_touch on suspensions;
create trigger trg_sus_touch before update on suspensions
  for each row execute function _suspension_touch();
drop trigger if exists trg_sustask_touch on suspension_tasks;
create trigger trg_sustask_touch before update on suspension_tasks
  for each row execute function _suspension_touch();
drop trigger if exists trg_sussub_touch on suspension_task_submissions;
create trigger trg_sussub_touch before update on suspension_task_submissions
  for each row execute function _suspension_touch();
drop trigger if exists trg_suslog_touch on suspension_daily_logs;
create trigger trg_suslog_touch before update on suspension_daily_logs
  for each row execute function _suspension_touch();

-- ─── 5. RLS: deny-by-default untuk publik ────────────────────
-- Tidak ada policy untuk role anon di tabel mana pun.
alter table suspension_log_templates enable row level security;
alter table suspensions enable row level security;
alter table suspension_tokens enable row level security;
alter table suspension_tasks enable row level security;
alter table suspension_task_submissions enable row level security;
alter table suspension_daily_logs enable row level security;
alter table suspension_followups enable row level security;
alter table suspension_token_attempts enable row level security;

grant select, insert, update, delete
  on suspension_log_templates, suspensions, suspension_tokens,
     suspension_tasks, suspension_task_submissions,
     suspension_daily_logs, suspension_followups, suspension_token_attempts
  to authenticated;

-- 5a. Templates: baca semua staff, kelola hanya admin
drop policy if exists tpl_select on suspension_log_templates;
create policy tpl_select on suspension_log_templates
  for select to authenticated using (true);
drop policy if exists tpl_admin_all on suspension_log_templates;
create policy tpl_admin_all on suspension_log_templates
  for all to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());

-- 5b. Suspensions: baca semua staff, tulis hanya admin
drop policy if exists sus_select on suspensions;
create policy sus_select on suspensions
  for select to authenticated using (true);
drop policy if exists sus_admin_all on suspensions;
create policy sus_admin_all on suspensions
  for all to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());

-- 5c. Tokens: hanya admin (wali lewat RPC SECURITY DEFINER)
drop policy if exists tok_admin_all on suspension_tokens;
create policy tok_admin_all on suspension_tokens
  for all to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());

-- 5d. Tasks: baca semua staff; tulis hanya pemilik (created_by) atau admin
drop policy if exists task_select on suspension_tasks;
create policy task_select on suspension_tasks
  for select to authenticated using (true);
drop policy if exists task_insert on suspension_tasks;
create policy task_insert on suspension_tasks
  for insert to authenticated with check (is_suspension_staff());
drop policy if exists task_owner_update on suspension_tasks;
create policy task_owner_update on suspension_tasks
  for update to authenticated
  using (created_by = auth.uid() or is_suspension_admin())
  with check (created_by = auth.uid() or is_suspension_admin());
drop policy if exists task_owner_delete on suspension_tasks;
create policy task_owner_delete on suspension_tasks
  for delete to authenticated
  using (created_by = auth.uid() or is_suspension_admin());

-- 5e. Submissions: baca semua staff; nilai hanya pemilik task atau admin
drop policy if exists sub_select on suspension_task_submissions;
create policy sub_select on suspension_task_submissions
  for select to authenticated using (true);
drop policy if exists sub_insert_staff on suspension_task_submissions;
create policy sub_insert_staff on suspension_task_submissions
  for insert to authenticated with check (is_suspension_staff());
drop policy if exists sub_grade_update on suspension_task_submissions;
create policy sub_grade_update on suspension_task_submissions
  for update to authenticated
  using (is_suspension_admin() or is_suspension_task_owner(task_id))
  with check (is_suspension_admin() or is_suspension_task_owner(task_id));
drop policy if exists sub_delete on suspension_task_submissions;
create policy sub_delete on suspension_task_submissions
  for delete to authenticated using (is_suspension_admin());

-- 5f. Daily logs: baca semua staff, tulis hanya admin (wali lewat RPC)
drop policy if exists log_select on suspension_daily_logs;
create policy log_select on suspension_daily_logs
  for select to authenticated using (true);
drop policy if exists log_admin_all on suspension_daily_logs;
create policy log_admin_all on suspension_daily_logs
  for all to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());

-- 5g. Followups: baca semua staff; catat boleh guru/pengurus; ubah/hapus admin
drop policy if exists fol_select on suspension_followups;
create policy fol_select on suspension_followups
  for select to authenticated using (true);
drop policy if exists fol_insert on suspension_followups;
create policy fol_insert on suspension_followups
  for insert to authenticated with check (is_suspension_staff());
drop policy if exists fol_manage on suspension_followups;
create policy fol_manage on suspension_followups
  for update to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());
drop policy if exists fol_delete on suspension_followups;
create policy fol_delete on suspension_followups
  for delete to authenticated using (is_suspension_admin());

-- 5h. Attempts: hanya admin (ditulis oleh RPC definer yang bypass RLS)
drop policy if exists att_admin_all on suspension_token_attempts;
create policy att_admin_all on suspension_token_attempts
  for all to authenticated
  using (is_suspension_admin()) with check (is_suspension_admin());

-- ─── 6. RPC publik (SECURITY DEFINER, satu-satunya jalan wali) ──
-- Halaman /skorsing/:token dilarang query tabel langsung; semua lewat RPC ini.

-- 6a. Rate limit: maksimal 30 percobaan per prefix per 10 menit
create or replace function _suspension_log_attempt(p_prefix text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from suspension_token_attempts
    where attempted_at < now() - interval '1 day';
  insert into suspension_token_attempts (token_prefix)
    values (substr(p_prefix, 1, 8));
  if (
    select count(*) from suspension_token_attempts
    where token_prefix = substr(p_prefix, 1, 8)
      and attempted_at > now() - interval '10 minutes'
  ) > 30 then
    raise exception 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'
      using errcode = 'P0001';
  end if;
end $$;

-- 6b. Validasi token terpusat: hash cocok + belum dicabut + belum kedaluwarsa + status aktif
create or replace function _suspension_check_token(p_token text)
returns suspensions
language plpgsql security definer set search_path = public
as $$
declare
  v suspensions%rowtype;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'Tautan tidak valid.' using errcode = 'P0001';
  end if;

  select s.* into v
  from suspensions s
  join suspension_tokens t on t.suspension_id = s.id
  where t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and t.revoked_at is null
    and now() <= t.expires_at;

  if not found then
    raise exception 'Tautan tidak valid atau sudah kedaluwarsa.' using errcode = 'P0001';
  end if;
  if v.status <> 'aktif' then
    raise exception 'Masa pembinaan sudah selesai atau dibatalkan.' using errcode = 'P0001';
  end if;

  update suspension_tokens
  set last_used_at = now(), use_count = use_count + 1
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  return v;
end $$;

-- 6c. RPC 1: validasi token -> ringkasan TANPA reason_summary (privasi)
create or replace function validate_suspension_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v suspensions%rowtype;
  v_student_name text;
  v_class_name text;
  v_days text[];
begin
  perform _suspension_log_attempt(substr(coalesce(p_token, ''), 1, 8));
  v := _suspension_check_token(p_token);

  select s.name, c.name into v_student_name, v_class_name
  from students s
  left join classes c on c.id = s.class_id
  where s.id = v.student_id;

  select array_agg(to_char(d, 'YYYY-MM-DD') order by d) into v_days
  from generate_series(v.start_date, v.end_date, interval '1 day') d;

  return jsonb_build_object(
    'suspension_id', v.id,
    'student_name', coalesce(v_student_name, '-'),
    'class_name', v_class_name,
    'jenjang', v.jenjang,
    'start_date', v.start_date,
    'end_date', v.end_date,
    'days', coalesce(to_jsonb(v_days), '[]'::jsonb)
  );
end $$;

-- 6d. RPC 2: data satu hari (template terfilter + tugas + log + submission)
create or replace function get_suspension_day(p_token text, p_date date)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v suspensions%rowtype;
  v_dow int;
  v_daytype text;
  v_templates jsonb;
  v_tasks jsonb;
  v_log jsonb;
  v_subs jsonb;
begin
  perform _suspension_log_attempt(substr(coalesce(p_token, ''), 1, 8));
  v := _suspension_check_token(p_token);

  if p_date is null or p_date < v.start_date or p_date > v.end_date then
    raise exception 'Tanggal di luar masa pembinaan.' using errcode = 'P0001';
  end if;

  -- 0=Ahad .. 6=Sabtu. Senin=1, Kamis=4.
  v_dow := extract(dow from p_date)::int;
  v_daytype := case when v_dow in (0, 6) then 'weekend' else 'weekday' end;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.ord, t.sort_order), '[]'::jsonb)
  into v_templates
  from (
    select id, block_key, item_key, label_id, input_type, options, sort_order,
      array_position(array['dinihari', 'pagi', 'sore', 'malam'], block_key) as ord
    from suspension_log_templates
    where is_active
      and (jenjang = 'both' or jenjang = v.jenjang)
      and (day_type = 'both' or day_type = v_daytype)
      and (not monday_thursday_only or v_dow in (1, 4))
  ) t;

  select coalesce(
    jsonb_agg(to_jsonb(t) order by t.due_date nulls last, t.created_at),
    '[]'::jsonb)
  into v_tasks
  from (
    select id, subject, title, description, due_date, attachment_url,
      target_tahfidz, target_wafa, created_at
    from suspension_tasks
    where suspension_id = v.id
  ) t;

  select to_jsonb(l) into v_log
  from (
    select entries, note_optional, submitted_at, updated_at
    from suspension_daily_logs
    where suspension_id = v.id and log_date = p_date
  ) l;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.task_id), '[]'::jsonb)
  into v_subs
  from (
    select task_id, status, score, teacher_comment,
      coalesce(array_length(photo_data, 1), 0)
        + coalesce(array_length(photo_urls, 1), 0) as photo_count,
      note, submitted_at
    from suspension_task_submissions
    where suspension_id = v.id
  ) s;

  return jsonb_build_object(
    'templates', v_templates,
    'tasks', v_tasks,
    'log', coalesce(v_log, 'null'::jsonb),
    'submissions', v_subs
  );
end $$;

-- 6e. RPC 3: simpan log harian (upsert) + audit actor wali
create or replace function save_suspension_log(
  p_token text, p_date date, p_entries jsonb, p_note text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v suspensions%rowtype;
  v_id uuid;
  v_prefix text := substr(coalesce(p_token, ''), 1, 8);
begin
  perform _suspension_log_attempt(v_prefix);
  v := _suspension_check_token(p_token);

  if p_date is null or p_date < v.start_date or p_date > v.end_date then
    raise exception 'Tanggal di luar masa pembinaan.' using errcode = 'P0001';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'object' then
    raise exception 'Format isian tidak valid.' using errcode = 'P0001';
  end if;

  insert into suspension_daily_logs (suspension_id, log_date, entries, note_optional)
  values (v.id, p_date, p_entries, nullif(p_note, ''))
  on conflict (suspension_id, log_date)
  do update set entries = excluded.entries,
    note_optional = excluded.note_optional,
    updated_at = now()
  returning id into v_id;

  insert into audit_logs (action, source, table_name, record_id, new_data,
    actor_name, actor_role, created_at)
  values ('UPDATE', 'OPERATIONAL', 'suspension_daily_logs', v_id,
    jsonb_build_object('suspension_id', v.id, 'log_date', p_date),
    'Wali (' || v_prefix || ')', 'wali', now());

  return jsonb_build_object('ok', true, 'log_id', v_id);
end $$;

-- 6f. RPC 4: kirim bukti tugas (base64 terkompresi dari client) + upsert submission.
-- Batas: maksimal 6 foto/pengiriman, 2 MB/foto, 10 MB total, 12 foto tersimpan.
-- Client WAJIB kompres dulu (utils/imageCompress.js, target <500 KB/foto).
create or replace function submit_suspension_task(
  p_token text, p_task_id uuid, p_photos_base64 text[], p_note text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v suspensions%rowtype;
  v_prefix text := substr(coalesce(p_token, ''), 1, 8);
  v_found uuid;
  v_photo text;
  v_clean text;
  v_bytes int;
  v_total int := 0;
  v_idx int := 0;
  v_kept text[] := '{}';
  v_sub_id uuid;
begin
  perform _suspension_log_attempt(v_prefix);
  v := _suspension_check_token(p_token);

  select id into v_found from suspension_tasks
  where id = p_task_id and suspension_id = v.id;
  if not found then
    raise exception 'Tugas tidak ditemukan.' using errcode = 'P0001';
  end if;

  if (p_photos_base64 is null or coalesce(array_length(p_photos_base64, 1), 0) = 0)
     and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'Lampirkan minimal satu foto atau catatan.' using errcode = 'P0001';
  end if;

  if p_photos_base64 is not null then
    if coalesce(array_length(p_photos_base64, 1), 0) > 6 then
      raise exception 'Maksimal 6 foto per pengiriman.' using errcode = 'P0001';
    end if;
    foreach v_photo in array p_photos_base64 loop
      v_idx := v_idx + 1;
      v_clean := v_photo;
      if v_clean like 'data:%;base64,%' then
        v_clean := split_part(v_clean, ',', 2);
      end if;
      if v_clean is null or length(v_clean) = 0 then
        raise exception 'Foto yang dikirim kosong.' using errcode = 'P0001';
      end if;
      -- Panjang base64 kira-kira 4/3 ukuran biner
      v_bytes := (length(v_clean) * 3) / 4;
      if v_bytes > 2 * 1024 * 1024 then
        raise exception 'Ukuran tiap foto maksimal 2 MB.' using errcode = 'P0001';
      end if;
      v_total := v_total + v_bytes;
      if v_total > 10 * 1024 * 1024 then
        raise exception 'Total foto maksimal 10 MB.' using errcode = 'P0001';
      end if;
      -- Validasi base64 benar-benar bisa di-decode
      begin
        perform length(decode(v_clean, 'base64'));
      exception when others then
        raise exception 'Format foto tidak valid.' using errcode = 'P0001';
      end;
      v_kept := v_kept || v_clean;
    end loop;
  end if;

  insert into suspension_task_submissions
    (task_id, suspension_id, photo_urls, photo_data, note, status)
  values (p_task_id, v.id, '{}', v_kept,
    nullif(trim(coalesce(p_note, '')), ''), 'dikerjakan')
  on conflict (task_id, suspension_id)
  do update set
    photo_data = case
      when coalesce(array_length(excluded.photo_data, 1), 0) > 0
      then (suspension_task_submissions.photo_data || excluded.photo_data)
      else suspension_task_submissions.photo_data end,
    note = excluded.note,
    status = 'dikerjakan',
    submitted_at = now(),
    updated_at = now()
  returning id into v_sub_id;

  -- Batasi akumulasi: maksimal 12 foto tersimpan per submission
  update suspension_task_submissions
  set photo_data = (photo_data)
    [greatest(array_length(photo_data, 1) - 11, 1):array_length(photo_data, 1)]
  where id = v_sub_id
    and coalesce(array_length(photo_data, 1), 0) > 12;

  insert into audit_logs (action, source, table_name, record_id, new_data,
    actor_name, actor_role, created_at)
  values ('INSERT', 'OPERATIONAL', 'suspension_task_submissions', v_sub_id,
    jsonb_build_object('suspension_id', v.id, 'task_id', p_task_id,
      'photo_count', coalesce(array_length(v_kept, 1), 0)),
    'Wali (' || v_prefix || ')', 'wali', now());

  return jsonb_build_object('ok', true, 'submission_id', v_sub_id,
    'photo_count', coalesce(array_length(v_kept, 1), 0));
end $$;

-- Hanya 4 RPC publik yang boleh dieksekusi anon. Helper internal (_) tidak di-grant.
grant execute on function validate_suspension_token(text) to anon, authenticated;
grant execute on function get_suspension_day(text, date) to anon, authenticated;
grant execute on function save_suspension_log(text, date, jsonb, text) to anon, authenticated;
grant execute on function submit_suspension_task(text, uuid, text[], text) to anon, authenticated;

-- ─── 7. Seed template checklist ──────────────────────────────
insert into suspension_log_templates
  (block_key, item_key, label_id, input_type, options, day_type,
   monday_thursday_only, jenjang, sort_order, is_active)
values
  -- Blok 1: Dini hari & Subuh (03.00-06.30)
  ('dinihari', 'qiyamul_lail', 'Qiyamul lail', 'check', '[]', 'both', false, 'both', 1, true),
  ('dinihari', 'subuh_berjamaah', 'Salat Subuh berjamaah di masjid/musala dekat rumah', 'check', '[]', 'both', false, 'both', 2, true),
  ('dinihari', 'ngaji_subuh', 'Mengaji setelah Subuh', 'check', '[]', 'both', false, 'both', 3, true),
  ('dinihari', 'kultum', 'Kultum / mendengarkan kultum', 'check', '[]', 'both', false, 'both', 4, true),
  ('dinihari', 'olahraga_piket', 'Olahraga pagi / membantu pekerjaan rumah', 'choice', '["Olahraga pagi", "Membantu pekerjaan rumah", "Keduanya", "Belum sempat"]', 'both', false, 'both', 5, true),
  ('dinihari', 'puasa', 'Puasa sunah Senin/Kamis', 'check', '[]', 'both', true, 'both', 6, true),
  -- Blok 2: Pagi & Siang (06.30-14.45)
  ('pagi', 'dhuha', 'Salat Duha', 'check', '[]', 'both', false, 'both', 1, true),
  ('pagi', 'wafa_bta', 'Wafa / BTA (isi jilid + halaman)', 'wafa', '[]', 'both', false, 'both', 2, true),
  ('pagi', 'tugas_kbm', 'Tugas KBM per mapel (lihat daftar tugas + unggah foto bukti)', 'tugas_ref', '[]', 'both', false, 'both', 3, true),
  ('pagi', 'dzuhur_ngaji', 'Salat Zuhur berjamaah + mengaji', 'check', '[]', 'both', false, 'both', 4, true),
  ('pagi', 'tahfidz', 'Setoran tahfidz (isi surah + ayat)', 'surah', '[]', 'both', false, 'both', 5, true),
  -- Blok 3: Sore & Maghrib (14.45-19.00)
  ('sore', 'ashar_ngaji', 'Salat Asar berjamaah + mengaji', 'check', '[]', 'both', false, 'both', 1, true),
  ('sore', 'giat_mandiri', 'Kegiatan mandiri bermanfaat (tulis singkat)', 'text', '[]', 'both', false, 'both', 2, true),
  ('sore', 'kajian_sore', 'Kajian sore (catatan singkat)', 'text', '[]', 'both', false, 'both', 3, true),
  ('sore', 'maghrib', 'Salat Magrib berjamaah', 'check', '[]', 'both', false, 'both', 4, true),
  -- Blok 4: Malam (19.00-03.00)
  ('malam', 'isya', 'Salat Isya berjamaah', 'check', '[]', 'both', false, 'both', 1, true),
  ('malam', 'tahfidz_murajaah', 'Tahfidz / murajaah', 'check', '[]', 'both', false, 'both', 2, true),
  ('malam', 'mufrodat', 'Hafalan mufrodat', 'check', '[]', 'both', false, 'both', 3, true),
  ('malam', 'belajar_malam', 'Belajar malam', 'check', '[]', 'both', false, 'both', 4, true),
  ('malam', 'tahajjud', 'Salat tahajud', 'check', '[]', 'both', false, 'both', 5, true),
  -- Varian akhir pekan (Sabtu-Ahad): ganti ekstrakurikuler
  ('pagi', 'kerja_bakti', 'Kerja bakti / bersih-bersih rumah dan lingkungan', 'check', '[]', 'weekend', false, 'both', 6, true),
  ('sore', 'bantu_usaha', 'Membantu usaha orang tua', 'check', '[]', 'weekend', false, 'both', 5, true),
  ('sore', 'tugas_pembina', 'Tugas ekstra dari pembina (tulis singkat)', 'text', '[]', 'weekend', false, 'both', 6, true)
on conflict (block_key, item_key, jenjang) do nothing;

-- ─── 8. Feature flag modul ───────────────────────────────────
insert into feature_flags (key, label, description, enabled, category, sort_order)
values ('module.suspension', 'Skorsing',
  'Modul Skorsing & Pembinaan di Rumah', true, 'modul', 50)
on conflict (key) do nothing;
