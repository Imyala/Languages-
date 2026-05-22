"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusPanel } from "@/components/StatusPanel";

type Item = {
  context?: string;
  prompt: string;
  choices: string[];
  skill: string;
  difficulty: number;
};

type StartResp = {
  sessionId: string;
  order: number;
  total: number;
  item: Item;
};

type AnswerResp =
  | { done: false; correct: boolean; explanation: string; order: number; total: number; item: Item }
  | {
      done: true;
      correct: boolean;
      explanation: string;
      profile: { reading: number; writing: number; grammar: number; vocab: number };
    };

export default function PlacementPage() {
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "loading" }
    | {
        phase: "playing";
        sessionId: string;
        order: number;
        total: number;
        item: Item;
        feedback?: { correct: boolean; explanation: string; chosen: number };
        submitting?: boolean;
      }
    | { phase: "done"; profile: { reading: number; writing: number; grammar: number; vocab: number } }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  const started = useRef(false);
  useEffect(() => {
    if (state.phase !== "idle" || started.current) return;
    started.current = true;
    setState({ phase: "loading" });
    fetch("/api/placement/start", { method: "POST" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as StartResp;
      })
      .then((data) =>
        setState({
          phase: "playing",
          sessionId: data.sessionId,
          order: data.order,
          total: data.total,
          item: data.item,
        }),
      )
      .catch((err) => setState({ phase: "error", message: String(err.message ?? err) }));
  }, [state.phase]);

  async function answer(choice: number) {
    if (state.phase !== "playing" || state.feedback || state.submitting) return;
    setState({ ...state, submitting: true });
    const resp = await fetch("/api/placement/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: state.sessionId, choiceIndex: choice }),
    });
    if (!resp.ok) {
      setState({ phase: "error", message: await resp.text() });
      return;
    }
    const data = (await resp.json()) as AnswerResp;
    setState({
      ...state,
      submitting: false,
      feedback: { correct: data.correct, explanation: data.explanation, chosen: choice },
    });

    // After a short pause showing feedback, advance.
    setTimeout(() => {
      if (data.done) {
        setState({ phase: "done", profile: data.profile });
      } else {
        setState({
          phase: "playing",
          sessionId: state.sessionId,
          order: data.order,
          total: data.total,
          item: data.item,
        });
      }
    }, 1600);
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center text-[color:var(--muted)]">
        Spinning up your placement session…
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="panel p-6">
          <div className="kicker mb-2">Error</div>
          <p>{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="max-w-3xl mx-auto px-5 py-12 grid gap-6">
        <div className="panel panel-accent p-6">
          <div className="kicker mb-2">Placement complete</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stats calibrated. Time to write.
          </h1>
          <p className="text-[color:var(--muted)] mt-2">
            These are starting estimates — every writing run from here updates them.
          </p>
        </div>
        <StatusPanel profile={state.profile} title="Starting stats" />
        <div className="flex gap-3">
          <Link href="/write" className="btn btn-primary">
            Start your first writing quest
          </Link>
          <Link href="/" className="btn">
            Back to status
          </Link>
        </div>
      </div>
    );
  }

  const { item, order, total, feedback } = state;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
      <div className="flex items-baseline justify-between">
        <div className="kicker">
          Placement · {order} / {total}
        </div>
        <div className="text-xs font-mono text-[color:var(--muted)]">
          skill: {item.skill} · diff {Math.round(item.difficulty)}
        </div>
      </div>
      <div className="panel p-6 grid gap-5">
        {item.context ? (
          <div className="text-[color:var(--foreground)] leading-relaxed border-l-2 pl-4 border-white/10 italic">
            {item.context}
          </div>
        ) : null}
        <h2 className="text-lg font-medium">{item.prompt}</h2>
        <div className="grid gap-3">
          {item.choices.map((choice, idx) => {
            let cls = "choice";
            if (feedback) {
              if (idx === feedback.chosen && !feedback.correct) cls += " wrong";
              if (feedback.correct && idx === feedback.chosen) cls += " correct";
            }
            return (
              <button
                key={idx}
                className={cls}
                disabled={!!feedback || state.submitting}
                onClick={() => answer(idx)}
              >
                {choice}
              </button>
            );
          })}
        </div>
        {feedback ? (
          <div
            className={`text-sm p-3 rounded-lg border ${
              feedback.correct
                ? "border-[color:var(--good)]/40 bg-[color:var(--good)]/10"
                : "border-[color:var(--bad)]/40 bg-[color:var(--bad)]/10"
            }`}
          >
            <strong className="block mb-1">
              {feedback.correct ? "Correct." : "Not quite."}
            </strong>
            <span className="text-[color:var(--muted)]">{feedback.explanation}</span>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-center text-[color:var(--muted)]">
        Difficulty adapts in real time — items get harder when you&apos;re right and
        easier when you&apos;re wrong.
      </p>
    </div>
  );
}
