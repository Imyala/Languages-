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

// ---------------------------------------------------------------------------
// Model catalogue — surfaced in the UI as user-selectable presets.
// ---------------------------------------------------------------------------

export type ModelPreset = {
  // Internal WebLLM id; not user-visible.
  id: string;
  // App-native name shown to the player.
  label: string;
  // Short flavor tag shown in the picker.
  tagline: string;
  description: string;
  approxSizeGB: number;
};

// Player-facing mentor tiers. The underlying open-source weights stay the same;
// only the names change so the experience feels like part of the app rather
// than an obvious wrapper around someone else's model.
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    label: "Mentor",
    tagline: "Default — balanced for most players",
    description: "Solid grader. Reasonable on a phone, sharp on a laptop. ~2.3 GB.",
    approxSizeGB: 2.3,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Polyglot",
    tagline: "Strongest at Afrikaans nuance",
    description: "Best non-English coverage. Slightly larger and slower. ~2.5 GB.",
    approxSizeGB: 2.5,
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Scholar",
    tagline: "Lighter — kinder to phones",
    description: "Smaller download and snappier on mobile. ~1.9 GB.",
    approxSizeGB: 1.9,
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Apprentice",
    tagline: "Fastest — but visibly weaker",
    description: "Tiny and fast. Misses subtler Afrikaans errors. ~0.9 GB.",
    approxSizeGB: 0.9,
  },
];

export const DEFAULT_MODEL_ID = MODEL_PRESETS[0].id;

export function presetLabelFor(id: string | null): string {
  if (!id) return "Mentor";
  return MODEL_PRESETS.find((m) => m.id === id)?.label ?? "Mentor";
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

export function currentModelId(): string | null {
  return loadedModelId;
}

export async function ensureEngine(modelId: string = DEFAULT_MODEL_ID): Promise<MLCEngine> {
  if (engine && loadedModelId === modelId) return engine;
  if (loadingPromise && loadedModelId === modelId) return loadingPromise;

  loadedModelId = modelId;
  // Dynamic import — webpack splits @mlc-ai/web-llm into its own chunk that
  // only ships the first time the user clicks "Download & load".
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  loadingPromise = CreateMLCEngine(modelId, {
    initProgressCallback: (p) => emit(p),
  });
  engine = await loadingPromise;
  loadingPromise = null;
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
  const eng = await ensureEngine();

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
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        acc += delta;
        tokens += 1;
        opts.onProgress?.({ tokens, textSoFar: acc, phase });
      }
    }
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
    } catch {
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
