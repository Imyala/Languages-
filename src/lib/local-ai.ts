// Local AI via WebLLM. Runs entirely in the browser on WebGPU.
// First-time launch downloads the chosen model (~1.5-2 GB) and caches it;
// subsequent launches load from cache and work offline.

"use client";

// WebLLM is large (~6 MB). Import types statically (zero runtime cost) but
// load the implementation only when ensureEngine() is called, via a dynamic
// import. This keeps the WebLLM chunk off every initial page load.
import type { MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
import { z } from "zod";
import { cefrFor } from "./ability";
import { getSetting, setSetting } from "./storage";

// ---------------------------------------------------------------------------
// Model catalogue — surfaced in the UI as user-selectable presets.
// ---------------------------------------------------------------------------

export type ModelPreset = {
  // Internal WebLLM id; not user-visible.
  id: string;
  // Afrikaans name shown to the player.
  label: string;
  // English gloss — small subtitle so non-speakers know what it means.
  english: string;
  // One-line flavor pitch shown in the picker.
  tagline: string;
  description: string;
  approxSizeGB: number;
};

// Player-facing tiers, named in Afrikaans so the picker itself reinforces
// vocabulary. Each name is a real Afrikaans word for a level of education.
// Underlying weights are unchanged — only the labels change.
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Onderwyser",
    english: "teacher",
    tagline: "Default — balanced for most players",
    description: "Solid all-rounder. Reasonable on a phone, sharp on a laptop. ~2.3 GB.",
    approxSizeGB: 2.3,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Meester",
    english: "master",
    tagline: "Strongest at Afrikaans nuance",
    description: "Best non-English coverage; the most demanding grader. ~2.5 GB.",
    approxSizeGB: 2.5,
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Skolier",
    english: "pupil",
    tagline: "Lighter — kinder to phones",
    description: "Smaller download and snappier on mobile. ~1.9 GB.",
    approxSizeGB: 1.9,
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Leerling",
    english: "learner",
    tagline: "Fastest — but visibly weaker",
    description: "Tiny and fast. Misses subtler Afrikaans errors. ~0.9 GB.",
    approxSizeGB: 0.9,
  },
];

export const DEFAULT_MODEL_ID = MODEL_PRESETS[0].id;

export function presetLabelFor(id: string | null): string {
  if (!id) return "Onderwyser";
  return MODEL_PRESETS.find((m) => m.id === id)?.label ?? "Onderwyser";
}

// ---------------------------------------------------------------------------
// Engine singleton + progress events
// ---------------------------------------------------------------------------

type ProgressListener = (p: InitProgressReport) => void;

let engine: MLCEngine | null = null;
let loadedModelId: string | null = null;
let loadingPromise: Promise<MLCEngine> | null = null;
const listeners = new Set<ProgressListener>();

export function onProgress(fn: ProgressListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(p: InitProgressReport) {
  for (const fn of listeners) fn(p);
}

export function isModelReady(): boolean {
  return engine !== null;
}

export function isModelLoading(): boolean {
  return loadingPromise !== null;
}

export function currentModelId(): string | null {
  return loadedModelId;
}

// Components on /write and /chat listen for this to know when the
// background auto-loader has finished its job (or a manual load
// completes), so they can transition out of waiting/picker states
// without polling.
function emitModelStateChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("gl:model-state-change"));
}

export async function ensureEngine(modelId: string = DEFAULT_MODEL_ID): Promise<MLCEngine> {
  // Fast paths.
  if (engine && loadedModelId === modelId) return engine;
  if (loadingPromise && loadedModelId === modelId) return loadingPromise;

  // A different model is already mid-load (e.g. the app-boot auto-loader is
  // still running while the user taps to switch). Wait it out so we don't
  // trample on each other's state, then re-check.
  if (loadingPromise) {
    try {
      await loadingPromise;
    } catch {
      /* ignore — we'll start fresh below */
    }
    if (engine && loadedModelId === modelId) return engine;
  }

  // Switching teachers: unload the previously-loaded engine first so we
  // don't double up on GPU memory.
  if (engine && loadedModelId !== modelId) {
    await unloadEngine();
  }

  loadedModelId = modelId;
  // Dynamic import — webpack splits @mlc-ai/web-llm into its own chunk that
  // only ships the first time we actually need it.
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  loadingPromise = CreateMLCEngine(modelId, {
    initProgressCallback: (p) => emit(p),
  });
  try {
    engine = await loadingPromise;
  } finally {
    loadingPromise = null;
  }
  await markModelDownloaded(modelId);
  emitModelStateChange();
  return engine;
}

