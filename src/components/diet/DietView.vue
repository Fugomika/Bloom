<script setup>
import { ref, computed, watch } from 'vue'
import {
  DB, myId, addMeal, updateMeal, deleteMeal, uploadMealImage, removeItemImage,
  saveBodyLog, deleteBodyLog, saveSettings, ensureImageUrls, imageUrls,
} from '../../composables/useStore.js'
import { uid, localDate } from '../../utils/date.js'
import { resizeImage } from '../../utils/image.js'
import { supabase } from '../../lib/supabase.js'

const tab = ref('food')
const who = ref('me')
const day = ref(localDate())

const ownerId = computed(() => (who.value === 'partner' && DB.partner ? DB.partner.id : myId()))
const targets = computed(() => {
  const src = who.value === 'partner' && DB.partner ? DB.partner : DB.settings
  return { kcal: src.calorieGoal, ...src.dietTargets }
})

function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}
function fmt(n) { return (n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 1 }) }
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function shiftDay(n) {
  const d = new Date(day.value + 'T00:00:00')
  d.setDate(d.getDate() + n)
  day.value = localDate(d)
}
function dayLabel(ds) {
  const t = localDate()
  if (ds === t) return 'Hari ini'
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (ds === localDate(y)) return 'Kemarin'
  return new Date(ds + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Food ───────────────────────────────────────────────────────
const dayMeals = computed(() =>
  DB.meals
    .filter(m => m.user_id === ownerId.value && m.date === day.value)
    .sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.at - b.at)
)
const isCounted = m => m.cal != null || m.carb != null || m.protein != null
const uncounted = computed(() => dayMeals.value.filter(m => !isCounted(m)).length)

const meters = computed(() => {
  const sum = k => dayMeals.value.reduce((s, m) => s + (Number(m[k]) || 0), 0)
  const t = targets.value
  const row = (label, unit, val, max, atLeast = false) => ({
    label, unit, val, max,
    pct: max ? Math.min(val / max, 1) : 0,
    // protein is a floor to reach; the others are ceilings to stay under
    color: atLeast
      ? (val >= max ? 'var(--leaf)' : 'var(--sun)')
      : (val > max ? 'var(--red)' : 'var(--leaf)'),
  })
  return [
    row('Kalori', 'kkal', sum('cal'), t.kcal),
    row('Karbo', 'porsi', sum('carb'), t.carb),
    row('Protein', 'g', sum('protein'), t.protein, true),
    row('Gorengan', 'buah', sum('fried'), t.fried),
  ]
})

watch(dayMeals, list => ensureImageUrls(list.map(m => m.image_path)), { immediate: true })

const text = ref('')
const time = ref('')
const blob = ref(null)
const preview = ref('')
const busy = ref(false)
const error = ref('')
const fileInput = ref(null)

async function readPhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return null
  try { return await resizeImage(file, 1200) } catch { error.value = 'Foto tidak bisa dibaca. Coba file lain.'; return null }
}
function setPreview(target, b) {
  if (target.value) URL.revokeObjectURL(target.value)
  target.value = b ? URL.createObjectURL(b) : ''
}
async function onFile(e) {
  error.value = ''
  const b = await readPhoto(e)
  if (!b) return
  blob.value = b
  setPreview(preview, b)
}
function clearPhoto() { blob.value = null; setPreview(preview, null) }

async function submit() {
  const name = text.value.trim()
  if ((!name && !blob.value) || busy.value) return
  busy.value = true
  error.value = ''
  const id = uid()
  const owner = ownerId.value
  let image_path = ''
  try {
    if (blob.value) image_path = await uploadMealImage(owner, id, blob.value)
  } catch (err) {
    console.error('[Bloom] Upload failed:', err)
    error.value = 'Upload foto gagal. Cek koneksi lalu coba lagi.'
    busy.value = false
    return
  }
  addMeal({
    id, user_id: owner, date: day.value, time: time.value || nowTime(), name,
    cal: null, carb: null, protein: null, fried: 0, image_path, type: 'snack', at: Date.now(),
  })
  text.value = ''
  time.value = ''
  clearPhoto()
  busy.value = false
}

// ── Edit entry ─────────────────────────────────────────────────
const ed = ref(null)
const edPreview = ref('')
const edFile = ref(null)
const confirmDel = ref(false)

