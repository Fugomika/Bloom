<script setup>
import { ref, computed, watch } from 'vue'
import { DB, ensureImageUrls, restoreWardrobeItem, deleteWardrobeItem } from '../../composables/useStore.js'
import { fmtIDR, fmtDateShort } from '../../utils/date.js'
import { WARDROBE_CATEGORIES, WARDROBE_COLORS, ARCHIVE_REASONS } from '../../utils/constants.js'
import ItemThumb from './ItemThumb.vue'
import ItemForm from './ItemForm.vue'
import OutfitBuilder from './OutfitBuilder.vue'
import OutfitCollage from './OutfitCollage.vue'

// Signed URLs for every photo. WardrobeView is always mounted (App toggles sections by
// class), so this also serves the dashboard widget.
watch(() => DB.wardrobe.map(i => i.image_path).join('|'),
  () => ensureImageUrls(DB.wardrobe.map(i => i.image_path)), { immediate: true })

function catInfo(key) {
  return WARDROBE_CATEGORIES.find(c => c.key === key) || WARDROBE_CATEGORIES[WARDROBE_CATEGORIES.length - 1]
}
function reasonInfo(key) {
  return ARCHIVE_REASONS.find(r => r.key === key) || ARCHIVE_REASONS[ARCHIVE_REASONS.length - 1]
}

// ── Stats ──────────────────────────────────────────────────────
const active   = computed(() => DB.wardrobe.filter(i => i.status !== 'archived'))
const archived = computed(() => DB.wardrobe.filter(i => i.status === 'archived'))
const totalValue = computed(() => active.value.reduce((s, i) => s + (Number(i.price) || 0), 0))

// ── Tabs ───────────────────────────────────────────────────────
const tab = ref('closet')

// ── Closet filters ─────────────────────────────────────────────
const fCat    = ref('all')
const fColor  = ref('')
const fSearch = ref('')
const SORT_KEY = 'bloom_wardrobe_sort'
const sortBy  = ref(readSort())
function readSort() { try { return localStorage.getItem(SORT_KEY) || 'new' } catch { return 'new' } }
watch(sortBy, v => { try { localStorage.setItem(SORT_KEY, v) } catch { /* private mode */ } })

const catCounts = computed(() =>
  WARDROBE_CATEGORIES
    .map(c => ({ ...c, count: active.value.filter(i => i.category === c.key).length }))
    .filter(c => c.count > 0))

const usedColors = computed(() => WARDROBE_COLORS.filter(c => active.value.some(i => i.colors.includes(c.key))))

const closetList = computed(() => {
  const q = fSearch.value.trim().toLowerCase()
  let list = active.value.filter(i =>
    (fCat.value === 'all' || i.category === fCat.value) &&
    (!fColor.value || i.colors.includes(fColor.value)) &&
    (!q || i.name.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q))))
  const catIdx = k => WARDROBE_CATEGORIES.findIndex(c => c.key === k)
  if (sortBy.value === 'name')     list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  else if (sortBy.value === 'cat') list = [...list].sort((a, b) => catIdx(a.category) - catIdx(b.category) || a.name.localeCompare(b.name))
  else                             list = [...list].sort((a, b) => b.at - a.at)
  return list
})

watch(catCounts, cs => { if (fCat.value !== 'all' && !cs.some(c => c.key === fCat.value)) fCat.value = 'all' })
watch(usedColors, cs => { if (fColor.value && !cs.some(c => c.key === fColor.value)) fColor.value = '' })

// ── Outfits ────────────────────────────────────────────────────
const outfitList = computed(() =>
  [...DB.outfits].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.at - a.at))

function hasArchived(o) {
  return o.item_ids.some(id => DB.wardrobe.find(i => i.id === id)?.status === 'archived')
}

// ── Archive ────────────────────────────────────────────────────
const archiveGroups = computed(() =>
  ARCHIVE_REASONS
    .map(r => ({ ...r, items: archived.value.filter(i => reasonInfo(i.archive_reason).key === r.key).sort((a, b) => (b.archived_at || 0) - (a.archived_at || 0)) }))
    .filter(g => g.items.length))

const deleteConfirmId = ref(null)
function executeDelete(id) { deleteWardrobeItem(id); deleteConfirmId.value = null }

// ── Modals ─────────────────────────────────────────────────────
const showItem   = ref(false)
const editItem   = ref(null)
const showOutfit = ref(false)
const editOutfit = ref(null)

