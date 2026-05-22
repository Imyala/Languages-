"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusPanel } from "@/components/StatusPanel";

type WritingPrompt = {
  promptTextEnglish: string;
  targetWordCount: string;
  requiredStructures: string[];
  modelAnswer: string;
  encouragement: string;
};

type Grading = {
  correctedText: string;
  errors: Array<{
    category: string;
    structure?: string;
    original: string;
    correction: string;
    explanation: string;
  }>;
  scores: {
    fluency: number;
    accuracy: number;
    complexity: number;
    vocab_range: number;
    task_completion: number;
  };
  praise: string[];
  newWordsUsedCorrectly: string[];
  overallFeedback: string;
  abilityEstimate: { writing: number; grammar: number; vocab: number };
};

type Profile = { reading: number; writing: number; grammar: number; vocab: number };

export default function WritePage() {
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<Grading | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deltas, setDeltas] = useState<Partial<Profile> | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [grading_, setGrading_] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/write/prompt")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error ?? "Failed to load prompt");
        setPrompt(j.prompt as WritingPrompt);
      })
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) =>
        setProfile({
          reading: p.reading,
          writing: p.writing,
          grammar: p.grammar,
          vocab: p.vocab,
        }),
      )
      .catch(() => {});
  }, []);

  async function submit() {
    if (!prompt || text.trim().length === 0 || grading_) return;
    setGrading_(true);
    setError(null);
    try {
      const r = await fetch("/api/write/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userText: text }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "Failed to grade");
      setGrading(j.grading as Grading);
      setProfile(j.profile as Profile);
      setDeltas(j.deltas as Partial<Profile>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGrading_(false);
    }
  }

  async function newPrompt() {
    setLoading(true);
    setPrompt(null);
    setGrading(null);
    setText("");
    setShowModel(false);
    setDeltas(undefined);
    try {
      const r = await fetch("/api/write/prompt");
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? "Failed to load prompt");
      setPrompt(j.prompt as WritingPrompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const needsPlacement = error?.toLowerCase().includes("placement");

  if (needsPlacement) {
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

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12 grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 grid gap-6">
        {loading || !prompt ? (
          <div className="panel p-6 text-[color:var(--muted)]">
            Generating a prompt at your level…
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

        {prompt && !grading ? (
          <div className="grid gap-3">
            <textarea
              className="writing"
              placeholder="Skryf in Afrikaans…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={grading_}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">
                {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Empty"}
              </span>
              <div className="flex gap-3">
                <button
                  className="btn"
                  onClick={() => setShowModel((v) => !v)}
                  disabled={grading_}
                >
                  {showModel ? "Hide model answer" : "Peek at model"}
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!text.trim() || grading_}
                  onClick={submit}
                >
                  {grading_ ? "Grading…" : "Submit for grading"}
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

        {grading ? <GradingView grading={grading} userText={text} /> : null}

        {grading ? (
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={newPrompt}>
              Next prompt
            </button>
            <Link href="/" className="btn">
              Back to status
            </Link>
          </div>
        ) : null}

        {error && !needsPlacement ? (
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
