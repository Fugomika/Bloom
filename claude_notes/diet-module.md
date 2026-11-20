# Diet — catatan makan, porsi, timbangan, dan akses berdua

## Tujuan

Modul ini menggantikan Calorie Tracker lama. Dibuat mengikuti hasil konsultasi gizi 3 Nov 2026 dan cara mencatat yang sudah berjalan di chat Telegram:

1. **Catat dulu, hitung belakangan.** Entri cukup teks bebas dan/atau foto. Angka boleh kosong.
2. **Ukur yang diminta dietisien**, bukan hanya kalori: porsi karbo, gram protein, jumlah gorengan.
3. **Timbangan** dengan grafik, karena itu yang ditanya saat kontrol.
4. **Berdua.** Dua akun yang dipasangkan bisa melihat dan mengisi catatan diet satu sama lain.

Section key-nya tetap `calories` (hanya labelnya yang jadi "Diet"), supaya `visible_sections` dan `mobile_nav_sections` yang sudah tersimpan tidak perlu dimigrasi.

## Setup (sekali, sebelum deploy)

1. Jalankan `SUPABASE_MIGRATION_DIET.sql` di Supabase SQL Editor.
2. Minta dia login ke Bloom sekali supaya akunnya ada.
3. Di bagian bawah file migrasi ada dua `INSERT INTO partners` yang dikomentari. Isi email dan nama, lalu jalankan.
4. Matikan pendaftaran baru: Supabase Dashboard → Authentication → Sign In / Providers → nonaktifkan "Allow new users to sign up".
5. Buka Diet → "Ubah target", isi 1.600 kkal (default lama masih 2.000).

**Urutan penting:** kalau kode baru di-deploy sebelum migrasi dijalankan, menyimpan entri makan dan menyimpan Settings akan gagal, karena kolom `diet_targets`, `time`, dll. belum ada.

## File

- `src/components/diet/DietView.vue`: seluruh UI (tab Makan dan Badan, modal edit, modal target)
- `src/composables/useStore.js`: `addMeal`, `updateMeal`, `deleteMeal`, `uploadMealImage`, `saveBodyLog`, `deleteBodyLog`, `todayKcal`, `myId`
- `src/utils/date.js`: `localDate()`
- `SUPABASE_MIGRATION_DIET.sql`: kolom baru, tabel `body_logs` dan `partners`, RLS

## Keputusan desain

### Entri makan: semua angka opsional

Tabel `meals` mendapat kolom `time`, `carb` (porsi), `protein` (gram), `fried` (jumlah), `image_path`. `cal` sekarang boleh `NULL`.

Entri yang `cal`, `carb`, dan `protein`-nya masih kosong ditandai "Belum dihitung", dan kartu ringkasan menulis berapa entri yang belum dihitung. Ini sengaja: total harian yang terlihat rendah karena belum diisi tidak boleh terbaca sebagai "masih aman".

Kolom `type` (breakfast/lunch/…) tidak dipakai lagi di UI. Dengan pola makan dua kali sehari plus puasa, urutan jam lebih berguna. Kolomnya dibiarkan supaya data lama tetap utuh.

### Arti warna meter

Kalori, karbo, dan gorengan adalah batas atas: hijau selama di bawah target, merah kalau lewat. Protein adalah batas bawah: kuning sampai target tercapai, lalu hijau.

Batas gorengan default 2 adalah **tebakan**; dietisien hanya bilang "dibatasi". Ubah di "Ubah target".

### Tanggal lokal, bukan UTC

`today()` di `utils/date.js` memakai `toISOString()`, jadi mengembalikan tanggal UTC. Di WIB, sebelum jam 07.00 hasilnya masih tanggal kemarin. Catatan makan jam 01.04 akan masuk hari yang salah, jadi modul Diet memakai `localDate()`.

Modul lain (Tasks, Habits, Workout) masih memakai `today()` dan punya masalah yang sama. Belum diubah karena di luar lingkup.

### Foto: bucket yang sama dengan Wardrobe

Foto makan disimpan di bucket privat `wardrobe` pada path `{user_id}/meals/{mealId}-{timestamp}.webp`. Nama bucket-nya jadi kurang pas, tapi policy pemilik (`{uid}/...`) dan helper signed URL (`ensureImageUrls`, `imageUrls`) langsung terpakai tanpa infrastruktur baru.

Signed URL hanya diminta untuk entri pada hari yang sedang dibuka, bukan seluruh riwayat.

### Akses berdua

Tabel `partners (user_id, partner_id, partner_name)`: baris ini artinya `user_id` boleh membaca dan menulis data diet milik `partner_id`. Pasangan dua arah berarti dua baris.

- Tabel ini **tidak punya policy INSERT/UPDATE**. Baris hanya bisa dibuat dari SQL Editor, jadi tidak ada cara memasangkan diri dengan akun orang lain lewat app.
- Fungsi `is_partner(owner)` dipakai di policy `meals` dan `body_logs`: `auth.uid() = user_id OR is_partner(user_id)`.
- `settings` hanya dapat policy SELECT untuk pasangan, supaya target dia bisa ditampilkan. Target hanya bisa diubah pemiliknya.
- Di Storage, pasangan hanya bisa menyentuh subfolder `meals/`. Foto Wardrobe tetap privat.
- Tabel lain (tasks, finance, notes, dll.) tidak berubah dan tetap per orang.

Di sisi klien, query `meals` dan `body_logs` di `load()` sengaja tidak difilter `user_id`: RLS yang menentukan baris mana yang kembali. Setiap baris membawa `user_id`-nya, dan `DietView` memfilter berdasarkan pilihan "Aku / {nama}". Fungsi store untuk diet juga tidak memfilter `uid()`, karena baris yang diedit bisa milik pasangan.

`DB.meals` berubah dari map per tanggal menjadi array datar, supaya bisa difilter per pemilik dan per tanggal.

## Yang sengaja belum dibuat

(Perkiraan gizi dengan AI sudah ada, lihat `ai-estimate.md`.)


- Durasi dan jarak di Workout, serta target mingguan (jalan 7×, beban 3×).
- Sinkronisasi realtime: kalau dia menambah entri, baru terlihat setelah halaman dimuat ulang.
