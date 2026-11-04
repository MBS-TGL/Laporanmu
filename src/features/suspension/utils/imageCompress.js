// Kompres foto bukti di client sebelum dikirim via RPC.
// Target: tiap foto <500 KB (batas RPC 2 MB), format JPEG.
// Pola mengikuti compressImage di useCore (canvas manual, tanpa lib baru).

const TARGET_BYTES = 500 * 1024

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  // Fallback browser lama: Image + object URL
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Berkas bukan gambar yang valid.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal memproses gambar.'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Kompres satu File gambar menjadi data URL JPEG.
 * Menurunkan kualitas bertahap (0.7 -> 0.5 -> 0.3) sampai di bawah target.
 */
export async function compressImageToDataUrl(file, { maxDim = 1280 } = {}) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('Berkas harus berupa gambar.')
  }
  const bitmap = await loadBitmap(file)
  const srcW = bitmap.width || bitmap.naturalWidth
  const srcH = bitmap.height || bitmap.naturalHeight
  if (!srcW || !srcH) throw new Error('Gambar tidak terbaca.')

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)
  if (typeof bitmap.close === 'function') bitmap.close()

  let blob = null
  for (const quality of [0.7, 0.5, 0.3]) {
    blob = await canvasToBlob(canvas, quality)
    if (blob.size <= TARGET_BYTES || quality === 0.3) break
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca gambar.'))
    reader.readAsDataURL(blob)
  })

  return { dataUrl, size: blob.size, width: w, height: h }
}

/**
 * Kompres banyak file sekaligus. Melempar bila ada yang gagal agar
 * pemanggil bisa menampilkan pesan spesifik ke wali.
 */
export async function compressImages(files, opts) {
  const list = Array.from(files || [])
  if (!list.length) return []
  return Promise.all(list.map((f) => compressImageToDataUrl(f, opts)))
}
