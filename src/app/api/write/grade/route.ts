import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import {
  deltasFromGrading,
  gradeWriting,
  WritingPromptSchema,
} from "@/lib/writing-ai";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  prompt: WritingPromptSchema,
  userText: z.string().min(1).max(8000),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }
  const { prompt, userText } = parsed.data;
  const { user, profile } = await getOrCreateUser("af");

  let grading;
  try {
    grading = await gradeWriting({
      prompt,
      userText,
      currentAbility: {
        writing: profile.writing,
        grammar: profile.grammar,
        vocab: profile.vocab,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const deltas = deltasFromGrading(
    { writing: profile.writing, grammar: profile.grammar, vocab: profile.vocab },
    grading,
  );

  const submission = await prisma.writingSubmission.create({
    data: {
      userId: user.id,
      language: "af",
      promptText: prompt.promptTextEnglish,
      promptLevel: profile.writing,
      userText,
      gradingJson: JSON.stringify(grading),
      deltaWriting: deltas.writing,
      deltaGrammar: deltas.grammar,
      deltaVocab: deltas.vocab,
    },
  });

  // Persist error tags + new lexicon entries.
  if (grading.errors.length > 0) {
    await prisma.errorTag.createMany({
      data: grading.errors.map((e) => ({
        userId: user.id,
        submissionId: submission.id,
        category: e.category,
        structure: e.structure ?? null,
        example: `${e.original} → ${e.correction}`,
      })),
    });
  }
  for (const lemma of grading.newWordsUsedCorrectly) {
    await prisma.lexiconEntry.upsert({
      where: {
        userId_language_lemma: { userId: user.id, language: "af", lemma },
      },
      update: {
        uses: { increment: 1 },
        lastUsed: new Date(),
        mastery: { increment: 0.1 },
      },
      create: {
        userId: user.id,
        language: "af",
        lemma,
      },
    });
  }

  const updated = await prisma.abilityProfile.update({
    where: { userId_language: { userId: user.id, language: "af" } },
    data: {
      writing: { increment: deltas.writing },
      grammar: { increment: deltas.grammar },
      vocab: { increment: deltas.vocab },
      uncertainty: Math.max(0.1, profile.uncertainty * 0.95),
    },
  });

  return NextResponse.json({
    ok: true,
    grading,
    deltas,
    profile: {
      reading: updated.reading,
      writing: updated.writing,
      grammar: updated.grammar,
      vocab: updated.vocab,
    },
  });
}
