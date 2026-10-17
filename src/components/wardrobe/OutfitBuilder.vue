<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { DB, addOutfit, updateOutfit, deleteOutfit } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'
import { WARDROBE_CATEGORIES } from '../../utils/constants.js'
import ItemThumb from './ItemThumb.vue'

const props = defineProps({
  open: Boolean,
  outfit: { type: Object, default: null },   // null → create mode
})
const emit = defineEmits(['close'])

const fName     = ref('')
const fItemIds  = ref([])
const fTags     = ref('')
const fNote     = ref('')
const fFavorite = ref(false)
const pickCat   = ref('all')
const confirmDel = ref(false)

const isEdit = computed(() => !!props.outfit)

watch(() => props.open, open => {
  if (!open) return
  const o = props.outfit
  fName.value     = o?.name || ''
  fItemIds.value  = [...(o?.item_ids || [])]
  fTags.value     = (o?.tags || []).join(', ')
  fNote.value     = o?.note || ''
  fFavorite.value = !!o?.favorite
  pickCat.value   = 'all'
  confirmDel.value = false
})

const byId = id => DB.wardrobe.find(i => i.id === id)
const selected = computed(() => fItemIds.value.map(byId).filter(Boolean))

// Archived items can't be added, but ones already in the outfit stay visible so they can be removed
const pickable = computed(() => DB.wardrobe.filter(i => i.status === 'active'))
const pickCats = computed(() => WARDROBE_CATEGORIES.filter(c => pickable.value.some(i => i.category === c.key)))
const pickList = computed(() => pickCat.value === 'all' ? pickable.value : pickable.value.filter(i => i.category === pickCat.value))

function toggle(id) {
  const i = fItemIds.value.indexOf(id)
  if (i >= 0) fItemIds.value.splice(i, 1)
  else fItemIds.value.push(id)
}

const canSave = computed(() => fItemIds.value.length > 0)

function save() {
  if (!canSave.value) return
  const payload = {
    name: fName.value.trim() || `Outfit ${DB.outfits.length + (isEdit.value ? 0 : 1)}`,
    item_ids: [...fItemIds.value],
    tags: fTags.value.split(',').map(t => t.trim()).filter(Boolean),
    note: fNote.value.trim(),
    favorite: fFavorite.value,
  }
  if (isEdit.value) updateOutfit(props.outfit.id, payload)
  else addOutfit({ id: uid(), ...payload, at: Date.now() })
  emit('close')
}

function remove() {
  deleteOutfit(props.outfit.id)
  emit('close')
}

function onKey(e) { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="overlay" :class="{ open }" @click.self="emit('close')">
    <div class="modal ob-modal">
      <div class="modal-head ob-head">
        <span>{{ isEdit ? 'Edit Outfit' : 'Buat Outfit' }}</span>
        <button class="ob-fav" :class="{ on: fFavorite }" type="button" @click="fFavorite = !fFavorite"
                :aria-label="fFavorite ? 'Hapus dari favorit' : 'Jadikan favorit'">{{ fFavorite ? '★' : '☆' }}</button>
      </div>

      <!-- Selected strip -->
      <div class="ob-label">Dipilih ({{ selected.length }})</div>
      <div class="ob-selected">
        <button v-for="it in selected" :key="it.id" type="button" class="ob-sel" @click="toggle(it.id)" :title="`Lepas ${it.name}`">
          <ItemThumb :item="it" />
          <span class="ob-x">✕</span>
          <span v-if="it.status === 'archived'" class="ob-arch">arsip</span>
        </button>
        <div v-if="!selected.length" class="ob-sel-empty">Pilih item di bawah untuk menyusun outfit</div>
      </div>

      <!-- Picker -->
      <div class="ob-label">Pilih dari lemari</div>
      <div class="ob-cats">
        <button class="ob-cat" :class="{ on: pickCat === 'all' }" type="button" @click="pickCat = 'all'">Semua</button>
        <button v-for="c in pickCats" :key="c.key" class="ob-cat" :class="{ on: pickCat === c.key }" type="button" @click="pickCat = c.key">
          {{ c.icon }} {{ c.label }}
        </button>
      </div>
      <div class="ob-grid">
        <button v-for="it in pickList" :key="it.id" type="button"
                class="ob-pick" :class="{ on: fItemIds.includes(it.id) }" @click="toggle(it.id)">
          <div class="ob-pick-img"><ItemThumb :item="it" /></div>
          <span class="ob-pick-name">{{ it.name }}</span>
          <span v-if="fItemIds.includes(it.id)" class="ob-check">✓</span>
        </button>
        <div v-if="!pickList.length" class="ob-sel-empty">Belum ada item aktif di lemari.</div>
      </div>

      <div class="form-row" style="margin-top:14px">
        <div class="fg">
          <label>Nama outfit</label>
          <input type="text" v-model="fName" placeholder="Ngantor santai, kondangan…" />
        </div>
      </div>
      <div class="form-row">
        <div class="fg">
          <label>Tag (pisahkan koma)</label>
          <input type="text" v-model="fTags" placeholder="kerja, weekend" />
        </div>
      </div>
      <div class="fg" style="margin-bottom:4px">
        <label>Catatan (opsional)</label>
        <input type="text" v-model="fNote" placeholder="Cocok buat cuaca panas…" />
      </div>

      <div v-if="isEdit" class="ob-del-row">
        <template v-if="confirmDel">
          <span>Hapus outfit ini?</span>
          <button class="btn btn-red ob-sm" type="button" @click="remove">Hapus</button>
          <button class="btn btn-ghost ob-sm" type="button" @click="confirmDel = false">Batal</button>
        </template>
        <button v-else class="btn btn-ghost ob-sm ob-del" type="button" @click="confirmDel = true">Hapus outfit</button>
      </div>

      <div class="modal-foot">
        <button class="btn btn-ghost" type="button" @click="emit('close')">Batal</button>
        <button class="btn btn-sun" type="button" :disabled="!canSave" @click="save">Simpan</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ob-modal { max-width:620px }
.ob-head { display:flex; align-items:center; justify-content:space-between }
.ob-fav { border:none; background:none; font-size:24px; cursor:pointer; color:var(--muted); line-height:1 }
.ob-fav.on { color:var(--gold) }
.ob-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px }

