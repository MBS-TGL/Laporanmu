## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  Unique |
| `name` | `text` |  |
| `role` | `text` |  |
| `phone` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `spmb_role` | `text` |  Nullable |

## Table `academic_years`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `semester` | `text` |  |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `curriculum` | `text` |  Nullable |
| `is_locked` | `bool` |  Nullable |

## Table `classes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `grade` | `text` |  |
| `major` | `text` |  Nullable |
| `homeroom_teacher_id` | `uuid` |  Nullable |
| `academic_year_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `students`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `registration_code` | `text` |  Unique |
| `pin` | `text` |  |
| `name` | `text` |  |
| `class_id` | `uuid` |  Nullable |
| `phone` | `text` |  Nullable |
| `total_points` | `int4` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `gender` | `text` |  Nullable |
| `import_id` | `uuid` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `guardian_name` | `text` |  Nullable |
| `guardian_relation` | `text` |  Nullable |
| `status` | `student_status` |  |
| `tags` | `_text` |  |
| `nisn` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `is_pinned` | `bool` |  Nullable |
| `nis` | `text` |  Nullable |
| `nik` | `text` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `birth_place` | `text` |  Nullable |
| `religion` | `text` |  Nullable |
| `address` | `text` |  Nullable |

## Table `point_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `points` | `int4` |  |
| `category` | `text` |  |
| `is_negative` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `violation_type_id` | `uuid` |  |
| `reporter_id` | `uuid` |  |
| `points` | `int4` |  |
| `notes` | `text` |  Nullable |
| `reported_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |
| `teacher_name` | `text` |  Nullable |

## Table `import_jobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |
| `entity` | `text` |  |
| `filename` | `text` |  Nullable |
| `mode` | `text` |  |
| `strict` | `bool` |  |
| `total_rows` | `int4` |  |
| `inserted` | `int4` |  |
| `updated` | `int4` |  |
| `skipped` | `int4` |  |
| `failed` | `int4` |  |
| `import_id` | `uuid` |  Nullable |
| `report_path` | `text` |  Nullable |
| `status` | `text` |  |

## Table `student_class_history`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  Nullable |
| `from_class_id` | `uuid` |  Nullable |
| `to_class_id` | `uuid` |  Nullable |
| `changed_at` | `timestamptz` |  Nullable |
| `note` | `text` |  Nullable |

