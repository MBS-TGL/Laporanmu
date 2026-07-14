import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve path variables for ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCALES_DIR = path.resolve(__dirname, '../src/locales')
const SRC_LANG = 'id'
const TARGET_LANGS = ['en', 'ar']

// Strict Glossary overrides for delicate Islamic school & academic terminology
const GLOSSARY = {
    en: {
        'Santri': 'Student',
        'Data Siswa': 'Student Database',
        'Data Guru': 'Teachers Staff',
        'Data Kelas': 'Classroom List',
        'Wali Kelas': 'Homeroom Teacher',
        'Tahfidz Al-Qur\'an': 'Tahfidz Al-Qur\'an',
        'Keuangan': 'Finance',
        'Laporan': 'Reports',
        'Kembali': 'Go Back',
        'Rapor & Penilaian': 'Report Cards & Grades',
        "Status": "Status",
        "Selesai": "Completed",
        "Masih Aktif": "Still Active"
    },
    ar: {
        'Santri': 'طالب',
        'Data Siswa': 'بيانات الطلاب',
        'Data Guru': 'بيانات المدرسين',
        'Data Kelas': 'إدارة الفصول',
        'Wali Kelas': 'مرب الصف',
        'Tahfidz Al-Qur\'an': 'تحفيظ القرآن الكريم',
        'Keuangan': 'الشؤون المالية',
        'Laporan': 'التقارير',
        'Kembali': 'رجوع',
        'Rapor & Penilaian': 'الشهادات والتقييم',
        "Status": "الحالة",
        "Selesai": "مكتمل",
        "Masih Aktif": "ما زال نشطاً"
    }
}

// Delay helper to prevent aggressive IP blocking
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Free-tier Google Translate API client with dynamic placeholder protection.
 */
async function translateText(text, fromLang, toLang) {
    if (!text || typeof text !== 'string') return text

    const trimmed = text.trim()
    
    // 1. Direct glossary lookup
    if (GLOSSARY[toLang] && GLOSSARY[toLang][trimmed]) {
        return GLOSSARY[toLang][trimmed]
    }

    // 2. Protect placeholders inside curly brackets (e.g., {month}, {count})
    const placeholders = []
    const protectedText = trimmed.replace(/\{([^}]+)\}/g, (match) => {
        placeholders.push(match)
        return ` [VAR_${placeholders.length - 1}] `
    })

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(protectedText)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        
        const data = await res.json()
        let translatedText = data[0].map(x => x[0]).join('')

        // 3. Restore protected placeholders
        translatedText = translatedText.replace(/\[VAR_(\d+)\]/gi, (match, index) => {
            const idx = parseInt(index, 10)
            return placeholders[idx] || match
        })

        // Clean up spaces around brackets often left by the translation engine
        translatedText = translatedText.replace(/\s*\{([^}]+)\}\s*/g, ' {$1} ').replace(/\s+/g, ' ').trim()
        
        return translatedText
    } catch (err) {
        console.error(`⚠️  Failed translation for [${trimmed}] to [${toLang}]:`, err.message)
        return trimmed // Safe fallback to source text
    }
}

/**
 * Main orchestration function
 */
async function run() {
    console.log('🏁 Starting Auto-Translation workflow...')
    
    if (!fs.existsSync(LOCALES_DIR)) {
        console.error(`❌ Locales directory not found at: ${LOCALES_DIR}`)
        process.exit(1)
    }

    const srcDir = path.join(LOCALES_DIR, SRC_LANG)
    if (!fs.existsSync(srcDir)) {
        console.error(`❌ Source locale directory (id) not found at: ${srcDir}`)
        process.exit(1)
    }

    // Read all JSON files in id/
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'))
    console.log(`📂 Found ${files.length} namespaces to translate: ${files.join(', ')}`)

    for (const file of files) {
        console.log(`\n📄 Processing namespace: [${file}]`)
        const srcFilePath = path.join(srcDir, file)
        const srcData = JSON.parse(fs.readFileSync(srcFilePath, 'utf8'))

        for (const targetLang of TARGET_LANGS) {
            const targetLangDir = path.join(LOCALES_DIR, targetLang)
            if (!fs.existsSync(targetLangDir)) {
                fs.mkdirSync(targetLangDir, { recursive: true })
            }

            const targetFilePath = path.join(targetLangDir, file)
            let targetData = {}
            
            if (fs.existsSync(targetFilePath)) {
                try {
                    targetData = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'))
                } catch {
                    console.log(`⚠️  Warning: Target file ${targetFilePath} was corrupt. Re-creating.`)
                }
            }

            let translatedCount = 0
            const finalData = {}

            // Iterate and translate missing keys
            for (const key of Object.keys(srcData)) {
                const sourceValue = srcData[key]
                
                // If translation already exists and is not empty, preserve it
                if (targetData[key] && targetData[key].trim() !== '') {
                    finalData[key] = targetData[key]
                } else {
                    // Translate new or missing key
                    console.log(`🌐 Translating [${key}] to [${targetLang}]: "${sourceValue}"`)
                    const translation = await translateText(sourceValue, SRC_LANG, targetLang)
                    finalData[key] = translation
                    translatedCount++
                    
                    // Throttle requests slightly
                    await sleep(300)
                }
            }

            // Write formatted JSON file
            fs.writeFileSync(targetFilePath, JSON.stringify(finalData, null, 2), 'utf8')
            if (translatedCount > 0) {
                console.log(`✅ [${targetLang}] Updated: Translated ${translatedCount} new keys.`)
            } else {
                console.log(`✨ [${targetLang}] Up to date: No new keys translated.`)
            }
        }
    }

    console.log('\n🎉 Auto-Translation workflow completed successfully!')
}

run()
