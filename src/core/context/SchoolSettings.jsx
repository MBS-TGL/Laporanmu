import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@lib/supabase'

// ─── Default Values (Fallback Jika Belum Ada Di DB) ───────────────────────────
export const DEFAULT_SETTINGS = {
    // Identitas Sekolah
    school_name_id: 'Muhammadiyah Boarding School (MBS) Tanggul',
    school_name_ar: 'معهد محمدية الإسلامي تانجول',
    school_subtitle_ar: 'المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية',
    school_address: 'Jl. Pemandian no. 88 RT 002 RW 003 Patemon, Tanggul, Jember 68155',
    school_domain: 'smpmuh4tanggul.sch.id',
    app_domain: 'laporanmu.my.id',
    logo_url: '',

    // Kepala Sekolah / Direktur
    headmaster_title_id: 'Pengasuh\nMuhammadiyah Boarding School Tanggul',
    headmaster_name_id: 'Ir. Muhammad Ali Maksum',
    headmaster_title_ar: 'مدير المعهد\nمعهد محمدية تانجول',
    headmaster_name_ar: 'المهندس محمد علي معصوم',

    // Warna Raport
    report_color_primary: '#1a5c35',
    report_color_secondary: '#c8a400',

    // WhatsApp
    wa_footer: 'Muhammadiyah Boarding School Tanggul · Laporanmu',
}

const SchoolSettingsContext = createContext({
    settings: DEFAULT_SETTINGS,
    loading: true,
    saveSettings: async () => null,
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SchoolSettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)

    // Fetch Saat Mount
    useEffect(() => {
        const load = async () => {
            try {
                const { data, error } = await supabase
                    .from('school_settings')
                    .select('*')
                    .eq('id', 1)
                    .maybeSingle()
                if (!error && data) {
                    // Naikkan Otomatis Judul Lama Ke Format Baru Multi-Baris
                    if (data.headmaster_title_id === 'Direktur MBS Tanggul') {
                        data.headmaster_title_id = 'Pengasuh\nMuhammadiyah Boarding School Tanggul'
                    }
                    if (data.headmaster_title_ar === 'مدير معهد محمدية الإسلامي تانجول') {
                        data.headmaster_title_ar = 'مدير المعهد\nمعهد محمدية تانجول'
                    }
                    // Naikkan Otomatis Nama/Judul Jika Cocok Dengan Default Lama
                    if (data.headmaster_name_id === 'KH. Muhammad Ali Maksum, Lc') {
                        data.headmaster_name_id = 'Ir. Muhammad Ali Maksum'
                        data.headmaster_name_ar = 'المهندس محمد علي معصوم'
                    }
                    // Perbaiki Otomatis Path Logo Lama
                    if (data.logo_url === '/src/assets/mbs.png') {
                        data.logo_url = ''
                    }
                    setSettings(prev => ({ ...prev, ...data }))
                }
            } catch {
                // Silent Fail — Pakai Default
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    /** Simpan Ke Supabase (Upsert Row Id=1) */
    const saveSettings = useCallback(async (updates) => {
        try {
            const { error } = await supabase
                .from('school_settings')
                .upsert(
                    { id: 1, ...updates, updated_at: new Date().toISOString() },
                    { onConflict: 'id' }
                )
            if (error) return error
            setSettings(prev => ({ ...prev, ...updates }))
            return null
        } catch (e) {
            return e
        }
    }, [])

    return (
        <SchoolSettingsContext.Provider value={{ settings, loading, saveSettings }}>
            {children}
        </SchoolSettingsContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useSchoolSettings = () => useContext(SchoolSettingsContext)