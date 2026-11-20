import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-haiku-5-5'
const MAX_TEXT = 2000
// The client resizes photos to 1200px WebP (~100-300KB); this only stops abuse
const MAX_IMAGE_B64 = 4_000_000
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const SYSTEM = `Kamu membantu dua orang di Indonesia mencatat makan untuk program diet dari dokter gizi. Dari deskripsi teks dan/atau foto, perkirakan isi gizi satu kali makan.

Ukuran yang dipakai dietisien mereka:
- 1 porsi karbo = 100 g nasi putih = sekitar 175 kkal. Hitung karbo lain dengan setara ini: 1 bungkus mi instan atau bihun = 1 porsi, 2 kentang sedang = 1 porsi, 1 lembar roti tawar sekitar 0,5 porsi. Nasi merah sama dengan nasi putih. Nasi porang sekitar 0,25 porsi per 100 g.
- Protein dalam gram (mis. 1 telur ayam sekitar 6 g, 100 g dada ayam matang sekitar 30 g, 1 potong tempe sedang sekitar 8 g, 1 potong tahu sedang sekitar 4 g).
- Gorengan = jumlah potong makanan yang digoreng terendam minyak: tahu/tempe goreng, bakwan, nugget, ayam goreng, telur dadar atau ceplok goreng, dan sejenisnya. Satu genggam kerupuk dihitung 1. Tumisan dan makanan yang ditulis "no minyak" tidak dihitung.

Cara memperkirakan:
- Kalau berat ditulis, pakai beratnya. Kalau tidak, pakai porsi umum warung atau rumahan Indonesia.
- Masakan bersantan, berkuah gulai, atau berminyak (nasi padang, gudeg, martabak, gorengan) jauh lebih tinggi kalori dari kelihatannya. Jangan meremehkan minyak dan santan, karena itulah yang paling sering membuat perkiraan meleset.
- Kalau tertulis "less kuah", "gak pake kuah", atau sebagian makanan tidak dihabiskan (mis. "makan 9/20"), sesuaikan angkanya.
- Kalau foto dan teks berbeda, teks yang ditulis orangnya lebih bisa dipercaya untuk jumlah, foto untuk ukuran porsi.

Isi "note" dengan satu sampai dua kalimat bahasa Indonesia yang santai: rincian singkat asumsi porsimu (mis. "Nasi ~150 g (1,5 porsi), 2 telur bulat balado, tempe orek. Kuah dianggap sedikit."). Jangan memberi nasihat diet. Isi "confidence" dengan "low" kalau deskripsi terlalu samar atau porsinya sulit ditebak.`

const SCHEMA = {
  type: 'object',
  properties: {
    cal: { type: 'integer', description: 'Perkiraan total kalori (kkal)' },
    carb: { type: 'number', description: 'Porsi karbo, kelipatan 0,5' },
    protein: { type: 'number', description: 'Protein dalam gram' },
    fried: { type: 'integer', description: 'Jumlah gorengan' },
    note: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['cal', 'carb', 'protein', 'fried', 'note', 'confidence'],
  additionalProperties: false,
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// Only the two paired Bloom accounts may spend API credit: a valid Supabase session
// plus a row in `partners`, read with the caller's own token so RLS does the check.
async function authorize(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const headers = { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` }

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers })
  if (!userRes.ok) return null
  const user = await userRes.json()

  const pairRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/partners?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`,
    { headers },
  )
  if (!pairRes.ok) return null
  const rows = await pairRes.json()
  return rows.length ? user : null
}

function clamp(n, max) {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : 0
}

async function estimate(request, env) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI belum dikonfigurasi di server.' }, 503)

  const user = await authorize(request, env)
  if (!user) return json({ error: 'Tidak diizinkan.' }, 401)

  let body
  try { body = await request.json() } catch { return json({ error: 'Body bukan JSON.' }, 400) }

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : ''
  const image = body.image
  const hasImage = image && IMAGE_TYPES.includes(image.media_type) && typeof image.data === 'string'
  if (hasImage && image.data.length > MAX_IMAGE_B64) return json({ error: 'Foto terlalu besar.' }, 413)
  if (!text && !hasImage) return json({ error: 'Isi teks atau foto dulu.' }, 400)

  const content = []
  if (hasImage) content.push({ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } })
  content.push({ type: 'text', text: text ? `Catatan makan: ${text}` : 'Tidak ada catatan teks, perkirakan dari foto saja.' })

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  let res
  try {
    res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    })
  } catch (err) {
    console.error('[estimate] API error', err?.status, err?.message)
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'AI sedang sibuk, coba lagi sebentar.' }, 429)
    return json({ error: 'Gagal menghubungi AI.' }, 502)
  }

  if (res.stop_reason === 'refusal') return json({ error: 'AI menolak memproses catatan ini.' }, 422)
  const block = res.content.find(b => b.type === 'text')
  let out
  try { out = JSON.parse(block?.text || '') } catch {
    console.error('[estimate] unparseable output', res.stop_reason)
    return json({ error: 'Jawaban AI tidak bisa dibaca, coba lagi.' }, 502)
  }

  return json({
    cal: Math.round(clamp(out.cal, 10000)),
    carb: Math.round(clamp(out.carb, 50) * 2) / 2,
    protein: Math.round(clamp(out.protein, 500)),
    fried: Math.round(clamp(out.fried, 50)),
    note: String(out.note || '').slice(0, 500),
    confidence: ['low', 'medium', 'high'].includes(out.confidence) ? out.confidence : 'low',
    usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/estimate') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      return estimate(request, env)
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404)
    return env.ASSETS.fetch(request)
  },
}
