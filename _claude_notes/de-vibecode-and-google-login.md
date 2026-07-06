# De-vibecoding Bloom, the Finance mobile fix, and Google login

Three changes landed in this session. Here's what was done, why, and how the pieces fit.

## 1. Finance list overflowing on mobile

**Symptom:** on a phone, the Finance transaction list pushed past the right edge of the
screen — the delete button and day totals were cut off and the whole page scrolled
horizontally.

**Root cause (the interesting part):** `.fin-grid` uses `grid-template-columns: 1.6fr 1fr`.
In CSS Grid, an `fr` track is shorthand for `minmax(auto, Nfr)` — the `auto` minimum means
*the column refuses to shrink below its content's min-content width*. The transaction notes
use `white-space: nowrap`, so their min-content width is the full unbroken line of text.
Result: the column was as wide as the longest note, no matter the screen size.

**Fix:** `min-width: 0` on `.fin-col-main` and `.fin-col-side`. Setting an explicit minimum
overrides the `auto` minimum, letting the columns shrink and the `text-overflow: ellipsis`
finally do its job. This is the grid twin of the classic flexbox `min-width: 0` trick — any
time a grid/flex child "refuses to shrink," this is the first thing to check.

Also added small ≤600px polish: tighter row padding, slightly smaller amount font, and the
delete ✕ is more visible by default (hover states don't exist on touch).

## 2. The de-vibecoding sweep

**The rule we settled on** (worth internalizing — it's what separates "fun" from
"AI-generated slop"):

- **Emoji as UI chrome → gone.** Nav icons, section header emojis (`💰 Finance`), widget
  titles (`📊 Kategori`), button suffixes (`Simpan ✨`), select options (`🔴 High`), and
  filter tabs are now plain text or SVG icons.
- **Emoji as content → kept.** Habit emojis, finance category icons (🍔 🚗), watchlist type
  icons (🎬 📺), life-calendar event emojis, the emoji picker, streak flames, and big
  empty-state illustrations all stay. These are either user-picked data or serve a real
  scanning purpose — real apps (money trackers, habit apps) use them too.
- **Fun lives in the design system**, not in emoji density: the sunflower palette, Fredoka
  One, rounded cards, confetti on task completion — all untouched.

### New components

- **`src/components/ui/AppIcon.vue`** — a ~25-icon set of inline Lucide-style SVGs
  (24×24 viewBox, `stroke: currentColor`, width 2, round caps). No npm dependency: the
  paths are static strings rendered with `v-html`, so the whole icon system is one small
  file and icons inherit text color automatically (that's why the sidebar icons are white
  on their gradient tiles and the bottom-nav icons light up gold when active — zero extra
  CSS per icon).
- **`src/components/ui/BloomLogo.vue`** — the 🌻 emoji brand mark replaced by a real SVG
  sunflower (two rings of 8 rotated ellipse petals + a two-tone center). Used in the
  sidebar, the loading screen, and the login card. An SVG logo scales crisply, matches the
  palette exactly, and renders identically on every OS (emoji don't).

### Why `v-html` is safe here
Normally `v-html` is an XSS risk. Here the input is a hardcoded constant map inside the
component — no user data ever flows into it, so there's no injection surface.

### Gotcha: emoji → SVG needs layout tweaks
Emoji are text, so containers sized them with `font-size`. SVGs are replaced elements, so
several spans switched from `font-size: 24px; display: block` to `display: flex`. If you
add an icon somewhere new and it looks misaligned, wrap it in a flex container.

## 3. Google login

- **`useAuth.js`** got `signInWithGoogle()` → `supabase.auth.signInWithOAuth({ provider:
  'google', options: { redirectTo: window.location.origin } })`. OAuth works by full-page
  redirect: Supabase bounces the browser to Google, Google bounces back to Supabase, and
  Supabase lands the user back on `redirectTo` with a session. The existing
  `onAuthStateChange` listener in `initAuth()` picks the session up — no other app code
  needed to change.
- **LoginView** shows a "Continue with Google" button under an "or" divider, using the
  official multi-color G mark inline.

### ⚠️ One-time setup you must do in Supabase (it won't work until then)
1. Google Cloud Console → create an OAuth 2.0 Client ID (Web application).
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Supabase Dashboard → Authentication → Providers → Google → enable, paste the Client ID
   and Client Secret.
3. Supabase Dashboard → Authentication → URL Configuration → add your site URLs to
   "Redirect URLs" (e.g. `http://localhost:5173` and your Azure Static Web Apps URL),
   otherwise the post-login redirect will be rejected.

### Login screen refresh (same commit)
The floating emoji decorations (🌸✨🌼💛) are replaced with three big blurred color blobs
(`border-radius: 50%` + `filter: blur(60px)`) that drift slowly — same warm, alive feeling,
much less "AI demo page." The spinning 🌻 submit spinner became a proper CSS ring spinner,
and `prefers-reduced-motion` now disables the ambient animation.

## Commits in this session
1. `fix: finance list horizontal overflow on mobile (grid min-width:0)`
2. `feat: replace emoji nav chrome with SVG icon system (AppIcon, BloomLogo)`
3. `refactor: remove emoji chrome from core views (headers, buttons, widgets)`
4. `refactor: remove emoji chrome from life/watchlist/finance views and app shell`
5. `feat: add Google sign-in + refresh login screen (SVG logo, ambient blobs)`
