<script setup>
import { ref, computed } from 'vue'
import { DB, upsertNote, deleteNote } from '../../composables/useStore.js'
import { uid } from '../../utils/date.js'
import { NOTE_COLORS, MONTHS } from '../../utils/constants.js'

const showModal = ref(false)
const editId = ref(null)
const nTitle = ref('')
const nContent = ref('')
const selColor = ref(NOTE_COLORS[0])
const modalHead = ref('New Note 📝')

const sorted = computed(() => [...DB.notes].sort((a, b) => b.at - a.at))

function openModal(id = null) {
  editId.value = id
  if (id) {
    const n = DB.notes.find(x => x.id === id)
    modalHead.value = 'Edit Note ✏️'
    nTitle.value = n.title; nContent.value = n.body; selColor.value = n.color
  } else {
    modalHead.value = 'New Note 📝'
    nTitle.value = ''; nContent.value = ''; selColor.value = NOTE_COLORS[0]
  }
  showModal.value = true
}
function closeModal() { showModal.value = false; editId.value = null }
function saveNote() {
  const title = nTitle.value.trim() || 'Untitled', body = nContent.value.trim()
  if (!body && title === 'Untitled') { closeModal(); return }
  if (editId.value) {
    const n = DB.notes.find(x => x.id === editId.value)
    if (n) upsertNote({ ...n, title, body, color: selColor.value, at: Date.now() })
  } else {
    upsertNote({ id: uid(), title, body, color: selColor.value, at: Date.now() })
  }
  closeModal()
}
function delNote(id, e) { e.stopPropagation(); deleteNote(id) }
function noteDate(n) { const d = new Date(n.at); return `${MONTHS[d.getMonth()]} ${d.getDate()}` }
</script>

<template>
  <div>
    <div class="sec-head"><h1>📝 My Notes</h1><p>Capture every thought</p></div>
    <div style="margin-bottom:18px"><button class="btn btn-sun" @click="openModal()">＋ New Note</button></div>

    <div class="notes-grid">
      <template v-if="sorted.length">
        <div v-for="n in sorted" :key="n.id" class="note-card" :style="`background:${n.color}`" @click="openModal(n.id)">
          <button class="note-del" @click="delNote(n.id, $event)">✕</button>
          <h3>{{ n.title }}</h3>
          <p>{{ n.body }}</p>
          <span class="note-ts">{{ noteDate(n) }}</span>
        </div>
      </template>
      <div v-else class="empty" style="grid-column:1/-1">
        <span class="ee">📝</span><h3>No notes yet</h3><p>Tap "+ New Note" to capture your first thought</p>
      </div>
    </div>

    <!-- Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal"
      @keydown="e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveNote() }">
      <div class="modal">
        <div class="modal-head">{{ modalHead }}</div>
        <div class="fg" style="margin-bottom:10px"><label>Title</label><input type="text" v-model="nTitle" placeholder="Give it a name…"/></div>
        <div class="csrow" style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap">
          <div v-for="c in NOTE_COLORS" :key="c" class="cs" :class="{ on: selColor === c }" :style="`background:${c}`" @click="selColor = c"></div>
        </div>
        <div class="fg"><label>Content</label><textarea v-model="nContent" placeholder="Write your thoughts… 💭"></textarea></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Cancel</button>
          <button class="btn btn-sun" @click="saveNote">Save ✨</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notes-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(236px,1fr)); gap:12px }
.note-card { border-radius:var(--r); padding:18px; cursor:pointer; position:relative; min-height:148px; transition:all .2s; animation:fadeUp .22s ease }
.note-card:hover { transform:translateY(-5px) rotate(.4deg); box-shadow:var(--sh-lg) }
.note-card h3 { font-family:'Fredoka One',cursive; font-size:16px; margin-bottom:7px }
.note-card p { font-size:13px; font-weight:600; opacity:.7; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; line-height:1.55; white-space:pre-line }
.note-ts { position:absolute; bottom:11px; right:12px; font-size:10px; font-weight:800; opacity:.45 }
.note-del { position:absolute; top:9px; right:9px; width:24px; height:24px; border-radius:7px; border:none; cursor:pointer; opacity:0; transition:opacity .15s; background:rgba(0,0,0,.1); font-size:10px; display:flex; align-items:center; justify-content:center }
.note-card:hover .note-del { opacity:1 }
.note-del:hover { background:rgba(220,38,38,.18) }
.cs { width:27px; height:27px; border-radius:50%; border:3px solid transparent; cursor:pointer; transition:transform .18s }
.cs:hover, .cs.on { transform:scale(1.22); border-color:var(--text) }
</style>
