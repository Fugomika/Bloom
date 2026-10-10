# Perbaikan Mobile (Fix + Polish Ringan)

Tujuan: hilangkan pengalaman buruk di mobile (zoom sendiri saat input, layout
bergeser, tombol yang tak bisa dipakai) **tanpa mengubah tampilan & layout**.
Pendekatan: perbaiki akar masalahnya di CSS/perilaku, bukan merombak desain.

## 1. Zoom sendiri saat fokus input (iOS) — dan tidak balik

**Kenapa terjadi:** Safari iOS otomatis zoom-in kalau field yang difokus
punya `font-size < 16px`, dan tidak pernah zoom-out lagi.

**Yang ada sebelumnya:** tambalan `font-size:16px` hanya di
`@media(max-width:600px)` dan cuma untuk sebagian tipe input. Berbasis lebar
layar itu rapuh.

**Perbaikan** (`src/assets/global.css`): aturan baru berbasis **jenis pointer**,
bukan lebar layar:

```css
@media (pointer: coarse) {
  input[type=text],input[type=email],input[type=password],input[type=search],
  input[type=tel],input[type=url],input[type=number],input[type=date],
  textarea,select { font-size:16px }
}
```

`pointer: coarse` = perangkat sentuh apa pun (HP & tablet, semua ukuran), dan
daftar tipe input-nya lengkap. Desktop (`pointer: fine`) tetap pakai 14px yang
lebih rapat. `LoginView` dan `WorkoutView` punya input dengan style sendiri
(specificity lebih tinggi), jadi override 16px-nya ikut dipindah ke
`@media (pointer: coarse)` supaya menang.

## 2. Tombol hapus tak terlihat di layar sentuh

**Kenapa:** di Tasks / Notes / Calories tombol delete pakai `opacity:0` lalu
baru muncul saat `:hover`. Di layar sentuh **tidak ada hover** → tombol tak
pernah muncul, item jadi tak bisa dihapus.

**Perbaikan:** tetap pakai hover-reveal di desktop, tapi tambahkan:

```css
@media (hover: none) { .del-btn { opacity:.55 } }   /* dan padanannya */
```

`hover: none` menyasar tepat perangkat tanpa hover. Watchlist yang tadinya
cuma redup (`opacity:.35`) juga dinaikkan di touch. Area tap tombol hapus
diperbesar (padding) agar nyaman dijempol — bentuk visualnya tetap.

## 3. Filter tabs meluber ke samping (sumber "bergeser")

**Kenapa:** `.ftabs` itu `width:fit-content` tanpa wrap/scroll. Di Tasks ada 6
tab → lebih lebar dari layar HP → halaman bisa tergeser horizontal / tab
kepotong.

**Perbaikan:** di `@media(max-width:600px)` `.ftabs` jadi bisa di-scroll
horizontal (`overflow-x:auto`, scrollbar disembunyikan) dan tiap `.ftab`
`flex-shrink:0` biar tidak gepeng. Barisnya tetap terlihat sama, cuma kini
bisa digeser kalau kebanyakan.

## 4. Pengaman anti-geser menyeluruh

Di `global.css`:
- `html { -webkit-text-size-adjust:100% }` — cegah iOS mengubah ukuran teks
  saat ganti orientasi (penyebab layout meloncat).
- `.main { overflow-x:hidden }` — kalau ada anak elemen kelewat lebar, halaman
  tidak ikut tergeser ke samping. (Grid "Life" tetap aman karena ia punya
  scroll sendiri di dalam kartunya.)
- `button, a, .chk, [role=button] { touch-action:manipulation }` — hilangkan
  jeda tap ~300ms dan double-tap-to-zoom di elemen interaktif.

## 5. Ganti dialog bawaan browser dengan modal

Dialog `prompt()`/`confirm()` jelek & tidak konsisten di mobile. Diganti modal
bergaya Bloom:
- **Calories** — edit "Daily Calorie Goal" kini modal (`showGoalModal`), bukan
  `prompt()`. Chip goal diberi ikon ✏️ sebagai petunjuk bisa diklik.
- **Life** — hapus kalender kini modal konfirmasi (`confirmDelCalId` →
  `executeDelCalendar`), bukan `confirm()`.

## Yang TIDAK diubah

Tampilan, warna, tata letak, dan struktur tiap menu dibiarkan apa adanya sesuai
keputusan "fix + polish ringan". Semua perubahan bersifat perilaku/robustness.

## Catatan teknis

- `@media (hover: none)` dan `@media (pointer: coarse)` cuma aktif di perangkat
  sentuh, jadi efeknya **tidak kelihatan** di Chrome desktop biasa — perlu mode
  Device Toolbar (emulasi perangkat) atau HP asli untuk mengetesnya.
- `npm run build` hijau setelah semua perubahan.
