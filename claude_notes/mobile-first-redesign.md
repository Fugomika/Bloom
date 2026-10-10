# Redesign Mobile-First (branch `mobile-first-redesign`)

Lanjutan dari perbaikan bug mobile (lihat `mobile-first-fixes.md`). Di sini
fokusnya **struktur & interaksi** biar terasa seperti aplikasi native di HP,
tapi **identitas visual Bloom dipertahankan** (sunflower/amber, Fredoka One +
Nunito, kartu rounded, emoji). Tidak bikin bahasa desain baru — Bloom sudah
punya karakter kuat, jadi effort-nya dihabiskan untuk layout mobile.

## 1. Top bar mobile (baru) — `src/components/layout/AppTopBar.vue`

Bar gelap (senada sidebar & bottom nav) yang **sticky** di atas, muncul hanya di
≤600px: logo Bloom + nama section aktif + tombol **Customize** (ikon sliders).

**Sekaligus menambal bug nyata:** `SettingsModal` cuma di-mount di dalam
`AppSidebar`, dan sidebar `display:none` di mobile — artinya **Customize/Settings
dulu sama sekali tak bisa dibuka di HP**. Sekarang top bar yang menampungnya.

- `position:fixed` + `padding-top: env(safe-area-inset-top)` (aman dari notch).
- `.main` diberi `padding-top` setinggi bar (54px + notch) supaya konten tidak
  ketutupan. Di-mount di `App.vue` di antara sidebar dan `<main>`.

## 2. Modal → bottom sheet di mobile (`global.css`)

Ini perubahan paling terasa. Di `@media(max-width:600px)`, semua `.overlay` +
`.modal` berubah jadi **bottom sheet**:
- Naik dari bawah layar (`align-items:flex-end`, `transform:translateY(100%)` →
  `0` saat open).
- Full-width, sudut atas rounded 24px, ada **grab handle** (`.modal::before`).
- `padding-bottom` ikut `env(safe-area-inset-bottom)`.
- Tombol di `.modal-foot` jadi `flex:1` — target jempol besar (Cancel | Simpan).

Karena semua form sudah pakai class `.modal`/`.overlay`, perubahan ini
**otomatis** berlaku ke Calories, Workout, Notes, Watchlist, Finance, Life, dan
Settings — tanpa sentuh markup-nya. Desktop tetap modal tengah seperti biasa.

(Drawer "More" `.mdrawer-overlay` tak terpengaruh karena selektornya scoped &
lebih spesifik.)

## 3. Bottom nav dipercantik (`global.css`)

Ikon tiap tab kini duduk dalam "pill"; tab aktif pill-nya terisi tint sunflower
(`rgba(251,191,36,.15)`), dan ada feedback `:active`. Target tap dinaikkan.

## 4. CTA utama full-width + ritme spacing mobile

- Helper `.btn-block` → full-width + lebih tinggi di ≤600px. Dipasang di tombol
  "tambah" utama: Tasks, Habits, Notes, Calories, Workout, Life.
- Toolbar multi-tombol ditata: Watchlist (Tambah | Pilih) dan Finance
  (Pemasukan | Pengeluaran, lalu Atur Budget full-width) jadi rapi.
- Spacing section, ukuran H1, dan greeting dashboard diskalakan untuk mobile.
  `.main` juga diberi `padding-bottom` agar item terakhir tidak ketutup nav.

## Cara verifikasi (yang sudah dilakukan)

Karena app di belakang login Supabase dan tidak ada `.env` di repo, dibuat
harness **sementara** (file `*.local`, sudah dihapus & tidak di-commit): entry
Vite yang me-render shell + semua view dengan data dummy, lalu dibuka di Chrome
di dalam iframe 390px untuk memicu media query mobile. Diverifikasi: top bar,
stat cards, bottom sheet (Log Food), Customize sheet (yang tadinya tak
terjangkau), tab filter yang bisa di-scroll, drawer More, dan toolbar Finance.
Semua tampil rapi. `npm run build` hijau.

## Menjalankan app sungguhan

Butuh `.env` dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, lalu
`npm run dev`. Harness preview tadi sudah dihapus.
