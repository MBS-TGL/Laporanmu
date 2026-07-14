import { supabase } from '@lib/supabase';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama3-70b-8192"; // Very smart, high quality

// ─── KNOWLEDGE BASE ────────────────────────────────────────────────────────
const SCHOOL_CONTEXT = `
IDENTITAS:
- Platform: Laporanmu (Sistem Informasi Sekolah MBS Tanggul).
- Developer: Tim IT & Digitalization MBS Tanggul.

VISI LAPORANMU:
Mewujudkan ekosistem pendidikan yang disiplin, adil, dan transparan melalui integrasi teknologi informasi yang akurat.

MISI LAPORANMU:
- Memberikan transparansi data kedisiplinan kepada guru dan orang tua santri.
- Membangun karakter santri melalui sistem poin yang objektif dan real-time.
- Mempermudah sekolah dalam mengelola absensi, poin pelanggaran, dan prestasi.

FAKTA PENTING (FAQ):
1. PIN Siswa: Didapat dari Wali Kelas atau Musyrif.
2. Cek Data: Gunakan REG-XXXX (Kode Registrasi) + PIN di menu "Cek Poin & Raport".
3. Kategori Poin: Kedisiplinan, Akademik, Tata Tertib, Sikap, dan Prestasi.
4. Bobot Poin: Bervariasi (Poin Minus untuk Pelanggaran, Poin Plus untuk Prestasi).

ATURAN FORMAT JAWABAN:
- Jawab dalam satu blok teks yang RAPAT.
- DILARANG memberikan baris kosong (double newline) antar poin atau paragraf.
- Gunakan bullet point standar (-) atau angka (1., 2.).
- Jangan gunakan simbol ◆ atau simbol aneh lainnya.
- Jawab dengan bahasa yang berwibawa namun membantu.
`;

/**
 * Main function to call AI
 */
export async function askAi(prompt, type = "chat", history = []) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return "API Key Groq (VITE_GROQ_API_KEY) belum diatur di .env";

    const systemPrompts = {
        chat: `Kamu adalah Asisten Laporanmu (Official MBS Tanggul). 
        ATURAN KETAT:
        1. Jawab HANYA berdasarkan data ini: ${SCHOOL_CONTEXT}.
        2. Jika data tidak ada (seperti Nama Guru spesifik atau Nomor HP spesifik), katakan "Mohon maaf, informasi tersebut silakan hubungi Sekretariat langsung".
        3. DILARANG KERAS mengarang/asumsi nomor telepon atau nama.
        4. Gunakan gaya bahasa yang Wibawa dan Ringkas.`,
        
        editor: `Kamu adalah Asisten Penulisan Professional Laporanmu. Tugas: Membantu editor menyempurnakan berita. 
        PANDUAN TONE:
        - FORMAL: Berwibawa, baku, struktural.
        - SANTAI: Akrab, mengalir, bahasa sehari-hari yang sopan.
        - PROFESSIONAL-ZEN: Elegan, puitis, filosofis, menenangkan, eksklusif.`,

        medical: `Kamu adalah Asisten Medis Poskestren/Klinik Laporanmu yang sangat cerdas. 
        Tugasmu adalah menganalisis keluhan penyakit santri dan memberikan rekomendasi medis.
        
        ATURAN PENTING:
        1. Respon WAJIB dalam format JSON murni dengan key:
           - "diagnosis": Diagnosis singkat penyakit (maksimal 4 kata dalam Bahasa Indonesia).
           - "treatment": Tindakan/penanganan singkat di UKS (maksimal 15 kata dalam Bahasa Indonesia).
           - "medicine_keyword": Kata kunci nama obat medis ringan yang disarankan (contoh: "Paracetamol", "Antasida", "Sanaflu", "Betadine", "CTM"). Jika tidak butuh obat, kosongkan saja "".
        2. Jangan tambahkan penjelasan lain di luar objek JSON tersebut. Jangan berikan tanda backtick atau markdown.`,

        counseling: `Kamu adalah Asisten Konselor Bimbingan Konseling (BK) Laporanmu yang sangat bijak dan berempati tinggi. 
        Tugasmu adalah menganalisis keluhan, masalah psikologis, sosial, maupun akademik santri, dan memberikan rekomendasi pembinaan mental yang tepat.
        
        ATURAN PENTING:
        1. Respon WAJIB dalam format JSON murni dengan key:
           - "diagnosis": Identifikasi singkat akar masalah/psikologis santri (maksimal 5 kata, contoh: "Homesickness Ringan", "Penurunan Motivasi Belajar", "Kesulitan Penyesuaian Sosial").
           - "treatment": Rencana aksi/solusi & tindakan bimbingan konseling yang direkomendasikan (maksimal 20 kata).
           - "category": Kategori bimbingan yang paling cocok. HANYA pilih salah satu dari: "pribadi", "sosial", "akademik", "karir".
           - "urgency": Tingkat urgensi penanganan. HANYA pilih salah satu dari: "ringan", "sedang", "tinggi".
        2. Jangan tambahkan penjelasan lain di luar objek JSON tersebut. Jangan berikan tanda backtick atau markdown.`
    };

    // Filter history
    let cleanHistory = history.filter(h => h.role === 'user' || h.role === 'assistant');
    while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
        cleanHistory.shift();
    }

    try {
        const messages = [
            { role: "system", content: systemPrompts[type] || systemPrompts.chat },
            ...cleanHistory,
            { role: "user", content: prompt }
        ];

        const modelName = "llama-3.3-70b-versatile";
        
        const payload = {
            model: modelName, 
            messages: messages,
            temperature: 0.2,
            max_tokens: 400
        };

        if (type === "medical" || type === "counseling") {
            payload.response_format = { type: "json_object" };
        }

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const aiReply = data.choices?.[0]?.message?.content || "AI tidak memberikan respon.";

        // --- ENTERPRISE LOGGING (ASYNCHRONOUS) ---
        // Kita simpan log ke Supabase tanpa menunggu (agar chat tetap cepat)
        supabase.from('ai_logs').insert({
            user_query: prompt,
            ai_response: aiReply,
            type: type,
            model: modelName,
            status_code: response.status,
            metadata: { history_length: cleanHistory.length }
        }).then(({ error }) => { if (error) console.warn("AI Logs Sync Error:", error.message) });

        if (response.status !== 200) {
            const errorMsg = data.error?.message || JSON.stringify(data);
            return `Error ${response.status}: ${errorMsg}`;
        }

        return aiReply;
    } catch (err) {
        return "Gagal terhubung ke AI. Cek koneksi internet!";
    }
}