## Table `teachers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `nbm` | `text` |  Nullable Unique |
| `subject` | `text` |  Nullable |
| `gender` | `bpchar` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `status` | `text` |  |
| `join_date` | `date` |  Nullable |
| `address` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `is_pinned` | `bool` |  |
| `class_id` | `uuid` |  Nullable |
| `type` | `text` |  Nullable |
| `profile_id` | `uuid` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `work_days` | `_text` |  Nullable |
| `fingerspot_name` | `text` |  Nullable |
| `nik` | `varchar` |  Nullable |
| `nip` | `varchar` |  Nullable |
| `nuptk` | `varchar` |  Nullable |
| `birth_place` | `varchar` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `employment_status` | `varchar` |  Nullable |
| `teaching_hours` | `int4` |  Nullable |
| `last_education` | `varchar` |  Nullable |
| `major` | `varchar` |  Nullable |
| `graduation_year` | `int4` |  Nullable |
| `total_points` | `int4` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `student_monthly_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `month` | `int2` |  |
| `year` | `int2` |  |
| `nilai_akhlak` | `int2` |  Nullable |
| `nilai_ibadah` | `int2` |  Nullable |
| `nilai_kebersihan` | `int2` |  Nullable |
| `nilai_quran` | `int2` |  Nullable |
| `nilai_bahasa` | `int2` |  Nullable |
| `berat_badan` | `numeric` |  Nullable |
| `tinggi_badan` | `numeric` |  Nullable |
| `ziyadah` | `varchar` |  Nullable |
| `murojaah` | `varchar` |  Nullable |
| `hari_sakit` | `int2` |  Nullable |
| `hari_pulang` | `int2` |  Nullable |
| `catatan` | `text` |  Nullable |
| `musyrif_name` | `varchar` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `hari_izin` | `int2` |  Nullable |
| `hari_alpa` | `int2` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `updated_by_name` | `text` |  Nullable |

## Table `student_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  Nullable |
| `class_id` | `uuid` |  Nullable |
| `year` | `int4` |  |
| `month` | `int4` |  |
| `days` | `jsonb` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `gate_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `visitor_type` | `text` |  |
| `teacher_id` | `uuid` |  Nullable |
| `visitor_name` | `text` |  |
| `visitor_nip` | `text` |  Nullable |
| `purpose` | `text` |  |
| `destination` | `text` |  Nullable |
| `vehicle_plate` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `check_in` | `timestamptz` |  |
| `check_out` | `timestamptz` |  Nullable |
| `recorded_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `estimated_return` | `timestamptz` |  Nullable |
| `student_id` | `uuid` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `feature_flags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `key` | `text` |  Unique |
| `label` | `text` |  |
| `description` | `text` |  Nullable |
| `enabled` | `bool` |  |
| `category` | `text` |  |
| `sort_order` | `int4` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `updated_by` | `uuid` |  Nullable |

## Table `user_preferences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable Unique |
| `notification_email` | `bool` |  Nullable |
| `notification_whatsapp` | `bool` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `school_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int2` | Primary |
| `school_name_id` | `text` |  |
| `school_name_ar` | `text` |  Nullable |
| `school_subtitle_ar` | `text` |  Nullable |
| `school_address` | `text` |  Nullable |
| `logo_url` | `text` |  Nullable |
| `headmaster_title_id` | `text` |  Nullable |
| `headmaster_name_id` | `text` |  Nullable |
| `headmaster_title_ar` | `text` |  Nullable |
| `headmaster_name_ar` | `text` |  Nullable |
| `report_color_primary` | `text` |  Nullable |
| `report_color_secondary` | `text` |  Nullable |
| `wa_footer` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `news`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `content` | `text` |  |
| `image_url` | `text` |  Nullable |
| `tag` | `text` |  Nullable |
| `author` | `text` |  Nullable |
| `is_published` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `scheduled_at` | `timestamptz` |  Nullable |
| `meta_title` | `text` |  Nullable |
| `meta_description` | `text` |  Nullable |
| `excerpt` | `text` |  Nullable |
| `slug` | `text` |  Nullable Unique |
| `is_featured` | `bool` |  Nullable |
| `image_alt` | `text` |  Nullable |
| `display_name` | `text` |  Nullable |
| `read_time` | `int4` |  Nullable |
| `view_count` | `int4` |  Nullable |
| `seo_score` | `int4` |  Nullable |
| `focus_keyword` | `text` |  Nullable |

## Table `teacher_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `teacher_id` | `uuid` |  Nullable |
| `date` | `date` |  |
| `scan_in` | `time` |  Nullable |
| `scan_out` | `time` |  Nullable |
| `status` | `text` |  |
| `late_minutes` | `int4` |  Nullable |
| `early_leave_minutes` | `int4` |  Nullable |
| `source` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `imported_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `teacher_attendance_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `jam_masuk` | `text` |  Nullable |
| `jam_keluar` | `text` |  Nullable |
| `standar_jam` | `int4` |  Nullable |
| `potongan_nominal` | `int4` |  Nullable |
| `potongan_interval` | `int4` |  Nullable |
| `lembur_enabled` | `bool` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `standar_menit` | `int4` |  Nullable |
| `lembur_nominal` | `int4` |  Nullable |
| `lembur_interval` | `int4` |  Nullable |

## Table `audit_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `table_name` | `text` |  |
| `record_id` | `uuid` |  Nullable |
| `old_data` | `jsonb` |  Nullable |
| `new_data` | `jsonb` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `source` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `url` | `text` |  Nullable |
| `actor_name` | `text` |  Nullable |
| `actor_role` | `text` |  Nullable |
| `severity` | `text` |  Nullable |
| `session_id` | `text` |  Nullable |
| `changed_fields` | `_text` |  Nullable |
| `duration_ms` | `int4` |  Nullable |

