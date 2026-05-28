// On-device storage via IndexedDB (Dexie). Mirrors what we used to keep in
// Prisma/SQLite — minus user accounts, since each browser IS the user now.

"use client";

import Dexie, { type EntityTable } from "dexie";

export type Skill = "reading" | "writing" | "grammar" | "vocab";

export type AbilityProfile = {
  id: string; // language code; "af" for v0
  language: string;
  reading: number;
  writing: number;
  grammar: number;
  vocab: number;
  uncertainty: number;
  placed: boolean;
  updatedAt: number;
};

export type PlacementSession = {
  id: string;
  language: string;
  startedAt: number;
  completedAt: number | null;
  asked: string[]; // bank IDs already shown
  order: number; // next item order (1-based)
  total: number;
};

export type PlacementItem = {
  id: string;
  sessionId: string;
  order: number;
  bankId: string;
  difficulty: number;
  skill: Skill;
  response: number | null;
  correct: boolean | null;
};

export type WritingSubmission = {
  id: string;
  language: string;
  createdAt: number;
  promptText: string;
  promptLevel: number;
  userText: string;
  // Grading JSON from local model (kept whole; UI parses on demand)
  gradingJson: string;
  deltaWriting: number;
  deltaGrammar: number;
  deltaVocab: number;
};

export type ErrorTag = {
  id: string;
  submissionId: string;
  createdAt: number;
  category: string;
  structure: string | null;
  example: string | null;
};

export type LexiconEntry = {
  id: string; // `${language}:${lemma}`
  language: string;
  lemma: string;
  firstSeen: number;
  lastUsed: number;
  uses: number;
  mastery: number;
};

export type AppSetting = {
  key: string;
  value: string;
};

class GamerLangDB extends Dexie {
  abilityProfiles!: EntityTable<AbilityProfile, "id">;
  placementSessions!: EntityTable<PlacementSession, "id">;
  placementItems!: EntityTable<PlacementItem, "id">;
  writingSubmissions!: EntityTable<WritingSubmission, "id">;
  errorTags!: EntityTable<ErrorTag, "id">;
  lexicon!: EntityTable<LexiconEntry, "id">;
  settings!: EntityTable<AppSetting, "key">;

  constructor() {
    super("gamer-lang");
    this.version(1).stores({
      abilityProfiles: "id, language",
      placementSessions: "id, language, completedAt",
      placementItems: "id, sessionId, order",
      writingSubmissions: "id, language, createdAt",
      errorTags: "id, submissionId, category, structure",
      lexicon: "id, language, lastUsed, mastery",
      settings: "key",
    });
  }
}

// Singleton — only instantiate in the browser.
let _db: GamerLangDB | null = null;
export function db(): GamerLangDB {
  if (typeof window === "undefined") {
    throw new Error("storage.db() called on the server; client-only.");
  }
  if (!_db) _db = new GamerLangDB();
  return _db;
}

// Convenience helpers --------------------------------------------------------

export async function getOrCreateProfile(language = "af"): Promise<AbilityProfile> {
  const existing = await db().abilityProfiles.get(language);
  if (existing) return existing;
  const fresh: AbilityProfile = {
    id: language,
    language,
    reading: 0,
    writing: 0,
    grammar: 0,
    vocab: 0,
    uncertainty: 1.0,
    placed: false,
    updatedAt: Date.now(),
  };
  await db().abilityProfiles.put(fresh);
  return fresh;
}

export async function updateProfile(
  language: string,
  patch: Partial<AbilityProfile>,
): Promise<AbilityProfile> {
  const current = await getOrCreateProfile(language);
  const next: AbilityProfile = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  await db().abilityProfiles.put(next);
  return next;
}

export function newId(): string {
  // Compatible with non-secure-context UUIDs; uses crypto.randomUUID where available.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getSetting(key: string): Promise<string | undefined> {
  return (await db().settings.get(key))?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db().settings.put({ key, value });
}

// Used by the chat tap-to-translate and the writing grader to record a
// word the learner has chosen to keep. Upserts: bumps `uses` and
// `lastUsed` if it already exists.
export async function addToLexicon(language: string, lemma: string): Promise<void> {
  const id = `${language}:${lemma.toLowerCase()}`;
  const existing = await db().lexicon.get(id);
  if (existing) {
    await db().lexicon.put({
      ...existing,
      uses: existing.uses + 1,
      lastUsed: Date.now(),
    });
  } else {
    await db().lexicon.put({
      id,
      language,
      lemma: lemma.toLowerCase(),
      firstSeen: Date.now(),
      lastUsed: Date.now(),
      uses: 1,
      mastery: 0.1,
    });
  }
}

export async function isInLexicon(language: string, lemma: string): Promise<boolean> {
  const id = `${language}:${lemma.toLowerCase()}`;
  return !!(await db().lexicon.get(id));
}
