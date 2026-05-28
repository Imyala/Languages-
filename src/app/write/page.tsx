"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusPanel } from "@/components/StatusPanel";
import { ModelLoader } from "@/components/ModelLoader";
import {
  AbortedError,
  abortCurrentGeneration,
  deltasFromGrading,
  gradeWriting,
  isModelReady,
  type Grading,
  type WritingPrompt,
} from "@/lib/local-ai";
import {
  getSeenWritingPromptIds,
  markWritingPromptSeen,
  pickWritingPrompt,
} from "@/lib/writing-prompts";
import {
  db,
  getOrCreateProfile,
  newId,
  updateProfile,
  type AbilityProfile,
} from "@/lib/storage";

type Stage =
  | "needs-placement"
  | "needs-model"
  | "loading-prompt"
  | "writing"
  | "grading"
  | "graded";

export default function WritePage() {
  const [stage, setStage] = useState<Stage>("loading-prompt");
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [text, setText] = useState("");
  const [grading, setGrading] = useState<Grading | null>(null);
  const [deltas, setDeltas] = useState<Partial<AbilityProfile> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  // Live generation progress — fed by the streaming token callback.
  const [genTokens, setGenTokens] = useState(0);
  const [genElapsedMs, setGenElapsedMs] = useState(0);
  const [genPhase, setGenPhase] = useState<"primary" | "repair">("primary");
  const genStartedAt = useRef<number | null>(null);
  const initialized = useRef(false);

  // Wall-clock elapsed counter — ticks every second while a model call is
  // in flight so the user can see something is still happening even when
  // tokens haven't landed yet (especially on phone CPUs).
  useEffect(() => {
    if (stage !== "loading-prompt" && stage !== "grading") return;
    if (genStartedAt.current == null) genStartedAt.current = Date.now();
    const id = setInterval(() => {
      setGenElapsedMs(Date.now() - (genStartedAt.current ?? Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  function beginGenerationTimer() {
    setGenTokens(0);
    setGenElapsedMs(0);
    setGenPhase("primary");
    genStartedAt.current = Date.now();
  }

  function formatDuration(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const p = await getOrCreateProfile("af");
      setProfile(p);
      if (!p.placed) {
        setStage("needs-placement");
        return;
      }
      if (!isModelReady()) {
        setStage("needs-model");
        return;
      }
      await loadPrompt();
    })();
  }, []);

  async function loadPrompt() {
    // No LLM call here — prompts are served instantly from a hand-curated
    // bank. The model only runs when the user submits for grading.
    setError(null);
    try {
      const p = await getOrCreateProfile("af");
      const tags = await db().errorTags.toArray();
      const grouped = new Map<string, number>();
      for (const t of tags) {
        if (t.structure) grouped.set(t.structure, (grouped.get(t.structure) ?? 0) + 1);
      }
      const weaknesses = [...grouped.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

      const seenIds = await getSeenWritingPromptIds();
      const picked = pickWritingPrompt({
        targetDifficulty: p.writing,
        excludeIds: seenIds,
        weaknessStructures: weaknesses,
      });
      if (!picked) {
        setError("No writing prompts available at your level yet.");
        setStage("writing");
        return;
      }
      await markWritingPromptSeen(picked.id);

      // Translate the bank item into the WritingPrompt shape the grader uses.
      const fresh: WritingPrompt = {
        promptTextEnglish: picked.promptTextEnglish,
        targetWordCount: picked.targetWordCount,
        requiredStructures: picked.targetStructures,
        modelAnswer: picked.modelAnswer,
        encouragement: picked.encouragement ?? "",
      };
      setPrompt(fresh);
      setText("");
      setGrading(null);
      setDeltas(undefined);
      setShowModel(false);
      setStage("writing");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("writing");
    }
  }

  async function submit() {
    if (!prompt || !text.trim()) return;
    beginGenerationTimer();
    setStage("grading");
    setError(null);
    try {
      const p = await getOrCreateProfile("af");
      const g = await gradeWriting(
        {
          prompt,
          userText: text,
          currentAbility: { writing: p.writing, grammar: p.grammar, vocab: p.vocab },
        },
        {
          onProgress: ({ tokens, phase }) => {
            setGenTokens(tokens);
            setGenPhase(phase);
          },
        },
      );
      const d = deltasFromGrading(
        { writing: p.writing, grammar: p.grammar, vocab: p.vocab },
        g,
      );

      // Persist submission.
      const submissionId = newId();
      await db().writingSubmissions.put({
        id: submissionId,
        language: "af",
        createdAt: Date.now(),
        promptText: prompt.promptTextEnglish,
        promptLevel: p.writing,
        userText: text,
        gradingJson: JSON.stringify(g),
        deltaWriting: d.writing,
        deltaGrammar: d.grammar,
        deltaVocab: d.vocab,
      });

      // Error tags.
      if (g.errors.length > 0) {
        await db().errorTags.bulkPut(
          g.errors.map((e) => ({
            id: newId(),
            submissionId,
            createdAt: Date.now(),
            category: e.category,
            structure: e.structure ?? null,
            example: `${e.original} → ${e.correction}`,
          })),
        );
      }

      // Lexicon additions.
      for (const lemma of g.newWordsUsedCorrectly) {
        const id = `af:${lemma}`;
        const existing = await db().lexicon.get(id);
        if (existing) {
          await db().lexicon.put({
            ...existing,
            uses: existing.uses + 1,
            lastUsed: Date.now(),
            mastery: Math.min(1, existing.mastery + 0.1),
          });
        } else {
          await db().lexicon.put({
            id,
            language: "af",
            lemma,
            firstSeen: Date.now(),
            lastUsed: Date.now(),
            uses: 1,
            mastery: 0.1,
          });
        }
      }

      const updated = await updateProfile("af", {
        writing: p.writing + d.writing,
        grammar: p.grammar + d.grammar,
        vocab: p.vocab + d.vocab,
        uncertainty: Math.max(0.1, p.uncertainty * 0.95),
      });

      setGrading(g);
      setDeltas(d);
      setProfile(updated);
      setStage("graded");
    } catch (e) {
      if (e instanceof AbortedError) {
        setError("Grading cancelled. Tap submit again to retry.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      setStage("writing");
    }
  }

  function cancelGeneration() {
    abortCurrentGeneration();
  }

  // -----------------------------------------------------------------------
  // Renders
  // -----------------------------------------------------------------------

  if (stage === "needs-placement") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="panel p-6">
          <div className="kicker mb-2">Hold on</div>
          <h1 className="text-xl font-semibold tracking-tight">
            Take the placement quiz first.
          </h1>
          <p className="text-[color:var(--muted)] mt-2">
            We need a starting point for your stats before we can tune writing
            prompts to your level.
          </p>
          <div className="mt-5">
            <Link href="/placement" className="btn btn-primary">
              Start placement
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "needs-model") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
        <div>
          <div className="kicker mb-2">One-time setup</div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pick your onderwyser.
          </h1>
          <p className="text-[color:var(--muted)] mt-2 max-w-prose">
            One-time download. Once cached, your teacher stays on your device
            and works offline.
          </p>
        </div>
        <ModelLoader auto onReady={() => loadPrompt()} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12 grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 grid gap-6">
        {stage === "loading-prompt" || !prompt ? (
          <div className="panel p-6 text-sm text-[color:var(--muted)]">
            Loading prompt…
          </div>
        ) : (
          <div className="panel panel-accent p-6">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div className="kicker">Writing quest</div>
              <span className="text-xs font-mono text-[color:var(--muted)]">
                {prompt.targetWordCount}
              </span>
            </div>
            <p className="text-lg leading-relaxed">{prompt.promptTextEnglish}</p>
            {prompt.requiredStructures.length > 0 ? (
              <div className="mt-4">
                <div className="kicker mb-2">Try to use</div>
                <ul className="flex flex-wrap gap-2">
                  {prompt.requiredStructures.map((s) => (
                    <li
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {prompt.encouragement ? (
              <p className="text-sm text-[color:var(--muted)] italic mt-4">
                {prompt.encouragement}
              </p>
            ) : null}
          </div>
        )}

        {stage === "writing" && prompt ? (
          <div className="grid gap-3">
            <textarea
              className="writing"
              placeholder="Skryf in Afrikaans…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">
                {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Empty"}
              </span>
              <div className="flex gap-3">
                <button className="btn" onClick={() => setShowModel((v) => !v)}>
                  {showModel ? "Hide model answer" : "Peek at model"}
                </button>
                <button className="btn btn-primary" disabled={!text.trim()} onClick={submit}>
                  Submit for grading
                </button>
              </div>
            </div>
            {showModel && prompt ? (
              <div className="panel p-4 text-sm text-[color:var(--muted)]">
                <div className="kicker mb-2">Model answer (use as last resort)</div>
                <p className="text-[color:var(--foreground)]/90 whitespace-pre-wrap">
                  {prompt.modelAnswer}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {stage === "grading" ? (
          <div className="panel p-5 grid gap-3">
            <div className="kicker">Grading</div>
            <div className="flex items-baseline justify-between gap-3 text-xs font-mono text-[color:var(--muted)]">
              <span>
                {genTokens > 0
                  ? `${genTokens} tokens${genPhase === "repair" ? " · repair pass" : ""}`
                  : "Reading your text…"}
              </span>
              <span>{formatDuration(genElapsedMs)} elapsed</span>
            </div>
            <div className="skill-bar">
              {/* Grading max_tokens is 2048. */}
              <div
                className="fill"
                style={{
                  width: `${Math.max(6, Math.min(100, Math.round((genTokens / 2048) * 100)))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[color:var(--muted)]/70 flex-1">
                {genElapsedMs > 90000
                  ? "Taking longer than expected. Cancel and try again, or pick a lighter teacher in Setup."
                  : "Your onderwyser is reading your text. Each token tick means it's working — feedback drops as soon as the response is complete."}
              </p>
              <button className="btn" onClick={cancelGeneration}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {stage === "graded" && grading ? <GradingView grading={grading} userText={text} /> : null}

        {stage === "graded" ? (
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={loadPrompt}>
              Next prompt
            </button>
            <Link href="/" className="btn">
              Back to status
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="panel p-4 border-[color:var(--bad)]/30 text-sm">
            <span className="kicker text-[color:var(--bad)] mr-2">Error</span>
            {error}
          </div>
        ) : null}
      </section>

      <aside className="grid gap-6 content-start">
        {profile ? (
          <StatusPanel
            profile={profile}
            deltas={deltas}
            title="Live status"
            subtitle={deltas ? "Updated from this submission" : undefined}
          />
        ) : null}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function GradingView({ grading, userText }: { grading: Grading; userText: string }) {
  return (
    <div className="grid gap-4">
      <div className="panel p-5">
        <div className="kicker mb-2">Overall</div>
        <p className="text-[color:var(--foreground)]/95">{grading.overallFeedback}</p>
        <div className="grid grid-cols-5 gap-3 mt-4">
          {(["fluency", "accuracy", "complexity", "vocab_range", "task_completion"] as const).map(
            (k) => (
              <ScorePip key={k} label={prettify(k)} value={grading.scores[k]} />
            ),
          )}
        </div>
      </div>

      {grading.errors.length > 0 ? (
        <div className="panel p-5">
          <div className="kicker mb-3">Corrections · {grading.errors.length}</div>
          <ul className="grid gap-3">
            {grading.errors.map((e, i) => (
              <li key={i} className="border border-white/5 rounded-lg p-3">
                <div className="text-xs font-mono text-[color:var(--muted)] mb-1">
                  {e.category}
                  {e.structure ? ` · ${e.structure}` : ""}
                </div>
                <div className="text-sm">
                  <span className="text-[color:var(--bad)] line-through">{e.original}</span>
                  <span className="mx-2 text-[color:var(--muted)]">→</span>
                  <span className="text-[color:var(--good)]">{e.correction}</span>
                </div>
                <p className="text-xs text-[color:var(--muted)] mt-1">{e.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="panel p-5 grid gap-3">
        <div className="kicker">Your text vs. corrected</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="border border-white/5 rounded-lg p-3">
            <div className="text-xs text-[color:var(--muted)] mb-1">You wrote</div>
            <p className="whitespace-pre-wrap">{userText}</p>
          </div>
          <div className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
            <div className="text-xs text-[color:var(--muted)] mb-1">Corrected</div>
            <p className="whitespace-pre-wrap">{grading.correctedText}</p>
          </div>
        </div>
      </div>

      {grading.praise.length > 0 ? (
        <div className="panel p-5">
          <div className="kicker mb-2">What worked</div>
          <ul className="grid gap-1.5 text-sm">
            {grading.praise.map((p, i) => (
              <li key={i} className="text-[color:var(--good)]/90">
                · {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {grading.newWordsUsedCorrectly.length > 0 ? (
        <div className="panel p-5">
          <div className="kicker mb-3">Loot · added to your lexicon</div>
          <ul className="flex flex-wrap gap-2">
            {grading.newWordsUsedCorrectly.map((w) => (
              <li
                key={w}
                className="text-sm px-2.5 py-1 rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ScorePip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold tabular-nums">{Math.round(value)}</div>
      <div className="text-[10px] uppercase tracking-wide text-[color:var(--muted)] mt-0.5">
        {label}
      </div>
    </div>
  );
}

function prettify(s: string) {
  return s.replace(/_/g, " ");
}