## Table `ai_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `user_query` | `text` |  |
| `ai_response` | `text` |  Nullable |
| `type` | `text` |  Nullable |
| `model` | `text` |  Nullable |
| `status_code` | `int4` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `gate_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `webhook_url` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `enrollment_waves`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `varchar` |  |
| `academic_year` | `varchar` |  |
| `start_date` | `date` |  |
| `end_date` | `date` |  |
| `quota` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `metadata` | `jsonb` |  Nullable |

## Table `enrollments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `registration_number` | `varchar` |  Unique |
| `name` | `varchar` |  |
| `gender` | `varchar` |  Nullable |
| `birth_place` | `varchar` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `nisn` | `varchar` |  Nullable |
| `school_origin` | `varchar` |  Nullable |
| `previous_pesantren` | `varchar` |  Nullable |
| `phone` | `varchar` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `program` | `varchar` |  Nullable |
| `quran_level` | `varchar` |  Nullable |
| `hafalan_quran` | `int4` |  Nullable |
| `status` | `varchar` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `wave_id` | `uuid` |  Nullable |
| `created_at` | `timestamp` |  Nullable |
| `updated_at` | `timestamp` |  Nullable |

## Table `dorms`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `ar` | `text` |  Nullable |
| `capacity` | `int4` |  |
| `created_at` | `timestamptz` |  Nullable |
| `gender` | `varchar` |  Nullable |
| `building` | `varchar` |  Nullable |
| `musyrif_id` | `uuid` |  Nullable |
| `status` | `varchar` |  Nullable |

## Table `dorm_audits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `date` | `date` |  |
| `room` | `text` |  |
| `score` | `int4` |  |
| `rating` | `text` |  |
| `aspects` | `jsonb` |  |
| `notes` | `text` |  Nullable |

## Table `dorm_shift_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `date` | `text` |  |
| `musyrif_name` | `text` |  |
| `shift` | `text` |  |
| `notes` | `text` |  Nullable |
| `issues` | `text` |  Nullable |

## Table `dorm_musyrif_tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `title` | `text` |  |
| `desc_text` | `text` |  |
| `completed` | `bool` |  Nullable |
| `completed_at` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `health_medicines`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `category` | `text` |  |
| `stock` | `int4` |  |
| `unit` | `text` |  |
| `min_stock` | `int4` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `health_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `date` | `date` |  |
| `time` | `time` |  |
| `student_id` | `uuid` |  Nullable |
| `student_name` | `text` |  |
| `class_name` | `text` |  Nullable |
| `complaint` | `text` |  |
| `diagnosis` | `text` |  Nullable |
| `treatment` | `text` |  |
| `medicine_id` | `uuid` |  Nullable |
| `medicine_name` | `text` |  Nullable |
| `medicine_qty` | `int4` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `counseling_logs`

Rekam jejak sesi Bimbingan Konseling (BK) santri MBS Tanggul.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `date` | `date` |  |
| `time` | `text` |  |
| `student_id` | `uuid` |  Nullable |
| `student_name` | `text` |  |
| `class_name` | `text` |  |
| `counselor_name` | `text` |  |
| `category` | `counseling_category` |  |
| `complaint` | `text` |  |
| `diagnosis` | `text` |  |
| `action_plan` | `text` |  |
| `urgency` | `counseling_urgency` |  |
| `status` | `counseling_status` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `dorm_inventories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `dorm_id` | `text` |  Nullable |
| `item_name` | `varchar` |  |
| `total_quantity` | `int4` |  Nullable |
| `good_condition_count` | `int4` |  Nullable |
| `damaged_condition_count` | `int4` |  Nullable |
| `last_checked_at` | `timestamptz` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `student_semester_reports`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `student_id` | `uuid` |  |
| `report_type` | `text` |  |
| `semester` | `int4` |  |
| `academic_year` | `text` |  |
| `scores` | `jsonb` |  |
| `extras` | `jsonb` |  Nullable |
| `musyrif_name` | `text` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `updated_by_name` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `signatures`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `role` | `text` |  |
| `person_id` | `uuid` |  |
| `signature_url` | `text` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Custom Types / Enums

