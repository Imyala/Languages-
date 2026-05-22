import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { generateWritingPrompt } from "@/lib/writing-ai";

export const runtime = "nodejs";

// GET /api/write/prompt — returns a fresh writing prompt at the user's level.
export async function GET() {
  const { user, profile } = await getOrCreateUser("af");

  if (!profile.placed) {
    return NextResponse.json(
      { error: "Take the placement quiz first." },
      { status: 400 },
    );
  }

  // Top weakness structures over the last 30 days.
  const weaknesses = await prisma.errorTag.groupBy({
    by: ["structure"],
    where: {
      userId: user.id,
      structure: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    },
    _count: { structure: true },
    orderBy: { _count: { structure: "desc" } },
    take: 5,
  });

  // Recent prompt topics (first 60 chars of prompt) so we don't repeat.
  const recent = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { promptText: true },
  });

  try {
    const prompt = await generateWritingPrompt({
      ability: profile.writing,
      weaknesses: weaknesses.map((w) => w.structure!).filter(Boolean),
      recentTopics: recent.map((r) => r.promptText.slice(0, 80)),
    });
    return NextResponse.json({ ok: true, prompt, abilityLevel: profile.writing });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
