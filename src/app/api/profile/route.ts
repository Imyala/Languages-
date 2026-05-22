import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export const runtime = "nodejs";

export async function GET() {
  const { user, profile } = await getOrCreateUser("af");

  const [submissionCount, lexiconCount, recentErrors, recent] = await Promise.all([
    prisma.writingSubmission.count({ where: { userId: user.id } }),
    prisma.lexiconEntry.count({ where: { userId: user.id, language: "af" } }),
    prisma.errorTag.groupBy({
      by: ["structure"],
      where: { userId: user.id, structure: { not: null } },
      _count: { structure: true },
      orderBy: { _count: { structure: "desc" } },
      take: 5,
    }),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
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

  return NextResponse.json({
    placed: profile.placed,
    reading: profile.reading,
    writing: profile.writing,
    grammar: profile.grammar,
    vocab: profile.vocab,
    uncertainty: profile.uncertainty,
    submissionCount,
    lexiconCount,
    topWeaknesses: recentErrors
      .filter((r) => r.structure)
      .map((r) => ({ structure: r.structure as string, count: r._count.structure })),
    recent,
  });
}
