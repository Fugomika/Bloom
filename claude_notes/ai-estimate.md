# Perkiraan gizi dengan AI

## Apa yang dibuat

Tombol **✨ Perkirakan dengan AI** di modal "Detail makanan". Teks dan foto entri dikirim ke Claude Haiku 5.5, lalu kalori, porsi karbo, protein, dan gorengan terisi ke kolom angka beserta catatan singkat asumsi porsinya.

Hasilnya hanya **draf**: tidak ada yang tersimpan sampai kamu menekan Simpan. Ini disengaja. Perkiraan dari foto itu kasar, terutama minyak dan santan, yang justru jadi fokus dietisien.

## Kenapa lewat Worker, bukan langsung dari browser

API key Anthropic tidak boleh ada di frontend. Semua variabel `VITE_*` di-inline ke JavaScript yang diunduh browser, jadi siapa pun bisa membacanya lalu memakai kredit kita.

Karena itu Worker `bloom` di Cloudflare, yang sebelumnya hanya menyajikan file statis, sekarang punya skrip kecil (`worker/index.js`):

- `run_worker_first: ["/api/*"]` di `wrangler.jsonc`: hanya `/api/*` yang menjalankan skrip. Semua request lain langsung dilayani dari `dist`, sama seperti sebelumnya.
- API key disimpan sebagai **secret** Worker, tidak pernah ada di repo.

## Siapa yang boleh memakai

Pendaftaran akun Supabase terbuka, jadi "sudah login" saja tidak cukup; orang asing bisa mendaftar lalu menghabiskan kredit. Worker memeriksa dua hal:

1. Token login valid (`/auth/v1/user` di Supabase).
2. Akun itu punya baris di tabel `partners`. Query-nya memakai token si pemanggil, jadi RLS yang menjawab. Akibatnya hanya dua akun yang sudah dipasangkan yang bisa memakai AI.

Batas lain: teks dipotong di 2.000 karakter, foto maksimal sekitar 3 MB (base64). Di sisi app, foto sudah dikecilkan ke 1.200 px WebP.

## Model dan biaya

`claude-haiku-5-5`, model termurah ($0,10 / $0,50 per 1 juta token). Output dipaksa mengikuti JSON schema (`output_config.format`), jadi selalu bisa di-parse. Angka di-clamp lagi di Worker supaya tidak ada nilai aneh.

Setiap respons membawa `usage` (token masuk dan keluar), yang bisa dipakai untuk menghitung biaya sebenarnya per entri.

Prompt sistem memuat ukuran dari dietisien (1 porsi karbo = 100 g nasi ≈ 175 kkal, dan seterusnya) serta definisi "gorengan", supaya angkanya cocok dengan meter di app.

## Setup

1. Buat API key di console.anthropic.com. Sebaiknya pasang batas belanja bulanan kecil juga.
2. Simpan key sebagai secret Worker: `npx wrangler secret put ANTHROPIC_API_KEY`, atau lewat Dashboard → Workers → bloom → Settings → Variables and secrets (tipe **Secret**).
3. Untuk development lokal: buat `.dev.vars` berisi `ANTHROPIC_API_KEY=...` (sudah di-`.gitignore`), lalu jalankan `npm run dev:api` (Worker di port 8787) bersamaan dengan `npm run dev`. Vite meneruskan `/api` ke 8787.

Tanpa key, endpoint menjawab 503 "AI belum dikonfigurasi" dan bagian lain app tetap normal.

## File

- `worker/index.js`: endpoint `/api/estimate`, cek akses, panggilan ke Claude
- `wrangler.jsonc`: konfigurasi Worker (sebelumnya diatur otomatis oleh Cloudflare). Custom domain `bloom.fugomika.dev` sekarang ditulis eksplisit di sini.
- `src/components/diet/DietView.vue`: tombol, pengiriman foto (`blobToBase64`), dan tampilan catatan AI
- `vite.config.js`: proxy `/api` untuk dev lokal
