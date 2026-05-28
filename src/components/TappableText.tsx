"use client";

import { useMemo } from "react";

// Tokenize on Unicode letters (so Afrikaans accents like ô, ê, ë work)
// plus apostrophe and hyphen inside words. Everything else is "other".
const TOKEN_RE = /([\p{L}'\-]+)|([^\p{L}'\-]+)/giu;

type Token = { kind: "word" | "other"; text: string };

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let m: RegExpExecArray | null;
  // Make a local copy of the regex so executions don't share lastIndex
  // across calls.
  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push({ kind: "word", text: m[1] });
    else if (m[2]) out.push({ kind: "other", text: m[2] });
  }
  return out;
}

export function TappableText({
  text,
  onTapWord,
}: {
  text: string;
  onTapWord: (word: string) => void;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === "word" ? (
          <button
            key={i}
            type="button"
            className="tappable-word"
            onClick={(e) => {
              e.stopPropagation();
              (e.currentTarget as HTMLButtonElement).blur();
              onTapWord(t.text);
            }}
          >
            {t.text}
          </button>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </>
  );
}
