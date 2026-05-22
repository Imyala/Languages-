# Gamer · Afrikaans (working title)

Gamified language learning inspired by *The Gamer* — RPG mechanics under a clean surface.
Free-production writing graded by Claude. Stats per skill. Errors feed the next prompt.

This is **v0**: placement quiz + writing loop only. Listening / speaking come later.

## Stack
- Next.js 16 (App Router, TypeScript) — single codebase serves PWA on mobile + desktop web
- Tailwind CSS
- Prisma 6 + SQLite (dev) — swap `DATABASE_URL` for Postgres in prod
- Anthropic SDK (Claude) for prompt generation + grading

## Getting started

```bash
cp .env.example .env
# add your Anthropic key:
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env

npm install
npx prisma migrate dev          # creates dev.db
npm run dev
```

Open http://localhost:3000.

## How it works
1. **Placement** — 12-item adaptive quiz across grammar / vocab / reading. Branching difficulty. Outputs continuous ability scores (0–100) per skill, mapped to CEFR bands.
2. **Writing quest** — Claude generates a writing prompt at your level, targeting your top weakness structures. You write in Afrikaans. Claude returns structured feedback (corrected text, error categories, scores, praise, vocab loot).
3. **Stats update** — Each grading nudges your ability scores ~20% toward Claude's estimate. Errors become a *weakness log* that drives future prompts (spaced repetition over structures, not flashcards).
4. **Lexicon** — Words you used correctly enter your personal lexicon as "loot."

## Deploy

See [DEPLOY.md](./DEPLOY.md). Short version: Vercel + a free Postgres (Neon recommended) + your Claude API key. ~5 minutes once you have the URLs in hand.

## Roadmap (next)
- Listening: dictation/shadowing with TTS + speech-to-text
- Reading: graded passages with comprehension drills
- Speaking: STT + pronunciation scoring
- Multiplayer "boss fights": timed writing duels
- Lexicon as inventory (SRS review queue)
- Auth + cross-device sync
- Additional languages (architecture already keyed by `language`)
