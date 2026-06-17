import { MONTHS } from './constants.js'

export function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function fmtDate(d) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
}

export function fmtDateShort(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

export function fmtYM(ym) {
  const [y, m] = ym.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

export function overdue(d) {
  return d && d < today()
}

export function streak(ins) {
  if (!ins.length) return 0
  const s = [...new Set(ins)].sort().reverse()
  let c = 0
  let cur = new Date()
  for (let i = 0; i < 400; i++) {
    const ds = cur.toISOString().split('T')[0]
    if (s.includes(ds)) { c++; cur.setDate(cur.getDate() - 1) }
    else if (i === 0) { cur.setDate(cur.getDate() - 1) }
    else break
  }
  return c
}

export function last7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function eventDuration(ev) {
  const [sy, sm] = ev.start.split('-').map(Number)
  const now = new Date()
  const estr = ev.end || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [ey, em] = estr.split('-').map(Number)
  const tot = Math.max(0, (ey - sy) * 12 + (em - sm))
  const y = Math.floor(tot / 12), mo = tot % 12
  if (y && mo) return `${y}yr ${mo}mo`
  if (y) return `${y}yr`
  return `${mo}mo`
}
