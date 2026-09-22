# Fix: zoom saat fokus input & komponen bergeser di iPhone

## Gejala
- Klik field (terutama di Finance) → Safari langsung zoom in.
- Kartu/list item/tombol kelihatan "geser sendiri" saat di-tap atau saat scroll.

## Penyebab & fix

### 1. Auto-zoom iOS Safari
iOS Safari otomatis zoom kalau field yang difokus punya `font-size` < 16px.
Semua input kita 14px (bahkan 12–13px di form Workout).

**Fix:** di breakpoint `max-width:600px`, field dinaikkan ke 16px. Desktop tetap 14px.

- Global: `src/assets/global.css` (blok `@media(max-width:600px)`)
- Style scoped yang override font-size punya specificity lebih tinggi (Vue menambah
  `[data-v-xxxx]` ke selector), jadi rule global kalah. Makanya perlu override lokal juga di:
  - `WorkoutView.vue` → `.wex-top input`, `.wex-bot input`
  - `LoginView.vue` → `.field input`

Kenapa tidak pakai `maximum-scale=1` di meta viewport? Itu mematikan pinch-zoom
untuk user sama sekali (buruk untuk aksesibilitas). Menaikkan font-size memperbaiki
akar masalahnya tanpa efek samping itu.

> Kalau nanti bikin input baru dengan font-size custom, pastikan ≥16px di mobile.

### 2. `100vh` di iOS
Di iOS Safari, `100vh` = tinggi viewport *maksimal* (address bar tersembunyi).
Saat address bar muncul/hilang atau keyboard terbuka, tinggi yang sebenarnya berubah
tapi `100vh` tidak — layout jadi lompat.

**Fix:** pakai `100dvh` (dynamic viewport height) yang mengikuti tinggi nyata.
Ditulis dua kali sebagai fallback:

```css
height:100vh;   /* browser lama */
height:100dvh;  /* browser baru menimpa baris di atas */
```

Browser yang tidak kenal `dvh` akan mengabaikan baris kedua, jadi tetap pakai `vh`.
Diterapkan di: `body`, `#app`, `.main`, `.modal` (max-height), `.sidebar`,
`.login-bg`, `.life-events-card`.

### 3. `:hover` yang "nempel" di touch device
Di layar sentuh, `:hover` aktif begitu elemen di-tap dan **baru lepas saat tap di
tempat lain**. Semua efek `:hover { transform: translateX/Y/scale }` jadi bikin elemen
geser dan tertahan di posisi itu.

**Fix:** efek yang menggerakkan elemen (`transform`) dipindah ke:

```css
@media (hover:hover) and (pointer:fine) { ... }
```

Media query ini hanya true di device dengan mouse/trackpad asli. Efek non-gerak
(warna, border, shadow, opacity) tetap jalan di semua device karena tidak menggeser layout.

Untuk color swatch (`.cs` di Notes, `.ecswatch` di Life), state `.on` (terpilih)
tetap membesar di semua device — hanya efek hover-nya yang dibatasi.

> Pola untuk ke depan: kalau menambah hover effect yang pakai `transform`,
> taruh di dalam media query `(hover:hover) and (pointer:fine)`.
