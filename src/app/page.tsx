"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cefrFor } from "@/lib/ability";
import {
  db,
  getOrCreateProfile,
  type AbilityProfile,
} from "@/lib/storage";

export default function LearnPage() {
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [runs, setRuns] = useState(0);
  const [words, setWords] = useState(0);

  useEffect(() => {
    (async () => {
      const p = await getOrCreateProfile("af");
      setProfile(p);
      setRuns(await db().writingSubmissions.count());
      setWords(await db().lexicon.where({ language: "af" }).count());
    })();
  }, []);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center text-[color:var(--muted)]">
        Loading…
      </div>
    );
  }

  // Onboarding gate: take placement first.
  if (!profile.placed) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 grid gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-[color:var(--muted)] mt-2">
            A short adaptive quiz puts you at the right level. About 5 minutes.
          </p>
        </div>
        <Link href="/placement" className="btn btn-primary py-4 text-base">
          Start placement quiz
        </Link>
      </div>
    );
  }

  const band = cefrFor(profile.writing);

  return (
    <div className="max-w-md mx-auto px-5 py-6 grid gap-4">
      {/* Tiny pill at the top — level + stats at a glance. */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[color:var(--muted)]">
          Your level <span className="text-[color:var(--foreground)] font-semibold">{band}</span>
        </span>
        <span className="text-[color:var(--muted)]">
          <span className="text-[color:var(--foreground)] font-semibold">{words}</span> words ·{" "}
          <span className="text-[color:var(--foreground)] font-semibold">{runs}</span> lessons
        </span>
      </div>

      {/* Primary action — Duolingo-style big "continue" button. */}
      <Link
        href="/write"
        className="panel panel-accent p-6 grid gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="kicker">Today&apos;s lesson</div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Writing</h2>
            <p className="text-sm text-[color:var(--muted)] mt-1">
              Free writing graded by your onderwyser. Adjusts to your level.
            </p>
          </div>
          <ArrowRight />
        </div>
      </Link>

      {/* Conversation practice. */}
      <Link
        href="/chat"
        className="panel p-5 grid gap-2 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Chat practice</h3>
            <p className="text-sm text-[color:var(--muted)] mt-0.5">
              Real back-and-forth conversations in Afrikaans.
            </p>
          </div>
          <ArrowRight />
        </div>
      </Link>

      {/* Coming-soon stubs so users can see what's planned. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4 grid gap-1 opacity-60">
          <div className="font-medium text-sm">Vocabulary</div>
          <div className="text-[11px] text-[color:var(--muted)]">Soon</div>
        </div>
        <div className="panel p-4 grid gap-1 opacity-60">
          <div className="font-medium text-sm">Sentence drills</div>
          <div className="text-[11px] text-[color:var(--muted)]">Soon</div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[color:var(--muted)]"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}