export async function unloadEngine(): Promise<void> {
  if (engine) {
    try {
      await engine.unload();
    } catch {
      // best-effort
    }
    engine = null;
    loadedModelId = null;
    emitModelStateChange();
  }
}

// Returns whatever engine the user currently has — the one that's
// already loaded, or the one they most recently chose (which is what
// ModelAutoLoader will have started loading on boot). Never silently
// forces the default; that would unload-and-reload a different teacher
// every time chatTurn / gradeWriting runs and yank the user out of
// their chat.
async function getActiveEngine(): Promise<MLCEngine> {
  if (engine) return engine;
  const savedId = await getSetting("modelId");
  return ensureEngine(savedId || DEFAULT_MODEL_ID);
}

// ---------------------------------------------------------------------------
// Downloaded-model registry
// ---------------------------------------------------------------------------
// WebLLM caches model shards in the browser's Cache API but doesn't expose a
// clean "which models are downloaded?" query. We track our own list in
// IndexedDB and append after every successful ensureEngine — gives the
// picker a "DOWNLOADED" badge to show without inspecting WebLLM internals.

const DOWNLOADED_KEY = "downloadedModelIds";

export async function getDownloadedModelIds(): Promise<string[]> {
  const raw = await getSetting(DOWNLOADED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function markModelDownloaded(id: string): Promise<void> {
  const list = await getDownloadedModelIds();
  if (!list.includes(id)) {
    list.push(id);
    await setSetting(DOWNLOADED_KEY, JSON.stringify(list));
  }
}

// ---------------------------------------------------------------------------
// Prompt + grading helpers (mirror the Claude version, simplified for small models)
// ---------------------------------------------------------------------------

export const WritingPromptSchema = z.object({
  promptTextEnglish: z.string(),
  targetWordCount: z.string(),
  requiredStructures: z.array(z.string()),
  modelAnswer: z.string(),
  encouragement: z.string(),
});
export type WritingPrompt = z.infer<typeof WritingPromptSchema>;

export const GradingSchema = z.object({
  correctedText: z.string(),
  errors: z
    .array(
      z.object({
        category: z.string(),
        structure: z.string().optional(),
        original: z.string(),
        correction: z.string(),
        explanation: z.string(),
      }),
    )
    .default([]),
  scores: z.object({
    fluency: z.number(),
    accuracy: z.number(),
    complexity: z.number(),
    vocab_range: z.number(),
    task_completion: z.number(),
  }),
  praise: z.array(z.string()).default([]),
  newWordsUsedCorrectly: z.array(z.string()).default([]),
  overallFeedback: z.string(),
  abilityEstimate: z.object({
    writing: z.number(),
    grammar: z.number(),
    vocab: z.number(),
  }),
});
export type Grading = z.infer<typeof GradingSchema>;

function parseJsonish<T>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

// Set by abortCurrentGeneration() so the streaming loops bail out at their
// next chunk boundary. Reset at the start of every new jsonChat / chat call.
let abortFlag = false;

export class AbortedError extends Error {
  constructor() {
    super("Generation cancelled.");
    this.name = "AbortedError";
  }
}

export function abortCurrentGeneration(): void {
  abortFlag = true;
  if (engine) {
    try {
      // WebLLM exposes interruptGenerate() to stop the current decode loop.
      (engine as unknown as { interruptGenerate(): void }).interruptGenerate();
    } catch {
      /* best-effort */
    }
  }
}

export type GenProgress = {
  tokens: number;
  textSoFar: string;
  phase: "primary" | "repair";
};

// Stream the model's response so the caller can show live token counts —
// generation can take 30-90s on a phone and a static spinner feels stuck.
// Validates the JSON when the stream finishes; on parse failure, takes one
// repair retry that streams too.
async function jsonChat<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  max_tokens?: number;
  onProgress?: (p: GenProgress) => void;
}): Promise<T> {
  abortFlag = false;
  const eng = await getActiveEngine();

  async function streamOnce(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    temperature: number,
    phase: "primary" | "repair",
  ): Promise<string> {
    const stream = await eng.chat.completions.create({
      messages,
      temperature,
      max_tokens: opts.max_tokens ?? 1024,
      response_format: { type: "json_object" },
      stream: true,
    });
    let acc = "";
    let tokens = 0;
    for await (const chunk of stream as AsyncIterable<{
      choices: Array<{ delta?: { content?: string } }>;
    }>) {
      if (abortFlag) throw new AbortedError();
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        acc += delta;
        tokens += 1;
        opts.onProgress?.({ tokens, textSoFar: acc, phase });
      }
    }
    if (abortFlag) throw new AbortedError();
    return acc;
  }

  const primaryMessages = [
    { role: "system" as const, content: opts.system },
    { role: "user" as const, content: opts.user },
  ];

  let raw = "";
  try {
    raw = await streamOnce(primaryMessages, opts.temperature ?? 0.3, "primary");
    return opts.schema.parse(parseJsonish(raw));
  } catch (firstErr) {
    // Don't waste a second pass on an explicit abort.
    if (firstErr instanceof AbortedError) throw firstErr;
    // One retry with explicit repair hint.
    const repairMessages = [
      ...primaryMessages,
      { role: "assistant" as const, content: raw },
      {
        role: "user" as const,
        content:
          "Your previous reply did not produce a valid JSON object matching the required schema. Reply again with ONLY the JSON object. No prose, no markdown fences.",
      },
    ];
    try {
      const raw2 = await streamOnce(repairMessages, 0, "repair");
      return opts.schema.parse(parseJsonish(raw2));
    } catch (e) {
      if (e instanceof AbortedError) throw e;
      throw firstErr;
    }
  }
}

