import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "gl_uid";

// Read the cookie set by middleware, then ensure a User + AbilityProfile row
// exists for this (cookie, language) pair. Safe to call from server components.
export async function getOrCreateUser(language = "af") {
  const jar = await cookies();
  const cookieId = jar.get(COOKIE_NAME)?.value;
  if (!cookieId) {
    throw new Error(
      "Missing user cookie; middleware should have set it on the first request.",
    );
  }

  let user = await prisma.user.findUnique({ where: { id: cookieId } });
  if (!user) {
    user = await prisma.user.create({ data: { id: cookieId } });
  }

  const profile = await prisma.abilityProfile.upsert({
    where: { userId_language: { userId: user.id, language } },
    update: {},
    create: { userId: user.id, language },
  });

  return { user, profile };
}
