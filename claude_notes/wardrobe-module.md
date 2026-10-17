# Wardrobe — katalog pakaian, outfit, dan arsip

## Tujuan

Wardrobe dibuat untuk tiga kebutuhan:

1. Tahu ada baju apa saja dan berapa jumlah sebenarnya.
2. Bisa menyimpan kombinasi outfit yang bagus.
3. Punya **arsip** untuk baju yang sudah gak muat atau gak betah dipakai. Baju yang diarsip tidak hilang, tapi juga tidak ikut dihitung di lemari.

Laundry tracking dan log "pakai hari ini" **sengaja tidak dibuat**, karena tidak dibutuhkan.

## Setup (sekali)

Jalankan `SUPABASE_MIGRATION_WARDROBE.sql` di Supabase SQL Editor. Script ini:

- membuat tabel `wardrobe_items` dan `wardrobe_outfits` (pakai RLS)
- membuat bucket Storage privat `wardrobe` beserta policy per-folder user
- menambahkan `'wardrobe'` ke `visible_sections`

Sebelum migrasi ini dijalankan, query load akan error dan Wardrobe tampil kosong. Bagian app lainnya tetap jalan normal.

## File

- `src/components/wardrobe/WardrobeView.vue`: stats dan tab Lemari / Outfit / Arsip
- `src/components/wardrobe/ItemForm.vue`: form tambah/edit item (bottom sheet), arsip, hapus
- `src/components/wardrobe/OutfitBuilder.vue`: memilih item untuk outfit
- `src/components/wardrobe/OutfitCollage.vue`: kolase 1–4 foto, dipakai juga di dashboard
- `src/components/wardrobe/ItemThumb.vue`: foto item, atau emoji kategori kalau tidak ada foto
- `src/utils/image.js`: resize ke WebP dan hapus background
- `src/composables/useStore.js`: CRUD dan helper Storage (`ensureImageUrls`, `uploadItemImage`, `removeItemImage`)

## Keputusan desain

### Foto: bucket privat dan signed URL

Foto disimpan di `wardrobe/{user_id}/{itemId}-{timestamp}.webp`. Bucket-nya privat, jadi `<img>` memakai signed URL (berlaku 7 hari). URL ini dibuat sekaligus untuk banyak foto lewat `createSignedUrls`, lalu di-cache di `imageUrls` yang reaktif.

`WardrobeView` punya watcher yang memanggil `ensureImageUrls` setiap kali daftar foto berubah. View ini selalu ter-mount, karena App hanya men-toggle class `.section`. Akibatnya dashboard ikut kebagian URL foto tanpa perlu kode tambahan.

Ada timestamp di nama file supaya mengganti foto selalu menghasilkan path baru. Cache browser tidak akan menampilkan foto lama, dan file lama langsung dihapus.

### Hapus background: on-device dan lazy

`@imgly/background-removal` (lisensi AGPL) di-load lewat `import()` dinamis, jadi tidak masuk bundle utama. Model `isnet_quint8` (~40MB) dan file wasm diambil dari CDN imgly saat pertama kali dipakai, lalu di-cache browser.

`vite build` tetap meng-emit file `ort-wasm-*.wasm` (~24MB) ke `dist/assets`, tapi file itu tidak pernah di-request. Library ini mengarahkan `wasmPaths` ke CDN-nya sendiri.

Dua versi foto disimpan sekaligus, yaitu asli dan hasil potong, jadi toggle "Hapus background otomatis" bisa dibolak-balik tanpa menjalankan model ulang. Kalau proses gagal, foto asli yang dipakai. Preferensi toggle disimpan di `localStorage` (`bloom_wardrobe_bg_remove`).

### Arsip memakai `status`, bukan tabel terpisah

Item yang diarsip punya `status: 'archived'`, `archive_reason`, dan `archived_at`. Statistik "item di lemari" hanya menghitung item yang aktif.

Outfit yang berisi item arsip tidak dihapus. Outfit itu diberi badge "ada item diarsip", karena bisa saja itemnya dikembalikan nanti. Item arsip juga tidak muncul di picker outfit builder.

Menghapus item secara permanen akan melepas item itu dari `item_ids` semua outfit yang memakainya.

### Integrasi Finance

Opsi ini hanya ada saat **menambah** item yang punya harga. Kalau toggle "Catat juga sebagai pengeluaran" dinyalakan, sebuah transaksi kategori `shopping` dibuat, dan id-nya disimpan di `finance_tx_id`. Mengedit atau menghapus item tidak mengubah transaksi tersebut, karena uangnya memang sudah keluar.

### Escape

Handler Escape global di `App.vue` hanya menghapus class `.open` dari DOM, sehingga state Vue tidak ikut berubah. Karena itu `ItemForm` dan `OutfitBuilder` punya listener sendiri yang meng-emit `close`. Tanpa listener ini, membuka modal lagi tidak akan memicu `watch(open)`, dan form tidak di-reset.
