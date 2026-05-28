"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lookupAfrikaans } from "@/lib/dictionary";
import {
  AbortedError,
  getCachedTranslation,
  setCachedTranslation,
  translateWord,
} from "@/lib/local-ai";
import { addToLexicon, isInLexicon } from "@/lib/storage";

type AiState = "idle" | "loading" | "error";

export function TranslationSheet({
  word,
  onClose,
}: {
  word: string;
  onClose: () => void;
}) {
  const dictionaryHit = lookupAfrikaans(word);
  const [aiTranslation, setAiTranslation] = useState<string | null>(null);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // SSR guard for createPortal — only mount after the first client render.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    isInLexicon("af", word).then(setAlreadySaved);
  }, [word]);

  // If we miss the built-in dictionary, check the AI translation cache so
  // a second tap on the same word is instant.
  useEffect(() => {
    if (dictionaryHit) return;
    getCachedTranslation(word).then((cached) => {
      if (cached) setAiTranslation(cached);
    });
  }, [word, dictionaryHit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function lookupWithAi() {
    setAiState("loading");
    setAiError(null);
    try {
      const result = await translateWord(word);
      setAiTranslation(result);
      setAiState("idle");
      await setCachedTranslation(word, result);
    } catch (e) {
      if (e instanceof AbortedError) {
        setAiState("idle");
      } else {
        setAiError(e instanceof Error ? e.message : String(e));
        setAiState("error");
      }
    }
  }

  async function save() {
    await addToLexicon("af", word);
    setJustSaved(true);
    setAlreadySaved(true);
  }

  if (!mounted) return null;

  const meaning = dictionaryHit ?? aiTranslation;
  const fromAi = !dictionaryHit && !!aiTranslation;

  const sheet = (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <div
        className="sheet"
        role="dialog"
        aria-label={`Translation of ${word}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />
        <div className="kicker">Word</div>
        <h3 className="text-2xl font-semibold mt-1 break-words">{word}</h3>

        {meaning ? (
          <p className="text-base text-[color:var(--foreground)] mt-2 leading-relaxed">
            {meaning}
            {fromAi ? (
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[color:var(--accent)] ml-2 align-middle">
                AI
              </span>
            ) : null}
          </p>
        ) : aiState === "loading" ? (
          <p className="text-sm text-[color:var(--muted)] mt-2 italic">
            Looking up with your onderwyser… can take 10–30 seconds on a
            phone.
          </p>
        ) : aiState === "error" ? (
          <p className="text-sm text-[color:var(--bad)] mt-2">
            AI lookup failed{aiError ? `: ${aiError}` : "."}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--muted)] mt-2 italic">
            Not in the built-in dictionary. Ask the AI to translate, or save
            the word for later.
          </p>
        )}

        {!meaning && aiState === "idle" ? (
          <button
            className="btn w-full mt-3 text-sm"
            onClick={lookupWithAi}
          >
            Look up with AI
          </button>
        ) : null}
        {!meaning && aiState === "error" ? (
          <button
            className="btn w-full mt-3 text-sm"
            onClick={lookupWithAi}
          >
            Retry
          </button>
        ) : null}

        <div className="flex gap-3 mt-5">
          <button className="btn flex-1" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary flex-1"
            onClick={save}
            disabled={alreadySaved}
          >
            {justSaved
              ? "Saved"
              : alreadySaved
                ? "In your words"
                : "Add to my words"}
          </button>
        </div>
      </div>
    </>
  );

  // Render at the document root so the sheet escapes any ancestor
  // stacking context (the /chat page is a fixed-position container,
  // which would otherwise trap the sheet beneath the bottom nav).
  return createPortal(sheet, document.body);
}
