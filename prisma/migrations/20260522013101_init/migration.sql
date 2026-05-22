-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AbilityProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "reading" REAL NOT NULL DEFAULT 0,
    "writing" REAL NOT NULL DEFAULT 0,
    "grammar" REAL NOT NULL DEFAULT 0,
    "vocab" REAL NOT NULL DEFAULT 0,
    "uncertainty" REAL NOT NULL DEFAULT 1.0,
    "placed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AbilityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "reading" REAL,
    "writing" REAL,
    "grammar" REAL,
    "vocab" REAL,
    CONSTRAINT "PlacementSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacementItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "difficulty" REAL NOT NULL,
    "skill" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answerKey" TEXT NOT NULL,
    "response" TEXT,
    "correct" BOOLEAN,
    "answeredAt" DATETIME,
    CONSTRAINT "PlacementItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlacementSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WritingSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "promptLevel" REAL NOT NULL,
    "userText" TEXT NOT NULL,
    "gradingJson" TEXT NOT NULL,
    "deltaWriting" REAL NOT NULL DEFAULT 0,
    "deltaGrammar" REAL NOT NULL DEFAULT 0,
    "deltaVocab" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WritingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT,
    "category" TEXT NOT NULL,
    "structure" TEXT,
    "example" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ErrorTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ErrorTag_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LexiconEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uses" INTEGER NOT NULL DEFAULT 1,
    "mastery" REAL NOT NULL DEFAULT 0.1,
    CONSTRAINT "LexiconEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AbilityProfile_userId_language_key" ON "AbilityProfile"("userId", "language");

-- CreateIndex
CREATE INDEX "PlacementItem_sessionId_order_idx" ON "PlacementItem"("sessionId", "order");

-- CreateIndex
CREATE INDEX "ErrorTag_userId_category_idx" ON "ErrorTag"("userId", "category");

-- CreateIndex
CREATE INDEX "ErrorTag_userId_structure_idx" ON "ErrorTag"("userId", "structure");

-- CreateIndex
CREATE UNIQUE INDEX "LexiconEntry_userId_language_lemma_key" ON "LexiconEntry"("userId", "language", "lemma");
