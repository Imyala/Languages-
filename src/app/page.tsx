import Link from "next/link";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { StatusPanel } from "@/components/StatusPanel";
import { cefrFor } from "@/lib/ability";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, profile } = await getOrCreateUser("af");

  const [submissionCount, lexiconCount, weaknesses, recent] = await Promise.all([
    prisma.writingSubmission.count({ where: { userId: user.id } }),
    prisma.lexiconEntry.count({ where: { userId: user.id, language: "af" } }),
    prisma.errorTag.groupBy({
      by: ["structure"],
      where: { userId: user.id, structure: { not: null } },
      _count: { structure: true },
      orderBy: { _count: { structure: "desc" } },
      take: 4,
    }),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        createdAt: true,
        promptText: true,
        deltaWriting: true,
        deltaGrammar: true,
        deltaVocab: true,
      },
    }),
  ]);

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
            <div className="mt-5 flex gap-3">
              <Link href="/placement" className="btn btn-primary">
                Start placement
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
              Free-production writing in Afrikaans. We&apos;ll generate a prompt
              targeted at your weaknesses, grade what you write, surface concrete
              corrections, and update your stats from real performance.
            </p>
            <div className="mt-5 flex gap-3">
              <Link href="/write" className="btn btn-primary">
                Start writing
              </Link>
              <Link href="/placement" className="btn">
                Retake placement
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
                  key={w.structure ?? "unknown"}
                  className="text-sm px-3 py-1.5 rounded-full border border-white/10 bg-white/5"
                >
                  <span className="text-[color:var(--foreground)]">{w.structure}</span>
                  <span className="text-[color:var(--muted)] ml-2">×{w._count.structure}</span>
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
          profile={{
            reading: profile.reading,
            writing: profile.writing,
            grammar: profile.grammar,
            vocab: profile.vocab,
          }}
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
            Every prompt is also a measurement. Claude grades your writing, the
            grade nudges your ability per skill, and your errors feed the next
            prompt. Higher uncertainty → bigger steps. Stats converge as you
            practice.
          </p>
        </div>
      </aside>
    </div>
  );
}
