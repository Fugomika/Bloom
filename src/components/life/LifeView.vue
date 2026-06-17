<script setup>
import { ref, computed } from 'vue'
import { DB, save } from '../../composables/useStore.js'
import { uid, fmtYM, fmtDateShort, eventDuration } from '../../utils/date.js'
import { MONTHS, EVT_EMOJIS, EVT_COLORS } from '../../utils/constants.js'

// ── State ──────────────────────────────────────────────────
const activeCalId = ref(null)
const selectedYM  = ref(null)
const evtPage     = ref(0)

// Calendar modal
const showCalModal = ref(false)
const editCalId    = ref(null)
const cnName       = ref('')
const cnStart      = ref('')
const cnYears      = ref(80)
const selCalEmoji  = ref('🌻')
const selCalColor  = ref('#34D399')
const showCalEmojiGrid = ref(false)

// Event modal
const showEvtModal = ref(false)
const editEvtId    = ref(null)
const evtTitle     = ref('')
const evtSM = ref(1); const evtSY = ref(new Date().getFullYear())
const evtEM = ref(1); const evtEY = ref(new Date().getFullYear())
const evtOngoing   = ref(false)
const selEvtEmoji  = ref('💕')
const selEvtColor  = ref(EVT_COLORS[0])
const showEvtEmojiGrid = ref(false)

// ── Helpers ────────────────────────────────────────────────
function getCal() { return (DB.lifeCalendars || []).find(c => c.id === activeCalId.value) }

function dotToYM(idx) {
  const cal = getCal(); if (!cal) return ''
  const bd = new Date(cal.startDate)
  const d = new Date(bd.getFullYear(), bd.getMonth() + idx)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function eventsAtYM(ym) {
  const cal = getCal(); if (!cal) return []
  return (cal.events || []).filter(e => e.start <= ym && (!e.end || e.end >= ym))
}

// ── Calendar list ──────────────────────────────────────────
const cals = computed(() => DB.lifeCalendars || [])

function calProgress(cal) {
  const bd = new Date(cal.startDate), now = new Date()
  const lived = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth())
  const total = cal.totalYears * 12
  return Math.min(100, Math.max(0, lived / total * 100)).toFixed(1)
}
function calElapsed(cal) {
  const bd = new Date(cal.startDate), now = new Date()
  const lived = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth())
  const y = Math.max(0, Math.floor(lived / 12)), m = Math.max(0, lived % 12)
  return `${y}yr ${m}mo`
}

function openCalendar(id) { activeCalId.value = id; selectedYM.value = null; evtPage.value = 0 }
function backToList() { activeCalId.value = null; selectedYM.value = null }

// ── Grid view stats ────────────────────────────────────────
const gridStats = computed(() => {
  const cal = getCal(); if (!cal) return null
  const bd = new Date(cal.startDate), now = new Date()
  const livedRaw = (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth())
  const total = cal.totalYears * 12
  const livedD = Math.min(Math.max(0, livedRaw), total)
  return {
    ageY: Math.floor(livedD / 12), ageM: livedD % 12,
    livedD, pct: (livedD / total * 100).toFixed(1),
    remain: Math.max(0, total - livedRaw), livedRaw, total
  }
})

// ── Dot grid ───────────────────────────────────────────────
const dotRows = computed(() => {
  const cal = getCal(); if (!cal || !gridStats.value) return []
  const { livedRaw } = gridStats.value
  const rows = []
  for (let yr = 0; yr < cal.totalYears; yr++) {
    const dots = []
    for (let mo = 0; mo < 12; mo++) {
      const idx = yr * 12 + mo
      const ym = dotToYM(idx)
      const evts = eventsAtYM(ym)
      const top = evts.length ? evts[evts.length - 1] : null
      let cls = 'ldot', st = ''
      if (idx < livedRaw) {
        cls += top ? '' : ' empty-past'
        st = `background:${top ? top.color : 'rgba(0,0,0,0.1)'}`
      } else if (idx === livedRaw && livedRaw < gridStats.value.total) {
        cls += ' current'
        const c = top ? top.color : cal.color || '#FBBF24'
        st = `background:${c};box-shadow:0 0 0 2px #fff,0 0 0 4.5px ${c}`
      } else {
        cls += ' future'
      }
      if (selectedYM.value === ym) cls += ' sel'
      const tip = (evts.length ? evts.map(e => `${e.emoji} ${e.title}`).join(' · ') + ' — ' : '') +
        fmtYM(ym) + (idx === livedRaw ? ' ← now' : '')
      dots.push({ ym, cls, st, tip })
    }
    rows.push({ yr, isDec: yr % 10 === 0, dots })
  }
  return rows
})

