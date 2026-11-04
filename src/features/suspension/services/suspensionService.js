// Service dashboard (authenticated) modul Skorsing.
// Aturan: kolom eksplisit, list wajib .limit()/.range(), selalu cek error,
// mutasi penting wajib logAudit(). Halaman publik DILARANG memakai file ini —
// pakai publicService.js (RPC saja).
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'

// ─── Token: raw 43 char (32 byte acak), yang disimpan hanya sha256 hex ───

function randomRawToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function sha256Hex(raw) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function expiryOf(endDate) {
  const d = new Date(`${endDate}T12:00:00`)
  d.setDate(d.getDate() + 1) // kedaluwarsa otomatis: tanggal selesai + 1 hari
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

// ─── Pencarian ─────────────────────────────────────────────

export async function searchStudents(term) {
  if (!term || term.trim().length < 2) return []
  const { data, error } = await supabase
    .from('students')
    .select('id, name, class_id, photo_url, guardian_name, classes ( id, name, grade )')
    .ilike('name', `%${term.trim()}%`)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')
    .limit(10)
  if (error) throw error
  return data || []
}

export async function searchViolationReports(studentId) {
  if (!studentId) return []
  const { data, error } = await supabase
    .from('reports')
    .select('id, points, notes, description, reported_at, point_rules ( name )')
    .eq('student_id', studentId)
    .order('reported_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data || []
}

// ─── Skorsing ──────────────────────────────────────────────

export async function listSuspensions({ status = 'all', search = '', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('suspensions')
    .select(
      `id, student_id, jenjang, start_date, end_date, reason_summary,
       violation_report_id, status, created_at, updated_at,
       student:students ( id, name, photo_url, guardian_name, classes ( id, name, grade ) )`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)
  if (search.trim()) query = query.ilike('student.name', `%${search.trim()}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) throw error
  return { items: data || [], total: count || 0 }
}

export async function getSuspension(id) {
  const { data, error } = await supabase
    .from('suspensions')
    .select(
      `id, student_id, jenjang, start_date, end_date, reason_summary,
       violation_report_id, status, created_by, created_at, updated_at,
       student:students ( id, name, photo_url, guardian_name, guardian_relation,
         classes ( id, name, grade ) ),
       violation:reports ( id, points, notes, description, reported_at )`,
    )
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createSuspension({ studentId, jenjang, startDate, endDate, reasonSummary, violationReportId, createdBy }) {
  const { data, error } = await supabase
    .from('suspensions')
    .insert({
      student_id: studentId,
      jenjang,
      start_date: startDate,
      end_date: endDate,
      reason_summary: reasonSummary,
      violation_report_id: violationReportId || null,
      status: 'aktif',
      created_by: createdBy || null,
    })
    .select('id, student_id, jenjang, start_date, end_date, status')
    .single()
  if (error) throw error
  await logAudit({
    action: 'INSERT', source: 'OPERATIONAL', tableName: 'suspensions',
    recordId: data.id, newData: data,
  })
  return data
}

export async function updateSuspension(id, updates, prev = null) {
  const { data, error } = await supabase
    .from('suspensions')
    .update(updates)
    .eq('id', id)
    .select('id, student_id, jenjang, start_date, end_date, status, reason_summary')
    .single()
  if (error) throw error
  await logAudit({
    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'suspensions',
    recordId: id, oldData: prev, newData: data,
  })
  return data
}

// ─── Token wali ────────────────────────────────────────────

export async function generateSuspensionToken(suspension, createdBy) {
  const raw = randomRawToken()
  const hash = await sha256Hex(raw)
  const { data, error } = await supabase
    .from('suspension_tokens')
    .insert({
      suspension_id: suspension.id,
      token_hash: hash,
      token_prefix: raw.slice(0, 8),
      expires_at: expiryOf(suspension.end_date),
      created_by: createdBy || null,
    })
    .select('id, suspension_id, token_prefix, expires_at, created_at')
    .single()
  if (error) throw error
  await logAudit({
    action: 'INSERT', source: 'SECURITY', tableName: 'suspension_tokens',
    recordId: data.id,
    newData: { suspension_id: suspension.id, token_prefix: data.token_prefix, expires_at: data.expires_at },
  })
  // raw HANYA dikembalikan sekali — tidak pernah disimpan di DB
  return { ...data, raw }
}

export async function listSuspensionTokens(suspensionId) {
  const { data, error } = await supabase
    .from('suspension_tokens')
    .select('id, token_prefix, expires_at, revoked_at, last_used_at, use_count, created_at')
    .eq('suspension_id', suspensionId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

export async function revokeSuspensionToken(tokenId, revokedBy) {
  const { data, error } = await supabase
    .from('suspension_tokens')
    .update({ revoked_at: new Date().toISOString(), revoked_by: revokedBy || null })
    .eq('id', tokenId)
    .select('id, suspension_id, token_prefix')
    .single()
  if (error) throw error
  await logAudit({
    action: 'UPDATE', source: 'SECURITY', tableName: 'suspension_tokens',
    recordId: tokenId, newData: { revoked: true, ...data },
  })
  return data
}

// ─── Tugas ─────────────────────────────────────────────────

export async function listSuspensionTasks(suspensionId) {
  const { data, error } = await supabase
    .from('suspension_tasks')
    .select('id, suspension_id, subject, title, description, due_date, attachment_url, target_tahfidz, target_wafa, created_by, created_at')
    .eq('suspension_id', suspensionId)
    .order('due_date', { ascending: true, nullsFirst: true })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function createSuspensionTask(payload) {
  const { data, error } = await supabase
    .from('suspension_tasks')
    .insert(payload)
    .select('id, suspension_id, subject, title, due_date, created_by')
    .single()
  if (error) throw error
  await logAudit({
    action: 'INSERT', source: 'OPERATIONAL', tableName: 'suspension_tasks',
    recordId: data.id, newData: data,
  })
  return data
}

export async function updateSuspensionTask(id, updates, prev = null) {
  const { data, error } = await supabase
    .from('suspension_tasks')
    .update(updates)
    .eq('id', id)
    .select('id, suspension_id, subject, title, due_date')
    .single()
  if (error) throw error
  await logAudit({
    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'suspension_tasks',
    recordId: id, oldData: prev, newData: data,
  })
  return data
}

export async function deleteSuspensionTask(id, prev = null) {
  const { error } = await supabase.from('suspension_tasks').delete().eq('id', id)
  if (error) throw error
  await logAudit({
    action: 'DELETE', source: 'OPERATIONAL', tableName: 'suspension_tasks',
    recordId: id, oldData: prev,
  })
}

// ─── Submission + penilaian ────────────────────────────────

export async function listSuspensionSubmissions(suspensionId) {
  const { data, error } = await supabase
    .from('suspension_task_submissions')
    .select('id, task_id, suspension_id, status, score, teacher_comment, photo_urls, note, submitted_at, graded_at')
    .eq('suspension_id', suspensionId)
    .limit(100)
  if (error) throw error
  // photo_data (base64) sengaja TIDAK ikut list agar ringan; diambil per item saat dinilai
  return data || []
}

export async function getSubmissionPhotos(submissionId) {
  const { data, error } = await supabase
    .from('suspension_task_submissions')
    .select('id, photo_data')
    .eq('id', submissionId)
    .single()
  if (error) throw error
  return data?.photo_data || []
}

export async function gradeSuspensionSubmission(id, { score, teacherComment, status, gradedBy }, prev = null) {
  const { data, error } = await supabase
    .from('suspension_task_submissions')
    .update({
      score: score ?? null,
      teacher_comment: teacherComment || null,
      status: status || 'dinilai',
      graded_by: gradedBy || null,
      graded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, task_id, suspension_id, status, score')
    .single()
  if (error) throw error
  await logAudit({
    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'suspension_task_submissions',
    recordId: id, oldData: prev, newData: data,
  })
  return data
}

// ─── Log harian (baca dashboard) ───────────────────────────

export async function listSuspensionLogs(suspensionId) {
  const { data, error } = await supabase
    .from('suspension_daily_logs')
    .select('id, log_date, entries, note_optional, submitted_at, updated_at')
    .eq('suspension_id', suspensionId)
    .order('log_date', { ascending: true })
    .limit(62)
  if (error) throw error
  return data || []
}

// ─── Followup pembina ──────────────────────────────────────

export async function listSuspensionFollowups(suspensionId) {
  const { data, error } = await supabase
    .from('suspension_followups')
    .select('id, contacted_at, method, notes, created_by, created_at')
    .eq('suspension_id', suspensionId)
    .order('contacted_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function addSuspensionFollowup({ suspensionId, method, notes, contactedAt, createdBy }) {
  const { data, error } = await supabase
    .from('suspension_followups')
    .insert({
      suspension_id: suspensionId,
      method,
      notes,
      contacted_at: contactedAt || new Date().toISOString(),
      created_by: createdBy || null,
    })
    .select('id, contacted_at, method, notes')
    .single()
  if (error) throw error
  await logAudit({
    action: 'INSERT', source: 'OPERATIONAL', tableName: 'suspension_followups',
    recordId: data.id, newData: { suspension_id: suspensionId, ...data },
  })
  return data
}

export async function deleteSuspensionFollowup(id, prev = null) {
  const { error } = await supabase.from('suspension_followups').delete().eq('id', id)
  if (error) throw error
  await logAudit({
    action: 'DELETE', source: 'OPERATIONAL', tableName: 'suspension_followups',
    recordId: id, oldData: prev,
  })
}

// ─── Template checklist (admin) ────────────────────────────

export async function listSuspensionTemplates() {
  const { data, error } = await supabase
    .from('suspension_log_templates')
    .select('id, block_key, item_key, label_id, input_type, options, day_type, monday_thursday_only, jenjang, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function updateSuspensionTemplate(id, updates, prev = null) {
  const { data, error } = await supabase
    .from('suspension_log_templates')
    .update(updates)
    .eq('id', id)
    .select('id, block_key, item_key, label_id, is_active')
    .single()
  if (error) throw error
  await logAudit({
    action: 'UPDATE', source: 'MASTER', tableName: 'suspension_log_templates',
    recordId: id, oldData: prev, newData: data,
  })
  return data
}