// ---------------------------------------------------------------------------
// Writing prompt generator
// ---------------------------------------------------------------------------

const PROMPT_SYSTEM = `You design short Afrikaans writing prompts for a language-learning app.
The learner writes in Afrikaans; the prompt itself is in English so beginners can understand the task.
Always reply with one JSON object only, no prose around it.

Schema:
{
  "promptTextEnglish": string (the writing task, in English),
  "targetWordCount": string (e.g. "60-100 words"),
  "requiredStructures": string[] (2-4 grammar features they should try),
  "modelAnswer": string (a natural Afrikaans response that demonstrates target structures),
  "encouragement": string (one short friendly line in English)
}

Calibrate length to level: A1 ~ 25-50 words, A2 ~ 50-80, B1 ~ 80-130, B2 ~ 130-180, C1 ~ 180-250.
Vary topics. Avoid clichéd "describe your daily routine" unless A1.`;

export async function generateWritingPrompt(
  input: {
    ability: number;
    weaknesses: string[];
    recentTopics: string[];
  },
  opts?: { onProgress?: (p: GenProgress) => void },
): Promise<WritingPrompt> {
  const band = cefrFor(input.ability);
  const user = `Learner profile:
- Writing ability: ${input.ability.toFixed(0)}/100 (CEFR ${band})
- Recent weakness structures (incorporate 1-2 if they fit): ${input.weaknesses.join(", ") || "none yet — pick fundamentals appropriate for the level"}
- Avoid repeating these recent topics: ${input.recentTopics.join(", ") || "none"}

Generate the next prompt JSON.`;
  return jsonChat({
    system: PROMPT_SYSTEM,
    user,
    schema: WritingPromptSchema,
    temperature: 0.6,
    max_tokens: 1024,
    onProgress: opts?.onProgress,
  });
}