function dotClick(ym) {
  selectedYM.value = selectedYM.value === ym ? null : ym
}
function clearSelection() { selectedYM.value = null }

// ── Selected month panel ────────────────────────────────────
const selMonthData = computed(() => {
  if (!selectedYM.value) return null
  const cal = getCal(); if (!cal) return null
  const bd = new Date(cal.startDate)
  const [y, m] = selectedYM.value.split('-').map(Number)
  const months = (y - bd.getFullYear()) * 12 + (m - (bd.getMonth() + 1))
  return {
    label: fmtYM(selectedYM.value),
    age: `${Math.max(0, Math.floor(months / 12))}yr ${Math.max(0, months % 12)}mo into this calendar`,
    evts: eventsAtYM(selectedYM.value)
  }
})

// ── Events list ─────────────────────────────────────────────
const PAGE = 3
const allEvts = computed(() => {
  const cal = getCal(); if (!cal) return []
  return [...(cal.events || [])].sort((a, b) => b.at - a.at)
})
const totalPages = computed(() => Math.max(1, Math.ceil(allEvts.value.length / PAGE)))
const pageEvts = computed(() => {
  const p = Math.min(evtPage.value, totalPages.value - 1)
  return allEvts.value.slice(p * PAGE, (p + 1) * PAGE)
})
function setEvtPage(p) { evtPage.value = p }

function evtBar(ev) {
  const cal = getCal(); if (!cal) return { bl: 0, bw: 1 }
  const bd = new Date(cal.startDate), total = cal.totalYears * 12
  const by = bd.getFullYear(), bm = bd.getMonth() + 1
  const [sy, sm] = ev.start.split('-').map(Number)
  const now = new Date()
  const eYM = ev.end || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [ey, em] = eYM.split('-').map(Number)
  const startOff = Math.max(0, (sy - by) * 12 + (sm - bm))
  const endOff = Math.min(total, (ey - by) * 12 + (em - bm))
  return {
    bl: (startOff / total * 100).toFixed(1),
    bw: Math.max(0.8, ((endOff - startOff) / total * 100)).toFixed(1)
  }
}

// ── Calendar modal ──────────────────────────────────────────
function openCalModal(id = null) {
  editCalId.value = id; showCalEmojiGrid.value = false
  if (id) {
    const cal = (DB.lifeCalendars || []).find(c => c.id === id); if (!cal) return
    cnName.value = cal.name; cnStart.value = cal.startDate.slice(0, 10)
    cnYears.value = cal.totalYears; selCalEmoji.value = cal.emoji; selCalColor.value = cal.color
  } else {
    cnName.value = ''; cnStart.value = ''; cnYears.value = 80
    selCalEmoji.value = '🌻'; selCalColor.value = '#34D399'
  }
  showCalModal.value = true
}
function closeCalModal() { showCalModal.value = false; editCalId.value = null }
function saveCalendar() {
  if (!cnName.value.trim() || !cnStart.value) return
  const totalYears = parseInt(cnYears.value) || 80
  if (!DB.lifeCalendars) DB.lifeCalendars = []
  if (editCalId.value) {
    const cal = DB.lifeCalendars.find(c => c.id === editCalId.value)
    if (cal) { cal.name = cnName.value.trim(); cal.emoji = selCalEmoji.value; cal.color = selCalColor.value; cal.startDate = cnStart.value; cal.totalYears = totalYears }
  } else {
    const nc = { id: uid(), name: cnName.value.trim(), emoji: selCalEmoji.value, color: selCalColor.value, startDate: cnStart.value, totalYears, events: [], createdAt: Date.now() }
    DB.lifeCalendars.push(nc); activeCalId.value = nc.id
  }
  save(); closeCalModal()
}
function delCalendar(id) {
  if (!confirm('Delete this calendar and all its events?')) return
  DB.lifeCalendars = (DB.lifeCalendars || []).filter(c => c.id !== id)
  if (activeCalId.value === id) activeCalId.value = null
  save()
}

