import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { pickItemByDifficulty } from "@/lib/placement-bank";

export const runtime = "nodejs";

// POST /api/placement/start — create a fresh placement session, return first item.
export async function POST() {
  const { user } = await getOrCreateUser("af");

  const session = await prisma.placementSession.create({
    data: { userId: user.id, language: "af" },
  });

  // Start near A2 (~30) and adapt from there.
  const first = pickItemByDifficulty(30, new Set());
  if (!first) {
    return NextResponse.json({ error: "Placement bank empty" }, { status: 500 });
  }

  await prisma.placementItem.create({
    data: {
      sessionId: session.id,
      order: 1,
      difficulty: first.difficulty,
      skill: first.skill,
      prompt: JSON.stringify({
        context: first.context,
        prompt: first.prompt,
        choices: first.choices,
        bankId: first.id,
      }),
      answerKey: JSON.stringify({ correctIndex: first.correctIndex, explanation: first.explanation }),
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    order: 1,
    total: 12,
    item: {
      context: first.context,
      prompt: first.prompt,
      choices: first.choices,
      skill: first.skill,
      difficulty: first.difficulty,
    },
  });
}
