# Gamer · Afrikaans (working title)

Gamified language learning inspired by *The Gamer* — RPG mechanics under a clean surface.
Free-production writing graded by an **on-device AI**. Stats per skill. Errors feed the next prompt.

**Fully offline-capable**: no server, no cloud, no account. The app is a static PWA; the AI model runs in your browser via WebGPU. First launch downloads the model (~1–2 GB) and caches it. After that, the whole app works on a plane.

## Stack
- **Next.js 16** static export (`output: "export"`) — single codebase serves the PWA on mobile + desktop
- **Tailwind CSS**
- **WebLLM** (`@mlc-ai/web-llm`) — Llama 3.2 / Qwen 2.5 / Gemma 2 running locally on WebGPU
- **Dexie** — IndexedDB persistence for all your progress
- **Serwist** — service worker for offline app shell

## Getting started

```bash
npm install
npm run dev
# open http://localhost:3000
```

You'll be prompted to download a model on the first visit to `/write` (or visit `/setup` directly). Pick from:

| Model | Size | Notes |
|---|---|---|
| Llama 3.2 3B (default) | ~2.3 GB | Balanced quality + speed |
| Qwen 2.5 3B | ~2.5 GB | Best multilingual; recommended for Afrikaans |
| Gemma 2 2B | ~1.9 GB | Smaller, faster on phones |
| Llama 3.2 1B | ~0.9 GB | Fastest; noticeably weaker grading |

## How it works

1. **Placement** — 12-item adaptive quiz from a hand-curated A1→C1 Afrikaans bank. No AI needed. Outputs continuous CEFR-aligned ability scores per skill.
2. **Writing quest** — the local model generates an English prompt at your level (incorporating your top weakness structures), you write in Afrikaans, the model grades with structured JSON (corrected text, categorized errors, scores, praise, vocab loot).
3. **Stats update** — each grading nudges your abilities ~20% toward the model's estimate. Errors become a **weakness log** that drives future prompts (spaced repetition over structures, not flashcards).
4. **Lexicon** — words you used correctly enter your personal lexicon.

Everything is stored in your browser's IndexedDB. Clearing site data wipes your progress.

## Browser requirements
- **WebGPU**: Chrome 113+, Edge 113+, Chrome Android. iOS Safari WebGPU is experimental.
- **~3 GB free storage** (model + app + progress)

## Build a static deploy

```bash
npm run build
# → out/ contains the entire deployable site
npm run preview   # serve it locally to test
```

Drop `out/` onto **GitHub Pages**, **Cloudflare Pages**, **Netlify**, **S3**, or any static host. No server required.

## Roadmap
- Listening: dictation/shadowing using on-device TTS where supported
- Reading: graded passages with comprehension drills (no AI needed; hand-authored)
- Speaking: Web Speech API + pronunciation heuristics
- Lexicon as inventory with SRS review queue
- Additional languages (architecture already keyed by `language`)
- Optional Claude/OpenAI fallback for users who want frontier-quality grading and have a key
