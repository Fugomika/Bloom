import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // /api/* is served by the Cloudflare Worker; run `npm run dev:api` alongside `npm run dev`
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
