<script setup>
import { ref, computed } from 'vue'
import { DB, addFoodSpot, updateFoodSpot, deleteFoodSpot, saveSettings } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'
import FoodPickerMap from './FoodPickerMap.vue'

// ── Default tree ────────────────────────────────────────────────
const DEFAULT_TREE = {
  id: 'root', label: 'Start', icon: '🎲', tag: '',
  children: [
    {
      id: 'nasi', label: 'Nasi', icon: '🍚', tag: 'nasi',
      children: [
        { id: 'nasi-kuah', label: 'Berkuah',       icon: '🥣', tag: 'berkuah', children: [] },
        { id: 'nasi-tdk',  label: 'Tidak berkuah',  icon: '🍳', tag: 'tidak',   children: [] },
      ],
    },
    {
      id: 'non-nasi', label: 'Non-nasi', icon: '🥗', tag: 'non-nasi',
      children: [
        { id: 'nn-kuah', label: 'Berkuah',       icon: '🥣', tag: 'berkuah', children: [] },
        { id: 'nn-tdk',  label: 'Tidak berkuah',  icon: '🍳', tag: 'tidak',   children: [] },
      ],
    },
  ],
}

function activeTree() { return DB.settings.foodTree || DEFAULT_TREE }

function onTreeUpdate(newTree) {
  saveSettings({ foodTree: newTree })
}

// ── Tabs ────────────────────────────────────────────────────────
const tab = ref('map')

// ── Favorites CRUD ──────────────────────────────────────────────
const PRESET_TAGS = ['nasi', 'mie', 'kentang', 'non-nasi', 'berkuah', 'tidak', 'pedas', 'manis', 'asin', 'gurih', 'gorengan']

const showModal = ref(false)
const editId    = ref(null)
const fName     = ref('')
const fNotes    = ref('')
const fTags     = ref([])
const fTagInput = ref('')

function addTag(t) {
  const v = t.trim().toLowerCase()
  if (v && !fTags.value.includes(v)) fTags.value.push(v)
  fTagInput.value = ''
}

function onTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(fTagInput.value) }
  if (e.key === 'Backspace' && !fTagInput.value) fTags.value.pop()
}

function removeTag(t) { fTags.value = fTags.value.filter(x => x !== t) }

function openAdd() {
  editId.value = null
  fName.value = ''; fNotes.value = ''; fTags.value = []
  showModal.value = true
}

function openEdit(spot) {
  editId.value = spot.id
  fName.value = spot.name; fNotes.value = spot.notes; fTags.value = [...(spot.tags || [])]
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function saveSpot() {
  const name = fName.value.trim()
  if (!name) return
  const payload = { name, notes: fNotes.value.trim(), tags: [...fTags.value] }
  if (editId.value) updateFoodSpot(editId.value, payload)
  else addFoodSpot({ id: uid(), ...payload, at: Date.now() })
  closeModal()
}

// ── Master tab (tree editor) ─────────────────────────────────────
function treeClone() { return JSON.parse(JSON.stringify(activeTree())) }

function findNode(root, id, cb) {
  if (root.id === id) { cb(root); return }
  ;(root.children || []).forEach(c => findNode(c, id, cb))
}

const flatTree = computed(() => {
  const out = []
  function walk(node, depth, parent) {
    const siblings = parent ? (parent.children || []) : [node]
    const idx      = siblings.findIndex(c => c.id === node.id)
    out.push({ node, depth, parent, idx, sibCount: siblings.length })
    ;(node.children || []).forEach(c => walk(c, depth + 1, node))
  }
  walk(activeTree(), 0, null)
  return out
})

const masterEditId   = ref(null)
const masterEditForm = ref({ label: '', icon: '', tag: '' })
const masterAddParentId = ref(null)
const masterNewChild    = ref({ label: '', icon: '⭐', tag: '' })

function startMasterEdit(item) {
  masterAddParentId.value = null
  masterEditId.value = item.node.id
  masterEditForm.value = { label: item.node.label, icon: item.node.icon, tag: item.node.tag || '' }
}

function saveMasterEdit() {
  const tree = treeClone()
  findNode(tree, masterEditId.value, n => {
    n.label = masterEditForm.value.label.trim() || n.label
    n.icon  = masterEditForm.value.icon.trim()  || n.icon
    n.tag   = masterEditForm.value.tag.trim()
  })
  saveSettings({ foodTree: tree })
  masterEditId.value = null
}

function masterDelete(nodeId, hasChildren) {
  if (hasChildren && !confirm('Hapus node ini beserta semua cabangnya?')) return
  const tree = treeClone()
  function prune(n) {
    n.children = (n.children || []).filter(c => c.id !== nodeId)
    n.children.forEach(prune)
  }
  prune(tree)
  saveSettings({ foodTree: tree })
}

function startMasterAdd(nodeId) {
  masterEditId.value = null
  masterAddParentId.value = nodeId
  masterNewChild.value = { label: '', icon: '⭐', tag: '' }
}

function confirmMasterAdd() {
  const tree = treeClone()
  findNode(tree, masterAddParentId.value, n => {
    n.children = [...(n.children || []), {
      id: uid(), children: [],
      label: masterNewChild.value.label.trim() || 'Pilihan',
      icon:  masterNewChild.value.icon.trim()  || '⭐',
      tag:   masterNewChild.value.tag.trim(),
    }]
  })
  saveSettings({ foodTree: tree })
  masterAddParentId.value = null
}

function masterMoveUp(nodeId) {
  const tree = treeClone()
  function swap(n) {
    const arr = n.children || []
    const idx = arr.findIndex(c => c.id === nodeId)
    if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; return }
    if (idx === -1) arr.forEach(swap)
  }
  swap(tree)
  saveSettings({ foodTree: tree })
}

