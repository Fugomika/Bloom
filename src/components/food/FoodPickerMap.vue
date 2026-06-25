<script setup>
import { ref, computed } from 'vue'
import { uid } from '../../utils/date.js'

// ── Layout constants ────────────────────────────────────────────
const NODE_R  = 32   // circle radius (px, in SVG coordinate space)
const LAYER_H = 130  // vertical gap between layers
const TOP_PAD = 56
const BOT_PAD = 32
const SVG_W   = 560  // internal coordinate width

const props = defineProps({
  tree:      { type: Object, required: true },
  foodSpots: { type: Array,  default: () => [] },
})
const emit = defineEmits(['update:tree'])

// ── Traversal state ─────────────────────────────────────────────
const path       = ref([props.tree.id])  // IDs from root → current leaf
const rerollSeed = ref(0)

// ── Edit state ──────────────────────────────────────────────────
const editMode     = ref(false)
const editForm     = ref(null)    // { id, label, icon, tag } or null
const addParentId  = ref(null)    // node ID we're adding a child to
const newChild     = ref({ label: '', icon: '⭐', tag: '' })

// ── Layout algorithm ─────────────────────────────────────────────
function countLeaves(node) {
  if (!node.children?.length) return 1
  return node.children.reduce((s, c) => s + countLeaves(c), 0)
}

function assignPos(node, xMin, xMax, depth) {
  node.x = (xMin + xMax) / 2
  node.y = depth * LAYER_H + TOP_PAD
  if (!node.children?.length) return
  const total = countLeaves(node)
  let x = xMin
  for (const child of node.children) {
    const w = (xMax - xMin) * countLeaves(child) / total
    assignPos(child, x, x + w, depth + 1)
    x += w
  }
}

const layoutTree = computed(() => {
  const clone = JSON.parse(JSON.stringify(props.tree))
  assignPos(clone, 0, SVG_W, 0)
  return clone
})

// Flat list of all nodes (with computed x/y)
const flat = computed(() => {
  const out = []
  function walk(n) { out.push(n); (n.children || []).forEach(walk) }
  walk(layoutTree.value)
  return out
})

const byId = computed(() => Object.fromEntries(flat.value.map(n => [n.id, n])))

const svgH = computed(() =>
  Math.max(...flat.value.map(n => n.y)) + NODE_R + BOT_PAD
)

