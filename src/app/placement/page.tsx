"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusPanel } from "@/components/StatusPanel";
import {
  difficultyForNextItem,
  updateAbility,
  type SkillKey,
} from "@/lib/ability";
import {
  PLACEMENT_BANK_AF,
  pickItemByDifficulty,
  type PlacementMCQ,
} from "@/lib/placement-bank";
import {
  db,
  getOrCreateProfile,
  newId,
  updateProfile,
  type AbilityProfile,
  type PlacementSession,
} from "@/lib/storage";

const TOTAL_ITEMS = 12;

type Phase =
  | { phase: "loading" }
  | {
      phase: "playing";
      session: PlacementSession;
      item: PlacementMCQ;
      feedback?: { correct: boolean; chosen: number };
      submitting?: boolean;
    }
  | { phase: "done"; profile: AbilityProfile }
  | { phase: "error"; message: string };

export default function PlacementPage() {
  const [state, setState] = useState<Phase>({ phase: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        await getOrCreateProfile("af");
        // Start a new session.
        const session: PlacementSession = {
          id: newId(),
          language: "af",
          startedAt: Date.now(),
          completedAt: null,
          asked: [],
          order: 1,
          total: TOTAL_ITEMS,
        };
        await db().placementSessions.put(session);

        const first = pickItemByDifficulty(30, new Set());
        if (!first) throw new Error("Placement bank empty");
        await db().placementItems.put({
          id: newId(),
          sessionId: session.id,
          order: 1,
          bankId: first.id,
          difficulty: first.difficulty,
          skill: first.skill,
          response: null,
          correct: null,
        });
        await db().placementSessions.put({ ...session, asked: [first.id] });

        setState({
          phase: "playing",
          session: { ...session, asked: [first.id] },
          item: first,
        });
      } catch (e) {
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  }, []);

  async function answer(choice: number) {
    if (state.phase !== "playing" || state.feedback || state.submitting) return;
    setState({ ...state, submitting: true });

    const correct = choice === state.item.correctIndex;

    // Mark the current placementItem with the answer.
    const items = await db()
      .placementItems.where({ sessionId: state.session.id })
      .toArray();
    const current = items.find((i) => i.order === state.session.order);
    if (current) {
      await db().placementItems.put({ ...current, response: choice, correct });
    }

    // Update ability via the same math we used server-side.
    const profile = await getOrCreateProfile("af");
    const skill = state.item.skill as SkillKey;
    const ability =
      skill === "reading"
        ? profile.reading
        : skill === "grammar"
          ? profile.grammar
          : skill === "vocab"
            ? profile.vocab
            : profile.writing;
    const { ability: newAbility, uncertainty: newUncertainty } = updateAbility(
      ability,
      profile.uncertainty,
      state.item.difficulty,
      correct,
    );

    const patch: Partial<AbilityProfile> = { uncertainty: newUncertainty };
    if (skill === "reading") patch.reading = newAbility;
    if (skill === "grammar") {
      patch.grammar = newAbility;
      patch.writing = profile.writing + (newAbility - profile.grammar) * 0.3;
    }
    if (skill === "vocab") {
      patch.vocab = newAbility;
      patch.writing = profile.writing + (newAbility - profile.vocab) * 0.2;
    }
    const updated = await updateProfile("af", patch);

    setState({
      ...state,
      submitting: false,
      feedback: { correct, chosen: choice },
    });

    setTimeout(async () => {
      const isLast = state.session.order >= TOTAL_ITEMS;
      if (isLast) {
        const finalProfile = await updateProfile("af", { placed: true });
        await db().placementSessions.put({
          ...state.session,
          completedAt: Date.now(),
          order: state.session.order,
        });
        setState({ phase: "done", profile: finalProfile });
        return;
      }
      // Pick next item.
      const askedIds = new Set(state.session.asked);
      const center = (updated.grammar + updated.vocab + updated.reading) / 3;
      const askedDifficulties = (
        await db()
          .placementItems.where({ sessionId: state.session.id })
          .toArray()
      ).map((i) => i.difficulty);
      const nextDifficulty = difficultyForNextItem(
        center || updated.grammar || 30,
        askedDifficulties,
      );
      const next = pickItemByDifficulty(nextDifficulty, askedIds);
      if (!next) {
        const finalProfile = await updateProfile("af", { placed: true });
        setState({ phase: "done", profile: finalProfile });
        return;
      }
      const newOrder = state.session.order + 1;
      const newAsked = [...state.session.asked, next.id];
      await db().placementItems.put({
        id: newId(),
        sessionId: state.session.id,
        order: newOrder,
        bankId: next.id,
        difficulty: next.difficulty,
        skill: next.skill,
        response: null,
        correct: null,
      });
      const newSession = {
        ...state.session,
        order: newOrder,
        asked: newAsked,
      };
      await db().placementSessions.put(newSession);
      setState({ phase: "playing", session: newSession, item: next });
    }, 1600);
  }

  if (state.phase === "loading") {
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

  const { item, session, feedback } = state;
  // Look up explanation by ID (placement bank has it).
  const bankItem = PLACEMENT_BANK_AF.find((i) => i.id === item.id);
  const explanation = bankItem?.explanation ?? "";

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
      <div className="flex items-baseline justify-between">
        <div className="kicker">
          Placement · {session.order} / {TOTAL_ITEMS}
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
            <span className="text-[color:var(--muted)]">{explanation}</span>
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