// ── Event modal ─────────────────────────────────────────────
function openEvtModal(id = null, prefill = null) {
  const cal = getCal(); if (!cal) return
  editEvtId.value = id; showEvtEmojiGrid.value = false; evtOngoing.value = false
  const now = new Date()
  if (id) {
    const ev = (cal.events || []).find(e => e.id === id); if (!ev) return
    evtTitle.value = ev.title; selEvtEmoji.value = ev.emoji; selEvtColor.value = ev.color
    const [sy, sm] = ev.start.split('-').map(Number)
    evtSY.value = sy; evtSM.value = sm
    evtOngoing.value = !ev.end
    if (ev.end) { const [ey, em] = ev.end.split('-').map(Number); evtEY.value = ey; evtEM.value = em }
    else { evtEY.value = now.getFullYear(); evtEM.value = now.getMonth() + 1 }
  } else {
    evtTitle.value = ''; selEvtEmoji.value = '💕'
    selEvtColor.value = EVT_COLORS[Math.floor(Math.random() * EVT_COLORS.length)]
    if (prefill) { const [py, pm] = prefill.split('-').map(Number); evtSY.value = py; evtSM.value = pm }
    else { evtSY.value = now.getFullYear(); evtSM.value = now.getMonth() + 1 }
    evtEY.value = now.getFullYear(); evtEM.value = now.getMonth() + 1
  }
  showEvtModal.value = true
}
function closeEvtModal() { showEvtModal.value = false; editEvtId.value = null }
function saveEvent() {
  const cal = getCal(); if (!cal) return
  if (!evtTitle.value.trim()) return
  const start = `${evtSY.value}-${String(evtSM.value).padStart(2, '0')}`
  const end = evtOngoing.value ? null : `${evtEY.value}-${String(evtEM.value).padStart(2, '0')}`
  if (!cal.events) cal.events = []
  if (editEvtId.value) {
    const ev = cal.events.find(e => e.id === editEvtId.value)
    if (ev) { ev.title = evtTitle.value.trim(); ev.emoji = selEvtEmoji.value; ev.color = selEvtColor.value; ev.start = start; ev.end = end }
  } else {
    cal.events.push({ id: uid(), title: evtTitle.value.trim(), emoji: selEvtEmoji.value, color: selEvtColor.value, start, end, at: Date.now() })
  }
  save(); closeEvtModal()
}
function delEvent(id) {
  const cal = getCal(); if (!cal) return
  cal.events = (cal.events || []).filter(e => e.id !== id); save()
}
function delEvtFromModal() { if (editEvtId.value) delEvent(editEvtId.value); closeEvtModal() }

