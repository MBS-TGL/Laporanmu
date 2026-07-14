/**
 * Utilitas pemformatan data untuk seluruh aplikasi
 */

// Format tanggal (contoh: 24 Mar 2024)
export const fmtDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

// Format waktu (contoh: 14:30)
export const fmtTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}

// Format tanggal & waktu lengkap
export const fmtDateTime = (date) => {
    if (!date) return '—'
    return `${fmtDate(date)} ${fmtTime(date)}`
}

// Format waktu relatif (contoh: 5 menit yang lalu)
export const fmtRelative = (date) => {
    if (!date) return '—'
    const now = new Date()
    const diff = now - new Date(date)
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Baru saja'
    if (minutes < 60) return `${minutes} menit lalu`
    if (hours < 24) return `${hours} jam lalu`
    if (days === 1) return 'Kemarin'
    if (days < 7) return `${days} hari lalu`
    
    return fmtDate(date)
}
