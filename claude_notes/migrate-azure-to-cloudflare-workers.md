# Migrasi hosting: Azure Static Web Apps → Cloudflare Workers

## Kenapa
Bloom tiba-tiba 404 (custom domain dan URL default Azure). Penyebabnya bukan kode: subscription
**Azure for Students** di-disable karena kredit $100 habis (sekitar 7 Nov 2026). Hampir semua
kreditnya kepakai resource `fugolearn` (MySQL Flexible Server sekitar $54, App Service sekitar $39).
Static Web App Bloom sendiri tier Free, tapi kalau subscription disabled, semua resource di dalamnya ikut mati.

## Yang diubah
| Bagian | Sebelum | Sesudah |
|---|---|---|
| Hosting | Azure Static Web Apps (`agreeable-island-04286c900`) | Cloudflare Worker `bloom` (static assets) |
| Deploy | GitHub Action `azure-static-web-apps-*.yml` | Cloudflare Workers Builds (Git integration): `npm run build` lalu `npx wrangler deploy` |
| Env build | GitHub Secrets | Worker → Settings → Builds → *Variables and secrets* |
| DNS `fugomika.dev` | name.com | Cloudflare (`buck` / `deborah.ns.cloudflare.com`) |

Workflow Azure dihapus. Kalau dibiarkan, setiap push ke `main` bakal gagal karena target Azure-nya udah nggak ada.

## Kenapa DNS ikut dipindah
Custom domain di Cloudflare **Workers** cuma bisa dipasang kalau zone domainnya ada di Cloudflare.
(Cloudflare *Pages* bisa pakai CNAME dari DNS luar, tapi kita milih tetap pakai Worker.)

Semua record lama disalin ke Cloudflare dalam mode **DNS only** (awan abu-abu):
- apex `fugomika.dev` (4×A + 4×AAAA) dan `www`, `makan-apa`, `cireng-enin` → GitHub Pages.
  Sengaja *nggak* di-proxy: GitHub Pages ngurus sertifikat HTTPS-nya sendiri, dan proxy Cloudflare
  dengan mode SSL default bisa bikin redirect loop atau bikin perpanjangan sertifikat GitHub gagal.
- `albasita` CNAME dan TXT `asuid.albasita` → Azure App Service (Albasita Office).
- `bloom` dibuat otomatis waktu custom domain dipasang di Worker.

## Hal yang perlu diingat
- Variabel `VITE_*` di-*inline* ke bundle **waktu build**, bukan dibaca saat runtime. Karena itu harus diisi
  di *Build* variables, bukan di Worker runtime variables. Kalau kosong, gejalanya layar blank dan error
  `supabaseUrl is required.` di console.
- Anon key Supabase memang aman ada di bundle frontend. Yang melindungi data adalah Row Level Security (RLS).
- Login Google: redirect URL di Supabase tetap `https://bloom.fugomika.dev`, jadi nggak perlu diubah.
  Kalau mau test lewat `bloom.fugomika.workers.dev`, URL itu perlu ditambahkan dulu ke Supabase Auth → URL Configuration.