.ob-selected {
  display:flex; gap:8px; overflow-x:auto; padding:4px 2px 8px; margin-bottom:12px;
  min-height:88px; scrollbar-width:thin;
}
.ob-sel {
  position:relative; width:76px; height:76px; flex-shrink:0; border-radius:var(--r-sm); overflow:hidden;
  border:2px solid var(--sun); padding:0; background:none; cursor:pointer;
}
.ob-x {
  position:absolute; top:3px; right:3px; width:18px; height:18px; border-radius:50%;
  background:rgba(26,14,0,.65); color:#fff; font-size:9px; display:flex; align-items:center; justify-content:center;
}
.ob-arch { position:absolute; left:3px; bottom:3px; font-size:9px; font-weight:900; padding:1px 5px; border-radius:6px; background:var(--red); color:#fff }
.ob-sel-empty { font-size:12px; font-weight:700; color:var(--muted); align-self:center; padding:8px 0 }

.ob-cats { display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; margin-bottom:8px; scrollbar-width:none }
.ob-cats::-webkit-scrollbar { display:none }
.ob-cat {
  flex-shrink:0; padding:6px 11px; border-radius:20px; border:2px solid var(--border); background:var(--surface);
  font-family:'Nunito',sans-serif; font-size:11.5px; font-weight:800; color:var(--muted); cursor:pointer; white-space:nowrap;
}
.ob-cat.on { border-color:var(--sun); background:var(--sun-lt); color:var(--sun-dk) }

.ob-grid {
  display:grid; grid-template-columns:repeat(auto-fill, minmax(92px, 1fr)); gap:8px;
  max-height:260px; overflow-y:auto; padding:2px;
}
.ob-pick {
  position:relative; display:flex; flex-direction:column; border-radius:var(--r-sm); overflow:hidden;
  border:2px solid var(--border); background:var(--surface); padding:0; cursor:pointer; text-align:left; transition:border-color .15s;
}
.ob-pick.on { border-color:var(--sun) }
.ob-pick-img { aspect-ratio:1 }
.ob-pick-name {
  font-family:'Nunito',sans-serif; font-size:10.5px; font-weight:800; color:var(--text);
  padding:4px 6px 5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.ob-check {
  position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%;
  background:var(--sun); color:#1A0E00; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center;
}

.ob-del-row { display:flex; align-items:center; gap:8px; margin-top:14px; font-size:13px; font-weight:800; flex-wrap:wrap }
.ob-sm { padding:7px 12px; font-size:12px }
.ob-del { color:#DC2626 }
.btn:disabled { opacity:.55; cursor:default }

@media(max-width:600px) {
  .ob-grid { grid-template-columns:repeat(3, 1fr); max-height:38dvh }
}
</style>
