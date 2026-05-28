"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MODEL_ID,
  MODEL_PRESETS,
  ensureEngine,
  isModelReady,
  onProgress,
  presetLabelFor,
} from "@/lib/local-ai";
import { getSetting, setSetting } from "@/lib/storage";

type Status = "idle" | "confirming" | "loading" | "ready" | "error";

export function ModelLoader({
  auto = false,
  onReady,
}: {
  auto?: boolean;
  onReady?: () => void;
}) {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [status, setStatus] = useState<Status>(isModelReady() ? "ready" : "idle");
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // Wall-clock timer state (ticks every second while loading, smooth)
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [smoothedEtaMs, setSmoothedEtaMs] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const triggered = useRef(false);
  // Set once the user has tapped a card — prevents the async load of the
  // previously-saved choice from clobbering a fresh selection that landed
  // first.
  const userPicked = useRef(false);

  useEffect(() => {
    (async () => {
      const saved = await getSetting("modelId");
      if (saved && !userPicked.current) setModelId(saved);
    })();
  }, []);

  useEffect(() => {
    const off = onProgress((p) => {
      setProgress(p.progress ?? 0);
      setProgressText(p.text ?? "");
    });
    return off;
  }, []);

  // Tick once per second while loading so elapsed time advances smoothly,
  // independent of WebLLM's chunk-by-chunk callbacks.
  useEffect(() => {
    if (status !== "loading") return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const id = setInterval(() => {
      const t = Date.now() - (startedAtRef.current ?? Date.now());
      setElapsedMs(t);
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Smooth the ETA via EMA so it doesn't jump every time a chunk lands.
  useEffect(() => {
    if (status !== "loading" || progress <= 0.02 || elapsedMs < 2000) return;
    const projectedTotal = elapsedMs / progress;
    const rawRemaining = Math.max(0, projectedTotal - elapsedMs);
    // EMA alpha 0.15 — heavy inertia so the ETA settles rather than jumping
    // with every chunk. Trade-off: slower to react to real throughput changes.
    setSmoothedEtaMs((prev) => (prev == null ? rawRemaining : prev * 0.85 + rawRemaining * 0.15));
  }, [progress, elapsedMs, status]);

  useEffect(() => {
    if (status === "ready") onReady?.();
  }, [status, onReady]);

  useEffect(() => {
    // `auto` no longer auto-starts the download — that ate the chance to
    // change selection. It just surfaces the picker without an extra click,
    // and the user still has to confirm before any bytes hit the network.
    if (!auto || triggered.current) return;
    triggered.current = true;
  }, [auto]);

  async function start() {
    if (status === "loading") return;
    setError(null);
    setProgress(0);
    setProgressText("");
    setElapsedMs(0);
    setSmoothedEtaMs(null);
    startedAtRef.current = Date.now();
    setStatus("loading");
    try {
      if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
        throw new Error(
          "This browser does not expose WebGPU. Use Chrome or Edge on desktop / Android. iOS Safari support is still experimental.",
        );
      }
      await setSetting("modelId", modelId);
      await ensureEngine(modelId);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  function formatDuration(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  const activePreset = MODEL_PRESETS.find((m) => m.id === modelId) ?? MODEL_PRESETS[0];
  const activeLabel = activePreset.label;
  const activeEnglish = activePreset.english;
  const activeSize = activePreset.approxSizeGB;

  if (status === "ready") {
    return (
      <div className="panel p-4 text-sm flex items-center justify-between gap-3">
        <span>
          <span
            className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
            style={{ background: "var(--good)", boxShadow: "0 0 8px var(--good)" }}
          />
          {presetLabelFor(modelId)} ready
        </span>
      </div>
    );
  }

  return (
    <div className="panel p-5 grid gap-4">
      <div>
        <div className="kicker mb-1">Kies jou onderwyser</div>
        <h3 className="text-lg font-semibold">
          Choose your in-app teacher
        </h3>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Each one runs on your device (one-time download, ~1–3 GB).
          Once cached, no internet needed.
        </p>
      </div>

      <div className="grid gap-2">
        {MODEL_PRESETS.map((m) => {
          const selected = m.id === modelId;
          // Cards stay tappable while the user is reviewing the confirmation —
          // they can change their mind right up until "Yes, download".
          const cardsDisabled = status === "loading";
          return (
            <button
              key={m.id}
              className={`choice ${selected ? "selected" : ""}`}
              disabled={cardsDisabled}
              aria-pressed={selected}
              onClick={() => {
                userPicked.current = true;
                setModelId(m.id);
                // If the user is mid-confirmation and re-taps, drop back to
                // idle so the new confirmation reflects the new choice.
                if (status === "confirming") setStatus("idle");
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">
                  {m.label}
                  <span className="ml-2 text-xs font-normal italic text-[color:var(--muted)]">
                    {m.english}
                  </span>
                </span>
                <span className="flex items-baseline gap-2">
                  {selected ? (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[color:var(--accent)]">
                      SELECTED
                    </span>
                  ) : null}
                  <span className="text-xs font-mono text-[color:var(--muted)]">
                    ~{m.approxSizeGB.toFixed(1)} GB
                  </span>
                </span>
              </div>
              <div className="text-xs text-[color:var(--muted)] mt-1">
                <span className="text-[color:var(--foreground)]/80">{m.tagline}</span>
                <span className="mx-1.5 text-[color:var(--muted)]/60">·</span>
                {m.description}
              </div>
            </button>
          );
        })}
      </div>

      {status === "loading" ? (
        <div className="grid gap-2">
          <div className="text-sm">
            Downloading <strong>{activeLabel}</strong>{" "}
            <span className="text-[color:var(--muted)]">({activeEnglish}, ~{activeSize.toFixed(1)} GB)</span>
          </div>
          <div className="skill-bar">
            <div className="fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="flex items-baseline justify-between gap-3 text-xs font-mono text-[color:var(--muted)]">
            <span>
              {progress > 0
                ? `${Math.round(progress * 100)}% · ${formatDuration(elapsedMs)} elapsed`
                : `${formatDuration(elapsedMs)} elapsed`}
            </span>
            <span>
              {smoothedEtaMs != null && progress > 0.02 && progress < 1
                ? `~${formatDuration(smoothedEtaMs)} remaining`
                : progress === 0
                  ? "Initializing…"
                  : ""}
            </span>
          </div>
          {progressText ? (
            <div className="text-[11px] text-[color:var(--muted)]/70 truncate">
              {progressText}
            </div>
          ) : null}
        </div>
      ) : status === "confirming" ? (
        <div className="panel p-4 grid gap-3 border-[color:var(--accent)]/40">
          <div>
            <div className="kicker mb-1">Confirm</div>
            <p className="text-sm">
              Download <strong>{activeLabel}</strong>{" "}
              <span className="text-[color:var(--muted)] italic">({activeEnglish})</span>{" "}
              — about <strong>{activeSize.toFixed(1)} GB</strong>?
            </p>
            <p className="text-xs text-[color:var(--muted)] mt-1">
              One-time download. Can take several minutes on a slow connection.
              After it completes, your teacher stays on your device and works
              offline.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={() => setStatus("idle")}>
              Pick different
            </button>
            <button className="btn btn-primary" onClick={start}>
              Yes, download
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => setStatus("confirming")}>
            Continue with {activeLabel}
          </button>
        </div>
      )}

      {error ? (
        <div className="text-sm text-[color:var(--bad)] border border-[color:var(--bad)]/30 rounded-lg p-3">
          {error}
        </div>
      ) : null}
    </div>
  );
}
