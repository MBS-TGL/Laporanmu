import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'

const ThemeContext = createContext({})

const STORAGE_KEY = 'laporanmu_theme'

export function ThemeProvider({ children }) {
    // Tentukan Tema Awal: Pakai Preferensi Tersimpan, Atau Ikuti Setting Sistem Jika Belum Pernah Diatur
    // [FIX] Bungkus dengan try-catch — localStorage.getItem bisa throw di mode incognito ketat
    // atau saat app di-embed dalam iframe dengan storage access yang diblokir browser
    const [isDark, setIsDark] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) return saved === 'dark'
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        } catch {
            return false
        }
    })

    // Sinkronkan Class "dark" Di Elemen html Dan Simpan Preferensi Ke LocalStorage Setiap Kali Tema Berubah
    // [FIX] Bungkus localStorage.setItem dengan try-catch — sama, bisa throw di lingkungan terbatas
    useEffect(() => {
        const root = document.documentElement
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        try {
            localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
        } catch { /* ignore — tema tetap berjalan, hanya tidak tersimpan */ }
    }, [isDark])

    // [FIX] Wrap useCallback — referensi toggleTheme stabil, tidak trigger re-render
    // child React.memo yang menerima toggleTheme sebagai prop (misal: tombol toggle di Navbar)
    const toggleTheme = useCallback(() => {
        // Fallback Untuk Browser Yang Belum Mendukung View Transitions API (Misalnya Firefox Dan Safari Saat Ini) — Ganti Tema Langsung Tanpa Animasi Transisi
        if (!document.startViewTransition) {
            setIsDark(prev => !prev)
            return
        }

        // Browser Modern: Gunakan View Transitions API Untuk Animasi Pudar Antar Tema.
        // flushSync Dipakai Agar React Merender Tema Baru Secara Synchronous Sebelum Browser
        // Mengambil Snapshot "Sesudah" — Tanpa Ini, Snapshot Bisa Terambil Sebelum DOM Selesai Berubah,
        // Sehingga Transisinya Jadi Patah Atau Salah.
        document.startViewTransition(() => {
            flushSync(() => {
                setIsDark(prev => !prev)
            })
        })
    }, [])

    // [FIX] useMemo pada value object — tanpa ini, object baru dibuat setiap render
    // sehingga semua consumer context ikut re-render meski isDark dan toggleTheme tidak berubah
    const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme])

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}