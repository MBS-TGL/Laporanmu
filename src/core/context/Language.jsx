import { createContext, useContext, useState, useEffect, useCallback } from "react"

const LanguageContext = createContext()

// ─── Impor JSON Terjemahan Modular ─────────────────────────────────────────
import idCommon from "../../locales/id/common.json"
import idNav from "../../locales/id/nav.json"
import idGate from "../../locales/id/gate.json"
import idBehavior from "../../locales/id/behavior.json"
import idDorms from "../../locales/id/dorms.json"

import enCommon from "../../locales/en/common.json"
import enNav from "../../locales/en/nav.json"
import enGate from "../../locales/en/gate.json"
import enBehavior from "../../locales/en/behavior.json"
import enDorms from "../../locales/en/dorms.json"

import arCommon from "../../locales/ar/common.json"
import arNav from "../../locales/ar/nav.json"
import arGate from "../../locales/ar/gate.json"
import arBehavior from "../../locales/ar/behavior.json"
import arDorms from "../../locales/ar/dorms.json"

// Gabungkan Kamus Modular Ke Dalam Namespace Tunggal
const DICTIONARY = {
    id: { ...idCommon, ...idNav, ...idGate, ...idBehavior, ...idDorms },
    en: { ...enCommon, ...enNav, ...enGate, ...enBehavior, ...enDorms },
    ar: { ...arCommon, ...arNav, ...arGate, ...arBehavior, ...arDorms }
}

const STORAGE_KEY = "app-language"

// Pemetaan O(1) Dari Route Ke Translation Key
const ROUTE_KEY_MAP = {
    "/dashboard": "nav.dashboard",
    "/task-center": "nav.task_center",
    "/boarding/gate": "nav.gate",
    "/boarding/behavior": "nav.behavior",
    "/boarding/dorms": "nav.dorms",
    "/boarding/health": "nav.health",
    "/academic/tahfidz": "nav.tahfidz",
    "/academic/attendance": "nav.attendance",
    "/academic/schedule": "nav.schedule",
    "/academic/raport": "nav.raport",
    "/academic/extracurricular": "nav.extracurricular",
    "/finance/invoices": "nav.invoices",
    "/finance/saving": "nav.saving",
    "/finance/payments": "nav.payments",
    "/master/students": "nav.students",
    "/master/teachers": "nav.teachers",
    "/master/classes": "nav.classes",
    "/master/subjects": "nav.subjects",
    "/master/poin": "nav.poin",
    "/master/academic-years": "nav.academic_years",
    "/master/enrollment": "nav.enrollment",
    "/boarding/counseling": "nav.counseling",
    "/raport": "nav.raport_bulanan",
    "/academic/library": "nav.library",
    "/master/inventory": "nav.inventory",
    "/admin": "nav.admin_dashboard",
    "/admin/news": "nav.news",
    "/admin/ai-insights": "nav.ai_insights",
    "/admin/logs": "nav.logs",
    "/admin/users": "nav.users",
    "/admin/database": "nav.database",
    "/admin/storage": "nav.storage",
    "/admin/tasks": "nav.tasks",
    "/admin/playground": "nav.playground",
    "/admin/settings": "nav.settings",
    "/settings": "nav.settings"
}

// Di-hoist ke luar component — fungsi murni, tidak perlu ada di dalam
function getTranslationKey(to) {
    if (!to) return null
    return ROUTE_KEY_MAP[to] || null
}

// Digit Arab Timur — di-hoist ke luar agar tidak dibuat ulang setiap render tNum
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || "id"
        } catch {
            return "id"
        }
    })

    // [FIX] Wrap dengan useCallback agar referensi stabil — tidak berubah kecuali `language` berubah
    const setLanguage = useCallback((lang) => {
        if (!["id", "en", "ar"].includes(lang)) return
        setLanguageState(lang)
        try {
            localStorage.setItem(STORAGE_KEY, lang)
        } catch { /* ignore */ }
    }, [])

    // Otomatis Beralih Antara LTR / RTL Saat Bahasa Berubah
    useEffect(() => {
        const isRtl = language === "ar"
        document.documentElement.dir = isRtl ? "rtl" : "ltr"
        document.documentElement.lang = language
    }, [language])

    // [FIX] useCallback — referensi t() stabil selama `language` tidak berubah.
    // Mencegah child React.memo re-render hanya karena LanguageProvider re-render.
    // Helper Terjemahan Dengan Fallback Berlapis Yang Kuat (Target ➔ En ➔ Id ➔ Raw Key)
    const t = useCallback((key) => {
        if (!key) return ""
        return DICTIONARY[language]?.[key] || DICTIONARY["en"]?.[key] || DICTIONARY["id"]?.[key] || key
    }, [language])

    // [FIX] useCallback — tNav bergantung pada t, jadi dep-nya [t]
    // Helper Terjemahan Dinamis Untuk Layout Dinamis
    const tNav = useCallback((item) => {
        if (!item) return ""
        const key = getTranslationKey(item.to)
        return key ? t(key) : item.label
    }, [t])

    // [FIX] useCallback — tNavDesc bergantung pada t, jadi dep-nya [t]
    // Terjemahkan Deskripsi Halaman Di Search Dropdown
    const tNavDesc = useCallback((item) => {
        if (!item) return ""
        const key = getTranslationKey(item.to)
        if (!key) return item.desc || ""
        const descKey = key.replace('nav.', 'nav.desc.')
        const translated = t(descKey)
        return translated === descKey ? (item.desc || "") : translated
    }, [t])

    // [FIX] useCallback — tGroup bergantung pada t, jadi dep-nya [t]
    const tGroup = useCallback((key, defaultLabel) => {
        const translateKey = `section.${key}`
        const translation = t(translateKey)
        return translation === translateKey ? defaultLabel : translation
    }, [t])

    // [FIX] useCallback — Helper Terjemahan Angka: Mengonversi Digit Inggris Ke Digit Arab Timur
    // Jika Bahasa Saat Ini Adalah 'ar'. ARABIC_DIGITS di-hoist ke luar agar tidak dibuat ulang.
    const tNum = useCallback((val) => {
        if (val === null || val === undefined) return ""
        const str = val.toString()
        if (language === "ar") {
            return str.replace(/[0-9]/g, (w) => ARABIC_DIGITS[+w])
        }
        return str
    }, [language])

    const dir = language === "ar" ? "rtl" : "ltr"

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, tNav, tNavDesc, tGroup, tNum, dir }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}