// ── SVG edges ───────────────────────────────────────────────────
function curve(x1, y1, x2, y2) {
  const m = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${m}, ${x2} ${m}, ${x2} ${y2}`
}

const edges = computed(() => {
  const out = []
  function walk(n) {
    for (const child of (n.children || [])) {
      out.push({
        id:     `${n.id}→${child.id}`,
        d:      curve(n.x, n.y + NODE_R, child.x, child.y - NODE_R),
        active: path.value.includes(n.id) && path.value.includes(child.id),
      })
      walk(child)
    }
  }
  walk(layoutTree.value)
  return out
})

// ── Path logic ───────────────────────────────────────────────────
const availIds = computed(() => {
  const lastId = path.value[path.value.length - 1]
  return new Set((byId.value[lastId]?.children || []).map(c => c.id))
})

function nodeState(node) {
  const idx = path.value.indexOf(node.id)
  if (idx >= 0) return idx === path.value.length - 1 ? 'selected' : 'visited'
  return availIds.value.has(node.id) ? 'available' : 'inactive'
}

function clickNode(node) {
  if (editMode.value) return
  const idx = path.value.indexOf(node.id)
  if (idx >= 0) {
    // Deselect: backtrack to before this node
    const prev = path.value.slice(0, idx)
    path.value = prev.length ? prev : [props.tree.id]
  } else if (availIds.value.has(node.id)) {
    path.value = [...path.value, node.id]
  }
}

function resetMap() { path.value = [props.tree.id] }

// ── Result ───────────────────────────────────────────────────────
const result = computed(() => {
  void rerollSeed.value
  const lastId = path.value[path.value.length - 1]
  const last   = byId.value[lastId]
  if (!last || (last.children || []).length > 0) return null

  const tags = path.value.map(id => byId.value[id]?.tag).filter(Boolean)

  const matches = props.foodSpots.filter(s => {
    if (!tags.length) return true
    // built-in carb+texture tags, plus optional customTags array
    const sTags = new Set([s.carbType, s.texture, ...(s.customTags || [])].filter(Boolean))
    return tags.every(t => sTags.has(t))
  })

  return matches.length
    ? { spot: matches[Math.floor(Math.random() * matches.length)] }
    : { empty: true }
})

function reroll() { rerollSeed.value++ }

const CARB_LBL = { nasi: '🍚 Nasi', 'non-nasi': '🥗 Non-nasi' }
const TEX_LBL  = { berkuah: '🥣 Berkuah', tidak: '🍳 Tidak berkuah' }

// ── Edit helpers ─────────────────────────────────────────────────
function deepClone() { return JSON.parse(JSON.stringify(props.tree)) }

function findNode(root, id, cb) {
  if (root.id === id) { cb(root); return }
  ;(root.children || []).forEach(c => findNode(c, id, cb))
}

function startEdit(node) {
  editForm.value = { id: node.id, label: node.label, icon: node.icon, tag: node.tag || '' }
}

function saveEdit() {
  if (!editForm.value) return
  const tree = deepClone()
  findNode(tree, editForm.value.id, n => {
    n.label = editForm.value.label.trim() || n.label
    n.icon  = editForm.value.icon.trim()  || n.icon
    n.tag   = editForm.value.tag.trim()
  })
  emit('update:tree', tree)
  editForm.value = null
}

function startAddChild(nodeId) {
  addParentId.value = nodeId
  newChild.value = { label: '', icon: '⭐', tag: '' }
}

function confirmAddChild() {
  const tree = deepClone()
  findNode(tree, addParentId.value, n => {
    n.children = [...(n.children || []), {
      id: uid(), children: [],
      label: newChild.value.label.trim() || 'Pilihan',
      icon:  newChild.value.icon.trim()  || '⭐',
      tag:   newChild.value.tag.trim(),
    }]
  })
  emit('update:tree', tree)
  addParentId.value = null
}

function deleteLeaf(nodeId) {
  const tree = deepClone()
  function prune(n) {
    n.children = (n.children || []).filter(c => c.id !== nodeId)
    n.children.forEach(prune)
  }
  prune(tree)
  emit('update:tree', tree)
  if (path.value.includes(nodeId)) {
    path.value = path.value.slice(0, path.value.indexOf(nodeId))
    if (!path.value.length) path.value = [props.tree.id]
  }
}
</script>

<template>
  <!-- Header -->
  <div class="pm-head">
    <span class="pm-title">🗺️ Pilih Jalurmu</span>
    <div class="pm-acts">
      <button class="pm-btn" @click="resetMap">🔄 Reset</button>
      <button class="pm-btn" :class="{ 'pm-btn-edit': editMode }"
              @click="editMode = !editMode; editForm = null; addParentId = null">
        {{ editMode ? '✓ Selesai' : '✎ Edit' }}
      </button>
    </div>
  </div>

  <!-- Dark game-map canvas -->
  <div class="pm-outer">
    <div class="pm-canvas" :style="{ height: svgH + 'px', minWidth: SVG_W + 'px' }">

      <!-- SVG connection layer -->
      <svg class="pm-svg"
           :viewBox="`0 0 ${SVG_W} ${svgH}`"
           :width="SVG_W" :height="svgH"
           xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pm-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path v-for="e in edges" :key="e.id" :d="e.d"
              :class="['pm-edge', { 'pm-edge-on': e.active }]" />
      </svg>

      <!-- Node divs -->
      <div v-for="node in flat" :key="node.id"
           class="pm-node"
           :class="[`pm-${nodeState(node)}`]"
           :style="{ left: node.x + 'px', top: node.y + 'px' }"
           @click="clickNode(node)">

        <div class="pm-circle">
          <span class="pm-emoji">{{ node.icon }}</span>
        </div>
        <span class="pm-lbl">{{ node.label }}</span>

        <!-- Edit-mode controls -->
        <div v-if="editMode" class="pm-ctrl" @click.stop>
          <button class="pm-cb pm-cb-edit" title="Edit node"      @click="startEdit(node)">✎</button>
          <button class="pm-cb pm-cb-add"  title="Add branch"     @click="startAddChild(node.id)">＋</button>
          <button v-if="!(node.children?.length) && node.id !== tree.id"
                  class="pm-cb pm-cb-del"  title="Delete"
                  @click="deleteLeaf(node.id)">✕</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Result panel -->
  <Transition name="pm-res">
    <div v-if="result" class="pm-result">
      <template v-if="result.empty">
        <div class="pm-res-ee">🗺️</div>
        <div class="pm-res-title">Nggak ada yang cocok</div>
        <p class="pm-res-sub">Tambahin favorit di tab Favorit, atau sesuaikan tag-nya ya!</p>
        <button class="btn btn-ghost" style="margin-top:4px" @click="resetMap">← Coba lagi</button>
      </template>
      <template v-else>
        <div class="pm-res-ee">🎉</div>
        <div class="pm-res-title">Makan ini yuk!</div>
        <div class="pm-res-name">{{ result.spot.name }}</div>
        <div v-if="result.spot.notes" class="pm-res-notes">{{ result.spot.notes }}</div>
        <div class="pm-res-tags">
          <span class="pm-res-tag">{{ CARB_LBL[result.spot.carbType] }}</span>
          <span class="pm-res-tag">{{ TEX_LBL[result.spot.texture] }}</span>
        </div>
        <div class="pm-res-acts">
          <button class="btn btn-ghost" @click="reroll">🎲 Pilih lain</button>
          <button class="btn btn-sun"   @click="resetMap">✓ Oke!</button>
        </div>
      </template>
    </div>
  </Transition>

  <!-- Edit node modal -->
  <Teleport to="body">
    <div v-if="editForm" class="pm-modal-bg" @click.self="editForm = null">
      <div class="pm-modal">
        <div class="modal-head">✎ Edit Node</div>
        <div class="fg" style="margin-bottom:10px">
          <label>Emoji</label>
          <input v-model="editForm.icon" type="text" placeholder="🍜" maxlength="4"
                 style="font-size:22px;text-align:center" />
        </div>
        <div class="fg" style="margin-bottom:10px">
          <label>Label</label>
          <input v-model="editForm.label" type="text" placeholder="Nama pilihan…" @keydown.enter="saveEdit" />
        </div>
        <div class="fg">
          <label>Tag filter <em style="font-weight:600;opacity:.55;font-style:normal">(untuk cocokkan makanan, mis: nasi, berkuah)</em></label>
          <input v-model="editForm.tag" type="text" placeholder="mis: nasi, berkuah, pedes…" @keydown.enter="saveEdit" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="editForm = null">Batal</button>
          <button class="btn btn-sun"   @click="saveEdit">Simpan ✨</button>
        </div>
      </div>
    </div>

    <!-- Add child modal -->
    <div v-if="addParentId" class="pm-modal-bg" @click.self="addParentId = null">
      <div class="pm-modal">
        <div class="modal-head">＋ Tambah Cabang</div>
        <div class="fg" style="margin-bottom:10px">
          <label>Emoji</label>
          <input v-model="newChild.icon" type="text" placeholder="⭐" maxlength="4"
                 style="font-size:22px;text-align:center" />
        </div>
        <div class="fg" style="margin-bottom:10px">
          <label>Label</label>
          <input v-model="newChild.label" type="text" placeholder="Nama pilihan baru…" @keydown.enter="confirmAddChild" />
        </div>
        <div class="fg">
          <label>Tag filter</label>
          <input v-model="newChild.tag" type="text" placeholder="mis: pedes, manis…" @keydown.enter="confirmAddChild" />
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="addParentId = null">Batal</button>
          <button class="btn btn-sun"   @click="confirmAddChild">Tambah ✨</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Header ──────────────────────────────────────────────────── */
.pm-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px }
.pm-title { font-family:'Fredoka One',cursive; font-size:17px; color:var(--text) }
.pm-acts  { display:flex; gap:8px }

.pm-btn {
  padding:6px 14px; border-radius:var(--r-sm);
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:12px; font-weight:800;
  color:var(--muted); transition:all .18s;
}
.pm-btn:hover   { border-color:var(--sun); color:var(--sun-dk) }
.pm-btn-edit    { border-color:var(--leaf); color:var(--leaf); background:rgba(52,211,153,.1) }

/* ── Canvas wrapper (dark game-map bg) ───────────────────────── */
.pm-outer {
  overflow-x: auto;
  background: linear-gradient(160deg, #1A1410 0%, #251C14 55%, #1A1410 100%);
  border-radius: 16px;
  border: 1px solid rgba(251,191,36,.18);
  margin-bottom: 16px;
  box-shadow: inset 0 0 60px rgba(0,0,0,.4);
}

.pm-canvas { position:relative }

/* ── SVG edges ───────────────────────────────────────────────── */
.pm-svg { position:absolute; top:0; left:0; pointer-events:none; overflow:visible }

.pm-edge {
  fill:none; stroke:rgba(255,255,255,.08); stroke-width:2; stroke-linecap:round;
  transition:stroke .35s, stroke-width .35s;
}
.pm-edge-on {
  stroke:#FBBF24; stroke-width:2.5;
  filter:url(#pm-glow);
}

/* ── Nodes ───────────────────────────────────────────────────── */
.pm-node {
  position:absolute; transform:translate(-50%,-50%);
  display:flex; flex-direction:column; align-items:center;
  cursor:pointer; width:80px; z-index:2;
  transition:opacity .25s;
}

.pm-circle {
  width:64px; height:64px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  border:2px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.05);
  transition:all .25s;
  position:relative;
}
.pm-emoji { font-size:22px; line-height:1; position:relative; z-index:1 }

.pm-lbl {
  font-size:10px; font-weight:800; color:rgba(255,255,255,.38);
  margin-top:6px; text-align:center;
  max-width:80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  transition:color .25s;
}

/* State — inactive: fog-of-war dim */
.pm-inactive { opacity:.22; cursor:default }

/* State — available: pulsing invitation */
.pm-available .pm-circle {
  border-color:rgba(251,191,36,.65);
  background:rgba(251,191,36,.1);
  animation:pmPulse 1.9s ease-in-out infinite;
}
.pm-available .pm-lbl { color:rgba(251,191,36,.75) }
.pm-available:hover .pm-circle { transform:scale(1.08) }

/* State — visited: on the lit path */
.pm-visited .pm-circle {
  border-color:rgba(251,191,36,.45);
  background:rgba(251,191,36,.1);
}
.pm-visited .pm-lbl { color:rgba(251,191,36,.65) }
.pm-visited:hover .pm-circle { transform:scale(1.05) }

/* State — selected: current end of path */
.pm-selected .pm-circle {
  border-color:#FBBF24;
  background:rgba(251,191,36,.22);
  box-shadow:0 0 0 5px rgba(251,191,36,.14), 0 0 22px rgba(251,191,36,.35);
  transform:scale(1.06);
}
.pm-selected .pm-lbl { color:#FDE68A; font-size:11px }
.pm-selected:hover .pm-circle { transform:scale(1.1) }

@keyframes pmPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(251,191,36,.0) }
  50%      { box-shadow:0 0 0 9px rgba(251,191,36,.22) }
}

/* ── Edit controls (shown on nodes in edit mode) ─────────────── */
.pm-ctrl {
  position:absolute; top:-8px; right:-14px;
  display:flex; flex-direction:column; gap:4px; z-index:10;
}
.pm-cb {
  width:22px; height:22px; border-radius:50%;
  border:1.5px solid rgba(255,255,255,.25);
  background:#2D2218; color:rgba(255,255,255,.65);
  font-size:9px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:all .15s; line-height:1;
}
.pm-cb-edit:hover { background:#FBBF24; border-color:#FBBF24; color:#1A1410 }
.pm-cb-add:hover  { background:#34D399; border-color:#34D399; color:#fff }
.pm-cb-del:hover  { background:#EF4444; border-color:#EF4444; color:#fff }

/* ── Result panel ────────────────────────────────────────────── */
.pm-result {
  background:linear-gradient(135deg, rgba(251,191,36,.07) 0%, rgba(249,115,22,.05) 100%);
  border:2px solid rgba(251,191,36,.28);
  border-radius:var(--r); padding:24px; text-align:center; margin-bottom:8px;
}
.pm-res-ee    { font-size:44px; margin-bottom:6px }
.pm-res-title { font-family:'Fredoka One',cursive; font-size:18px; color:var(--text); margin-bottom:4px }
.pm-res-name  { font-family:'Fredoka One',cursive; font-size:28px; color:var(--sun-dk); margin-bottom:4px; line-height:1.2 }
.pm-res-notes { font-size:12px; font-weight:700; color:var(--muted); margin-bottom:12px }
.pm-res-tags  { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:16px }
.pm-res-tag   { font-size:11px; font-weight:800; background:rgba(251,191,36,.15); color:#B45309; padding:3px 10px; border-radius:20px }
.pm-res-sub   { font-size:13px; font-weight:700; color:var(--muted); margin-bottom:14px }
.pm-res-acts  { display:flex; gap:10px; justify-content:center }

.pm-res-enter-active { transition:all .3s ease }
.pm-res-enter-from   { opacity:0; transform:translateY(10px) }

/* ── Edit modals (teleported to body) ────────────────────────── */
.pm-modal-bg {
  position:fixed; inset:0; background:rgba(0,0,0,.55);
  display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;
}
.pm-modal {
  background:var(--surface); border-radius:var(--r);
  padding:24px; width:100%; max-width:380px; box-shadow:0 20px 60px rgba(0,0,0,.3);
}
</style>