// ---------------------------------------------------------------------------
// Writing grader
// ---------------------------------------------------------------------------

const GRADE_SYSTEM = `You are an Afrikaans writing tutor. You grade a learner's free writing and return ONE JSON object, no prose around it.

Schema:
{
  "correctedText": string (Afrikaans; preserve voice, fix errors),
  "errors": [{ "category": "grammar|spelling|word_order|word_choice|agreement|tense|article|punctuation|register|other", "structure": string (kebab-case label like "double-negation", "verb-second"), "original": string, "correction": string, "explanation": string (one short sentence) }],
  "scores": { "fluency": 0-100, "accuracy": 0-100, "complexity": 0-100, "vocab_range": 0-100, "task_completion": 0-100 },
  "praise": string[] (specific, not generic),
  "newWordsUsedCorrectly": string[] (lemmas the learner used correctly that are at or above their level),
  "overallFeedback": string (2-3 sentences, encouraging but honest),
  "abilityEstimate": { "writing": 0-100, "grammar": 0-100, "vocab": 0-100 } (your honest CEFR-aligned estimate of THIS submission)
}

Rules:
- Be honest. Short or trivial answers earn low scores even if technically correct.
- Each error must point at a real span from the learner's text in "original" with a concrete fix in "correction".
- Don't rewrite stylistic choices unless they are wrong.`;

export async function gradeWriting(
  input: {
    prompt: WritingPrompt;
    userText: string;
    currentAbility: { writing: number; grammar: number; vocab: number };
  },
  opts?: { onProgress?: (p: GenProgress) => void },
): Promise<Grading> {
  const band = cefrFor(input.currentAbility.writing);
  const user = `Prompt (in English): ${input.prompt.promptTextEnglish}
Target length: ${input.prompt.targetWordCount}
Required structures: ${input.prompt.requiredStructures.join(", ")}

Learner profile:
- Writing ability: ${input.currentAbility.writing.toFixed(0)}/100 (CEFR ${band})
- Grammar ability: ${input.currentAbility.grammar.toFixed(0)}/100
- Vocab ability: ${input.currentAbility.vocab.toFixed(0)}/100

Learner's submission (Afrikaans):
"""
${input.userText}
"""

Grade it. Return only the JSON.`;
  return jsonChat({
    system: GRADE_SYSTEM,
    user,
    schema: GradingSchema,
    temperature: 0.2,
    max_tokens: 2048,
    onProgress: opts?.onProgress,
  });
}

// ---------------------------------------------------------------------------
// Conversational chat (free-form, no JSON shape)
// ---------------------------------------------------------------------------

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatTurnResult = {
  reply: string;
  correction: { corrected: string; note: string } | null;
};

export const CHAT_SCENES: Array<{
  id: string;
  label: string;
  description: string;
  systemSnippet: string;
}> = [
  {
    id: "casual",
    label: "Casual chat",
    description: "Just hang out with a friend.",
    systemSnippet:
      "You and the user are old friends catching up. Keep it warm and easy.",
  },
  {
    id: "cafe",
    label: "At the café",
    description: "Order food and drinks.",
    systemSnippet:
      "You are a friendly server at a South African café. The user is a customer. Greet them, take their order, offer suggestions.",
  },
  {
    id: "directions",
    label: "Asking directions",
    description: "Find your way around town.",
    systemSnippet:
      "You are a local on a Stellenbosch street. The user is a tourist asking for directions or recommendations.",
  },
  {
    id: "shop",
    label: "Shopping",
    description: "Buy clothes, food, anything.",
    systemSnippet:
      "You are a friendly shop assistant in a clothing store. The user is browsing; help them find what they need.",
  },
  {
    id: "doctor",
    label: "Doctor's visit",
    description: "Describe symptoms, get advice.",
    systemSnippet:
      "You are a gentle GP. The user is a patient describing how they feel; ask follow-up questions.",
  },
];

