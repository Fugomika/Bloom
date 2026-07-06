<script setup>
import { ref, computed } from 'vue'
import { DB, addTransaction, updateTransaction, deleteTransaction, saveSettings } from '../../composables/useStore.js'
import { uid, today, thisYM, fmtDate, fmtIDR } from '../../utils/date.js'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/constants.js'
import AppIcon from '../ui/AppIcon.vue'

const ALL_CATS = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]
function catInfo(key) {
  return ALL_CATS.find(c => c.key === key) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

// ── Stats ──────────────────────────────────────────────────────
const ym = computed(() => thisYM())
const txThisMonth = computed(() => DB.finance.filter(t => t.date.slice(0, 7) === ym.value))
const incomeMonth  = computed(() => txThisMonth.value.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
const expenseMonth = computed(() => txThisMonth.value.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
const balance = computed(() => DB.finance.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0))

// ── List + filter ──────────────────────────────────────────────
const tFilter = ref('all')

const filtered = computed(() => {
  const list = tFilter.value === 'all' ? DB.finance : DB.finance.filter(t => t.type === tFilter.value)
  return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)
})

const grouped = computed(() => {
  const g = {}
  for (const t of filtered.value) {
    if (!g[t.date]) g[t.date] = []
    g[t.date].push(t)
  }
  return Object.entries(g)
})

function dayTotal(txs) {
  return txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
}

// ── Category breakdown (this month, expense) ──────────────────
const categoryBreakdown = computed(() => {
  const map = {}
  for (const t of txThisMonth.value.filter(t => t.type === 'expense')) {
    map[t.category] = (map[t.category] || 0) + t.amount
  }
  return Object.entries(map)
    .map(([key, amount]) => ({ ...catInfo(key), amount }))
    .sort((a, b) => b.amount - a.amount)
})
const maxCategoryAmount = computed(() => Math.max(1, ...categoryBreakdown.value.map(c => c.amount)))

// ── Budgets ────────────────────────────────────────────────────
const budgetProgress = computed(() =>
  EXPENSE_CATEGORIES
    .map(c => {
      const limit = DB.settings.financeBudgets[c.key] || 0
      const spent = txThisMonth.value
        .filter(t => t.type === 'expense' && t.category === c.key)
        .reduce((s, t) => s + t.amount, 0)
      return { ...c, limit, spent, pct: limit ? Math.min(spent / limit, 1) : 0 }
    })
    .filter(c => c.limit > 0)
)

const showBudgetModal = ref(false)
const budgetDraft = ref({})

function openBudgetModal() {
  budgetDraft.value = Object.fromEntries(
    EXPENSE_CATEGORIES.map(c => [c.key, DB.settings.financeBudgets[c.key] || ''])
  )
  showBudgetModal.value = true
}

function saveBudgets() {
  const cleaned = {}
  for (const [k, v] of Object.entries(budgetDraft.value)) {
    const n = parseFloat(v)
    if (n > 0) cleaned[k] = n
  }
  saveSettings({ financeBudgets: cleaned })
  showBudgetModal.value = false
}

// ── Add / edit transaction modal ─────────────────────────────
const showModal = ref(false)
const editId    = ref(null)
const fType     = ref('expense')
const fAmount   = ref('')
const fCategory = ref('food')
const fDate     = ref(today())
const fNote     = ref('')

const availableCats = computed(() => fType.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

function switchType(type) {
  fType.value = type
  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  if (!cats.find(c => c.key === fCategory.value)) fCategory.value = cats[0].key
}

function openAdd(type = 'expense') {
  editId.value = null
  fType.value = type
  fAmount.value = ''
  fCategory.value = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0].key
  fDate.value = today()
  fNote.value = ''
  showModal.value = true
}

function openEdit(t) {
  editId.value = t.id
  fType.value = t.type
  fAmount.value = String(t.amount)
  fCategory.value = t.category
  fDate.value = t.date
  fNote.value = t.note || ''
  showModal.value = true
}

function closeModal() { showModal.value = false; editId.value = null }

function save() {
  const amount = parseFloat(fAmount.value)
  if (!amount || amount <= 0) return
  const payload = { type: fType.value, amount, category: fCategory.value, date: fDate.value, note: fNote.value.trim() }
  if (editId.value) {
    updateTransaction(editId.value, payload)
  } else {
    addTransaction({ id: uid(), ...payload, at: Date.now() })
  }
  closeModal()
}

// ── Inline delete confirm ──────────────────────────────────────
const deleteConfirmId = ref(null)
function confirmDelete(id) { deleteConfirmId.value = id }
function cancelDelete()    { deleteConfirmId.value = null }
function executeDelete(id) { deleteTransaction(id); deleteConfirmId.value = null }

const EMPTY_MSG = {
  all:     { ee: '💰', h: 'Belum ada transaksi', p: 'Tambahin pemasukan atau pengeluaran pertama kamu!' },
  income:  { ee: '💵', h: 'Belum ada pemasukan',  p: 'Catat gaji, bonus, atau pemasukan lainnya di sini.' },
  expense: { ee: '🧾', h: 'Belum ada pengeluaran', p: 'Catat pengeluaran biar kamu tetap on track!' },
}
</script>

<template>
  <div>
    <div class="sec-head">
      <h1>Finance</h1>
      <p>Lacak pemasukan, pengeluaran, dan budget bulanan kamu</p>
    </div>

    <!-- Stats -->
    <div class="fin-stats">
      <div class="fin-stat" :class="balance >= 0 ? 'fs-pos' : 'fs-neg'">
        <span class="fs-ee"><AppIcon name="wallet" :size="22" /></span>
        <span class="fs-n">{{ fmtIDR(balance) }}</span>
        <div class="fs-l">saldo total</div>
      </div>
      <div class="fin-stat fs-income">
        <span class="fs-ee"><AppIcon name="trend-up" :size="22" /></span>
        <span class="fs-n">{{ fmtIDR(incomeMonth) }}</span>
        <div class="fs-l">pemasukan bulan ini</div>
      </div>
      <div class="fin-stat fs-expense">
        <span class="fs-ee"><AppIcon name="trend-down" :size="22" /></span>
        <span class="fs-n">{{ fmtIDR(expenseMonth) }}</span>
        <div class="fs-l">pengeluaran bulan ini</div>
      </div>
    </div>

    <div class="fin-top-row">
      <button class="btn btn-leaf" @click="openAdd('income')">＋ Pemasukan</button>
      <button class="btn btn-red"  @click="openAdd('expense')">＋ Pengeluaran</button>
      <button class="btn btn-ghost fin-budget-btn" @click="openBudgetModal"><AppIcon name="target" :size="14" /> Atur Budget</button>
    </div>

    <div class="fin-grid">
      <!-- Left: transaction list -->
      <div class="fin-col-main">
        <div class="ftabs">
          <button class="ftab" :class="{ active: tFilter === 'all' }"     @click="tFilter = 'all'">Semua</button>
          <button class="ftab" :class="{ active: tFilter === 'income' }"  @click="tFilter = 'income'">Pemasukan</button>
          <button class="ftab" :class="{ active: tFilter === 'expense' }" @click="tFilter = 'expense'">Pengeluaran</button>
        </div>

        <div v-if="!filtered.length" class="empty">
          <span class="ee">{{ EMPTY_MSG[tFilter].ee }}</span>
          <h3>{{ EMPTY_MSG[tFilter].h }}</h3>
          <p>{{ EMPTY_MSG[tFilter].p }}</p>
        </div>

        <div v-else class="fin-list">
          <div v-for="[date, txs] in grouped" :key="date" class="fin-day-group">
            <div class="fin-day-head">
              <span>{{ fmtDate(date) }}</span>
              <span :class="dayTotal(txs) >= 0 ? 'fs-pos-text' : 'fs-neg-text'">
                {{ dayTotal(txs) >= 0 ? '+' : '' }}{{ fmtIDR(dayTotal(txs)) }}
              </span>
            </div>

            <div v-for="t in txs" :key="t.id" class="fin-item">
              <div class="fin-icon" :style="`background:${catInfo(t.category).color}22;color:${catInfo(t.category).color}`">
                {{ catInfo(t.category).icon }}
              </div>
              <div class="fin-body" @click="openEdit(t)">
                <div class="fin-cat">{{ catInfo(t.category).label }}</div>
                <div v-if="t.note" class="fin-note">{{ t.note }}</div>
              </div>
              <div class="fin-amount" :class="t.type === 'income' ? 'fs-pos-text' : 'fs-neg-text'">
                {{ t.type === 'income' ? '+' : '-' }}{{ fmtIDR(t.amount) }}
              </div>

              <template v-if="deleteConfirmId === t.id">
                <div class="fin-confirm">
                  <button class="fin-confirm-yes" @click.stop="executeDelete(t.id)">Hapus</button>
                  <button class="fin-confirm-no"  @click.stop="cancelDelete()">Batal</button>
                </div>
              </template>
              <button v-else class="fin-del" @click.stop="confirmDelete(t.id)">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: breakdown + budgets -->
      <div class="fin-col-side">
        <div class="card">
          <div class="widget-title">Kategori Bulan Ini</div>
          <div v-if="categoryBreakdown.length" class="fin-cat-bars">
            <div v-for="c in categoryBreakdown" :key="c.key" class="fin-cat-bar-row">
              <div class="fin-cat-bar-lbl">
                <span>{{ c.icon }} {{ c.label }}</span>
                <span>{{ fmtIDR(c.amount) }}</span>
              </div>
              <div class="fin-cat-bar-track">
                <div class="fin-cat-bar-fill" :style="`width:${(c.amount / maxCategoryAmount) * 100}%;background:${c.color}`"></div>
              </div>
            </div>
          </div>
          <div v-else class="fin-empty-mini">Belum ada pengeluaran bulan ini</div>
        </div>

        <div v-if="budgetProgress.length" class="card" style="margin-top:14px">
          <div class="widget-title">Budget Bulanan</div>
          <div class="fin-budget-list">
            <div v-for="b in budgetProgress" :key="b.key" class="fin-budget-row">
              <div class="fin-cat-bar-lbl">
                <span>{{ b.icon }} {{ b.label }}</span>
                <span :class="{ 'fs-neg-text': b.spent > b.limit }">{{ fmtIDR(b.spent) }} / {{ fmtIDR(b.limit) }}</span>
              </div>
              <div class="fin-cat-bar-track">
                <div class="fin-cat-bar-fill" :style="`width:${b.pct * 100}%;background:${b.spent > b.limit ? '#EF4444' : b.color}`"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Transaction Modal -->
    <div class="overlay" :class="{ open: showModal }" @click.self="closeModal"
      @keydown="e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save() }">
      <div class="modal">
        <div class="modal-head">{{ editId ? 'Edit Transaksi' : (fType === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran') }}</div>

        <div class="fin-seg-row">
          <button class="fin-seg fin-seg-income" :class="{ on: fType === 'income' }" @click="switchType('income')">Pemasukan</button>
          <button class="fin-seg fin-seg-expense" :class="{ on: fType === 'expense' }" @click="switchType('expense')">Pengeluaran</button>
        </div>

        <div class="form-row">
          <div class="fg">
            <label>Jumlah (Rp)</label>
            <input type="number" v-model="fAmount" placeholder="50000" min="0" @keydown.enter="save" />
          </div>
          <div class="fg">
            <label>Tanggal</label>
            <input type="date" v-model="fDate" />
          </div>
        </div>

        <div class="fin-cat-label">Kategori</div>
        <div class="fin-cat-grid">
          <button
            v-for="c in availableCats" :key="c.key"
            class="fin-cat-card" :class="{ on: fCategory === c.key }"
            :style="fCategory === c.key ? `border-color:${c.color};background:${c.color}18;color:${c.color}` : ''"
            @click="fCategory = c.key"
          >
            <span class="fin-cat-card-icon">{{ c.icon }}</span>
            <span>{{ c.label }}</span>
          </button>
        </div>

        <div class="fg" style="margin-bottom:4px">
          <label>Catatan (opsional)</label>
          <input type="text" v-model="fNote" placeholder="Misal: makan siang sama teman…" @keydown.enter="save" />
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="closeModal">Batal</button>
          <button class="btn" :class="fType === 'income' ? 'btn-leaf' : 'btn-red'" @click="save">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Budget Modal -->
    <div class="overlay" :class="{ open: showBudgetModal }" @click.self="showBudgetModal = false">
      <div class="modal">
        <div class="modal-head">Atur Budget Bulanan</div>
        <p class="fin-budget-sub">Set limit per kategori — kosongkan untuk mematikan budget kategori itu.</p>

        <div class="fin-budget-form">
          <div v-for="c in EXPENSE_CATEGORIES" :key="c.key" class="fin-budget-form-row">
            <span class="fin-budget-form-lbl">{{ c.icon }} {{ c.label }}</span>
            <input type="number" v-model="budgetDraft[c.key]" placeholder="0" min="0" />
          </div>
        </div>

        <div class="modal-foot">
          <button class="btn btn-ghost" @click="showBudgetModal = false">Batal</button>
          <button class="btn btn-sun" @click="saveBudgets">Simpan</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Stats ───────────────────────────────────────────────────── */
.fin-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:18px }
.fin-stat { border-radius:var(--r); padding:20px 18px; color:#fff; position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s }
.fin-stat:hover { transform:translateY(-4px); box-shadow:var(--sh-md) }
.fin-stat.fs-pos, .fin-stat.fs-income { background:linear-gradient(135deg,#22C55E,#15803D) }
.fin-stat.fs-neg { background:linear-gradient(135deg,#EF4444,#DC2626) }
.fin-stat.fs-expense { background:linear-gradient(135deg,#F97316,#DC2626) }
.fs-ee { display:flex; margin-bottom:7px }
.fs-n  { font-family:'Fredoka One',cursive; font-size:22px; line-height:1; display:block; word-break:break-word }
.fs-l  { font-size:10px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; opacity:.85; margin-top:4px }

.fs-pos-text { color:var(--leaf-dk); font-weight:900 }
.fs-neg-text { color:#DC2626; font-weight:900 }

/* ── Top row ─────────────────────────────────────────────────── */
.fin-top-row { display:flex; gap:10px; align-items:center; margin-bottom:18px; flex-wrap:wrap }
.fin-budget-btn { margin-left:auto }

/* ── Layout ──────────────────────────────────────────────────── */
.fin-grid { display:grid; grid-template-columns:1.6fr 1fr; gap:18px; align-items:start }
/* fr tracks default to minmax(auto,…): without min-width:0 the nowrap
   note text sets the column's minimum and forces horizontal scroll on mobile */
.fin-col-main, .fin-col-side { min-width:0 }

/* ── Transaction list ────────────────────────────────────────── */
.fin-list { display:flex; flex-direction:column; gap:18px }
.fin-day-group { display:flex; flex-direction:column; gap:8px }
.fin-day-head { display:flex; align-items:center; justify-content:space-between; font-family:'Fredoka One',cursive; font-size:13px; color:var(--muted); padding:0 2px }

.fin-item {
  display:flex; align-items:center; gap:12px;
  background:var(--surface); border-radius:var(--r-sm); padding:11px 14px;
  box-shadow:var(--sh); transition:all .18s; animation:fadeUp .2s ease; position:relative;
}
.fin-item:hover { transform:translateX(2px) }

.fin-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0 }
.fin-body { flex:1; min-width:0; cursor:pointer }
.fin-cat  { font-weight:800; font-size:13px }
.fin-note { font-size:11px; font-weight:700; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.fin-amount { font-family:'Fredoka One',cursive; font-size:14px; flex-shrink:0 }

.fin-del {
  width:26px; height:26px; border:none; background:transparent; border-radius:7px;
  cursor:pointer; color:var(--muted); font-size:11px; opacity:.35; transition:all .15s;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.fin-item:hover .fin-del { opacity:1 }
.fin-del:hover { background:rgba(239,68,68,.12); color:#EF4444 }

.fin-confirm { display:flex; align-items:center; gap:6px; flex-shrink:0; animation:fadeUp .15s ease }
.fin-confirm-yes {
  padding:5px 10px; border-radius:7px; border:none; cursor:pointer;
  background:#EF4444; color:#fff; font-family:'Nunito',sans-serif; font-size:11px; font-weight:900; transition:all .15s;
}
.fin-confirm-yes:hover { background:#DC2626 }
.fin-confirm-no {
  padding:5px 10px; border-radius:7px; border:1.5px solid var(--border); cursor:pointer;
  background:var(--surface); color:var(--muted); font-family:'Nunito',sans-serif; font-size:11px; font-weight:800; transition:all .15s;
}
.fin-confirm-no:hover { border-color:var(--sun); color:var(--sun-dk) }

/* ── Category breakdown / budget bars ───────────────────────── */
.fin-cat-bars, .fin-budget-list { display:flex; flex-direction:column; gap:12px }
.fin-cat-bar-row, .fin-budget-row { display:flex; flex-direction:column; gap:5px }
.fin-cat-bar-lbl { display:flex; justify-content:space-between; font-size:12px; font-weight:800; color:var(--text) }
.fin-cat-bar-track { height:8px; border-radius:20px; background:var(--bg); overflow:hidden }
.fin-cat-bar-fill { height:100%; border-radius:20px; transition:width .4s ease }
.fin-empty-mini { font-size:12px; font-weight:700; color:var(--muted); padding:6px 0 }

/* ── Modal: type segment ─────────────────────────────────────── */
.fin-seg-row { display:flex; gap:8px; margin-bottom:14px }
.fin-seg {
  flex:1; padding:10px 14px; border-radius:var(--r-sm);
  border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:13px; font-weight:800; color:var(--muted);
  transition:all .18s;
}
.fin-seg-income.on { border-color:var(--leaf); background:var(--leaf-lt); color:var(--leaf-dk) }
.fin-seg-expense.on { border-color:var(--red); background:var(--red-lt); color:#DC2626 }
.fin-seg:hover { border-color:var(--sun); color:var(--sun-dk) }

/* ── Modal: category grid ────────────────────────────────────── */
.fin-cat-label { font-size:11px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px }
.fin-cat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px }
.fin-cat-card {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:10px 6px; border-radius:var(--r-sm); border:2px solid var(--border); background:var(--surface);
  cursor:pointer; font-family:'Nunito',sans-serif; font-size:10.5px; font-weight:800; color:var(--muted);
  transition:all .18s; text-align:center;
}
.fin-cat-card-icon { font-size:18px }
.fin-cat-card:hover { border-color:var(--sun) }

/* ── Budget modal form ───────────────────────────────────────── */
.fin-budget-sub { font-size:12px; font-weight:700; color:var(--muted); margin:-6px 0 16px }
.fin-budget-form { display:flex; flex-direction:column; gap:9px; max-height:340px; overflow-y:auto }
.fin-budget-form-row { display:flex; align-items:center; gap:10px }
.fin-budget-form-lbl { flex:1; font-size:13px; font-weight:800; color:var(--text) }
.fin-budget-form-row input { max-width:140px }

@media(max-width:960px) {
  .fin-stats { grid-template-columns:1fr 1fr 1fr }
  .fin-grid { grid-template-columns:1fr }
}
@media(max-width:600px) {
  .fin-stats { grid-template-columns:1fr; gap:9px }
  .fin-budget-btn { margin-left:0 }
  .fin-cat-grid { grid-template-columns:repeat(3,1fr) }
  .fin-item { padding:10px 12px; gap:10px }
  .fin-amount { font-size:13px }
  .fin-del { opacity:.6 }
}
</style>