function openEdit(m) {
  ed.value = {
    id: m.id, name: m.name, date: m.date, time: m.time || '',
    cal: m.cal ?? '', carb: m.carb ?? '', protein: m.protein ?? '', fried: m.fried || '',
    oldPath: m.image_path || '', keepPhoto: !!m.image_path, blob: null, owner: m.user_id,
  }
  setPreview(edPreview, null)
  confirmDel.value = false
  error.value = ''
  resetAi()
}
function closeEdit() { ed.value = null; setPreview(edPreview, null); resetAi() }
async function onEditFile(e) {
  const b = await readPhoto(e)
  if (!b || !ed.value) return
  ed.value.blob = b
  setPreview(edPreview, b)
}
function clearEditPhoto() { ed.value.blob = null; ed.value.keepPhoto = false; setPreview(edPreview, null) }
const edPhotoUrl = computed(() => {
  if (!ed.value) return ''
  return edPreview.value || (ed.value.keepPhoto ? imageUrls[ed.value.oldPath]?.url || '' : '')
})

// ── AI estimate ────────────────────────────────────────────────
const aiBusy = ref(false)
const aiNote = ref('')
const aiConf = ref('')
const aiError = ref('')
function resetAi() { aiBusy.value = false; aiNote.value = ''; aiConf.value = ''; aiError.value = '' }

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

