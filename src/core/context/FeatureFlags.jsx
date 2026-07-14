import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isDemoMode } from '@lib/supabase'

// ─── Context ──────────────────────────────────────────────────────────────────

const FeatureFlagsContext = createContext({
    flags: {},
    loading: true,
    refresh: () => { },
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeatureFlagsProvider({ children }) {
    const [flags, setFlags] = useState({})
    const [loading, setLoading] = useState(true)

    const fetchFlags = useCallback(async () => {
        if (isDemoMode) {
            setFlags({
                'module.absensi': true,
                'module.poin': true,
                'module.raport': true,
                'module.gate': true,
                'module.students': true,
                'module.teachers': true,
                'module.classes': true,
                'module.violation_types': true,
                'module.academic_years': true,
                'module.enrollment': true,
                'nav.dorms': true,
                'nav.health': true,
                'nav.counseling': true,
                'system.maintenance': false,
            })
            setLoading(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('key, enabled')
            if (error) throw error
            // Konversi Array ➔ { 'module.absensi': true, 'nav.raport': false, ... }
            const map = {}
                ; (data || []).forEach(f => { map[f.key] = f.enabled })
            setFlags(map)
        } catch (e) {
            console.error('[FeatureFlags] Gagal load flags:', e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isDemoMode) {
            fetchFlags()
            return
        }
        fetchFlags()

        // Subscription Realtime — Update Flags Secara Instan Saat Diubah Di Admin Panel
        const channel = supabase
            .channel('feature_flags_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'feature_flags',
            }, (payload) => {
                if (payload.new?.key) {
                    setFlags(prev => ({ ...prev, [payload.new.key]: payload.new.enabled }))
                }
            })
            .subscribe()

        // Polling Fallback Setiap 60 Detik — Berjalan Terus Sebagai Backup Realtime
        const pollInterval = setInterval(fetchFlags, 60000)

        return () => {
            supabase.removeChannel(channel)
            clearInterval(pollInterval)
        }
    }, [fetchFlags])

    return (
        <FeatureFlagsContext.Provider value={{ flags, loading, refresh: fetchFlags }}>
            {children}
        </FeatureFlagsContext.Provider>
    )
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Ambil Semua Flags Sekaligus */
export function useFeatureFlags() {
    return useContext(FeatureFlagsContext)
}

/** Periksa Satu Flag: useFlag('module.absensi') ➔ true/false */
export function useFlag(key) {
    const { flags, loading } = useContext(FeatureFlagsContext)
    return { enabled: flags[key] ?? true, loading }
    // Default true — Jika Flag Belum Load, Anggap Aktif (Fail Open)
}