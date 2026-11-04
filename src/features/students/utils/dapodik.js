// Deteksi & normalisasi file export "daftar_pd" dari aplikasi Dapodik.
//
// Export Dapodik punya struktur khas:
//   - beberapa baris judul di atas tabel
//   - 2 baris header: baris pertama berisi kolom utama + blok merged
//     "Data Ayah" / "Data Ibu" / "Data Wali", baris kedua berisi sub-kolom
//     (Nama, Tahun Lahir, Jenjang Pendidikan, Pekerjaan, Penghasilan, NIK)
//     di bawah masing-masing blok
//
// Modul ini melebur kedua baris header jadi satu daftar header rapi
// ("Nama Ayah", "NIK Ayah", ...), menggabungkan kolom alamat menjadi satu
// "Alamat Lengkap", dan memetakan kolom Dapodik yang tidak punya kolom
// khusus di tabel students ke metadata jsonb via extractDapodikMetadata().

const norm = (s) => String(s ?? '').toLowerCase().replace(/[\s\xA0\n\r]+/g, ' ').trim()

const PARENT_BLOCKS = ['data ayah', 'data ibu', 'data wali']

// Melebur (blok induk, sub-kolom) -> header rapi untuk kebutuhan import
const HEADER_RENAME = {
    'data ayah|nama': 'Nama Ayah',
    'data ayah|nik': 'NIK Ayah',
    'data ayah|tahun lahir': 'Tahun Lahir Ayah',
    'data ayah|jenjang pendidikan': 'Jenjang Pendidikan Ayah',
    'data ayah|pekerjaan': 'Pekerjaan Ayah',
    'data ayah|penghasilan': 'Penghasilan Ayah',
    'data ibu|nama': 'Nama Ibu',
    'data ibu|nik': 'NIK Ibu',
    'data ibu|tahun lahir': 'Tahun Lahir Ibu',
    'data ibu|jenjang pendidikan': 'Jenjang Pendidikan Ibu',
    'data ibu|pekerjaan': 'Pekerjaan Ibu',
    'data ibu|penghasilan': 'Penghasilan Ibu',
    'data wali|nama': 'Nama Wali',
    'data wali|nik': 'NIK Wali',
    'data wali|tahun lahir': 'Tahun Lahir Wali',
    'data wali|jenjang pendidikan': 'Jenjang Pendidikan Wali',
    'data wali|pekerjaan': 'Pekerjaan Wali',
    'data wali|penghasilan': 'Penghasilan Wali',
}

// "Telepon" di Dapodik = telepon rumah, bukan HP. Diganti nama supaya tidak
// tertangkap kolom phone (No. HP/WA) saat auto-mapping.
const MAIN_RENAME = { 'telepon': 'Telp Rumah' }

const ADDRESS_PARTS = ['alamat', 'rt', 'rw', 'dusun', 'kelurahan', 'kecamatan', 'kode pos']

// Cari posisi baris header Dapodik di antara baris-baris judul.
// Header utama harus memuat 'nama' + 'nisn' dan salah satu kolom khas
// daftar_pd; sub-header di baris berikutnya opsional (ada di daftar_pd 2 baris).
function findHeaderRows(matrix) {
    const limit = Math.min(matrix.length, 25)
    for (let i = 0; i < limit; i++) {
        const cells = (matrix[i] || []).map(norm)
        if (!cells.includes('nama') || !cells.includes('nisn')) continue
        const hasDapodikCols = cells.includes('nipd') || cells.includes('data ayah') || cells.includes('rombel saat ini')
        if (!hasDapodikCols) continue
        const next = (matrix[i + 1] || []).map(norm)
        const hasSub = next.some(c => c === 'tahun lahir' || c === 'jenjang pendidikan')
        return { mainIdx: i, subIdx: hasSub ? i + 1 : null }
    }
    return null
}

export const isDapodikDaftarPD = (matrix) => !!findHeaderRows(matrix)