async function aiEstimate() {
  const e = ed.value
  if (!e || aiBusy.value) return
  const id = e.id
  aiBusy.value = true
  aiError.value = ''
  aiNote.value = ''
  try {
    let blob = e.blob
    if (!blob && e.keepPhoto && imageUrls[e.oldPath]?.url) blob = await (await fetch(imageUrls[e.oldPath].url)).blob()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({
        text: e.name,
        image: blob ? { media_type: blob.type || 'image/webp', data: await blobToBase64(blob) } : undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    // the sheet may have been closed or switched to another entry while waiting
    if (ed.value?.id !== id) return
    if (!res.ok) { aiError.value = data.error || 'Perkiraan AI gagal, coba lagi.'; return }
    Object.assign(ed.value, { cal: String(data.cal), carb: String(data.carb), protein: String(data.protein), fried: String(data.fried) })
    aiNote.value = data.note
    aiConf.value = data.confidence
  } catch (err) {
    console.error('[Bloom] AI estimate failed:', err)
    if (ed.value?.id === id) aiError.value = 'Tidak bisa menghubungi server. Cek koneksi.'
  } finally {
    if (ed.value?.id === id) aiBusy.value = false
  }
}

async function saveEdit() {
  const e = ed.value
  if (!e || busy.value) return
  let image_path = e.keepPhoto ? e.oldPath : ''
  if (e.blob) {
    busy.value = true
    try { image_path = await uploadMealImage(e.owner, e.id, e.blob) }
    catch (err) {
      console.error('[Bloom] Upload failed:', err)
      error.value = 'Upload foto gagal. Cek koneksi lalu coba lagi.'
      busy.value = false
      return
    }
    busy.value = false
  }
  if (!e.name.trim() && !image_path) return
  if (e.oldPath && e.oldPath !== image_path) removeItemImage(e.oldPath)
  updateMeal(e.id, {
    name: e.name.trim(), date: e.date || day.value, time: e.time || null,
    cal: num(e.cal) == null ? null : Math.round(num(e.cal)),
    carb: num(e.carb), protein: num(e.protein), fried: Math.round(num(e.fried) || 0),
    image_path,
  })
  closeEdit()
}
function removeEntry() {
  if (!confirmDel.value) { confirmDel.value = true; return }
  deleteMeal(ed.value.id)
  closeEdit()
}

// ── Body ───────────────────────────────────────────────────────
const logs = computed(() =>
  DB.bodyLogs.filter(l => l.user_id === ownerId.value).sort((a, b) => a.date.localeCompare(b.date))
)
const latest = computed(() => logs.value[logs.value.length - 1])
const delta = computed(() => (logs.value.length > 1 ? latest.value.weight - logs.value[0].weight : null))

const bDate = ref(localDate())
const bWeight = ref('')
const bFat = ref('')
const bMuscle = ref('')
const bVisceral = ref('')

function saveBody() {
  const weight = num(bWeight.value)
  if (!weight || !bDate.value) return
  const existing = logs.value.find(l => l.date === bDate.value)
  saveBodyLog({
    id: existing?.id || uid(), user_id: ownerId.value, date: bDate.value, weight,
    fat: num(bFat.value), muscle: num(bMuscle.value), visceral: num(bVisceral.value),
    at: existing?.at || Date.now(),
  })
  bWeight.value = ''; bFat.value = ''; bMuscle.value = ''; bVisceral.value = ''
}

const W = 320, H = 150, PX = 34, PY = 16
const chart = computed(() => {
  const pts = logs.value
  if (!pts.length) return null
  const ws = pts.map(p => p.weight)
  if (targets.value.weight) ws.push(targets.value.weight)
  const lo = Math.floor(Math.min(...ws) - 1), hi = Math.ceil(Math.max(...ws) + 1)
  const t0 = Date.parse(pts[0].date), t1 = Date.parse(pts[pts.length - 1].date)
  const x = d => (t1 === t0 ? W / 2 : PX + ((Date.parse(d) - t0) / (t1 - t0)) * (W - PX - 10))
  const y = w => PY + (1 - (w - lo) / (hi - lo)) * (H - PY * 2)
  return {
    lo, hi,
    dots: pts.map(p => ({ x: x(p.date), y: y(p.weight), id: p.id })),
    line: pts.map(p => `${x(p.date)},${y(p.weight)}`).join(' '),
    targetY: targets.value.weight ? y(targets.value.weight) : null,
  }
})

// ── Targets ────────────────────────────────────────────────────
const showTargets = ref(false)
const tg = ref({})
function openTargets() {
  const t = targets.value
  tg.value = { kcal: t.kcal, carb: t.carb, protein: t.protein, fried: t.fried, weight: t.weight ?? '' }
  showTargets.value = true
}
function saveTargets() {
  const t = tg.value
  saveSettings({
    calorieGoal: Math.round(num(t.kcal) || DB.settings.calorieGoal),
    dietTargets: {
      carb: num(t.carb) ?? DB.settings.dietTargets.carb,
      protein: num(t.protein) ?? DB.settings.dietTargets.protein,
      fried: num(t.fried) ?? DB.settings.dietTargets.fried,
      weight: num(t.weight),
    },
  })
  showTargets.value = false
}
</script>

<template>
  <div>
    <div class="sec-head"><h1>Diet</h1><p>Catat dulu, hitung belakangan</p></div>

    <div class="top-row">
      <div class="ftabs">
        <button class="ftab" :class="{ active: tab === 'food' }" @click="tab = 'food'">🍽️ Makan</button>
        <button class="ftab" :class="{ active: tab === 'body' }" @click="tab = 'body'">⚖️ Badan</button>
      </div>
      <div v-if="DB.partner" class="ftabs">
        <button class="ftab" :class="{ active: who === 'me' }" @click="who = 'me'">Aku</button>
        <button class="ftab" :class="{ active: who === 'partner' }" @click="who = 'partner'">{{ DB.partner.name }}</button>
      </div>
    </div>

    <!-- ── Makan ── -->
    <template v-if="tab === 'food'">
      <div class="day-nav">
        <button class="day-btn" aria-label="Hari sebelumnya" @click="shiftDay(-1)">‹</button>
        <label class="day-label">
          {{ dayLabel(day) }}
          <input type="date" v-model="day" :max="localDate()" />
        </label>
        <button class="day-btn" aria-label="Hari berikutnya" :disabled="day >= localDate()" @click="shiftDay(1)">›</button>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="meters">
          <div v-for="m in meters" :key="m.label" class="meter">
            <div class="meter-top">
              <span class="meter-label">{{ m.label }}</span>
              <span class="meter-val"><b>{{ fmt(m.val) }}</b> / {{ fmt(m.max) }} {{ m.unit }}</span>
            </div>
            <div class="bar"><div class="bar-fill" :style="{ width: m.pct * 100 + '%', background: m.color }"></div></div>
          </div>
        </div>
        <div class="meter-foot">
          <span v-if="uncounted" class="warn">{{ uncounted }} catatan belum dihitung, total belum lengkap</span>
          <span v-else></span>
          <button v-if="who === 'me'" class="link" @click="openTargets">Ubah target</button>
        </div>
      </div>

      <div class="card composer">
        <textarea v-model="text" rows="2" placeholder="Makan apa? mis. Warteg: telor 2, tempe 1, sayur daun singkong"
          @keydown="e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }"></textarea>
        <div v-if="preview" class="thumb-wrap">
          <img :src="preview" alt="" class="thumb" />
          <button class="thumb-x" aria-label="Hapus foto" @click="clearPhoto">✕</button>
        </div>
        <div v-if="error && !ed" class="err">{{ error }}</div>
        <div class="composer-row">
          <input type="time" v-model="time" aria-label="Jam makan" />
          <button class="btn btn-ghost" @click="fileInput?.click()">📷 Foto</button>
          <button class="btn btn-leaf grow" :disabled="busy || (!text.trim() && !blob)" @click="submit">
            {{ busy ? 'Menyimpan…' : 'Catat' }}
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />
      </div>

      <div v-if="!dayMeals.length" class="empty">
        <span class="ee">🥗</span><h3>Belum ada catatan</h3><p>Tulis saja apa yang dimakan, angkanya bisa menyusul</p>
      </div>
      <div v-for="m in dayMeals" :key="m.id" class="entry" @click="openEdit(m)">
        <div class="entry-time">{{ m.time || '—' }}</div>
        <div class="entry-body">
          <div v-if="m.name" class="entry-text">{{ m.name }}</div>
          <img v-if="m.image_path && imageUrls[m.image_path]" :src="imageUrls[m.image_path].url" alt="" class="entry-img" loading="lazy" />
          <div class="chips">
            <template v-if="isCounted(m)">
              <span v-if="m.cal != null" class="chip c-kcal">{{ fmt(m.cal) }} kkal</span>
              <span v-if="m.carb" class="chip c-carb">{{ fmt(m.carb) }} porsi karbo</span>
              <span v-if="m.protein" class="chip c-prot">{{ fmt(m.protein) }} g protein</span>
            </template>
            <span v-else class="chip c-todo">Belum dihitung</span>
            <span v-if="m.fried" class="chip c-fried">{{ m.fried }} gorengan</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Badan ── -->
    <template v-else>
      <div class="card" style="margin-bottom:14px">
        <div v-if="latest" class="body-stats">
          <div><div class="bs-num">{{ fmt(latest.weight) }} kg</div><div class="bs-lbl">{{ dayLabel(latest.date) }}</div></div>
          <div v-if="delta != null">
            <div class="bs-num" :style="{ color: delta <= 0 ? 'var(--leaf-dk)' : '#DC2626' }">{{ delta > 0 ? '+' : '' }}{{ fmt(delta) }} kg</div>
            <div class="bs-lbl">sejak {{ dayLabel(logs[0].date) }}</div>
          </div>
          <div v-if="targets.weight">
            <div class="bs-num">{{ fmt(targets.weight) }} kg</div><div class="bs-lbl">target</div>
          </div>
        </div>
        <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" class="chart" role="img" aria-label="Grafik berat badan">
          <text x="2" :y="PY + 4" class="ax">{{ chart.hi }}</text>
          <text x="2" :y="H - PY + 4" class="ax">{{ chart.lo }}</text>
          <line :x1="PX" :x2="W - 6" :y1="PY" :y2="PY" class="grid" />
          <line :x1="PX" :x2="W - 6" :y1="H - PY" :y2="H - PY" class="grid" />
          <line v-if="chart.targetY != null" :x1="PX" :x2="W - 6" :y1="chart.targetY" :y2="chart.targetY" class="target" />
          <polyline :points="chart.line" class="line" />
          <circle v-for="d in chart.dots" :key="d.id" :cx="d.x" :cy="d.y" r="3.5" class="dot" />
        </svg>
        <div v-else class="empty" style="padding:24px 10px">
          <span class="ee">⚖️</span><h3>Belum ada data</h3><p>Catat berat pertama di bawah</p>
        </div>
        <div v-if="who === 'me'" class="meter-foot"><span></span><button class="link" @click="openTargets">Ubah target</button></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="widget-title">Catat timbangan</div>
        <div class="form-row">
          <div class="fg"><label>Tanggal</label><input type="date" v-model="bDate" :max="localDate()" /></div>
          <div class="fg"><label>Berat (kg)</label><input type="number" inputmode="decimal" step="0.1" v-model="bWeight" placeholder="92.7" @keydown.enter="saveBody" /></div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Lemak (%)</label><input type="number" inputmode="decimal" step="0.1" v-model="bFat" placeholder="opsional" /></div>
          <div class="fg"><label>Otot (%)</label><input type="number" inputmode="decimal" step="0.1" v-model="bMuscle" placeholder="opsional" /></div>
          <div class="fg"><label>Lemak visceral</label><input type="number" inputmode="decimal" step="0.5" v-model="bVisceral" placeholder="opsional" /></div>
        </div>
        <button class="btn btn-leaf btn-block" :disabled="!num(bWeight)" @click="saveBody">Simpan</button>
      </div>

      <div v-for="l in [...logs].reverse()" :key="l.id" class="entry static">
        <div class="entry-time wide">{{ dayLabel(l.date) }}</div>
        <div class="entry-body">
          <div class="entry-text"><b>{{ fmt(l.weight) }} kg</b></div>
          <div class="chips">
            <span v-if="l.fat != null" class="chip c-kcal">lemak {{ fmt(l.fat) }}%</span>
            <span v-if="l.muscle != null" class="chip c-prot">otot {{ fmt(l.muscle) }}%</span>
            <span v-if="l.visceral != null" class="chip c-fried">visceral {{ fmt(l.visceral) }}</span>
          </div>
        </div>
        <button class="row-del" aria-label="Hapus" @click="deleteBodyLog(l.id)">✕</button>
      </div>
    </template>

    <!-- Edit entry -->
    <div class="overlay" :class="{ open: !!ed }" @click.self="closeEdit">
      <div v-if="ed" class="modal">
        <div class="modal-head">Detail makanan</div>
        <div class="fg" style="margin-bottom:14px">
          <label>Makanan</label>
          <textarea v-model="ed.name" rows="3" style="min-height:76px"></textarea>
        </div>
        <div class="form-row">
          <div class="fg"><label>Tanggal</label><input type="date" v-model="ed.date" :max="localDate()" /></div>
          <div class="fg"><label>Jam</label><input type="time" v-model="ed.time" /></div>
        </div>
        <div class="form-row nums">
          <div class="fg"><label>Kalori (kkal)</label><input type="number" inputmode="numeric" v-model="ed.cal" placeholder="—" /></div>
          <div class="fg"><label>Karbo (porsi)</label><input type="number" inputmode="decimal" step="0.5" v-model="ed.carb" placeholder="—" /></div>
          <div class="fg"><label>Protein (g)</label><input type="number" inputmode="decimal" v-model="ed.protein" placeholder="—" /></div>
          <div class="fg"><label>Gorengan (buah)</label><input type="number" inputmode="numeric" v-model="ed.fried" placeholder="0" /></div>
        </div>
        <div class="ai-row">
          <button class="btn btn-ghost ai-btn" :disabled="aiBusy || (!ed.name.trim() && !edPhotoUrl)" @click="aiEstimate">
            ✨ {{ aiBusy ? 'Menghitung…' : 'Perkirakan dengan AI' }}
          </button>
        </div>
        <div v-if="aiNote" class="ai-note">
          <b>Perkiraan AI{{ aiConf === 'low' ? ', kurang yakin' : '' }}.</b> {{ aiNote }}
          <span class="ai-hint">Angkanya sudah diisi di atas. Cek dulu, lalu Simpan.</span>
        </div>
        <div v-if="aiError" class="err" style="margin:-4px 0 12px">{{ aiError }}</div>
        <details class="cheat">
          <summary>Contekan porsi (catatan dietisien 3 Nov)</summary>
          <ul>
            <li>1 porsi karbo = 100 g nasi, sekitar 175 kkal</li>
            <li>1 bungkus mi instan atau bihun = 1 porsi</li>
            <li>2 kentang = 1 porsi, paling mengenyangkan</li>
            <li>Nasi porang sekitar ¼ kalori nasi; nasi merah kalorinya sama, seratnya lebih banyak</li>
          </ul>
        </details>
        <div class="photo-row">
          <div v-if="edPhotoUrl" class="thumb-wrap">
            <img :src="edPhotoUrl" alt="" class="thumb big" />
            <button class="thumb-x" aria-label="Hapus foto" @click="clearEditPhoto">✕</button>
          </div>
          <button class="btn btn-ghost" @click="edFile?.click()">📷 {{ edPhotoUrl ? 'Ganti foto' : 'Tambah foto' }}</button>
          <input ref="edFile" type="file" accept="image/*" hidden @change="onEditFile" />
        </div>
        <div v-if="error" class="err">{{ error }}</div>
        <div class="modal-foot">
          <button class="btn btn-ghost del" @click="removeEntry">{{ confirmDel ? 'Yakin hapus?' : 'Hapus' }}</button>
          <button class="btn btn-ghost" @click="closeEdit">Batal</button>
          <button class="btn btn-leaf" :disabled="busy" @click="saveEdit">{{ busy ? 'Menyimpan…' : 'Simpan' }}</button>
        </div>
      </div>
    </div>

    <!-- Targets -->
    <div class="overlay" :class="{ open: showTargets }" @click.self="showTargets = false">
      <div class="modal" style="max-width:420px">
        <div class="modal-head">Target harian</div>
        <div class="form-row nums">
          <div class="fg"><label>Kalori (kkal)</label><input type="number" inputmode="numeric" v-model="tg.kcal" /></div>
          <div class="fg"><label>Karbo (porsi)</label><input type="number" inputmode="decimal" step="0.5" v-model="tg.carb" /></div>
          <div class="fg"><label>Protein (g)</label><input type="number" inputmode="decimal" v-model="tg.protein" /></div>
          <div class="fg"><label>Gorengan maks (buah)</label><input type="number" inputmode="numeric" v-model="tg.fried" /></div>
        </div>
        <div class="fg" style="margin-bottom:4px">
          <label>Target berat (kg, opsional)</label>
          <input type="number" inputmode="decimal" step="0.1" v-model="tg.weight" placeholder="—" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showTargets = false">Batal</button>
          <button class="btn btn-leaf" @click="saveTargets">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-row { display:flex; gap:10px; flex-wrap:wrap; justify-content:space-between }
input[type=time] {
  font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; padding:9px 12px;
  border:2px solid rgba(0,0,0,.09); border-radius:var(--r-sm); background:#FAFAF5; color:var(--text); outline:none
}
@media (pointer: coarse) { input[type=time] { font-size:16px } }

.day-nav { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px }
.day-btn { width:44px; height:44px; border:none; border-radius:var(--r-sm); background:var(--surface); box-shadow:var(--sh); font-size:22px; font-weight:900; color:var(--text); cursor:pointer }
.day-btn:disabled { opacity:.3; cursor:default }
.day-label { position:relative; flex:1; text-align:center; font-family:'Fredoka One',cursive; font-size:19px; padding:9px 0; cursor:pointer }
/* the native date input sits invisibly over the label so a tap opens the picker */
.day-label input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer }

.meters { display:grid; grid-template-columns:1fr 1fr; gap:14px 20px }
.meter-top { display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:6px }
.meter-label { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; color:var(--muted) }
.meter-val { font-size:12px; font-weight:800; color:var(--muted); white-space:nowrap }
.meter-val b { font-family:'Fredoka One',cursive; font-weight:400; font-size:17px; color:var(--text) }
.bar { height:8px; border-radius:4px; background:rgba(0,0,0,.06); overflow:hidden }
.bar-fill { height:100%; border-radius:4px; transition:width .4s ease, background .3s }
.meter-foot { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:14px; min-height:20px }
.warn { font-size:12px; font-weight:800; color:#B45309 }
.link { border:none; background:none; font-family:inherit; font-size:12px; font-weight:900; color:var(--muted); text-decoration:underline; cursor:pointer; padding:4px 0; white-space:nowrap }

.composer { margin-bottom:18px; padding:16px }
.composer textarea { resize:vertical; min-height:60px }
.composer-row { display:flex; gap:8px; margin-top:10px; align-items:stretch }
.composer-row input[type=time] { width:auto; flex-shrink:0 }
.grow { flex:1; justify-content:center }
.btn:disabled { opacity:.5; cursor:default }
.err { font-size:12px; font-weight:800; color:#DC2626; margin-top:8px }

.thumb-wrap { position:relative; display:inline-block; margin-top:10px }
.thumb { width:72px; height:72px; object-fit:cover; border-radius:var(--r-sm); display:block }
.thumb.big { width:110px; height:110px }
.thumb-x { position:absolute; top:-8px; right:-8px; width:26px; height:26px; border-radius:50%; border:none; background:var(--text); color:#fff; font-size:11px; cursor:pointer }

.entry { display:flex; gap:12px; padding:12px 14px; background:var(--surface); border-radius:var(--r-sm); margin-bottom:7px; box-shadow:var(--sh); cursor:pointer; animation:fadeUp .2s ease }
.entry.static { cursor:default; align-items:center }
.entry-time { font-family:'Fredoka One',cursive; font-size:14px; color:var(--sun-dk); width:44px; flex-shrink:0; padding-top:1px }
.entry-time.wide { width:92px }
.entry-body { flex:1; min-width:0 }
.entry-text { font-size:14px; font-weight:700; white-space:pre-wrap; overflow-wrap:anywhere }
.entry-img { display:block; max-width:180px; max-height:180px; border-radius:var(--r-sm); margin-top:8px; object-fit:cover }
.chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:7px }
.chips:empty { display:none }
.chip { padding:3px 9px; border-radius:20px; font-size:11px; font-weight:900 }
.c-kcal  { background:var(--sun-lt); color:var(--sun-dk) }
.c-carb  { background:var(--coral-lt); color:#C2410C }
.c-prot  { background:var(--leaf-lt); color:var(--leaf-dk) }
.c-fried { background:var(--red-lt); color:#DC2626 }
.c-todo  { background:rgba(0,0,0,.05); color:var(--muted) }
.row-del { border:none; background:none; cursor:pointer; font-size:12px; color:var(--muted); padding:10px; border-radius:7px; opacity:.6 }
.row-del:hover { background:#FEE2E2; color:#DC2626; opacity:1 }

.nums .fg { min-width:calc(50% - 5px) }
.ai-row { margin-bottom:12px }
.ai-btn { width:100%; justify-content:center; background:var(--purple-lt); color:#6D28D9 }
.ai-btn:hover:not(:disabled) { background:#DDD6FE; color:#5B21B6 }
.ai-note { font-size:13px; font-weight:700; line-height:1.5; background:var(--purple-lt); color:#4C1D95; border-radius:var(--r-sm); padding:10px 12px; margin-bottom:12px }
.ai-hint { display:block; margin-top:4px; font-size:12px; color:#6D28D9 }
.cheat { font-size:13px; font-weight:700; color:var(--muted); margin-bottom:14px }
.cheat summary { cursor:pointer; font-weight:900 }
.cheat ul { margin:8px 0 0 18px; line-height:1.6 }
.photo-row { display:flex; align-items:center; gap:14px; flex-wrap:wrap }
.photo-row .thumb-wrap { margin-top:0 }
.del { color:#DC2626; margin-right:auto }

.body-stats { display:flex; gap:26px; flex-wrap:wrap; margin-bottom:14px }
.bs-num { font-family:'Fredoka One',cursive; font-size:24px; line-height:1.1 }
.bs-lbl { font-size:11px; font-weight:800; color:var(--muted); margin-top:2px }
/* the SVG scales with its viewBox, so cap the width or text and dots balloon on desktop */
.chart { width:100%; max-width:560px; height:auto; display:block }
.ax { font-size:10px; font-weight:800; fill:var(--muted); font-family:'Nunito',sans-serif }
.grid { stroke:rgba(0,0,0,.08); stroke-width:1 }
.target { stroke:var(--leaf); stroke-width:1.5; stroke-dasharray:5 4 }
.line { fill:none; stroke:var(--sun-dk); stroke-width:2.5; stroke-linejoin:round; stroke-linecap:round }
.dot { fill:#fff; stroke:var(--sun-dk); stroke-width:2 }

@media(max-width:600px) {
  .meters { grid-template-columns:1fr }
  .nums { flex-direction:row }
  .modal-foot .del { flex:0 0 auto }
}
</style>