### `app_role`

`admin` | `teacher` | `elder`

### `incident_status`

`submitted` | `approved` | `rejected`

### `user_role`

`admin` | `teacher` | `elder`

### `student_status`

`aktif` | `lulus` | `pindah` | `keluar`

### `counseling_category`

`pribadi` | `sosial` | `akademik` | `karir`

### `counseling_urgency`

`ringan` | `sedang` | `tinggi`

### `counseling_status`

`proses` | `selesai`

## Table `wafa_attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `item_id` | `uuid` | Not null (FK to teachers or students) |
| `tab` | `text` | Not null (`teacher`, `mentor`, `student`) |
| `year` | `int4` | Not null |
| `month` | `int4` | Not null |
| `days` | `jsonb` | Not null, default `'{}'` |
| `updated_by` | `uuid` | Nullable (FK to profiles) |
| `created_at` | `timestamptz` | Nullable, default `now()` |
| `updated_at` | `timestamptz` | Nullable, default `now()` |

Constraints: unique(`item_id`, `tab`, `year`, `month`)

## Table `wafa_groups`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `name` | `text` | Not null |
| `guru_id` | `uuid` | Not null (FK to teachers) |
| `created_at` | `timestamptz` | Nullable, default `now()` |
| `updated_at` | `timestamptz` | Nullable, default `now()` |
| `deleted_at` | `timestamptz` | Nullable |

## Table `wafa_group_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `group_id` | `uuid` | Not null (FK to wafa_groups, ON DELETE CASCADE) |
| `student_id` | `uuid` | Not null (FK to students) |
| `role` | `text` | Not null, default `student` (`student` or `mudabbir`) |
| `created_at` | `timestamptz` | Nullable, default `now()` |

Constraints: unique(`group_id`, `student_id`)

## RLS Policies

### `ai_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `ai_logs_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `ai_logs_insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `ai_logs_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `teacher_attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `teacher_attendance_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `teacher_attendance_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` |
| `teacher_attendance_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` | — |
| `teacher_attendance_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |

### `gate_config`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `gate_config_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `gate_config_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` |
| `gate_config_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `gate_config_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `teacher_attendance_config`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `teacher_attendance_config_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `teacher_attendance_config_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` |
| `teacher_attendance_config_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `teacher_attendance_config_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `student_monthly_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `monthly_reports_delete` | DELETE | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text]))))) OR (created_by = auth.uid()))` | — |
| `monthly_reports_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` |
| `monthly_reports_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `monthly_reports_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` | — |

### `enrollments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `enrollments_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = 'ketua'::text)))))` | — |
| `enrollments_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` |
| `enrollments_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` | — |
| `enrollments_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` | — |

### `classes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `classes_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `classes_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` |
| `classes_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `classes_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_delete` | DELETE | authenticated | PERMISSIVE | `((auth.uid() <> id) AND (get_my_role() = ANY (ARRAY['admin'::text, 'developer'::text])))` | — |
| `profiles_insert_trigger` | INSERT | public | PERMISSIVE | — | `true` |
| `profiles_select` | SELECT | authenticated | PERMISSIVE | `((auth.uid() = id) OR (get_my_role() = ANY (ARRAY['admin'::text, 'developer'::text])))` | — |
| `profiles_select_own` | SELECT | public | PERMISSIVE | `(auth.uid() = id)` | — |
| `profiles_update` | UPDATE | authenticated | PERMISSIVE | `((auth.uid() = id) OR (get_my_role() = ANY (ARRAY['admin'::text, 'developer'::text])))` | — |
| `profiles_update_own` | UPDATE | public | PERMISSIVE | `(auth.uid() = id)` | — |

### `enrollment_waves`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `enrollment_waves_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |
| `enrollment_waves_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = 'ketua'::text)))))` |
| `enrollment_waves_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` | — |
| `enrollment_waves_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = 'ketua'::text)))))` | — |

