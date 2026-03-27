# Cascade Youth FC — Player Development Platform

A full-stack web application for tracking player development at a Welsh grassroots youth football club. Coaches log match results and training sessions; the platform builds longitudinal player development data over time.

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** — dark, professional design system
- **Supabase** — Postgres database + Auth + Row-Level Security
- **Recharts** — development score charts
- **Deployed on Vercel**

---

## Features

| Page | Description |
|------|-------------|
| `/dashboard` | Summary metrics, recent results, top performers, age-group dev score chart |
| `/match/log` | Two-step form: match details → per-player rating grid (effort, technical, decisions, physical) |
| `/session/log` | Training session log with focus tags and player flags |
| `/players` | Full squad list with dev scores, appearances, goals, trend indicators |
| `/players/[id]` | Player profile with dev score timeline chart, match ratings history, training flags |
| `/login` | Email/password auth via Supabase |

---

## Development Score Formula

Weighted average of per-match ratings:

| Component | Weight |
|-----------|--------|
| Technical | 35% |
| Decisions | 30% |
| Effort | 20% |
| Physical | 15% |

**Trend** is calculated by comparing the average dev score of the last 3 matches vs the 3 before that. A difference > 0.3 = **up/down**, otherwise **stable**.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url>
cd cascade-youth-fc
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these in your Supabase project under **Settings → API**.

### 3. Run the database migration

In the Supabase dashboard, open the **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, RLS policies, and the `coach_clubs` membership table.

### 4. Run the seed script

```bash
npm run seed
```

This will:
- Create the **Cascade Youth FC** club
- Create age groups: **U12, U14, U16, U18** (season 2024/25)
- Add **10–12 players** per age group with realistic Welsh names
- Log **5–6 matches** per age group with player ratings
- Log **4–5 training sessions** per age group with player flags
- Create a **seed coach account** and link it to the club

After seeding, the script prints the login credentials:

```
Email:    coach@cascadefc.wales
Password: Cascade2024!
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the seed credentials.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (seed only) | Service role key — only used in the seed script, never exposed to the browser |

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                    # Authenticated app shell
│   │   ├── layout.tsx            # Sidebar layout
│   │   ├── dashboard/
│   │   ├── match/log/
│   │   ├── session/log/
│   │   └── players/
│   │       └── [id]/
│   ├── auth/callback/route.ts    # Supabase OAuth callback
│   ├── login/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx
│   └── charts/
│       ├── DevelopmentLineChart.tsx
│       └── AgeGroupBarChart.tsx
├── lib/
│   ├── supabase.ts               # Browser client
│   ├── supabase-server.ts        # Server client (SSR)
│   └── calculations.ts           # Dev score formulas
├── middleware.ts                 # Auth guard
└── types/
    └── database.ts               # TypeScript types
supabase/
└── migrations/
    └── 001_initial_schema.sql
scripts/
└── seed.ts
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the three environment variables in the Vercel project settings
4. Deploy — Next.js App Router is supported out of the box

---

## Database Schema

```
clubs ──< age_groups ──< players
       ──< matches ──< match_player_ratings >── players
       ──< training_sessions ──< session_player_flags >── players

auth.users <──< coach_clubs >──> clubs   (RLS: coaches see only their own club)
```

---

## Mobile

The app is fully responsive. The sidebar becomes a fixed bottom navigation bar on mobile, keeping all key actions accessible with one thumb. Match and session forms are designed to be completable in under 8 minutes on a phone in the car park.