function chatSystemPrompt(scene: typeof CHAT_SCENES[number], ability: number): string {
  const band = cefrFor(ability);
  return `You are an Afrikaans speaker chatting with a CEFR ${band} learner.
Scene: ${scene.systemSnippet}

REPLY:
1-3 sentences in pure Afrikaans. Stay in character. End most replies with a question. Never include English in the reply, never include parenthetical glosses.

CORRECTION (only when the user clearly made a mistake):
Only add a correction block if the user's last message has a CLEAR, UNAMBIGUOUS error that any Afrikaans teacher would mark wrong. If you are not certain, OMIT the block. False corrections damage the learner's trust.

DO correct things like:
- Missing double negation ("Ek is nie moeg" → "Ek is nie moeg nie")
- Wrong past tense form ("Ek het werk" → "Ek het gewerk")
- V2 word-order violation ("Vandag ek gaan winkels toe" → "Vandag gaan ek winkels toe")
- Wrong word entirely ("Ek het 'n boek skryf" → "Ek het 'n boek geskryf")
- Mixing English mid-sentence ("Ek wil eat" → "Ek wil eet")
- Whole message in English

DO NOT correct things like:
- Stylistic variations where multiple Afrikaans phrasings work
- Word choice when both are acceptable
- Sentences that are correct but informal or short
- Missing capitalisation or punctuation
- Spelling variations that are both accepted in modern Afrikaans
- Anything you're unsure about

FORMAT:
After your Afrikaans reply, only when correcting, put a line that is just "###" then on the next lines:
CORRECTED: <the user's message, rewritten correctly in Afrikaans>
WHY: <one short English sentence explaining the change>

Never add the block for synthetic system messages in [brackets].

Example — no error, no block:
User: Ek hou van koffie.
Lekker! Watter soort hou jy van?

Example — real V2 error, include block:
User: Vandag ek gaan winkels toe.
Sjoe, wat wil jy gaan koop?
###
CORRECTED: Vandag gaan ek winkels toe.
WHY: After a time word at the start, the verb stays in second position.

Example — past tense error, include block:
User: Ek het my boek lees gister.
Lekker! Watter boek was dit?
###
CORRECTED: Ek het gister my boek gelees.
WHY: Past tense of "lees" is "gelees", and time adverbs come before the object.

Example — wrote English, include block:
User: I went to the shop.
Probeer in Afrikaans, jy kan dit doen!
###
CORRECTED: Ek het na die winkel toe gegaan.
WHY: Try replying in Afrikaans next time.`;
}

