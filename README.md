# CARE — Voice Menu Flow

A Next.js + Supabase implementation of the CARE Voice flow: a Pelapor (reporter)
submits a voice, a rule-based "AI" analyzes and routes it, and a Responder/PIC
(Manager level) processes it through **Open → In Verification → In Progress →
Closed**. Both roles live in this one app (switch with the tabs at the top) and
share the same Supabase-backed data in real time.

This started as a static HTML prototype (still kept at `docs/prototype.html`
for reference) and was rebuilt here as a real app with a persistent database.

## Stack

- **Next.js 16** (App Router, client components, TypeScript, Tailwind CSS v4)
- **Supabase** — Postgres database, Storage (for voice photos), Realtime
- **Vercel** — hosting

## 1. Set up Supabase

1. Create a new project on [supabase.com](https://supabase.com/dashboard) — name it **CARE**.
2. Open the **SQL Editor** and run the full contents of [`supabase/schema.sql`](./supabase/schema.sql).
   It creates the `voices` / `voice_events` / `pic_roster` tables, seeds them with
   demo data (mirrors the original prototype), sets up RLS policies, and
   creates the `voice-photos` storage bucket. Safe to re-run.
3. Go to **Project Settings → API** and copy the **Project URL** and the
   **anon / public** key.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local dev, or set the same two
variables in your Vercel project (**Settings → Environment Variables**):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Open it in two tabs —
one on Pelapor, one on Responder/PIC — to see changes sync live via Supabase
Realtime.

## 4. Deploy to Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick this repo.
2. Name the project **CARE**.
3. Paste in the two environment variables from step 2.
4. Deploy. Every push to the default branch redeploys automatically.

## Security note (read before storing real reports)

This is an MVP without real user authentication — roles are switched
client-side (same as the original prototype), and Supabase Row Level
Security policies are intentionally **permissive** for the `anon` key so the
demo works without a login step. That means anyone with the app URL can
read/write any voice. Before using this for real, sensitive reports, add
Supabase Auth with per-user roles and tighten the RLS policies in
`supabase/schema.sql` accordingly.

## AI classification

Category, severity, and PIC routing are rule-based (keyword matching in
`src/lib/ai.ts` + the `route_pic` Postgres function in the schema) — free,
fast, no external API key required. Swap in a real LLM call there if you want
higher-fidelity classification later.
