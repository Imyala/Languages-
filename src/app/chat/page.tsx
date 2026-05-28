"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ModelLoader } from "@/components/ModelLoader";
import { cefrFor } from "@/lib/ability";
import {
  AbortedError,
  abortCurrentGeneration,
  chatTurn,
  CHAT_SCENES,
  isModelLoading,
  isModelReady,
  onProgress,
  type ChatMessage,
} from "@/lib/local-ai";
import { getOrCreateProfile, type AbilityProfile } from "@/lib/storage";

type Stage = "loading-model" | "needs-model" | "scene" | "chatting";

export default function ChatPage() {
  const [stage, setStage] = useState<Stage>("scene");
  const [profile, setProfile] = useState<AbilityProfile | null>(null);
  const [scene, setScene] = useState(CHAT_SCENES[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const stageRef = useRef<Stage>("scene");
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  async function reconcile() {
    const p = await getOrCreateProfile("af");
    setProfile(p);
    const s = stageRef.current;
    if (isModelReady()) {
      // Don't yank the user out of an active chat.
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
  }, [messages, streamingText]);

  async function streamReply(history: ChatMessage[]) {
    if (!profile) return;
    setStreaming(true);
    setStreamingText("");
    setError(null);
    try {
      const text = await chatTurn({
        scene,
        ability: profile.writing,
        history,
        onToken: (acc) => setStreamingText(acc),
      });
      setMessages([...history, { role: "assistant", content: text }]);
      setStreamingText("");
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
    setMessages([]);
    setStage("chatting");
    // Kick off the AI's opening line by sending an empty history with a
    // tiny user nudge so the model knows to open the scene.
    const opener: ChatMessage = {
      role: "user",
      content: "[Start the scene. Greet me in Afrikaans.]",
    };
    streamReply([opener]);
  }

  function send() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    streamReply(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">
            Pick a scene
          </h1>
          <p className="text-[color:var(--muted)] mt-2 max-w-prose">
            Your onderwyser plays a role; you chat in Afrikaans. Calibrated to
            your level ({profile ? cefrFor(profile.writing) : "A2"}). Reply in
            Afrikaans — if you write English we&apos;ll nudge you back.
          </p>
        </div>

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

  // Chatting
  return (
    <div className="max-w-2xl mx-auto px-5 py-6 grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="kicker">Scene</div>
          <h2 className="text-lg font-semibold">{scene.label}</h2>
        </div>
        <button
          className="btn"
          onClick={() => {
            if (streaming) abortCurrentGeneration();
            setStage("scene");
          }}
        >
          End chat
        </button>
      </div>

      <div className="panel p-4 grid gap-3 min-h-[60vh] max-h-[70vh] overflow-y-auto">
        {messages
          .filter((m) => !(m.role === "user" && m.content.startsWith("[Start the scene")))
          .map((m, i) => (
            <Bubble key={i} role={m.role} text={m.content} />
          ))}
        {streaming && streamingText ? <Bubble role="assistant" text={streamingText} streaming /> : null}
        {streaming && !streamingText ? (
          <div className="mr-auto text-xs text-[color:var(--muted)] italic">
            Onderwyser is thinking…
          </div>
        ) : null}
        <div ref={threadEndRef} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-end gap-2">
          <textarea
            className="writing flex-1"
            style={{ minHeight: 80 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
            >
              Send
            </button>
          )}
        </div>
        {error ? (
          <div className="text-xs text-[color:var(--bad)]">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  streaming,
}: {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
        isUser
          ? "ml-auto bg-[color:var(--accent)]/15 border border-[color:var(--accent)]/30"
          : "mr-auto bg-white/[0.04] border border-white/[0.06]"
      }`}
    >
      {text}
      {streaming ? (
        <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-[color:var(--accent)] animate-pulse" />
      ) : null}
    </div>
  );
}