function masterMoveDown(nodeId) {
  const tree = treeClone()
  function swap(n) {
    const arr = n.children || []
    const idx = arr.findIndex(c => c.id === nodeId)
    if (idx >= 0 && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; return }
    if (idx === -1) arr.forEach(swap)
  }
  swap(tree)
  saveSettings({ foodTree: tree })
}

function masterReset() {
  if (confirm('Reset map ke bawaan? Semua perubahan akan hilang.')) {
    saveSettings({ foodTree: JSON.parse(JSON.stringify(DEFAULT_TREE)) })
  }
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>🍜 Food Picks</h1>
      <p>Susah milih makan siang? Ikutin jalurmu sendiri!</p>
    </div>

    <!-- Tabs -->
    <div class="ftabs" style="margin-bottom:20px">
      <button class="ftab" :class="{ active: tab === 'map' }"    @click="tab = 'map'">🗺️ Pilih</button>
      <button class="ftab" :class="{ active: tab === 'spots' }"  @click="tab = 'spots'">
        ⭐ Favorit ({{ DB.foodSpots.length }})
      </button>
      <button class="ftab" :class="{ active: tab === 'master' }" @click="tab = 'master'">⚙️ Master</button>
    </div>

    <!-- ── Map tab ── -->
    <template v-if="tab === 'map'">
      <FoodPickerMap
        :tree="activeTree()"
        :foodSpots="DB.foodSpots"
        @update:tree="onTreeUpdate"
      />
    </template>

    <!-- ── Favorites tab ── -->
    <template v-else-if="tab === 'spots'">
      <div style="margin-bottom:16px">
        <button class="btn btn-sun" @click="openAdd">＋ Tambah Favorit</button>
      </div>

      <div class="fs-list">
        <template v-if="DB.foodSpots.length">
          <div v-for="spot in DB.foodSpots" :key="spot.id"
               class="fs-card" @click="openEdit(spot)">
            <div class="fs-icon">🍽️</div>
            <div class="fs-body">
              <div class="fs-name">{{ spot.name }}</div>
              <div v-if="spot.notes" class="fs-notes">{{ spot.notes }}</div>
              <div class="fs-tags">
                <span v-for="tag in (spot.tags || [])" :key="tag" class="fs-tag">{{ tag }}</span>
              </div>
            </div>
            <button class="fs-del" @click.stop="deleteFoodSpot(spot.id)">✕</button>
          </div>
        </template>
        <div v-else class="empty">
          <span class="ee">🍜</span>
          <h3>Belum ada favorit nih</h3>
          <p>Tambahin dulu biar bisa dipilihkan sama node map! 🌻</p>
        </div>
      </div>
    </template>

    <!-- ── Master tab ── -->
    <template v-else>
      <div class="mt-head">
        <span class="mt-title">⚙️ Atur Cabang Map</span>
        <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" @click="masterReset">↺ Reset Bawaan</button>
      </div>
      <p class="mt-hint">Edit label, emoji, atau tag tiap node. Tag dicocokkan ke makanan favorit saat jalur selesai.</p>

      <div class="mt-list">
        <template v-for="item in flatTree" :key="item.node.id">
          <!-- Node row -->
          <div class="mt-row" :style="{ paddingLeft: (item.depth * 22 + 14) + 'px' }">
            <span v-if="item.depth > 0" class="mt-branch">└</span>

            <!-- Inline edit form -->
            <template v-if="masterEditId === item.node.id">
              <input v-model="masterEditForm.icon"  class="mt-icon-input" maxlength="4" />
              <input v-model="masterEditForm.label" class="mt-lbl-input"  placeholder="Label…" @keydown.enter="saveMasterEdit" />
              <input v-model="masterEditForm.tag"   class="mt-tag-input"  placeholder="tag…"   @keydown.enter="saveMasterEdit" />
              <div class="mt-acts">
                <button class="mt-act mt-save"   title="Simpan" @click="saveMasterEdit">✓</button>
                <button class="mt-act mt-cancel" title="Batal"  @click="masterEditId = null">✕</button>
              </div>
            </template>

            <!-- Normal display -->
            <template v-else>
              <span class="mt-icon">{{ item.node.icon }}</span>
              <span class="mt-label">{{ item.node.label }}</span>
              <span v-if="item.node.tag" class="mt-tag-chip">{{ item.node.tag }}</span>
              <div class="mt-acts">
                <button class="mt-act" title="Edit"   @click="startMasterEdit(item)">✎</button>
                <button class="mt-act mt-add" title="Tambah cabang" @click="startMasterAdd(item.node.id)">＋</button>
                <button class="mt-act" title="Naik"
                        :disabled="item.idx === 0 || item.depth === 0"
                        @click="masterMoveUp(item.node.id)">↑</button>
                <button class="mt-act" title="Turun"
                        :disabled="item.idx >= item.sibCount - 1 || item.depth === 0"
                        @click="masterMoveDown(item.node.id)">↓</button>
                <button v-if="item.depth > 0" class="mt-act mt-del" title="Hapus"
                        @click="masterDelete(item.node.id, item.node.children?.length > 0)">✕</button>
              </div>
            </template>
          </div>

          <!-- Inline add-child form -->
          <div v-if="masterAddParentId === item.node.id" class="mt-row mt-add-form"
               :style="{ paddingLeft: ((item.depth + 1) * 22 + 14) + 'px' }">
            <span class="mt-branch">└</span>
            <input v-model="masterNewChild.icon"  class="mt-icon-input" maxlength="4" />
            <input v-model="masterNewChild.label" class="mt-lbl-input"  placeholder="Label baru…" @keydown.enter="confirmMasterAdd" />
            <input v-model="masterNewChild.tag"   class="mt-tag-input"  placeholder="tag…"        @keydown.enter="confirmMasterAdd" />
            <div class="mt-acts">
              <button class="mt-act mt-save"   @click="confirmMasterAdd">✓</button>
              <button class="mt-act mt-cancel" @click="masterAddParentId = null">✕</button>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Add / Edit modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal">
      <div class="modal">
        <div class="modal-head">{{ editId ? '✏️ Edit Favorit' : '🍜 Tambah Favorit' }}</div>

        <div class="fg" style="margin-bottom:14px">
          <label>Nama makanan / tempat</label>
          <input type="text" v-model="fName"
                 placeholder="Mis: Nasi Goreng Pak Udin…" @keydown.enter="saveSpot" />
        </div>
        <div class="fg" style="margin-bottom:4px">
          <label>Catatan (opsional)</label>
          <input type="text" v-model="fNotes" placeholder="Mis: Enak banget, deket kantor" />
        </div>

        <div class="fss-label">Tag <em style="font-weight:600;opacity:.5;font-style:normal">(dicocokkan ke map)</em></div>

        <!-- Chip input -->
        <div class="fchip-wrap" @click="$refs.tagIn.focus()">
          <span v-for="t in fTags" :key="t" class="fchip">
            {{ t }}<button class="fchip-del" type="button" @click.stop="removeTag(t)">✕</button>
          </span>
          <input ref="tagIn" v-model="fTagInput" class="fchip-input"
                 placeholder="ketik + Enter…" @keydown="onTagKeydown" />
        </div>

        <!-- Preset quick-tags -->
        <div class="fpreset-row">
          <button v-for="pt in PRESET_TAGS" :key="pt" type="button"
                  class="fpreset" :class="{ on: fTags.includes(pt) }"
                  @click="fTags.includes(pt) ? removeTag(pt) : addTag(pt)">
            {{ pt }}
          </button>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn btn-sun"   @click="saveSpot">Simpan ✨</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Favorites list ──────────────────────────────────────────── */
.fs-list { display:flex; flex-direction:column; gap:10px }

.fs-card {
  display:flex; align-items:center; gap:14px;
  background:var(--surface); border-radius:var(--r); padding:14px 16px;
  border:2px solid var(--border); cursor:pointer; transition:all .2s;
  animation:fadeUp .2s ease; position:relative;
}
.fs-card:hover { box-shadow:var(--sh); border-color:var(--sun) }

.fs-icon { font-size:24px; flex-shrink:0 }
.fs-body { flex:1; min-width:0 }
.fs-name  { font-family:'Fredoka One',cursive; font-size:16px; color:var(--text); margin-bottom:4px }
.fs-notes { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }

.fs-tags { display:flex; gap:6px; flex-wrap:wrap }
.fs-tag  { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; background:rgba(251,191,36,.15); color:#B45309 }

.fs-del {
  position:absolute; top:9px; right:9px;
  width:26px; height:26px; border:none; background:transparent; border-radius:7px;
  cursor:pointer; color:var(--muted); font-size:11px; opacity:0;
  display:flex; align-items:center; justify-content:center; transition:all .15s;
}
.fs-card:hover .fs-del { opacity:1 }
.fs-del:hover { background:rgba(239,68,68,.12); color:#EF4444 }

/* ── Tag chip input in modal ──────────────────────────────────── */
.fss-label {
  font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase;
  color:var(--muted); margin-bottom:8px; margin-top:20px;
}

.fchip-wrap {
  display:flex; flex-wrap:wrap; gap:6px; align-items:center;
  border:2px solid var(--border); border-radius:var(--r-sm); padding:8px 10px;
  min-height:44px; background:var(--bg); cursor:text;
  transition:border-color .18s; margin-bottom:10px;
}
.fchip-wrap:focus-within { border-color:var(--sun) }

.fchip {
  display:inline-flex; align-items:center; gap:4px;
  background:rgba(251,191,36,.18); color:#B45309;
  font-size:11px; font-weight:800; padding:3px 8px; border-radius:20px;
}
.fchip-del {
  border:none; background:none; cursor:pointer; padding:0; color:#B45309;
  font-size:9px; line-height:1; display:flex; align-items:center;
}
.fchip-del:hover { color:#EF4444 }

.fchip-input {
  border:none !important; outline:none !important; box-shadow:none !important;
  background:none; padding:0;
  font-size:13px; font-family:'Nunito',sans-serif; color:var(--text);
  min-width:100px; flex:1;
}

.fpreset-row { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px }
.fpreset {
  padding:4px 10px; border-radius:20px;
  border:1.5px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:11px; font-weight:800; color:var(--muted);
  transition:all .15s;
}
.fpreset.on    { border-color:var(--sun); background:rgba(251,191,36,.12); color:#B45309 }
.fpreset:hover { border-color:var(--sun); color:var(--sun-dk) }

/* ── Master tab ──────────────────────────────────────────────── */
.mt-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.mt-title { font-family:'Fredoka One',cursive; font-size:16px; color:var(--text) }
.mt-hint  { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:16px; line-height:1.55 }

.mt-list { display:flex; flex-direction:column }

.mt-row {
  display:flex; align-items:center; gap:8px; flex-wrap:nowrap;
  padding-top:5px; padding-bottom:5px; padding-right:8px;
  border-radius:var(--r-sm);
  transition:background .15s;
}
.mt-row:hover { background:var(--surface) }
.mt-add-form  { background:rgba(251,191,36,.04) }

.mt-branch { color:var(--border); font-size:13px; flex-shrink:0; user-select:none }
.mt-icon   { font-size:18px; flex-shrink:0 }
.mt-label  { font-family:'Fredoka One',cursive; font-size:14px; color:var(--text); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.mt-tag-chip { font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; background:rgba(251,191,36,.15); color:#B45309; flex-shrink:0 }

.mt-acts { display:flex; gap:3px; flex-shrink:0; margin-left:auto }

.mt-act {
  width:26px; height:26px; border-radius:7px; flex-shrink:0;
  border:1.5px solid var(--border); background:var(--surface);
  cursor:pointer; font-size:11px; color:var(--muted);
  display:flex; align-items:center; justify-content:center; transition:all .15s;
}
.mt-act:disabled { opacity:.28; cursor:default; pointer-events:none }
.mt-act:not(:disabled):hover { border-color:var(--sun); color:var(--sun-dk) }
.mt-add:not(:disabled):hover   { border-color:var(--leaf); color:var(--leaf) }
.mt-del:not(:disabled):hover   { border-color:#EF4444; color:#EF4444 }
.mt-save:not(:disabled):hover  { border-color:var(--leaf); color:var(--leaf) }
.mt-cancel:not(:disabled):hover { border-color:#EF4444; color:#EF4444 }

.mt-icon-input {
  width:36px; text-align:center; font-size:16px; padding:4px; flex-shrink:0;
  border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--bg);
  font-family:inherit;
}
.mt-lbl-input {
  flex:1; min-width:60px; padding:5px 8px;
  border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--bg);
  font-family:'Nunito',sans-serif; font-size:13px; font-weight:700; color:var(--text);
}
.mt-tag-input {
  width:80px; flex-shrink:0; padding:5px 8px;
  border-radius:var(--r-sm); border:1.5px solid var(--border); background:var(--bg);
  font-family:'Nunito',sans-serif; font-size:12px; color:var(--text);
}

@media (max-width: 480px) {
  .mt-acts { gap:2px }
  .mt-act  { width:24px; height:24px; font-size:10px }
  .mt-tag-input { width:60px }
}
</style>
