# Deploy guide — Vercel + Postgres

Local dev uses SQLite (zero setup). Production runs on **Postgres** because Vercel is serverless — the SQLite file would be wiped between requests.

Both schemas live in this repo:
- `prisma/schema.prisma` — local SQLite (used by `npm run dev`)
- `prisma-prod/schema.prisma` — production Postgres (used by `npm run build:prod` / Vercel)

They define identical models and compile to the same `src/generated/prisma` client. App code is unchanged.

---

## 1. Get a free Postgres database

Pick one — all have free tiers and zero credit-card requirement:

| Provider | URL | Notes |
|---|---|---|
| **Neon** | https://neon.tech | Recommended — fastest signup, generous free tier, branchable DBs |
| **Vercel Postgres** | (set up inside Vercel) | Easiest if you're using Vercel anyway; auto-fills env vars |
| **Supabase** | https://supabase.com | Free tier, also gives you auth + storage if you want them later |

Whichever you pick, copy the **connection string**. It looks like:
```
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

---

## 2. Get a Claude API key

Go to https://console.anthropic.com → API Keys → Create. Copy the `sk-ant-...` key.

---

## 3. Deploy on Vercel

### 3a. Push the repo to GitHub
The repo is already on GitHub at `imyala/Languages-` on branch `claude/gamified-afrikaans-app-kNjtL`. Merge to `main` first if you want main to be the deploy branch, or point Vercel directly at the feature branch.

### 3b. Import to Vercel
1. Go to https://vercel.com/new
2. **Add New Project** → **Import Git Repository**
3. Pick `imyala/Languages-`
4. Vercel will auto-detect Next.js. **Don't change** the framework preset — `vercel.json` overrides the build command for you.

### 3c. Add environment variables
On the **Environment Variables** screen, add both:

| Key | Value | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com |
| `DATABASE_URL` | `postgresql://...` | Step 1 above |

Apply them to all three environments (Production, Preview, Development).

### 3d. Click Deploy
First deploy takes ~2 minutes. Vercel runs the command from `vercel.json`:
```
npx prisma generate --schema=prisma-prod/schema.prisma
npx prisma db push --schema=prisma-prod/schema.prisma --skip-generate --accept-data-loss
next build
```

`db push` creates the Postgres tables on first deploy (and applies non-destructive changes on subsequent deploys).

You'll get a URL like `https://languages-xxxx.vercel.app`. That's your live app.

---

## 4. Test the live app

1. Open the deployed URL on your phone (it's PWA-installable — "Add to Home Screen" works)
2. Take the placement quiz at `/placement`
3. Go to `/write` and try a writing prompt

If the writing page errors with "Anthropic API key" — your `ANTHROPIC_API_KEY` env var is missing or wrong. Re-check in Vercel project settings.

---

## 5. (Optional) Use Postgres locally too

If you want local dev to hit the same Postgres (e.g. to share state with the deployed version, or to test schema changes against the real provider before deploying), set `DATABASE_URL` in your local `.env` to the Postgres URL and use the prod schema:

```bash
# In .env
DATABASE_URL="postgresql://...your-neon-url..."

# Push schema to Postgres
npm run prisma:prod:push

# Run dev server — it'll connect to Postgres now
npm run dev
```

To go back to SQLite, change `.env` to `DATABASE_URL="file:./dev.db"` and run `npm run prisma:dev`.

---

## Upgrading from `db push` to proper migrations

`db push` is fine for v0 — it just syncs the schema. Once you have real users you want to protect, switch to migrations:

```bash
# One-time: generate the initial migration against your Postgres URL
DATABASE_URL="postgresql://..." npx prisma migrate dev --schema=prisma-prod/schema.prisma --name init

# Update vercel.json buildCommand to use `migrate deploy` instead of `db push`:
#   npx prisma migrate deploy --schema=prisma-prod/schema.prisma
```

This commits the migration SQL to the repo and applies them in order on every deploy. Safer for any schema change that touches existing data.

---

## Troubleshooting

**Build fails: `Environment variable not found: DATABASE_URL`**
You didn't add `DATABASE_URL` in Vercel project env vars. Add it and redeploy.

**Build fails: `Can't reach database server`**
Your `DATABASE_URL` is unreachable from Vercel — usually a wrong host, missing `?sslmode=require`, or the DB is paused (Neon pauses free DBs after inactivity; first hit wakes it).

**Runtime error on `/write`: `ANTHROPIC_API_KEY is not set`**
The Vercel function can't see your key. Re-add it in Vercel → Settings → Environment Variables, redeploy.

**Cookies don't persist on Vercel**
We're using an anonymous-id cookie for users. On Vercel it should "just work" since it's HTTPS + same-origin. If a user's stats vanish, check `src/proxy.ts` — the cookie is `httpOnly: true, sameSite: "lax"`.
