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

## Site lain yang ikut pindah (dari GitHub Pages)
Rencananya repo-repo ini mau dijadikan private, dan GitHub Pages gratis nggak bisa serve dari repo private.
Jadi semuanya sekarang dilayani Cloudflare Worker, dan GitHub Pages di ketiga repo sudah dimatikan:

| Domain | Worker | Repo | Catatan |
|---|---|---|---|
| `fugomika.dev`, `www` | `portfolio` | `Fugomika/portfolio` | Next.js static export → `out/`, `deploy.yml` dihapus |
| `makan-apa.fugomika.dev` | `makan-apa` | `Fugomika/makan-apa` | HTML statis dari root |
| `cireng-enin.fugomika.dev` | `cireng-enin` | `Fugomika/cireng-enin` | HTML statis dari root |

Repo yang di-serve dari root punya `.assetsignore` supaya `CLAUDE.md`, `claude_notes/`, `.git`, dan file
sejenis nggak ikut ke-publish. Ini penting karena isi repo private bisa kebuka kalau file-file itu ikut di-serve.

## Hal yang perlu diingat
- Variabel `VITE_*` di-*inline* ke bundle **waktu build**, bukan dibaca saat runtime. Karena itu harus diisi
  di *Build* variables, bukan di Worker runtime variables. Kalau kosong, gejalanya layar blank dan error
  `supabaseUrl is required.` di console.
- Anon key Supabase memang aman ada di bundle frontend. Yang melindungi data adalah Row Level Security (RLS).
- Login Google: redirect URL di Supabase tetap `https://bloom.fugomika.dev`, jadi nggak perlu diubah.
  Kalau mau test lewat `bloom.fugomika.workers.dev`, URL itu perlu ditambahkan dulu ke Supabase Auth → URL Configuration.