### `reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `reports_delete` | DELETE | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text]))))) OR (reporter_id = auth.uid()))` | — |
| `reports_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` |
| `reports_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `reports_update` | UPDATE | authenticated | PERMISSIVE | `((EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text]))))) OR (reporter_id = auth.uid()))` | — |

### `academic_years`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `academic_years_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `academic_years_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` |
| `academic_years_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `academic_years_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |

### `health_medicines`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access to health_medicines for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | — |
| `Allow read access to health_medicines for all` | SELECT | public | PERMISSIVE | `true` | — |

### `feature_flags`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `feature_flags_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `feature_flags_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` |
| `feature_flags_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `feature_flags_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `health_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all access to health_logs for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | — |
| `Allow read access to health_logs for all` | SELECT | public | PERMISSIVE | `true` | — |

### `counseling_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `counseling_logs: authenticated dapat delete` | DELETE | authenticated | PERMISSIVE | `true` | — |
| `counseling_logs: authenticated dapat insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `counseling_logs: authenticated dapat membaca` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `counseling_logs: authenticated dapat update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |

### `student_semester_reports`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow all actions for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |
| `Allow public read access` | SELECT | anon | PERMISSIVE | `true` | — |

### `news`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `news_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `news_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` |
| `news_select_public` | SELECT | anon, authenticated | PERMISSIVE | `true` | — |
| `news_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |

### `gate_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `gate_logs_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'developer'::text])))))` | — |
| `gate_logs_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'satpam'::text, 'developer'::text])))))` |
| `gate_logs_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `gate_logs_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'satpam'::text, 'developer'::text])))))` | — |

### `school_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `school_settings_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `school_settings_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` |
| `school_settings_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `school_settings_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `audit_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `audit_logs_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'developer'::text))))` | — |
| `audit_logs_insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `audit_logs_select` | SELECT | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |

### `students`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `students_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `students_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` |
| `students_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `students_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND ((profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])) OR (profiles.spmb_role = ANY (ARRAY['ketua'::text, 'anggota'::text]))))))` | — |

### `point_rules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `point_rules_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |
| `point_rules_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` |
| `point_rules_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `point_rules_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text, 'guru'::text])))))` | — |

### `teachers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `teachers_delete` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text])))))` | — |
| `teachers_insert` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` |
| `teachers_select` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `teachers_update` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['developer'::text, 'admin'::text, 'pengurus'::text])))))` | — |

### `dorm_inventories`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow read for authenticated users` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `Allow write for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `signatures`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Authenticated manage signatures` | ALL | authenticated | PERMISSIVE | `true` | `true` |
| `Public read signatures` | SELECT | public | PERMISSIVE | `true` | — |

### `dorms`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow full access for authenticated users` | ALL | authenticated | PERMISSIVE | `true` | — |
| `Allow public read access` | SELECT | public | PERMISSIVE | `true` | — |

### `dorm_audits`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public delete access on dorm_audits` | DELETE | public | PERMISSIVE | `true` | — |
| `Allow public insert access on dorm_audits` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public read access on dorm_audits` | SELECT | public | PERMISSIVE | `true` | — |

### `dorm_shift_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public insert access on dorm_shift_logs` | INSERT | public | PERMISSIVE | — | `true` |
| `Allow public read access on dorm_shift_logs` | SELECT | public | PERMISSIVE | `true` | — |

### `dorm_musyrif_tasks`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public read access on dorm_musyrif_tasks` | SELECT | public | PERMISSIVE | `true` | — |
| `Allow public update access on dorm_musyrif_tasks` | UPDATE | public | PERMISSIVE | `true` | — |

