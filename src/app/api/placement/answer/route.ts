import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { difficultyForNextItem, updateAbility, type SkillKey } from "@/lib/ability";
import { pickItemByDifficulty } from "@/lib/placement-bank";

export const runtime = "nodejs";

const TOTAL_ITEMS = 12;

type AnswerKey = { correctIndex: number; explanation: string };
type StoredPrompt = {
  context?: string;
  prompt: string;
  choices: string[];
  bankId: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { sessionId: string; choiceIndex: number };
  const { user, profile } = await getOrCreateUser("af");

  const session = await prisma.placementSession.findUnique({
    where: { id: body.sessionId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Mark the current (last-unanswered) item with the user's response.
  const current = session.items.find((i) => i.response === null);
  if (!current) {
    return NextResponse.json({ error: "No pending item" }, { status: 400 });
  }

  const key = JSON.parse(current.answerKey) as AnswerKey;
  const correct = body.choiceIndex === key.correctIndex;

  await prisma.placementItem.update({
    where: { id: current.id },
    data: {
      response: JSON.stringify({ choiceIndex: body.choiceIndex }),
      correct,
      answeredAt: new Date(),
    },
  });

  // Update ability estimates. Placement maps the chosen skill bucket; we also
  // bleed a bit into the overall "writing" because writing depends on grammar+vocab.
  const skill = current.skill as SkillKey;
  const skillAbility =
    skill === "reading"
      ? profile.reading
      : skill === "grammar"
        ? profile.grammar
        : skill === "vocab"
          ? profile.vocab
          : profile.writing;

  const { ability: newSkillAbility, uncertainty: newUncertainty } = updateAbility(
    skillAbility,
    profile.uncertainty,
    current.difficulty,
    correct,
  );

  const updateData: Record<string, number> = { uncertainty: newUncertainty };
  if (skill === "reading") updateData.reading = newSkillAbility;
  if (skill === "grammar") {
    updateData.grammar = newSkillAbility;
    updateData.writing = profile.writing + (newSkillAbility - profile.grammar) * 0.3;
  }
  if (skill === "vocab") {
    updateData.vocab = newSkillAbility;
    updateData.writing = profile.writing + (newSkillAbility - profile.vocab) * 0.2;
  }

  await prisma.abilityProfile.update({
    where: { userId_language: { userId: user.id, language: "af" } },
    data: updateData,
  });

  const order = current.order;
  const explanation = key.explanation;

  // Done?
  if (order >= TOTAL_ITEMS) {
    const final = await prisma.abilityProfile.findUnique({
      where: { userId_language: { userId: user.id, language: "af" } },
    });
    await prisma.placementSession.update({
      where: { id: session.id },
      data: {
        completedAt: new Date(),
        reading: final?.reading,
        writing: final?.writing,
        grammar: final?.grammar,
        vocab: final?.vocab,
      },
    });
    await prisma.abilityProfile.update({
      where: { userId_language: { userId: user.id, language: "af" } },
      data: { placed: true },
    });

    return NextResponse.json({
      done: true,
      correct,
      explanation,
      profile: {
        reading: final?.reading ?? 0,
        writing: final?.writing ?? 0,
        grammar: final?.grammar ?? 0,
        vocab: final?.vocab ?? 0,
      },
    });
  }

  // Pick next item near the user's current center-of-mass ability.
  const profileNow = await prisma.abilityProfile.findUnique({
    where: { userId_language: { userId: user.id, language: "af" } },
  });
  const center =
    ((profileNow?.reading ?? 0) +
      (profileNow?.grammar ?? 0) +
      (profileNow?.vocab ?? 0)) /
    3;

  const askedIds = new Set<string>(
    session.items.map((i) => {
      try {
        return (JSON.parse(i.prompt) as StoredPrompt).bankId;
      } catch {
        return "";
      }
    }),
  );
  const nextDifficulty = difficultyForNextItem(
    center || profile.grammar || 30,
    session.items.map((i) => i.difficulty),
  );
  const next = pickItemByDifficulty(nextDifficulty, askedIds);
  if (!next) {
    return NextResponse.json({
      done: true,
      correct,
      explanation,
      profile: {
        reading: profileNow?.reading ?? 0,
        writing: profileNow?.writing ?? 0,
        grammar: profileNow?.grammar ?? 0,
        vocab: profileNow?.vocab ?? 0,
      },
    });
  }

  await prisma.placementItem.create({
    data: {
      sessionId: session.id,
      order: order + 1,
      difficulty: next.difficulty,
      skill: next.skill,
      prompt: JSON.stringify({
        context: next.context,
        prompt: next.prompt,
        choices: next.choices,
        bankId: next.id,
      }),
      answerKey: JSON.stringify({
        correctIndex: next.correctIndex,
        explanation: next.explanation,
      }),
    },
  });

  return NextResponse.json({
    done: false,
    correct,
    explanation,
    order: order + 1,
    total: TOTAL_ITEMS,
    item: {
      context: next.context,
      prompt: next.prompt,
      choices: next.choices,
      skill: next.skill,
      difficulty: next.difficulty,
    },
  });
}
