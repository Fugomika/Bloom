// Image helpers for Wardrobe photos: shrink on-device, optionally strip the background,
// and export as a small WebP before upload.

const MAX_SIDE = 800

async function decode(blob) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }) } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img) }
    img.onerror = reject
    img.src = URL.createObjectURL(blob)
  })
}

// Scale so the longest side is at most `max`, encode as WebP (keeps transparency).
// Falls back to PNG on browsers that cannot encode WebP (older Safari).
export async function resizeImage(blob, max = MAX_SIDE, quality = 0.82) {
  const img = await decode(blob)
  const w = img.width, h = img.height
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  img.close?.()

  const encode = type => new Promise(r => canvas.toBlob(r, type, quality))
  const webp = await encode('image/webp')
  if (webp && webp.type === 'image/webp') return webp
  return encode('image/png')
}

// Removes the background in the browser. The library and its ~40MB model are loaded
// lazily on first use and cached by the browser afterwards.
// onProgress(fraction 0..1, label) is called while the model downloads / runs.
export async function removeBackground(blob, onProgress) {
  const { removeBackground: run } = await import('@imgly/background-removal')
  return run(blob, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (!onProgress || !total) return
      onProgress(current / total, key.startsWith('fetch') ? 'Mengunduh model…' : 'Memproses…')
    },
  })
}
