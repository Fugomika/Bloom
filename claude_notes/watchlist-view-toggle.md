# Toggle tampilan Watchlist: List ↔ Card

## Apa yang berubah

Watchlist sekarang punya dua tampilan yang bisa di-toggle lewat tombol kecil di kanan filter tabs:

- **Column (list)** — tampilan lama: baris horizontal lebar, satu item per baris.
- **Card (grid)** — grid kartu vertikal (`auto-fill`, min 190px, min 140px di mobile): ikon besar di atas, judul 2 baris, badge di tengah, kontrol aksi jadi baris footer.

Default-nya tetap **column**, jadi tidak ada perubahan tampilan buat yang belum pernah menyentuh toggle.

## File yang disentuh

- `src/components/watchlist/WatchlistView.vue` — toggle + CSS mode kartu
- `src/components/ui/AppIcon.vue` — dua ikon baru: `grid` dan `rows`

## Keputusan desain yang perlu dijelaskan

### 1. Preferensi disimpan di `localStorage`, bukan Supabase

`DB.settings` di `useStore.js` di-back tabel `settings` di Supabase dengan **kolom tetap** (`calorie_goal`, `finance_budgets`, `visible_sections`, `mobile_nav_sections`). Nambah preferensi tampilan ke sana berarti bikin migrasi kolom baru + update `saveSettings()`.

Buat preferensi UI ringan yang sifatnya per-perangkat (di HP mungkin mau card, di laptop mau list), itu overhead yang tidak sepadan — dan tiap toggle jadi butuh round-trip ke server. Jadi disimpan lokal:

```js
const VIEW_KEY = 'bloom_watchlist_view'
const viewMode = ref(localStorage.getItem(VIEW_KEY) === 'card' ? 'card' : 'column')
watch(viewMode, v => localStorage.setItem(VIEW_KEY, v))
```

Pembacaan sengaja pakai `=== 'card' ? 'card' : 'column'` — nilai sampah atau `null` otomatis jatuh ke default yang aman, tanpa perlu validasi terpisah.

### 2. Satu markup untuk dua tampilan, dibedakan lewat CSS

Tidak ada duplikasi template. Item watchlist tetap markup yang sama; `.wl-list` cuma dapat class tambahan `.wl-list-card`, dan CSS yang mengubah flex-column jadi grid.

Kenapa penting: semua handler (`openEdit`, `cycleStatus`, `moveUp/moveDown`, konfirmasi hapus inline) otomatis jalan identik di kedua mode. Kalau markup-nya digandakan, tiap perubahan perilaku ke depan harus diedit dua kali dan gampang lupa satu.

### 3. Trik `display: contents` di `.wl-actions`

Ini bagian yang paling non-obvious. Di mode kartu, tombol aksi (panah urutan, tombol status, tombol hapus) harus berkumpul jadi **satu baris footer** di bawah kartu. Di mode list, mereka harus tetap jadi anak langsung dari flexbox `.wl-card` supaya sejajar horizontal seperti sekarang.

Solusinya: bungkus semuanya dalam `<div class="wl-actions">`, lalu:

```css
.wl-actions { display: contents }                    /* mode list: wrapper "hilang" */
.wl-list-card .wl-actions { display: flex; ... }     /* mode card: wrapper jadi footer */
```

`display: contents` bikin elemen wrapper tidak menghasilkan box sama sekali — anak-anaknya naik dan diperlakukan seolah anak langsung dari `.wl-card`. Artinya **tampilan list lama tetap identik piksel per piksel**, tanpa perlu menyentuh satu pun CSS-nya. Begitu masuk mode kartu, wrapper yang sama "hidup" jadi flex container.

Detail kecil: `margin-top: auto` di footer bikin dia nempel ke bawah kartu. Karena grid item default-nya `stretch`, semua kartu di satu baris tingginya sama, jadi footer-nya rata walau judulnya beda panjang.

Tombol hapus (`.wl-del`) di mode kartu di-`position: absolute` ke pojok kanan atas — `.wl-card` sudah `position: relative`, jadi tidak perlu tambahan apa-apa.

### 4. Arah panah urutan ikut arah tata letak

Di mode list item tersusun ke bawah, jadi panahnya `▲ ▼`. Di mode kartu item tersusun ke samping (grid mengalir kiri→kanan), jadi panah atas/bawah jadi membingungkan — arahnya tidak cocok dengan ke mana item itu benar-benar bergerak. Glyph-nya ikut mode:

```vue
{{ viewMode === 'card' ? '◀' : '▲' }}
```

Fungsi `moveUp`/`moveDown` tidak berubah — yang bergeser cuma representasi visualnya, karena "naik satu posisi di queue" di grid artinya bergerak ke kiri.

## Catatan

`display: contents` pernah punya bug aksesibilitas di browser lama (elemen hilang dari accessibility tree). Sudah beres di semua browser modern, dan di sini wrapper-nya cuma `div` tanpa makna semantik, jadi aman.
