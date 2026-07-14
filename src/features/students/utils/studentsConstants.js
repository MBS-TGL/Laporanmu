export const SortOptions = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'class_asc', label: 'Kelas A–Z' },
    { value: 'points_desc', label: 'Poin tertinggi' },
    { value: 'points_asc', label: 'Poin terendah' },
    { value: 'updated_desc', label: 'Terakhir diubah' },
]

export const RiskThreshold = -30
export const AvailableTags = ['Beasiswa', 'Berprestasi']

export const getTagColor = (tag) => {
    const colors = [
        'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'bg-pink-500/10 text-pink-500 border-pink-500/20',
        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Helper to calculate data completeness percentage
export const calculateCompleteness = (s) => {
    if (!s) return 0;
    let score = 40; // Base score for Name, Gender, Class
    if (s.photo_url || s.photo) score += 20;
    if (s.phone) score += 15;
    if (s.nisn) score += 15;
    if (s.metadata && Object.keys(s.metadata).length > 0) score += 10;
    return score;
};

export const maskInfo = (str, visibleLen = 3) => {
    if (!str) return '---'
    if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, visibleLen) + '***'
};

// Helper: format relative date
export const formatRelativeDate = (isoString) => {
    if (!isoString) return null
    const d = new Date(isoString)
    const now = new Date()
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hari ini'
    if (diffDays === 1) return 'Kemarin'
    if (diffDays < 7) return `${diffDays} hari lalu`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} bln lalu`
    return `${Math.floor(diffDays / 365)} thn lalu`
};
export const EDUCATION_LEVELS = [
    'Tidak Sekolah', 'SD/MI', 'SMP/MTs', 'SMA/MA/SMK',
    'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3'
]

export const OCCUPATION_LIST = [
    'Tidak Bekerja', 'PNS', 'TNI/Polri', 'Guru/Dosen',
    'Wiraswasta', 'Karyawan Swasta', 'Pedagang', 'Petani',
    'Nelayan', 'Buruh', 'Ibu Rumah Tangga', 'Pensiunan',
    'Lainnya'
]

export const INCOME_RANGES = [
    'Kurang dari Rp 1.000.000',
    'Rp 1.000.000 - Rp 3.000.000',
    'Rp 3.000.000 - Rp 5.000.000',
    'Rp 5.000.000 - Rp 10.000.000',
    'Lebih dari Rp 10.000.000'
]

export const SPECIAL_NEEDS = [
    'Tidak Ada', 'Tunanetra', 'Tunarungu', 'Tunagrahita',
    'Tunadaksa', 'Tunalaras', 'Autis', 'ADHD', 'Lainnya'
]

export const LIVING_WITH = [
    'Orang Tua', 'Wali', 'Kos', 'Asrama', 'Panti Asuhan', 'Lainnya'
]

export const TRANSPORT_MODES = [
    'Jalan Kaki', 'Sepeda', 'Motor', 'Mobil', 'Angkutan Umum',
    'Ojek Online', 'Antar Jemput Sekolah', 'Lainnya'
]
