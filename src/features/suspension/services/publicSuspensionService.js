// Satu-satunya akses halaman publik /skorsing/:token ke Supabase.
// DILARANG query tabel langsung dari file ini maupun halaman publik —
// semua lewat 4 RPC SECURITY DEFINER yang memvalidasi token + rate limit.
import { supabase } from '@lib/supabase'

function rpcError(err, fallback) {
  const msg = err?.message || err?.hint || ''
  if (!msg) return new Error(fallback)
  // Pesan dari RPC sudah Bahasa Indonesia — teruskan apa adanya
  return new Error(msg)
}

export async function validatePublicToken(token, signal) {
  const { data, error } = await supabase.rpc('validate_suspension_token', {
    p_token: token,
  }).abortSignal(signal)
  if (error) throw rpcError(error, 'Tautan tidak valid atau sudah kedaluwarsa.')
  return data
}

export async function fetchPublicDay(token, dateStr, signal) {
  const { data, error } = await supabase.rpc('get_suspension_day', {
    p_token: token,
    p_date: dateStr,
  }).abortSignal(signal)
  if (error) throw rpcError(error, 'Gagal memuat data hari ini.')
  // Normalisasi: pastikan shape selalu lengkap walau RPC berubah
  return {
    templates: data?.templates || [],
    tasks: data?.tasks || [],
    log: data?.log || null,
    submissions: data?.submissions || [],
  }
}

export async function savePublicLog(token, dateStr, entries, note) {
  const { data, error } = await supabase.rpc('save_suspension_log', {
    p_token: token,
    p_date: dateStr,
    p_entries: entries || {},
    p_note: note || null,
  })
  if (error) throw rpcError(error, 'Gagal menyimpan log harian.')
  return data
}

export async function submitPublicTask(token, taskId, photoDataUrls, note) {
  const { data, error } = await supabase.rpc('submit_suspension_task', {
    p_token: token,
    p_task_id: taskId,
    p_photos_base64: photoDataUrls || [],
    p_note: note || null,
  })
  if (error) throw rpcError(error, 'Gagal mengirim bukti tugas.')
  return data
}
