<div align="center">

# 🌻 Bloom

**A warm, personal dashboard — built with love**

![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?style=flat-square&logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

</div>

---

Bloom is a personal life dashboard PWA. Track tasks, habits, calories, workouts, notes, and visualize your life in months — all in one cozy place, synced across every device via Supabase.

---

## ✨ Features

| Section | What it does |
|---|---|
| 🏠 **Dashboard** | At-a-glance stats, active tasks, today's habits & calories |
| ✅ **Tasks** | Add tasks with priority + due date, filter by All / Active / Done |
| 🔥 **Habits** | Daily check-ins, 7-day streak dots, streak counter |
| 🥗 **Calories** | Animated ring, per-meal logging by type, custom goal |
| 💪 **Workout** | Log workouts with dynamic exercise rows (sets × reps × kg) |
| 📝 **Notes** | Colorful sticky notes, create and edit in a modal |
| 📅 **Life in Months** | Dot-grid time visualizer with events, progress, and month selector |

---

## 🛠 Stack

- **Vue 3** — `<script setup>` SFCs throughout
- **Vite** — instant dev server and builds
- **Supabase** — Postgres database + Auth (email/password)
- **CSS custom properties** — no UI framework, fully hand-crafted
- **Fredoka One + Nunito** — via Google Fonts

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Fugomika/Bloom.git
cd Bloom
npm install
```

### 2. Set up Supabase

Follow **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** — it walks you through creating the project, running the SQL schema, enabling auth, and setting RLS policies.

### 3. Add your keys

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173`, create an account, and you're in 🌻

---

## 📁 Structure

```
src/
├── lib/
│   └── supabase.js          # Supabase client
├── composables/
│   ├── useAuth.js           # Auth state + signIn/signUp/signOut
│   ├── useStore.js          # Reactive DB + per-entity CRUD → Supabase
│   ├── useNavigation.js     # Active section state
│   └── useConfetti.js       # 🎉
├── components/
│   ├── auth/LoginView.vue   # Login / sign-up screen
│   ├── layout/              # Sidebar + bottom nav
│   ├── dashboard/
│   ├── tasks/
│   ├── habits/
│   ├── calories/
│   ├── workout/
│   ├── notes/
│   ├── life/
│   └── ui/                  # EmojiPicker
├── utils/
│   ├── date.js
│   └── constants.js
└── assets/global.css        # Design tokens + global styles
```

---

## 🔒 Security

- Email/password auth via Supabase Auth
- Row Level Security (RLS) enabled — every row is scoped to `auth.uid()`
- The `VITE_SUPABASE_ANON_KEY` is safe to expose; it can't access any row that doesn't belong to the signed-in user
- `.env` is gitignored

---

<div align="center">

Made with 💛 for someone special

</div>
