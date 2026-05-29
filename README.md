# Gamer · Afrikaans (working title)

Gamified language learning inspired by *The Gamer* — RPG mechanics under a clean surface.
Free-production writing graded by an **on-device AI**. Stats per skill. Errors feed the next prompt.

**Fully offline-capable**: no server, no cloud, no account. The app is a static PWA; the AI model runs in your browser via WebGPU. First launch downloads the model (~1–2 GB) and caches it. After that, the whole app works on a plane.

## Stack
- **Next.js 16** static export (`output: "export"`) — single codebase serves the PWA on mobile + desktop
- **Tailwind CSS**
- **WebLLM** (`@mlc-ai/web-llm`) — Qwen 3 (0.6B / 1.7B / 4B / 8B) running locally on WebGPU
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
| Onderwyser — Qwen 3 4B (default) | ~2.4 GB | Best Afrikaans that still fits most phones |
| Meester — Qwen 3 8B | ~4.8 GB | Top quality; needs ~6 GB GPU memory (laptop tier) |
| Skolier — Qwen 3 1.7B | ~1.0 GB | Lighter, snappier on older phones |
| Leerling — Qwen 3 0.6B | ~0.4 GB | Tiny + fastest; visibly weaker |

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

### GitHub Pages (automated)

The repo ships `.github/workflows/pages.yml`. To enable:

1. Push the branch to `main` (or merge — see below)
2. Go to **Settings → Pages → Build and deployment** → **Source: GitHub Actions**
3. The workflow runs on every push to `main` and on manual dispatch from the Actions tab
4. Once green, your app is live at `https://<your-user>.github.io/Languages-/`

The workflow sets `NEXT_BASE_PATH=/Languages-` so all asset and route URLs are correctly prefixed for the subpath, and writes `.nojekyll` so the `_next/` static chunks aren't ignored. To deploy from any branch on demand, use **Actions → Deploy to GitHub Pages → Run workflow**.

## Roadmap
- Listening: dictation/shadowing using on-device TTS where supported
- Reading: graded passages with comprehension drills (no AI needed; hand-authored)
- Speaking: Web Speech API + pronunciation heuristics
- Lexicon as inventory with SRS review queue
- Additional languages (architecture already keyed by `language`)
- Optional Claude/OpenAI fallback for users who want frontier-quality grading and have a key
