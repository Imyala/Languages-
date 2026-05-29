"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ModelLoader } from "@/components/ModelLoader";
import { TappableText } from "@/components/TappableText";
import { TranslationSheet } from "@/components/TranslationSheet";
import { cefrFor } from "@/lib/ability";
import {
  AbortedError,
  abortCurrentGeneration,
  chatTurn,
  CHAT_SCENES,
  currentModelId,
  isModelLoading,
  isModelReady,
  onProgress,
  presetLabelFor,
  type ChatMessage,
} from "@/lib/local-ai";
import {
  db,
  getOrCreateProfile,
  type AbilityProfile,
} from "@/lib/storage";

type Stage = "loading-model" | "needs-model" | "scene" | "chatting";

type ChatItem = ChatMessage & {
  correction?: { corrected: string; note: string } | null;
};

export default function ChatPage() {
  const [stage, setStage] = useState<Stage>("scene");
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [scene, setScene] = useState(CHAT_SCENES[0]);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tappedWord, setTappedWord] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const initialized = useRef(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  async function reloadSavedWords() {
    const entries = await db().lexicon.where({ language: "af" }).toArray();
    setSavedWords(new Set(entries.map((e) => e.lemma.toLowerCase())));
  }
  useEffect(() => {
    reloadSavedWords();
  }, []);

  const stageRef = useRef<Stage>("scene");
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  async function reconcile() {
    const p = await getOrCreateProfile("af");
    setProfile(p);
    const s = stageRef.current;
    if (isModelReady()) {
      if (s === "chatting" || s === "scene") return;
      setStage("scene");
      return;
    }
    if (isModelLoading()) {
      setStage("loading-model");
      return;
    }
    setStage("needs-model");
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    reconcile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => reconcile();
    window.addEventListener("gl:model-state-change", handler);
    return () => window.removeEventListener("gl:model-state-change", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [autoLoadProgress, setAutoLoadProgress] = useState(0);
  useEffect(() => {
    if (stage !== "loading-model") return;
    const off = onProgress((p) => setAutoLoadProgress(p.progress ?? 0));
    return off;
  }, [stage]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function streamReply(history: ChatMessage[]) {
    if (!profile) return;
    setStreaming(true);
    setError(null);
    try {
      const { reply, correction } = await chatTurn({
        scene,
        ability: profile.writing,
        history,
        onToken: () => {
          /* swallowed — only typing dots show during generation */
        },
      });

      setMessages((prev) => {
        // Attach the correction to the most recent user message so it
        // renders right under that bubble in the thread.
        const next: ChatItem[] = prev.map((m) => ({ ...m }));
        if (correction) {
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].role === "user") {
              next[i].correction = correction;
              break;
            }
          }
        }
        next.push({ role: "assistant", content: reply });
        return next;
      });
    } catch (e) {
      if (e instanceof AbortedError) {
        setError("Cancelled.");
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setStreaming(false);
    }
  }

  function startScene() {
    setStage("chatting");
    const opener: ChatMessage = {
      role: "user",
      content: "[Start the scene. Greet me in Afrikaans.]",
    };
    // Internal opener seeds the model with a turn to react to. The render
    // filter below hides it from the visible thread.
    setMessages([{ ...opener }]);
    streamReply([opener]);
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    const userMsg: ChatItem = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    streamReply(next.map(({ role, content }) => ({ role, content })));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  // ------------------------------------------------------------------ Stages

  if (stage === "loading-model") {
    return (
      <div className="max-w-md mx-auto px-5 py-10 grid gap-4">
        <div>
          <div className="kicker mb-2">Waking your teacher</div>
          <h1 className="text-lg font-semibold">Loading your onderwyser…</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Already on your device. We&apos;re reading it into memory — usually
            10–30 seconds.
          </p>
        </div>
        <div className="skill-bar">
          <div
            className="fill"
            style={{ width: `${Math.max(8, Math.round(autoLoadProgress * 100))}%` }}
          />
        </div>
      </div>
    );
  }

  if (stage === "needs-model") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
        <div>
          <div className="kicker mb-2">One-time setup</div>
          <h1 className="text-xl font-semibold tracking-tight">
            Pick your onderwyser first.
          </h1>
          <p className="text-[color:var(--muted)] mt-2 max-w-prose">
            Chat needs a teacher loaded. Once cached, your conversations stay
            on your device.
          </p>
        </div>
        <ModelLoader onReady={() => setStage("scene")} />
      </div>
    );
  }

  if (stage === "scene") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
        <div>
          <div className="kicker mb-2">Gesprek</div>
          <h1 className="text-2xl font-semibold tracking-tight">Pick a scene</h1>
          <p className="text-[color:var(--muted)] mt-2 max-w-prose">
            Your onderwyser plays a role; you chat in Afrikaans. Calibrated to
            your level ({profile ? cefrFor(profile.writing) : "A2"}). If you
            make a mistake we&apos;ll show how it should be corrected and why.
          </p>
        </div>

        {isModelReady() &&
        (currentModelId() === "Qwen3-0.6B-q4f16_1-MLC" ||
          currentModelId() === "Qwen3-1.7B-q4f16_1-MLC") ? (
          <div className="panel p-3 text-xs text-[color:var(--muted)] flex items-baseline gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mt-1 shrink-0"
              style={{ background: "var(--accent)" }}
            />
            <span>
              On <strong className="text-[color:var(--foreground)]">{presetLabelFor(currentModelId())}</strong>.
              For sharper Afrikaans, upgrade to <strong>Onderwyser</strong>{" "}
              (or <strong>Meester</strong> on a laptop) in{" "}
              <Link href="/setup" className="underline">
                Profile → Onderwyser
              </Link>
              .
            </span>
          </div>
        ) : null}

        <div className="grid gap-2">
          {CHAT_SCENES.map((s) => {
            const selected = s.id === scene.id;
            return (
              <button
                key={s.id}
                className={`choice ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                onClick={() => setScene(s)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{s.label}</span>
                  {selected ? (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[color:var(--accent)]">
                      SELECTED
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-[color:var(--muted)] mt-1">
                  {s.description}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/" className="btn">
            Back
          </Link>
          <button className="btn btn-primary" onClick={startScene}>
            Start the {scene.label.toLowerCase()}
          </button>
        </div>
      </div>
    );
  }

  // ---- Chatting — full-viewport messaging layout ----
  const visibleMessages = messages.filter(
    (m) => !(m.role === "user" && m.content.startsWith("[Start the scene")),
  );

  return (
    <div
      className="fixed left-0 right-0"
      style={{
        top: "45px",
        bottom: "calc(58px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="max-w-2xl mx-auto h-full flex flex-col">
        {/* Compact scene header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/5 shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
              Scene
            </div>
            <h2 className="text-sm font-semibold truncate">{scene.label}</h2>
          </div>
          <button
            className="btn text-xs px-3 py-1.5"
            onClick={() => {
              if (streaming) abortCurrentGeneration();
              setStage("scene");
            }}
          >
            End
          </button>
        </div>

        {/* Messages — scrollable thread, always reachable. */}
        <div className="flex-1 overflow-y-auto px-3 py-3 grid auto-rows-max gap-1.5 content-start">
          {visibleMessages.map((m, i) => (
            <MessageItem
              key={i}
              message={m}
              onTapWord={setTappedWord}
              savedWords={savedWords}
            />
          ))}
          {streaming ? <TypingBubble /> : null}
          <div ref={threadEndRef} />
        </div>

        {/* Input bar — pinned to bottom of the chat container, just above the
            persistent bottom nav. */}
        <div className="border-t border-white/5 px-2 py-2 flex items-end gap-2 shrink-0">
          <textarea
            ref={textareaRef}
            className="chat-input flex-1"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            placeholder="Tik in Afrikaans…"
            disabled={streaming}
          />
          {streaming ? (
            <button className="btn" onClick={() => abortCurrentGeneration()}>
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={send}
              disabled={!input.trim()}
              aria-label="Send"
            >
              Send
            </button>
          )}
        </div>

        {error ? (
          <div className="text-[11px] text-[color:var(--bad)] px-3 pb-1 shrink-0">
            {error}
          </div>
        ) : null}
      </div>

      {tappedWord ? (
        <TranslationSheet
          word={tappedWord}
          onClose={() => {
            setTappedWord(null);
            reloadSavedWords();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message rendering
// ---------------------------------------------------------------------------

function MessageItem({
  message,
  onTapWord,
  savedWords,
}: {
  message: ChatItem;
  onTapWord: (word: string) => void;
  savedWords: Set<string>;
}) {
  if (message.role === "user") {
    return (
      <div className="grid gap-1">
        <Bubble
          role="user"
          text={message.content}
          onTapWord={onTapWord}
          savedWords={savedWords}
        />
        {message.correction ? (
          <CorrectionCard
            correction={message.correction}
            onTapWord={onTapWord}
            savedWords={savedWords}
          />
        ) : null}
      </div>
    );
  }
  return (
    <Bubble
      role="assistant"
      text={message.content}
      onTapWord={onTapWord}
      savedWords={savedWords}
    />
  );
}

function Bubble({
  role,
  text,
  onTapWord,
  savedWords,
}: {
  role: "user" | "assistant";
  text: string;
  onTapWord: (word: string) => void;
  savedWords: Set<string>;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "ml-auto bg-[color:var(--accent)]/15 border border-[color:var(--accent)]/30"
          : "mr-auto bg-white/[0.04] border border-white/[0.06]"
      }`}
    >
      <TappableText text={text} onTapWord={onTapWord} savedWords={savedWords} />
    </div>
  );
}

function CorrectionCard({
  correction,
  onTapWord,
  savedWords,
}: {
  correction: { corrected: string; note: string };
  onTapWord: (word: string) => void;
  savedWords: Set<string>;
}) {
  return (
    <div className="ml-auto max-w-[85%] px-3 py-2 rounded-xl bg-[color:var(--accent)]/[0.06] border border-[color:var(--accent)]/25">
      <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[color:var(--accent)] mb-1">
        Try
      </div>
      <div className="text-sm leading-snug text-[color:var(--foreground)]">
        <TappableText
          text={correction.corrected}
          onTapWord={onTapWord}
          savedWords={savedWords}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-[color:var(--muted)] italic">
        {correction.note}
      </p>
    </div>
  );
}

function TypingBubble() {
  return (
    <div
      className="mr-auto px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
      aria-label="Onderwyser is typing"
    >
      <span className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
    </div>
  );
}