// Year range for event modal selects
const calYearRange = computed(() => {
  const cal = getCal(); if (!cal) return []
  const bd = new Date(cal.startDate)
  const start = bd.getFullYear(), end = start + cal.totalYears
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
</script>

<template>
  <div>
    <div class="sec-head"><h1>📅 Life in Months</h1><p>Create time grids for anything — your life, a trip, a career</p></div>

    <!-- CALENDAR LIST -->
    <div v-if="!activeCalId">
      <div style="margin-bottom:20px">
        <button class="btn btn-sun" @click="openCalModal()">＋ New Calendar</button>
      </div>
      <div v-if="!cals.length" class="empty" style="padding:56px 20px">
        <span class="ee">📅</span><h3>No calendars yet</h3><p>Create one to start visualizing your time</p>
      </div>
      <div v-else class="cl-grid">
        <div v-for="cal in cals" :key="cal.id" class="cl-card" @click="openCalendar(cal.id)">
          <div class="cl-head">
            <div class="cl-icon" :style="`background:${cal.color}22`">{{ cal.emoji }}</div>
            <div style="flex:1;min-width:0">
              <div class="cl-name">{{ cal.name }}</div>
              <div class="cl-meta">{{ fmtDateShort(cal.startDate) }} · {{ cal.totalYears }}yr total</div>
            </div>
            <div class="cl-acts" @click.stop>
              <button class="evt-act" @click="openCalModal(cal.id)">✏️</button>
              <button class="evt-act del" @click="delCalendar(cal.id)">🗑️</button>
            </div>
          </div>
          <div class="life-progress-bar" style="margin:10px 0 5px"><div class="life-progress-fill" :style="`width:${calProgress(cal)}%`"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:800;color:var(--muted)">
            <span>{{ calProgress(cal) }}% · {{ calElapsed(cal) }} elapsed</span>
            <span>{{ (cal.events || []).length }} event{{ (cal.events || []).length !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- GRID VIEW -->
    <div v-else-if="getCal()">
      <div class="life-breadcrumb">
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" @click="backToList">← Back</button>
        <div style="font-family:'Fredoka One',cursive;font-size:20px;flex:1">{{ getCal().emoji }} {{ getCal().name }}</div>
        <button class="btn btn-ghost" style="font-size:12px;padding:5px 12px" @click="openCalModal(activeCalId)">✏️ Edit</button>
      </div>

      <div v-if="gridStats" class="life-stat-row">
        <div class="life-stat"><div class="ls-n" style="color:var(--sun-dk)">{{ gridStats.ageY }}<small style="font-size:12px">yr</small> {{ gridStats.ageM }}<small style="font-size:12px">mo</small></div><div class="ls-l">Elapsed</div></div>
        <div class="life-stat"><div class="ls-n" style="color:var(--leaf-dk)">{{ gridStats.livedD.toLocaleString() }}</div><div class="ls-l">Months In</div></div>
        <div class="life-stat"><div class="ls-n" style="color:var(--coral)">{{ gridStats.pct }}%</div><div class="ls-l">Completed</div></div>
        <div class="life-stat"><div class="ls-n" style="color:#818CF8">{{ gridStats.remain.toLocaleString() }}</div><div class="ls-l">Ahead</div></div>
      </div>
      <div class="life-progress-bar"><div class="life-progress-fill" :style="`width:${gridStats?.pct}%`"></div></div>

      <div class="life-two-col">
        <!-- Grid card -->
        <div class="card life-grid-card">
          <div class="life-hdr-row">
            <div class="life-yr-lbl"></div>
            <div class="life-month-hdrs">
              <div v-for="(m, i) in ['J','F','M','A','M','J','J','A','S','O','N','D']" :key="i" class="life-mhdr">{{ m }}</div>
            </div>
          </div>
          <div class="life-grid">
            <div v-for="row in dotRows" :key="row.yr" class="life-row" :class="{ decade: row.isDec }">
              <div class="life-yr">{{ row.yr }}</div>
              <div class="life-months">
                <div v-for="dot in row.dots" :key="dot.ym"
                  :class="dot.cls" :style="dot.st" :title="dot.tip"
                  @click="dotClick(dot.ym)"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Events card -->
        <div class="card life-events-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div class="widget-title" style="margin-bottom:0">🎯 Events</div>
            <button class="btn btn-sun" style="padding:6px 13px;font-size:12px" @click="openEvtModal()">＋ Add</button>
          </div>

          <!-- Selected month panel -->
          <div v-if="selectedYM && selMonthData" class="life-sel-wrap">
            <div class="life-sel-hd">
              <div>
                <div class="life-sel-date">{{ selMonthData.label }}</div>
                <div class="life-sel-age">{{ selMonthData.age }}</div>
              </div>
              <button class="life-sel-x" @click="clearSelection">✕ close</button>
            </div>
            <div v-if="!selMonthData.evts.length">
              <div style="color:var(--muted);font-size:13px;font-weight:700;margin-bottom:10px">Nothing here yet.</div>
              <button class="btn btn-sun" style="font-size:12px;padding:6px 12px;width:100%" @click="openEvtModal(null, selectedYM)">＋ Add event at this month</button>
            </div>
            <div v-else>
              <div v-for="ev in selMonthData.evts" :key="ev.id"
                class="life-sel-evt" :style="`background:${ev.color}18;border-left-color:${ev.color}`"
                @click="openEvtModal(ev.id)"
              >
                <span style="font-size:18px">{{ ev.emoji }}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;font-size:13px">{{ ev.title }}</div>
                  <div style="font-size:11px;color:var(--muted);font-weight:700">{{ fmtYM(ev.start) }} → {{ ev.end ? fmtYM(ev.end) : 'Present' }} · {{ eventDuration(ev) }}</div>
                </div>
                <span style="font-size:12px;color:var(--muted)">✏️</span>
              </div>
              <button class="btn btn-ghost" style="font-size:11px;padding:5px 10px;margin-top:8px;width:100%" @click="openEvtModal(null, selectedYM)">＋ Add another here</button>
            </div>
            <div style="border-top:1px solid var(--border);margin:14px 0"></div>
          </div>

          <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px">All Events</div>

          <div v-if="!allEvts.length" style="color:var(--muted);font-size:13px;font-weight:700;padding:6px 0">No events yet — click any dot!</div>
          <div v-else>
            <div v-for="ev in pageEvts" :key="ev.id" class="evt-card" :style="`--ec:${ev.color}`">
              <div class="evt-emoji">{{ ev.emoji }}</div>
              <div class="evt-info">
                <div class="evt-title">{{ ev.title }}</div>
                <div class="evt-meta">{{ fmtYM(ev.start) }} → {{ ev.end ? fmtYM(ev.end) : 'Present' }}<span class="evt-dur">{{ eventDuration(ev) }}</span></div>
                <div class="evt-bar-bg">
                  <div class="evt-bar-fill" :style="`left:${evtBar(ev).bl}%;width:${evtBar(ev).bw}%;background:${ev.color}`"></div>
                </div>
              </div>
              <div class="evt-acts">
                <button class="evt-act" @click="openEvtModal(ev.id)">✏️</button>
                <button class="evt-act del" @click="delEvent(ev.id)">🗑️</button>
              </div>
            </div>
            <div v-if="totalPages > 1" class="evt-pg">
              <button class="pg-btn" :disabled="evtPage === 0" @click="setEvtPage(evtPage - 1)">← Prev</button>
              <span class="pg-info">{{ evtPage + 1 }} of {{ totalPages }}</span>
              <button class="pg-btn" :disabled="evtPage >= totalPages - 1" @click="setEvtPage(evtPage + 1)">Next →</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CALENDAR MODAL -->
    <div class="overlay" :class="{ open: showCalModal }" @click.self="closeCalModal">
      <div class="modal" style="max-width:500px">
        <div class="modal-head">{{ editCalId ? 'Edit Calendar ✏️' : 'New Calendar 📅' }}</div>
        <div class="form-row" style="margin-bottom:10px;align-items:flex-start">
          <div class="fg" style="flex:2"><label>Calendar Name</label><input type="text" v-model="cnName" placeholder="e.g. My Life, World Trip, Workplace…"/></div>
          <div class="fg" style="max-width:80px">
            <label>Emoji</label>
            <div style="font-size:26px;cursor:pointer;padding:6px;background:var(--bg);border-radius:var(--r-sm);text-align:center;border:2px solid rgba(0,0,0,.09)" @click="showCalEmojiGrid = !showCalEmojiGrid">{{ selCalEmoji }}</div>
          </div>
        </div>
        <div v-if="showCalEmojiGrid" class="eemoji-grid" style="margin-bottom:10px">
          <div v-for="e in EVT_EMOJIS" :key="e" class="eemoji" :class="{ on: selCalEmoji === e }" @click="selCalEmoji = e; showCalEmojiGrid = false">{{ e }}</div>
        </div>
        <div class="fg" style="margin-bottom:12px">
          <label>Color</label>
          <div class="ecol-row">
            <div v-for="c in EVT_COLORS" :key="c" class="ecswatch" :class="{ on: selCalColor === c }" :style="`background:${c}`" @click="selCalColor = c"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="fg"><label>Start Date</label><input type="date" v-model="cnStart"/></div>
          <div class="fg"><label>Duration (years)</label><input type="number" v-model="cnYears" min="1" max="200" step="1"/></div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeCalModal">Cancel</button>
          <button v-if="editCalId" class="btn btn-ghost" style="color:#DC2626" @click="delCalendar(editCalId); closeCalModal()">🗑️ Delete</button>
          <button class="btn btn-sun" @click="saveCalendar">Save</button>
        </div>
      </div>
    </div>

    <!-- EVENT MODAL -->
    <div class="overlay" :class="{ open: showEvtModal }" @click.self="closeEvtModal">
      <div class="modal" style="max-width:560px">
        <div class="modal-head">{{ editEvtId ? 'Edit Event ✏️' : 'Add Event 🎯' }}</div>
        <div class="form-row" style="margin-bottom:10px;align-items:flex-start">
          <div class="fg" style="flex:2"><label>Title</label><input type="text" v-model="evtTitle" placeholder="e.g. Relationship with Sarah, CS Degree…" @keydown.enter="saveEvent"/></div>
          <div class="fg" style="max-width:80px">
            <label>Emoji</label>
            <div style="font-size:26px;cursor:pointer;padding:6px;background:var(--bg);border-radius:var(--r-sm);text-align:center;border:2px solid rgba(0,0,0,.09)" @click="showEvtEmojiGrid = !showEvtEmojiGrid">{{ selEvtEmoji }}</div>
          </div>
        </div>
        <div v-if="showEvtEmojiGrid" class="eemoji-grid" style="margin-bottom:10px">
          <div v-for="e in EVT_EMOJIS" :key="e" class="eemoji" :class="{ on: selEvtEmoji === e }" @click="selEvtEmoji = e; showEvtEmojiGrid = false">{{ e }}</div>
        </div>
        <div class="fg" style="margin-bottom:12px">
          <label>Color</label>
          <div class="ecol-row">
            <div v-for="c in EVT_COLORS" :key="c" class="ecswatch" :class="{ on: selEvtColor === c }" :style="`background:${c}`" @click="selEvtColor = c"></div>
          </div>
        </div>
        <div class="form-row">
          <div class="fg">
            <label>Start</label>
            <div style="display:flex;gap:7px">
              <select v-model="evtSM" style="flex:1">
                <option v-for="(m, i) in MONTHS" :key="i" :value="i+1">{{ m }}</option>
              </select>
              <select v-model="evtSY" style="flex:1">
                <option v-for="y in calYearRange" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>
          <div class="fg">
            <label>End <span v-if="evtOngoing" style="color:var(--leaf);font-weight:800">· Ongoing</span></label>
            <div style="display:flex;gap:7px">
              <select v-model="evtEM" :disabled="evtOngoing" :style="evtOngoing ? 'opacity:.35;flex:1' : 'flex:1'">
                <option v-for="(m, i) in MONTHS" :key="i" :value="i+1">{{ m }}</option>
              </select>
              <select v-model="evtEY" :disabled="evtOngoing" :style="evtOngoing ? 'opacity:.35;flex:1' : 'flex:1'">
                <option v-for="y in calYearRange" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
            <label style="display:flex;align-items:center;gap:7px;margin-top:8px;cursor:pointer;font-size:12px;font-weight:800;color:var(--muted)">
              <input type="checkbox" v-model="evtOngoing"> Still happening / ongoing
            </label>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeEvtModal">Cancel</button>
          <button v-if="editEvtId" class="btn btn-ghost" style="color:#DC2626" @click="delEvtFromModal">🗑️ Delete</button>
          <button class="btn btn-sun" @click="saveEvent">Save Event</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Calendar list */
.cl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(256px,1fr)); gap:14px; margin-bottom:20px }
.cl-card { background:var(--surface); border-radius:var(--r); padding:18px; box-shadow:var(--sh); cursor:pointer; border:2px solid transparent; transition:all .2s; animation:fadeUp .22s ease }
.cl-card:hover { border-color:var(--sun-lt); transform:translateY(-3px); box-shadow:var(--sh-md) }
.cl-head { display:flex; align-items:flex-start; gap:12px; margin-bottom:8px }
.cl-icon { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0 }
.cl-name { font-family:'Fredoka One',cursive; font-size:17px }
.cl-meta { font-size:11px; font-weight:800; color:var(--muted); margin-top:2px }
.cl-acts { margin-left:auto; display:flex; gap:3px; flex-shrink:0 }
.evt-act { border:none; background:none; cursor:pointer; font-size:13px; padding:4px 6px; border-radius:6px; color:var(--muted); transition:all .15s }
.evt-act:hover { background:rgba(0,0,0,.08); color:var(--text) }
.evt-act.del:hover { background:#FEE2E2; color:#DC2626 }

/* Progress */
.life-progress-bar { height:6px; border-radius:3px; background:rgba(0,0,0,.07); margin-bottom:18px; overflow:hidden }
.life-progress-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#34D399,#FBBF24,#F97316,#EF4444,#818CF8); transition:width .8s ease }

/* Breadcrumb */
.life-breadcrumb { display:flex; align-items:center; gap:10px; margin-bottom:20px; flex-wrap:wrap }

/* Stats */
.life-stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px }
.life-stat { background:var(--surface); border-radius:var(--r); padding:16px 12px; text-align:center; box-shadow:var(--sh); transition:transform .2s }
.life-stat:hover { transform:translateY(-3px) }
.life-stat .ls-n { font-family:'Fredoka One',cursive; font-size:22px; line-height:1.2 }
.life-stat .ls-l { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-top:3px }

/* Two-column layout */
.life-two-col { display:grid; grid-template-columns:max-content 1fr; gap:16px; align-items:start }
.life-grid-card { overflow-x:auto }
@media(min-width:861px) { .life-events-card { position:sticky; top:16px; max-height:calc(100vh - 80px); overflow-y:auto } }
@media(max-width:860px) {
  .life-two-col { grid-template-columns:1fr }
  .life-grid-card { display:flex; flex-direction:column; align-items:center }
}

/* Grid */
.life-hdr-row { display:flex; align-items:center; margin-bottom:6px }
.life-yr-lbl { width:30px; flex-shrink:0 }
.life-mhdr { width:10px; font-size:7px; font-weight:900; color:var(--muted); text-align:center; flex-shrink:0 }
.life-grid { display:flex; flex-direction:column; gap:2px }
.life-row { display:flex; align-items:center }
.life-row.decade { margin-top:8px }
.life-yr { width:30px; font-size:9px; font-weight:900; color:rgba(0,0,0,.2); text-align:right; padding-right:8px; flex-shrink:0; line-height:1 }
.life-row.decade .life-yr { color:var(--text); font-size:10px }
.life-month-hdrs { display:flex; gap:2px }
.life-months { display:flex; gap:2px }
.ldot { width:10px; height:10px; border-radius:50%; flex-shrink:0; cursor:pointer; transition:transform .15s }
.ldot:hover { transform:scale(1.65); z-index:2; position:relative }
.ldot.future { background:rgba(0,0,0,.06) }
.ldot.empty-past { background:rgba(0,0,0,.1) }
.ldot.current { z-index:2; position:relative; animation:ldotPulse 2s ease-in-out infinite }
.ldot.sel { outline:2.5px solid var(--sun); outline-offset:2px; z-index:3; position:relative }
@media(min-width:601px) {
  .ldot { width:12px; height:12px }
  .life-month-hdrs { gap:3px }
  .life-months { gap:3px }
  .life-mhdr { width:12px; font-size:8px }
  .life-grid { gap:3px }
  .life-row.decade { margin-top:11px }
}
@media(max-width:600px) {
  .life-stat-row { grid-template-columns:1fr 1fr }
  .life-grid-card { padding:14px 10px }
}

/* Events */
.evt-card { display:flex; align-items:flex-start; gap:12px; padding:11px 14px; background:var(--bg); border-radius:var(--r-sm); border-left:4px solid var(--ec,#FBBF24); transition:all .18s; animation:fadeUp .22s ease; margin-bottom:12px }
.evt-card:hover { transform:translateX(2px) }
.evt-emoji { font-size:20px; flex-shrink:0; line-height:1; padding-top:1px }
.evt-info { flex:1; min-width:0 }
.evt-title { font-weight:800; font-size:13px }
.evt-meta { font-size:11px; font-weight:700; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:5px; flex-wrap:wrap }
.evt-dur { font-size:10px; font-weight:900; padding:1px 7px; border-radius:9px; background:rgba(0,0,0,.07) }
.evt-bar-bg { height:4px; background:rgba(0,0,0,.07); border-radius:3px; position:relative; margin-top:7px; overflow:hidden }
.evt-bar-fill { position:absolute; top:0; bottom:0; border-radius:3px; min-width:4px }
.evt-acts { display:flex; gap:3px; flex-shrink:0 }
.evt-pg { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border) }
.pg-btn { border:none; background:rgba(0,0,0,.06); cursor:pointer; font-family:'Nunito',sans-serif; font-weight:900; font-size:12px; padding:6px 18px; border-radius:8px; transition:all .15s; color:var(--text) }
.pg-btn:hover:not(:disabled) { background:var(--sun-lt); color:var(--sun-dk) }
.pg-btn:disabled { opacity:.3; cursor:default }
.pg-info { font-size:12px; font-weight:800; color:var(--muted) }

/* Selected month panel */
.life-sel-wrap { background:var(--bg); border-radius:var(--r-sm); padding:13px 14px; margin-bottom:4px; border:2px solid var(--sun-lt) }
.life-sel-hd { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px }
.life-sel-date { font-family:'Fredoka One',cursive; font-size:18px }
.life-sel-age { font-size:11px; font-weight:800; color:var(--muted); margin-top:2px }
.life-sel-x { border:none; background:rgba(0,0,0,.08); border-radius:6px; cursor:pointer; font-size:12px; padding:3px 8px; color:var(--muted); font-family:'Nunito',sans-serif; font-weight:900; transition:background .15s }
.life-sel-x:hover { background:rgba(0,0,0,.14) }
.life-sel-evt { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:var(--r-xs); cursor:pointer; transition:all .15s; margin-bottom:5px; border-left:3px solid transparent }
.life-sel-evt:hover { transform:translateX(2px); filter:brightness(.97) }

/* Emoji/color pickers (modal) */
.eemoji-grid { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; max-height:86px; overflow-y:auto }
.eemoji { width:32px; height:32px; border-radius:7px; border:2px solid transparent; background:var(--bg); font-size:16px; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center }
.eemoji:hover, .eemoji.on { border-color:var(--sun); background:var(--sun-lt) }
.ecol-row { display:flex; flex-wrap:wrap; gap:7px; margin-top:5px }
.ecswatch { width:26px; height:26px; border-radius:50%; border:3px solid transparent; cursor:pointer; transition:transform .18s }
.ecswatch.on, .ecswatch:hover { transform:scale(1.25); border-color:var(--text) }
</style>
