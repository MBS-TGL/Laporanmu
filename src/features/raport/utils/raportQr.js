const cache = new Map()

export function getRaportQrDataUrl(value, size = 160) {
    if (!value) return Promise.resolve('')
    const key = `${size}|${value}`
    if (cache.has(key)) return cache.get(key)

    // qrcode (~40 KB) di-load dinamis saat pertama dibutuhkan
    const pending = import('qrcode').then(({ default: QRCode }) =>
        QRCode.toDataURL(value, {
            width: size,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#111827', light: '#ffffff' },
        })
    ).catch((err) => {
        console.error('[Raport QR]', err)
        cache.delete(key)
        return ''
    })

    cache.set(key, pending)
    return pending
}
