
import { supabase } from '@lib/supabase'

/**
 * Tulis satu entry ke audit_logs
 * @param {Object} params
 * @param {'INSERT'|'UPDATE'|'DELETE'|'LOGIN'|'LOGOUT'|'RESTORE'|'EXPORT'|'SEND'} params.action
 * @param {string}  params.tableName
 * @param {'OPERATIONAL'|'SYSTEM'|'MASTER'|'SECURITY'|'AUTH'} [params.source]
 * @param {string}  [params.recordId]
 * @param {Object}  [params.oldData]
 * @param {Object}  [params.newData]
 */
export async function logAudit({ action, tableName, source = 'SYSTEM', recordId = null, oldData = null, newData = null }) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Snapshot actor name & role dari profiles (immutable — forensics safe)
        let actorName = 'System'
        let actorRole = 'unknown'
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', user.id)
                .single()
            if (profile) {
                actorName = profile.name || user.email || 'System'
                actorRole = profile.role || 'unknown'
            }
        } catch (e) {
            console.debug('[auditLogger] Failed to fetch profile:', e.message)
        }

        // Capture forensic context
        const userAgent = navigator.userAgent
        const url = window.location.href

        let ipAddress = sessionStorage.getItem('_audit_ip') || '0.0.0.0'
        if (ipAddress === '0.0.0.0') {
            try {
                const ipRes = await fetch('https://api64.ipify.org?format=json')
                const ipJson = await ipRes.json()
                ipAddress = ipJson.ip
                sessionStorage.setItem('_audit_ip', ipAddress)
            } catch (e) {
                console.debug('[auditLogger] Failed to fetch IP:', e.message)
            }
        }

        // Bersihkan data — hapus field sensitif sebelum disimpan
        const sanitize = (obj) => {
            if (!obj) return null
            const clean = { ...obj }
            delete clean.password
            delete clean.password_hash
            delete clean.token
            delete clean.secret
            return clean
        }

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action,
            source: source || 'SYSTEM',
            table_name: tableName,
            record_id: recordId || null,
            old_data: sanitize(oldData),
            new_data: sanitize(newData),
            ip_address: ipAddress,
            user_agent: userAgent,
            url: url,
            actor_name: actorName,
            actor_role: actorRole,
        })
        // Sengaja tidak throw error — audit log gagal tidak boleh block aksi utama
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis audit log:', err?.message)
    }
}

/**
 * Helper khusus untuk batch log — misalnya import massal
 * @param {Array} entries - Array of { action, tableName, source, recordId, oldData, newData }
 */
export async function logAuditBatch(entries) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !entries?.length) return

        // Snapshot actor name & role dari profiles
        let actorName = 'System'
        let actorRole = 'unknown'
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', user.id)
                .single()
            if (profile) {
                actorName = profile.name || user.email || 'System'
                actorRole = profile.role || 'unknown'
            }
        } catch (e) {
            console.debug('[auditLogger] Failed to fetch profile:', e.message)
        }

        const sanitize = (obj) => {
            if (!obj) return null
            const clean = { ...obj }
            delete clean.password; delete clean.password_hash
            delete clean.token; delete clean.secret
            return clean
        }

        const userAgent = navigator.userAgent
        const url = window.location.href
        let ipAddress = sessionStorage.getItem('_audit_ip') || '0.0.0.0'
        if (ipAddress === '0.0.0.0') {
            try {
                const ipRes = await fetch('https://api64.ipify.org?format=json')
                const ipJson = await ipRes.json()
                ipAddress = ipJson.ip
                sessionStorage.setItem('_audit_ip', ipAddress)
            } catch (e) {
                console.debug('[auditLogger] Failed to fetch IP:', e.message)
            }
        }

        const rows = entries.map(e => ({
            user_id: user.id,
            action: e.action,
            source: e.source || 'SYSTEM',
            table_name: e.tableName,
            record_id: e.recordId || null,
            old_data: sanitize(e.oldData),
            new_data: sanitize(e.newData),
            ip_address: ipAddress,
            user_agent: userAgent,
            url: url,
            actor_name: actorName,
            actor_role: actorRole,
        }))

        await supabase.from('audit_logs').insert(rows)
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis batch audit log:', err?.message)
    }
}
