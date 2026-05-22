import { z } from "zod";
import { anthropic, extractText, MODEL, parseJsonish } from "./anthropic";
import { cefrFor } from "./ability";

// ---------------------------------------------------------------------------
// Schemas: validate Claude's structured output before we trust it.
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
  errors: z.array(
    z.object({
      category: z.string(),
      structure: z.string().optional(),
      original: z.string(),
      correction: z.string(),
      explanation: z.string(),
    }),
  ),
  scores: z.object({
    fluency: z.number(),
    accuracy: z.number(),
    complexity: z.number(),
    vocab_range: z.number(),
    task_completion: z.number(),
  }),
  praise: z.array(z.string()),
  newWordsUsedCorrectly: z.array(z.string()),
  overallFeedback: z.string(),
  abilityEstimate: z.object({
    writing: z.number(),
    grammar: z.number(),
    vocab: z.number(),
  }),
});
export type Grading = z.infer<typeof GradingSchema>;

// ---------------------------------------------------------------------------
// Prompt generator
// ---------------------------------------------------------------------------

const PROMPT_SYSTEM = `You are an Afrikaans writing-prompt designer for a gamified language-learning app.
You produce writing prompts targeted at a learner's current level, often emphasizing grammar structures the learner has struggled with so they can practise them in free production.

Hard rules:
- Output ONLY a single JSON object, no preamble, no markdown fences.
- The prompt body is written in ENGLISH so a beginner can understand the task. The learner will respond in Afrikaans.
- "modelAnswer" must be a natural-sounding Afrikaans response that demonstrates target structures.
- Vary topic; avoid clichés like "describe your daily routine" unless the user is A1.
- Calibrate length to level: A1 ≈ 25–50 words, A2 ≈ 50–80, B1 ≈ 80–130, B2 ≈ 130–180, C1 ≈ 180–250.
- The "requiredStructures" list must be 2–4 specific grammar features the learner should attempt.

JSON shape:
{
  "promptTextEnglish": string,
  "targetWordCount": string (e.g. "80-120 words"),
  "requiredStructures": string[],
  "modelAnswer": string (in Afrikaans),
  "encouragement": string (one short line, in English, friendly but not cringey)
}`;

export async function generateWritingPrompt(input: {
  ability: number; // writing ability 0-100
  weaknesses: string[]; // top error structures to target
  recentTopics: string[]; // to avoid repeating
}): Promise<WritingPrompt> {
  const band = cefrFor(input.ability);
  const userMessage = `Learner profile:
- Writing ability: ${input.ability.toFixed(0)}/100 (CEFR: ${band})
- Recent weakness structures to target (try to incorporate 1–2 of these into the required structures): ${input.weaknesses.length ? input.weaknesses.join(", ") : "none yet — pick fundamentals appropriate for the level"}
- Recently used topics (avoid repeating): ${input.recentTopics.length ? input.recentTopics.join(", ") : "none"}

Generate the next prompt.`;

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: PROMPT_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = extractText(response);
  const parsed = parseJsonish<unknown>(text);
  return WritingPromptSchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Grader
// ---------------------------------------------------------------------------

const GRADE_SYSTEM = `You are an expert Afrikaans writing tutor for a gamified language-learning app.
You grade the learner's free-production writing and return structured JSON feedback that the app uses to update a skill tree.

Hard rules:
- Output ONLY a single JSON object, no preamble, no markdown fences.
- "correctedText" should preserve the learner's voice while fixing real errors. Don't rewrite stylistic choices unless they're wrong.
- Each error must point at a concrete span ("original") and give a concrete fix ("correction"). The "explanation" is one short sentence aimed at the learner.
- Use these "category" values exactly: grammar, spelling, word_order, word_choice, agreement, tense, article, punctuation, register, other.
- Where possible set "structure" to a short kebab-case label, e.g. "double-negation", "verb-second", "past-tense-het-ge", "definite-article", "subordinate-clause-order".
- "newWordsUsedCorrectly" contains lemmas (dictionary forms) of words the learner used correctly that are at or above their level — these unlock as "loot".
- Scores 0–100: fluency (natural flow), accuracy (grammatical correctness), complexity (sentence variety/structures attempted), vocab_range (lexical reach), task_completion (did they answer the prompt?).
- "abilityEstimate" is YOUR estimate, on 0–100 CEFR-aligned scale, of the learner's writing/grammar/vocab demonstrated by THIS submission. Be honest. A short or trivial response should get low scores even if technically correct.
- Praise should be specific (mention exactly what they did well), not generic.

JSON shape:
{
  "correctedText": string (Afrikaans),
  "errors": [{ "category": string, "structure": string, "original": string, "correction": string, "explanation": string }],
  "scores": { "fluency": number, "accuracy": number, "complexity": number, "vocab_range": number, "task_completion": number },
  "praise": string[],
  "newWordsUsedCorrectly": string[],
  "overallFeedback": string (2-3 sentences, encouraging but honest),
  "abilityEstimate": { "writing": number, "grammar": number, "vocab": number }
}`;

export async function gradeWriting(input: {
  prompt: WritingPrompt;
  userText: string;
  currentAbility: { writing: number; grammar: number; vocab: number };
}): Promise<Grading> {
  const band = cefrFor(input.currentAbility.writing);
  const userMessage = `Prompt (in English): ${input.prompt.promptTextEnglish}
Target length: ${input.prompt.targetWordCount}
Required structures: ${input.prompt.requiredStructures.join(", ")}

Learner profile:
- Current writing ability: ${input.currentAbility.writing.toFixed(0)}/100 (CEFR: ${band})
- Current grammar ability: ${input.currentAbility.grammar.toFixed(0)}/100
- Current vocab ability: ${input.currentAbility.vocab.toFixed(0)}/100

Learner's submission (in Afrikaans):
"""
${input.userText}
"""

Grade it.`;

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: GRADE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = extractText(response);
  const parsed = parseJsonish<unknown>(text);
  return GradingSchema.parse(parsed);
}

// Convert a grading result into ability deltas to apply to the user's profile.
// We move 20% of the way from current to Claude's estimate per submission.
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