export function flattenDapodik(matrix) {
    const found = findHeaderRows(matrix)
    if (!found) return null
    const { mainIdx, subIdx } = found
    const main = (matrix[mainIdx] || []).map(norm)
    const sub = subIdx != null ? (matrix[subIdx] || []).map(norm) : []
    const dataStart = subIdx != null ? subIdx + 1 : mainIdx + 1

    // 1. Melebur dua baris header menjadi satu
    const headers = []
    const colIdx = []
    let lastMain = ''
    const width = Math.max(main.length, sub.length)
    for (let c = 0; c < width; c++) {
        const m = main[c] || ''
        const s = sub[c] || ''
        if (m) lastMain = m
        // Kolom kosong di kedua baris header (biasanya di ujung kanan) dilewati
        if (!m && !s) continue
        // Sel merged "Data Ayah/Ibu/Wali": main hanya terisi di sub-kolom pertama
        const blockMain = m || lastMain
        const renamed = HEADER_RENAME[`${blockMain}|${s}`] || MAIN_RENAME[blockMain]
        if (renamed) { headers.push(renamed); colIdx.push(c); continue }
        if (s) headers.push(PARENT_BLOCKS.includes(blockMain) ? `${s} ${blockMain}` : `${blockMain} ${s}`)
        else headers.push(blockMain)
        colIdx.push(c)
    }

    // 2. Baris data -> objek { header: nilai }
    const rows = []
    for (let r = dataStart; r < matrix.length; r++) {
        const cells = matrix[r] || []
        const row = {}
        let hasValue = false
        headers.forEach((h, i) => {
            const v = String(cells[colIdx[i]] ?? '').trim()
            if (v) hasValue = true
            row[h] = v
        })
        if (hasValue) rows.push(row)
    }

    // 3. Gabungkan alamat (Alamat + RT/RW/Dusun/Kel/Kec/Kode Pos) jadi satu kolom
    const colOf = (name) => headers.findIndex(h => norm(h) === name)
    const alamatIdx = colOf('alamat')
    if (alamatIdx >= 0) {
        const PART_PREFIX = { alamat: '', rt: 'RT ', rw: 'RW ', dusun: 'Dusun ', kelurahan: 'Kel. ', kecamatan: 'Kec. ', 'kode pos': 'Kode Pos ' }
        const partIdx = ADDRESS_PARTS.map(p => colOf(p)).filter(i => i >= 0)
        // header hasil flatten sudah dinormalisasi, jadi pakai string asli di
        // headers[] sebagai key row — bukan nama bagian alamat
        const addrParts = partIdx.map(i => ({ key: headers[i], prefix: PART_PREFIX[norm(headers[i])] ?? '' }))
        const dropKeys = new Set(addrParts.map(p => p.key))
        for (const row of rows) {
            let addr = ''
            for (const { key, prefix } of addrParts) {
                const v = row[key]
                if (!v) continue
                // Field Dapodik kadang sudah memuat labelnya sendiri
                // ("Kec. Tanggul") atau sudah ada di Alamat ("DUSUN KRAJAN")
                const labeled = prefix && norm(v).startsWith(norm(prefix).trim()) ? v : `${prefix}${v}`
                const isCode = ['rt', 'rw', 'kode pos'].includes(norm(key))
                if (!isCode && norm(addr).includes(norm(v))) continue
                addr = addr ? `${addr}, ${labeled}` : labeled
            }
            dropKeys.forEach(k => delete row[k])
            row['Alamat Lengkap'] = addr
        }
        const newHeaders = headers.filter(h => !dropKeys.has(h))
        newHeaders.push('Alamat Lengkap')
        return { headers: newHeaders, rows }
    }

    return { headers, rows }
}

// Kolom Dapodik tanpa kolom khusus di tabel students -> metadata jsonb.
// Key = header hasil flattenDapodik (dinormalisasi), value = path di metadata.
// 'father'/'mother'/'guardian' digabung ke objek metadata orang tua yang sudah
// ada; sisanya masuk sebagai key mandiri di metadata santri.
const META_MAP = {
    'tempat lahir': 'tempat_lahir',
    'tanggal lahir': 'tanggal_lahir',
    'nik': 'nik',
    'agama': 'agama',
    'alamat lengkap': 'alamat',
    'telp rumah': 'telepon_rumah',
    'e-mail': 'email',
    'email': 'email',
    'jenis tinggal': 'jenis_tinggal',
    'alat transportasi': 'alat_transportasi',
    'sekolah asal': 'sekolah_asal',
    'no kk': 'no_kk',
    'anak ke-berapa': 'anak_ke',
    'jml. saudara kandung': 'jml_saudara',
    'jarak rumah ke sekolah (km)': 'jarak_rumah_sekolah',
    'no peserta ujian nasional': 'no_un',
    'no seri ijazah': 'no_seri_ijazah',
    'skhun': 'skhun',
    'no registrasi akta lahir': 'no_akta_lahir',
    'penerima kps': 'penerima_kps',
    'no. kps': 'no_kps',
    'penerima kip': 'penerima_kip',
    'nomor kip': 'nomor_kip',
    'nama di kip': 'nama_kip',
    'nomor kks': 'nomor_kks',
    'layak pip (usulan dari sekolah)': 'layak_pip',
    'alasan layak pip': 'alasan_layak_pip',
    'kebutuhan khusus': 'kebutuhan_khusus',
    'bank': 'bank',
    'nomor rekening bank': 'no_rekening',
    'rekening atas nama': 'rekening_atas_nama',
    'berat badan': 'berat_badan',
    'tinggi badan': 'tinggi_badan',
    'lingkar kepala': 'lingkar_kepala',
    'lintang': 'lintang',
    'bujur': 'bujur',
    'nik ayah': 'father.nik',
    'tahun lahir ayah': 'father.tahun_lahir',
    'jenjang pendidikan ayah': 'father.jenjang_pendidikan',
    'pekerjaan ayah': 'father.pekerjaan',
    'penghasilan ayah': 'father.penghasilan',
    'nik ibu': 'mother.nik',
    'tahun lahir ibu': 'mother.tahun_lahir',
    'jenjang pendidikan ibu': 'mother.jenjang_pendidikan',
    'pekerjaan ibu': 'mother.pekerjaan',
    'penghasilan ibu': 'mother.penghasilan',
    'nik wali': 'guardian.nik',
    'tahun lahir wali': 'guardian.tahun_lahir',
    'jenjang pendidikan wali': 'guardian.jenjang_pendidikan',
    'pekerjaan wali': 'guardian.pekerjaan',
    'penghasilan wali': 'guardian.penghasilan',
}

export function extractDapodikMetadata(row) {
    const out = {}
    for (const key of Object.keys(row)) {
        const path = META_MAP[norm(key)]
        if (!path) continue
        const v = String(row[key] ?? '').trim()
        if (!v) continue
        const parts = path.split('.')
        let node = out
        for (let i = 0; i < parts.length - 1; i++) {
            if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {}
            node = node[parts[i]]
        }
        node[parts[parts.length - 1]] = v
    }
    return out
}
