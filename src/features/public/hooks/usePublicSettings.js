import { useEffect, useState } from 'react'
import { supabase } from '@lib/supabase'
import { DEFAULT_SETTINGS } from '@core/context/SchoolSettings'

// Cache module-level agar beberapa halaman publik berbagi satu fetch.
let cache = null
let inflight = null

/**
 * Fetch ringan school_settings untuk halaman publik (tanpa provider).
 * Merge hasil DB di atas DEFAULT_SETTINGS, fallback diam ke default.
 */
export default function usePublicSettings() {
    const [settings, setSettings] = useState(cache || DEFAULT_SETTINGS)

    useEffect(() => {
        if (cache) return
        if (!inflight) {
            inflight = supabase
                .from('school_settings')
                .select('*')
                .eq('id', 1)
                .maybeSingle()
                .then(({ data }) => {
                    cache = data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS
                    inflight = null
                    return cache
                })
                .catch(() => {
                    inflight = null
                    return DEFAULT_SETTINGS
                })
        }
        let mounted = true
        inflight.then((s) => { if (mounted && s) setSettings(s) })
        return () => { mounted = false }
    }, [])

    return settings
}
