"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPanel } from "@/components/StatusPanel";
import { cefrFor } from "@/lib/ability";
import {
  db,
  getOrCreateProfile,
  type AbilityProfile,
  type WritingSubmission,
} from "@/lib/storage";

type WeaknessRow = { structure: string; count: number };

export default function Home() {
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [lexiconCount, setLexiconCount] = useState(0);
  const [weaknesses, setWeaknesses] = useState<WeaknessRow[]>([]);
  const [recent, setRecent] = useState<WritingSubmission[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getOrCreateProfile("af");
      setProfile(p);
      const dbi = db();
      setSubmissionCount(await dbi.writingSubmissions.count());
      setLexiconCount(await dbi.lexicon.where({ language: "af" }).count());
      const tags = await dbi.errorTags.toArray();
      const grouped = new Map<string, number>();
      for (const t of tags) if (t.structure) grouped.set(t.structure, (grouped.get(t.structure) ?? 0) + 1);
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
      setRecent(subs.slice(0, 4));
    })();
  }, []);

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 text-center text-[color:var(--muted)]">
        Loading your status…
      </div>
    );
  }

  const placed = profile.placed;

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 sm:py-12 grid gap-6 sm:grid-cols-3">
      <section className="sm:col-span-2 grid gap-6">
        {!placed ? (
          <div className="panel p-6">
            <div className="kicker mb-2">New player</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Calibrate your starting stats.
            </h1>
            <p className="text-[color:var(--muted)] mt-2 max-w-prose">
              A short adaptive quiz — 12 items, branching difficulty. We use it to
              place you on a real CEFR-aligned scale, then every writing session
              keeps your stats honest from there. No streaks, no hearts. Just
              writing that gets graded.
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link href="/placement" className="btn btn-primary">
                Start placement
              </Link>
              <Link href="/setup" className="btn">
                Choose mentor
              </Link>
            </div>
          </div>
        ) : (
          <div className="panel p-6">
            <div className="kicker mb-2">Today&apos;s quest</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Write at level {cefrFor(profile.writing)}.
            </h1>
            <p className="text-[color:var(--muted)] mt-2 max-w-prose">
              Free-production writing in Afrikaans, graded on-device. Stats move
              from real performance — not from streaks.
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link href="/write" className="btn btn-primary">
                Start writing
              </Link>
              <Link href="/placement" className="btn">
                Retake placement
              </Link>
              <Link href="/setup" className="btn">
                Mentor
              </Link>
            </div>
          </div>
        )}

        {placed && weaknesses.length > 0 ? (
          <div className="panel p-6">
            <div className="kicker mb-3">Weakness log · drives your next prompts</div>
            <ul className="flex flex-wrap gap-2">
              {weaknesses.map((w) => (
                <li
                  key={w.structure}
                  className="text-sm px-3 py-1.5 rounded-full border border-white/10 bg-white/5"
                >
                  <span className="text-[color:var(--foreground)]">{w.structure}</span>
                  <span className="text-[color:var(--muted)] ml-2">×{w.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {placed && recent.length > 0 ? (
          <div className="panel p-6">
            <div className="kicker mb-3">Recent runs</div>
            <ul className="grid gap-3">
              {recent.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-[color:var(--foreground)] line-clamp-1">
                    {r.promptText}
                  </span>
                  <span className="text-xs font-mono text-[color:var(--muted)] whitespace-nowrap">
                    W {r.deltaWriting >= 0 ? "+" : ""}
                    {r.deltaWriting.toFixed(1)} · G {r.deltaGrammar >= 0 ? "+" : ""}
                    {r.deltaGrammar.toFixed(1)} · V {r.deltaVocab >= 0 ? "+" : ""}
                    {r.deltaVocab.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <aside className="grid gap-6">
        <StatusPanel
          profile={profile}
          title="Status · Afrikaans"
          subtitle={
            placed
              ? `${submissionCount} writing runs · ${lexiconCount} words in lexicon`
              : "Not yet placed"
          }
        />
        <div className="panel p-5">
          <div className="kicker mb-2">How leveling works</div>
          <p className="text-sm text-[color:var(--muted)]">
            Every prompt is also a measurement. Your mentor grades each piece
            of writing, the grade nudges your ability per skill, and your
            errors feed the next prompt. Everything stays on your device.
          </p>
        </div>
      </aside>
    </div>
  );
}
