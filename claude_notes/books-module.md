# Books — reading tracker, koleksi, dan target tahunan

## Setup (sekali)

Jalankan `SUPABASE_MIGRATION_BOOKS.sql` di Supabase SQL Editor. Script ini membuat tabel `books` dan `reading_goals` (keduanya dengan RLS), lalu menambahkan `'books'` ke `visible_sections`.

Opsional: isi `VITE_GOOGLE_BOOKS_KEY` di `.env` supaya pencarian juga memakai Google Books. Cakupan buku Indonesia di Google Books lebih lengkap daripada Open Library.

## Isi fitur

- **Bacaan**
  - Status buku: Sedang Baca, Mau Baca, Selesai, dan Berhenti.
  - Tombol cepat "Mulai baca" mengisi `started_at` dengan tanggal hari ini.
  - Tombol "Selesai" membuka form dengan status *done* sudah terisi, supaya rating dan review bisa langsung diisi.
- **Koleksi**
  - Buku yang ditandai `owned`, dengan format Fisik, Ebook, atau Audiobook, beserta lokasi/platform dan nama peminjam.
  - Buku yang sedang dipinjam tampil di bagian paling atas.
- **Statistik per tahun**
  - Target tahunan dan pacing (di depan atau di belakang jadwal).
  - Grafik buku selesai per bulan, dengan tooltip saat hover/tap dan tampilan tabel.
  - Jumlah halaman, rata-rata rating, genre teratas, sebaran rating, dan penulis yang paling sering dibaca.
- **Kutipan**: disimpan sebagai array JSONB `quotes` di baris buku. Isinya `{id, text, page, at}`.
- **Dashboard**: widget "Sedang Dibaca" berisi maksimal 3 cover dan progress target tahun ini.

## File

- `src/components/books/BooksView.vue`: stats dan tab Bacaan / Koleksi / Statistik
- `src/components/books/BookForm.vue`: langkah cari, lalu detail (status, rating, koleksi, kutipan)
- `src/components/books/BookCover.vue`: cover, atau sampul berwarna kalau tidak ada gambar
- `src/utils/bookSearch.js`: Open Library dan Google Books (opsional)
- `src/composables/useStore.js`: `addBook`, `updateBook`, `deleteBook`, `setReadingGoal`

## Keputusan desain

### Target disimpan di tabel `reading_goals`, bukan kolom `settings`

`saveSettings()` meng-update kolom-kolom tetap di tabel `settings`. Kalau `reading_goals` ditambahkan ke sana, user yang belum menjalankan migrasi akan mengalami error saat menyimpan **semua** setting. Dengan tabel terpisah, kegagalannya hanya terbatas di fitur Books.

### Pencarian: Open Library dulu, Google Books opsional

- **Open Library** gratis dan tidak butuh key. Cover diambil dari `covers.openlibrary.org/b/id/{cover_i}-M.jpg`. URL cover di-hotlink, tidak di-upload ulang.
- **Google Books tanpa key** memakai quota project bersama yang sudah habis (dicek 2026-10-18, hasilnya `quota_limit_value: 0`). Karena itu Google hanya dipanggil kalau `VITE_GOOGLE_BOOKS_KEY` diisi.
- Hasil dari kedua sumber digabung selang-seling dan diduplikasi berdasarkan judul+penulis.
- Kalau input berupa ISBN 10/13 digit, pencarian otomatis memakai parameter `isbn`.

### Cover fallback

`BookCover.vue` membuat sampul berwarna dengan judul di atasnya. Warnanya diambil dari hash judul, jadi tetap konsisten. Fallback ini dipakai kalau tidak ada URL cover atau gambarnya gagal dimuat.

### Grafik

Hanya satu seri data, jadi cukup satu warna (`--purple`), tanpa legend. Angka hanya ditampilkan di bulan dengan nilai tertinggi dan di bulan yang sedang di-hover, tidak di setiap batang. Ada juga `<details>` berisi tabel sebagai alternatif aksesibilitas.

### Escape

Sama seperti Wardrobe: `BookForm` punya listener Escape sendiri, karena handler global di `App.vue` hanya menghapus class `.open` dan tidak mengubah state Vue.