function openAddItem()      { editItem.value = null; showItem.value = true }
function openEditItem(it)   { editItem.value = it;   showItem.value = true }
function openAddOutfit()    { editOutfit.value = null; showOutfit.value = true }
function openEditOutfit(o)  { editOutfit.value = o;    showOutfit.value = true }

const EMPTY_MSG = {
  closet:  { ee: '👕', h: 'Lemari masih kosong', p: 'Tambahin baju pertama kamu — foto biar gampang dikenali!' },
  filter:  { ee: '🔍', h: 'Tidak ada yang cocok', p: 'Coba ubah filter atau kata kunci pencarian.' },
  outfits: { ee: '👗', h: 'Belum ada outfit', p: 'Simpan kombinasi favorit kamu biar gak bingung lagi mau pakai apa.' },
  archive: { ee: '📦', h: 'Arsip kosong', p: 'Baju yang sudah gak muat atau gak dipakai lagi akan muncul di sini.' },
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>Wardrobe</h1>
      <p>Semua pakaian kamu, outfit favorit, dan arsip</p>
    </div>

    <!-- Stats -->
    <div class="wr-stats">
      <div class="wr-stat wr-s1">
        <span class="wr-n">{{ active.length }}</span>
        <div class="wr-l">item di lemari</div>
      </div>
      <div class="wr-stat wr-s2">
        <span class="wr-n">{{ DB.outfits.length }}</span>
        <div class="wr-l">outfit tersimpan</div>
      </div>
      <div class="wr-stat wr-s3">
        <span class="wr-n">{{ archived.length }}</span>
        <div class="wr-l">diarsipkan</div>
      </div>
      <div class="wr-stat wr-s4">
        <span class="wr-n wr-n-sm">{{ fmtIDR(totalValue) }}</span>
        <div class="wr-l">nilai lemari</div>
      </div>
    </div>

    <div class="wr-top-row">
      <button class="btn btn-sun" @click="openAddItem">＋ Tambah Item</button>
      <button class="btn btn-ghost" @click="openAddOutfit" :disabled="!active.length">＋ Buat Outfit</button>
    </div>

    <div class="ftabs">
      <button class="ftab" :class="{ active: tab === 'closet' }"  @click="tab = 'closet'">Lemari · {{ active.length }}</button>
      <button class="ftab" :class="{ active: tab === 'outfits' }" @click="tab = 'outfits'">Outfit · {{ DB.outfits.length }}</button>
      <button class="ftab" :class="{ active: tab === 'archive' }" @click="tab = 'archive'">Arsip · {{ archived.length }}</button>
    </div>

    <!-- ── Lemari ── -->
    <template v-if="tab === 'closet'">
      <template v-if="active.length">
        <div class="wr-chips">
          <button class="wr-chip" :class="{ on: fCat === 'all' }" @click="fCat = 'all'">Semua <b>{{ active.length }}</b></button>
          <button v-for="c in catCounts" :key="c.key" class="wr-chip" :class="{ on: fCat === c.key }" @click="fCat = c.key">
            {{ c.icon }} {{ c.label }} <b>{{ c.count }}</b>
          </button>
        </div>

        <div class="wr-tools">
          <input type="search" v-model="fSearch" class="wr-search" placeholder="Cari nama, brand, tag…" />
          <select v-model="sortBy" class="wr-sort" aria-label="Urutkan">
            <option value="new">Terbaru</option>
            <option value="name">Nama</option>
            <option value="cat">Kategori</option>
          </select>
        </div>

        <div v-if="usedColors.length > 1" class="wr-colors">
          <button v-for="c in usedColors" :key="c.key" class="wr-color" :class="{ on: fColor === c.key }"
                  :style="`background:${c.hex}`" :title="c.label" :aria-label="`Filter warna ${c.label}`"
                  @click="fColor = fColor === c.key ? '' : c.key"></button>
          <button v-if="fColor" class="wr-color-clear" @click="fColor = ''">Reset</button>
        </div>
      </template>

      <div v-if="closetList.length" class="wr-grid">
        <div v-for="it in closetList" :key="it.id" class="wr-card" @click="openEditItem(it)">
          <div class="wr-card-img"><ItemThumb :item="it" /></div>
          <div class="wr-card-body">
            <div class="wr-card-name">{{ it.name }}</div>
            <div class="wr-card-meta">
              <span>{{ catInfo(it.category).icon }} {{ catInfo(it.category).label }}</span>
              <span v-if="it.brand">· {{ it.brand }}</span>
            </div>
            <div v-if="it.colors.length" class="wr-dots">
              <span v-for="ck in it.colors.slice(0, 4)" :key="ck" class="wr-dot"
                    :style="`background:${WARDROBE_COLORS.find(c => c.key === ck)?.hex || '#ccc'}`"></span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <span class="ee">{{ (active.length ? EMPTY_MSG.filter : EMPTY_MSG.closet).ee }}</span>
        <h3>{{ (active.length ? EMPTY_MSG.filter : EMPTY_MSG.closet).h }}</h3>
        <p>{{ (active.length ? EMPTY_MSG.filter : EMPTY_MSG.closet).p }}</p>
      </div>
    </template>

    <!-- ── Outfit ── -->
    <template v-else-if="tab === 'outfits'">
      <div v-if="outfitList.length" class="wr-grid wr-grid-outfit">
        <div v-for="o in outfitList" :key="o.id" class="wr-card" @click="openEditOutfit(o)">
          <div class="wr-card-img"><OutfitCollage :item-ids="o.item_ids" /></div>
          <div class="wr-card-body">
            <div class="wr-card-name">
              <span v-if="o.favorite" class="wr-star">★</span>{{ o.name }}
            </div>
            <div class="wr-card-meta">
              <span>{{ o.item_ids.length }} item</span>
              <span v-if="o.tags.length">· {{ o.tags.join(', ') }}</span>
            </div>
            <span v-if="hasArchived(o)" class="badge wr-badge-arch">ada item diarsip</span>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <span class="ee">{{ EMPTY_MSG.outfits.ee }}</span>
        <h3>{{ EMPTY_MSG.outfits.h }}</h3>
        <p>{{ EMPTY_MSG.outfits.p }}</p>
      </div>
    </template>

    <!-- ── Arsip ── -->
    <template v-else>
      <div v-if="archiveGroups.length" class="wr-arch">
        <div v-for="g in archiveGroups" :key="g.key" class="wr-arch-group">
          <div class="wr-arch-head"><span>{{ g.icon }} {{ g.label }}</span><span>{{ g.items.length }}</span></div>
          <div v-for="it in g.items" :key="it.id" class="wr-arch-item" @click="openEditItem(it)">
            <div class="wr-arch-img"><ItemThumb :item="it" /></div>
            <div class="wr-arch-body">
              <div class="wr-card-name">{{ it.name }}</div>
              <div class="wr-card-meta">
                {{ catInfo(it.category).label }}<template v-if="it.archived_at"> · diarsip {{ fmtDateShort(it.archived_at) }}</template>
              </div>
            </div>
            <div class="wr-arch-acts" @click.stop>
              <template v-if="deleteConfirmId === it.id">
                <button class="wr-mini wr-mini-red" @click="executeDelete(it.id)">Hapus</button>
                <button class="wr-mini" @click="deleteConfirmId = null">Batal</button>
              </template>
              <template v-else>
                <button class="wr-mini wr-mini-leaf" @click="restoreWardrobeItem(it.id)">↩︎ Kembalikan</button>
                <button class="wr-mini wr-mini-x" @click="deleteConfirmId = it.id" aria-label="Hapus permanen">✕</button>
              </template>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <span class="ee">{{ EMPTY_MSG.archive.ee }}</span>
        <h3>{{ EMPTY_MSG.archive.h }}</h3>
        <p>{{ EMPTY_MSG.archive.p }}</p>
      </div>
    </template>

    <ItemForm :open="showItem" :item="editItem" @close="showItem = false" />
    <OutfitBuilder :open="showOutfit" :outfit="editOutfit" @close="showOutfit = false" />
  </div>
</template>

<style scoped>
/* ── Stats ── */
.wr-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px }
.wr-stat { border-radius:var(--r); padding:18px; color:#fff; min-width:0 }
.wr-s1 { background:linear-gradient(135deg,#EC4899,#BE185D) }
.wr-s2 { background:linear-gradient(135deg,#8B5CF6,#6D28D9) }
.wr-s3 { background:linear-gradient(135deg,#94A3B8,#475569) }
.wr-s4 { background:linear-gradient(135deg,#F59E0B,#D97706) }
.wr-n { font-family:'Fredoka One',cursive; font-size:28px; line-height:1; display:block; word-break:break-word }
.wr-n-sm { font-size:19px; line-height:1.2 }
.wr-l { font-size:10px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; opacity:.88; margin-top:5px }

.wr-top-row { display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap }
.wr-top-row .btn:disabled { opacity:.5; cursor:default }

/* ── Filters ── */
.wr-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px }
.wr-chip {
  padding:6px 12px; border-radius:20px; border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted); cursor:pointer; white-space:nowrap; transition:all .15s;
}
.wr-chip b { font-weight:900; color:var(--text); margin-left:2px }
.wr-chip.on { border-color:var(--sun); background:var(--sun-lt); color:var(--sun-dk) }
.wr-tools { display:flex; gap:8px; margin-bottom:12px }
.wr-search {
  flex:1; min-width:0; font-family:'Nunito',sans-serif; font-size:14px; font-weight:700; padding:9px 12px;
  border:2px solid rgba(0,0,0,.09); border-radius:var(--r-sm); background:#FAFAF5; color:var(--text); outline:none;
}
.wr-search:focus { border-color:var(--sun) }
.wr-sort { width:auto; flex-shrink:0 }
.wr-colors { display:flex; gap:7px; flex-wrap:wrap; align-items:center; margin-bottom:16px }
.wr-color { width:24px; height:24px; border-radius:50%; border:2px solid rgba(0,0,0,.12); cursor:pointer; padding:0 }
.wr-color.on { box-shadow:0 0 0 2px var(--bg), 0 0 0 4px var(--sun) }
.wr-color-clear { border:none; background:none; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800; color:var(--muted); cursor:pointer }

/* ── Grid cards ── */
.wr-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px }
.wr-grid-outfit { grid-template-columns:repeat(auto-fill, minmax(190px, 1fr)) }
.wr-card {
  background:var(--surface); border-radius:var(--r-sm); box-shadow:var(--sh); overflow:hidden;
  cursor:pointer; display:flex; flex-direction:column; animation:fadeUp .2s ease; transition:transform .18s, box-shadow .18s;
}
@media (hover:hover) and (pointer:fine) {
  .wr-card:hover { transform:translateY(-3px); box-shadow:var(--sh-md) }
}
.wr-card-img { aspect-ratio:1; border-bottom:1px solid var(--border) }
.wr-card-body { padding:9px 11px 11px; min-width:0; display:flex; flex-direction:column; gap:3px }
.wr-card-name { font-weight:900; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.wr-card-meta { font-size:11px; font-weight:700; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.wr-dots { display:flex; gap:4px; margin-top:2px }
.wr-dot { width:11px; height:11px; border-radius:50%; border:1px solid rgba(0,0,0,.15) }
.wr-star { color:var(--gold); margin-right:4px }
.wr-badge-arch { background:var(--red-lt); color:#DC2626; align-self:flex-start; margin-top:3px }

/* ── Archive list ── */
.wr-arch { display:flex; flex-direction:column; gap:18px }
.wr-arch-group { display:flex; flex-direction:column; gap:8px }
.wr-arch-head { display:flex; justify-content:space-between; font-family:'Fredoka One',cursive; font-size:14px; color:var(--muted); padding:0 2px }
.wr-arch-item {
  display:flex; align-items:center; gap:12px; background:var(--surface); border-radius:var(--r-sm);
  padding:8px 12px 8px 8px; box-shadow:var(--sh); cursor:pointer; animation:fadeUp .2s ease;
}
.wr-arch-img { width:52px; height:52px; border-radius:10px; overflow:hidden; flex-shrink:0; filter:grayscale(.5); opacity:.85 }
.wr-arch-body { flex:1; min-width:0 }
.wr-arch-acts { display:flex; gap:6px; flex-shrink:0 }
.wr-mini {
  padding:6px 10px; border-radius:8px; border:1.5px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:11.5px; font-weight:900; color:var(--muted); cursor:pointer; white-space:nowrap;
}
.wr-mini-leaf { border-color:var(--leaf); color:var(--leaf-dk); background:var(--leaf-lt) }
.wr-mini-red  { border-color:var(--red); background:var(--red); color:#fff }
.wr-mini-x    { width:30px; padding:6px 0 }

@media(max-width:960px) {
  .wr-stats { grid-template-columns:1fr 1fr }
}
@media(max-width:600px) {
  .wr-stats { gap:9px }
  .wr-stat { padding:14px }
  .wr-n { font-size:24px }
  .wr-n-sm { font-size:16px }
  .wr-top-row > .btn { flex:1; justify-content:center; padding:13px 14px; font-size:14px }
  /* category chips scroll sideways instead of wrapping into a tall block */
  .wr-chips { flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; margin-right:-15px; padding-right:15px }
  .wr-chips::-webkit-scrollbar { display:none }
  .wr-grid { grid-template-columns:repeat(2, 1fr); gap:10px }
  .wr-grid-outfit { grid-template-columns:repeat(2, 1fr) }
  .wr-search { font-size:16px }
  .wr-arch-item { flex-wrap:wrap }
  .wr-arch-acts { width:100%; justify-content:flex-end }
}
</style>