// Reject "corrections" where the rewrite is essentially the same as the
// original. Small models sometimes echo the user's sentence back with a
// trivial change (whitespace, capitalisation, punctuation) and a vague
// note — those aren't real corrections and they erode trust. We normalise
// both sides and drop the block if they collapse to the same tokens.
function isTrivialCorrection(original: string, corrected: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      // Strip all non-letter characters (incl. accents kept).
      .replace(/[^\p{L}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = normalize(original);
  const b = normalize(corrected);
  if (!b) return true;
  return a === b;
}

// Parse the model's plain-text response into reply + optional correction.
// Tolerant: any "###" line on its own marks the start of the correction
// block; missing or malformed blocks just yield correction = null.
function parseChatResponse(raw: string): ChatTurnResult {
  const cleaned = stripParentheticals(raw);
  const split = cleaned.split(/\n\s*#{3,}\s*\n/);
  const reply = split[0].trim();
  if (split.length < 2) return { reply, correction: null };
  const block = split.slice(1).join("\n");
  const correctedMatch = block.match(/CORRECTED\s*:\s*([^\n]+)/i);
  const whyMatch = block.match(/WHY\s*:\s*([^\n]+)/i);
  if (!correctedMatch || !whyMatch) return { reply, correction: null };
  return {
    reply,
    correction: {
      corrected: correctedMatch[1].trim(),
      note: whyMatch[1].trim(),
    },
  };
}

// Models occasionally ignore the no-parens rule. Strip parenthetical text
// from replies before showing them, plus collapse the whitespace it leaves
// behind. Safe because Afrikaans conversation almost never uses parens.
function stripParentheticals(text: string): string {
  return text
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function chatTurn(opts: {
  scene: typeof CHAT_SCENES[number];
  ability: number;
  history: ChatMessage[];
  onToken?: (textSoFar: string, tokenCount: number) => void;
}): Promise<ChatTurnResult> {
  abortFlag = false;
  const eng = await getActiveEngine();

  const lastUser = [...opts.history].reverse().find((m) => m.role === "user");
  const isOpener = lastUser?.content.startsWith("[Start the scene") ?? false;

  // Plain-text streaming (no JSON mode) — grammar-constrained sampling
  // roughly doubles per-token cost on small models, which made chat
  // unusable on phones. We get the reply and the optional correction in
  // one freeform pass and parse them apart by a "###" sentinel.
  const stream = await eng.chat.completions.create({
    messages: [
      { role: "system", content: chatSystemPrompt(opts.scene, opts.ability) },
      ...opts.history,
    ],
    temperature: 0.7,
    max_tokens: 256,
    stream: true,
  });
  let acc = "";
  let tokens = 0;
  for await (const chunk of stream as AsyncIterable<{
    choices: Array<{ delta?: { content?: string } }>;
  }>) {
    if (abortFlag) throw new AbortedError();
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) {
      acc += delta;
      tokens += 1;
      opts.onToken?.(acc, tokens);
    }
  }
  if (abortFlag) throw new AbortedError();

  const parsed = parseChatResponse(acc);
  let correction = parsed.correction;
  // Drop trivial / hallucinated corrections so the user only sees real ones.
  if (correction && lastUser) {
    if (isTrivialCorrection(lastUser.content, correction.corrected)) {
      correction = null;
    }
  }
  return {
    reply: parsed.reply,
    // Suppress corrections on the synthetic [Start the scene] opener.
    correction: isOpener ? null : correction,
  };
}

// Single-word translation. Used as a fallback when the built-in
// dictionary on /chat doesn't have a word. We keep it short, low
// temperature, and tiny max_tokens so it completes in a few seconds
// even on phone hardware, then cache the result so a second tap is
// instant.
export async function translateWord(word: string): Promise<string> {
  abortFlag = false;
  const eng = await getActiveEngine();
  const stream = await eng.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You translate single Afrikaans words into English. Reply with ONLY the English meaning. No quotes, no parentheticals, no explanation. Keep it under 8 words.",
      },
      { role: "user", content: `Translate this Afrikaans word: ${word}` },
    ],
    temperature: 0.1,
    max_tokens: 32,
    stream: true,
  });
  let acc = "";
  for await (const chunk of stream as AsyncIterable<{
    choices: Array<{ delta?: { content?: string } }>;
  }>) {
    if (abortFlag) throw new AbortedError();
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (delta) acc += delta;
  }
  if (abortFlag) throw new AbortedError();
  return acc
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");
}

const AI_TRANSLATION_CACHE_KEY = "aiTranslationCache";

export async function getCachedTranslation(word: string): Promise<string | null> {
  const raw = await getSetting(AI_TRANSLATION_CACHE_KEY);
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw) as Record<string, string>;
    return cache[word.toLowerCase()] ?? null;
  } catch {
    return null;
  }
}

export async function setCachedTranslation(
  word: string,
  translation: string,
): Promise<void> {
  const raw = await getSetting(AI_TRANSLATION_CACHE_KEY);
  let cache: Record<string, string> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") cache = parsed;
    } catch {
      /* corrupt cache; start fresh */
    }
  }
  cache[word.toLowerCase()] = translation;
  await setSetting(AI_TRANSLATION_CACHE_KEY, JSON.stringify(cache));
}

// Same ability-delta math as before.
export function deltasFromGrading(
  current: { writing: number; grammar: number; vocab: number },
  grading: Grading,
): { writing: number; grammar: number; vocab: number } {
  const lr = 0.2;
  return {
    writing: (grading.abilityEstimate.writing - current.writing) * lr,
    grammar: (grading.abilityEstimate.grammar - current.grammar) * lr,
    vocab: (grading.abilityEstimate.vocab - current.vocab) * lr,
  };
}
