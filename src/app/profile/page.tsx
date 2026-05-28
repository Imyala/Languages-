"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPanel } from "@/components/StatusPanel";
import { cefrFor } from "@/lib/ability";
import { currentModelId, isModelReady, presetLabelFor } from "@/lib/local-ai";
import {
  db,
  getOrCreateProfile,
  type AbilityProfile,
  type WritingSubmission,
} from "@/lib/storage";

type Weakness = { structure: string; count: number };

export default function ProfilePage() {
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [runs, setRuns] = useState(0);
  const [words, setWords] = useState(0);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [recent, setRecent] = useState<WritingSubmission[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getOrCreateProfile("af");
      setProfile(p);
      const dbi = db();
      setRuns(await dbi.writingSubmissions.count());
      setWords(await dbi.lexicon.where({ language: "af" }).count());
      const tags = await dbi.errorTags.toArray();
      const grouped = new Map<string, number>();
      for (const t of tags) {
        if (t.structure) grouped.set(t.structure, (grouped.get(t.structure) ?? 0) + 1);
      }
      setWeaknesses(
        [...grouped.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([structure, count]) => ({ structure, count })),
      );
      const subs = await dbi.writingSubmissions
        .where("language")
        .equals("af")
        .reverse()
        .sortBy("createdAt");
      setRecent(subs.slice(0, 5));
      setActiveModelId(isModelReady() ? currentModelId() : null);
    })();
  }, []);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-5 py-16 text-center text-[color:var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6 grid gap-4">
      <div>
        <div className="kicker">Profile</div>
        <h1 className="text-xl font-semibold tracking-tight mt-1">
          {profile.placed ? `Level ${cefrFor(profile.writing)}` : "Not placed yet"}
        </h1>
      </div>

      <StatusPanel
        profile={{
          reading: profile.reading,
          writing: profile.writing,
          grammar: profile.grammar,
          vocab: profile.vocab,
        }}
        title="Your levels"
        subtitle={`${runs} lessons · ${words} words known`}
      />

      {weaknesses.length > 0 ? (
        <div className="panel p-4">
          <div className="kicker mb-2">Things to practise</div>
          <ul className="flex flex-wrap gap-2">
            {weaknesses.map((w) => (
              <li
                key={w.structure}
                className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/5"
              >
                <span>{w.structure}</span>
                <span className="text-[color:var(--muted)] ml-1.5">×{w.count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="panel p-4">
          <div className="kicker mb-2">Recent lessons</div>
          <ul className="grid gap-2">
            {recent.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3">
                <span className="text-sm line-clamp-1">{r.promptText}</span>
                <span className="text-[11px] font-mono text-[color:var(--muted)] whitespace-nowrap">
                  {r.deltaWriting >= 0 ? "+" : ""}
                  {r.deltaWriting.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href="/setup"
        className="panel p-4 grid gap-1 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm">Onderwyser</div>
            <div className="text-xs text-[color:var(--muted)] mt-0.5">
              {activeModelId ? `${presetLabelFor(activeModelId)} is active` : "Pick a teacher"}
            </div>
          </div>
          <ArrowRight />
        </div>
      </Link>

      <Link
        href="/placement"
        className="panel p-4 grid gap-1 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm">Retake placement</div>
            <div className="text-xs text-[color:var(--muted)] mt-0.5">
              Re-calibrate your starting level
            </div>
          </div>
          <ArrowRight />
        </div>
      </Link>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[color:var(--muted)]"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
