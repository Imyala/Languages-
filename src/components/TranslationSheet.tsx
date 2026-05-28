"use client";

import { useEffect, useState } from "react";
import { lookupAfrikaans } from "@/lib/dictionary";
import { addToLexicon, isInLexicon } from "@/lib/storage";

export function TranslationSheet({
  word,
  onClose,
}: {
  word: string;
  onClose: () => void;
}) {
  const translation = lookupAfrikaans(word);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    isInLexicon("af", word).then(setAlreadySaved);
  }, [word]);

  // Close the sheet on ESC.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    await addToLexicon("af", word);
    setJustSaved(true);
    setAlreadySaved(true);
  }

  return (
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
        {translation ? (
          <p className="text-base text-[color:var(--foreground)] mt-2 leading-relaxed">
            {translation}
          </p>
        ) : (
          <p className="text-sm text-[color:var(--muted)] mt-2 italic">
            Not in the built-in dictionary yet. You can still save it to your
            word bank — we&apos;ll surface it again when more translation tools
            ship.
          </p>
        )}
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
}
