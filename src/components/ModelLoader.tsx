"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_MODEL_ID,
  MODEL_PRESETS,
  currentModelId,
  ensureEngine,
  getDownloadedModelIds,
  isModelReady,
  onProgress,
} from "@/lib/local-ai";
import { getSetting, setSetting } from "@/lib/storage";

type Status = "idle" | "confirming" | "loading" | "error";

export function ModelLoader({
  auto = false,
  onReady,
}: {
  auto?: boolean;
  onReady?: () => void;
}) {
  // The card the user has tapped on (which the bottom action operates on).
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  // The model the engine currently has loaded in memory (null = none).
  const [activeId, setActiveId] = useState<string | null>(
    isModelReady() ? currentModelId() : null,
  );
  // Set of model ids the user has previously downloaded (and which therefore
  // live in the browser cache — switching to them is fast, no network).
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [smoothedEtaMs, setSmoothedEtaMs] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const userPicked = useRef(false);

  // Load saved selection + downloaded-model list on mount.
  useEffect(() => {
    (async () => {
      const [saved, downloaded] = await Promise.all([
        getSetting("modelId"),
        getDownloadedModelIds(),
      ]);
      if (saved && !userPicked.current) setModelId(saved);
      setDownloadedIds(new Set(downloaded));
    })();
  }, []);

  // Subscribe to engine progress events.
  useEffect(() => {
    const off = onProgress((p) => {
      setProgress(p.progress ?? 0);
      setProgressText(p.text ?? "");
    });
    return off;
  }, []);

  // Wall-clock elapsed during download.
  useEffect(() => {
    if (status !== "loading") return;
    if (startedAtRef.current == null) startedAtRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedMs(Date.now() - (startedAtRef.current ?? Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Smoothed ETA via EMA (alpha 0.15).
  useEffect(() => {
    if (status !== "loading" || progress <= 0.02 || elapsedMs < 2000) return;
    const projectedTotal = elapsedMs / progress;
    const rawRemaining = Math.max(0, projectedTotal - elapsedMs);
    setSmoothedEtaMs((prev) =>
      prev == null ? rawRemaining : prev * 0.85 + rawRemaining * 0.15,
    );
  }, [progress, elapsedMs, status]);

  // Fire onReady whenever a model becomes active (initial load OR switch).
  useEffect(() => {
    if (activeId) onReady?.();
  }, [activeId, onReady]);

  // The `auto` prop is informational only — it doesn't auto-start a download
  // (which would deny the user any chance to confirm or pick a different
  // teacher). It used to.
  useEffect(() => {
    if (!auto) return;
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
      setActiveId(modelId);
      setDownloadedIds((prev) => {
        const next = new Set(prev);
        next.add(modelId);
        return next;
      });
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  function cancelDownload() {
    // Hard reload — the simplest way to truly halt an in-flight WebLLM
    // download. Already-completed shards live in the Cache API and survive
    // the reload, so the next attempt resumes from where this one stopped.
    window.location.reload();
  }

  function formatDuration(ms: number): string {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  const activePreset = MODEL_PRESETS.find((m) => m.id === modelId) ?? MODEL_PRESETS[0];
  const isSelectedDownloaded = downloadedIds.has(modelId);
  const isSelectedActive = activeId === modelId;

  // The verb / question that shapes the primary button + confirm copy
  // depending on whether the chosen card is brand-new, cached, or already
  // running.
  const actionKind: "active" | "switch" | "download" = isSelectedActive
    ? "active"
    : isSelectedDownloaded
      ? "switch"
      : "download";

  return (
    <div className="panel p-5 grid gap-4">
      <div>
        <div className="kicker mb-1">Kies jou onderwyser</div>
        <h3 className="text-lg font-semibold">Choose your in-app teacher</h3>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Tap a teacher to inspect. Each one runs on your device (one-time
          download, ~1–3 GB) and stays cached so you can switch any time.
        </p>
      </div>

      <div className="grid gap-2">
        {MODEL_PRESETS.map((m) => {
          const selected = m.id === modelId;
          const downloaded = downloadedIds.has(m.id);
          const active = activeId === m.id;
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
                // If user re-picks while a confirm is up, drop back to idle so
                // the next confirm reflects the new choice.
                if (status === "confirming") setStatus("idle");
              }}
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <span className="font-medium">
                  {m.label}
                  <span className="ml-2 text-xs font-normal italic text-[color:var(--muted)]">
                    {m.english}
                  </span>
                </span>
                <span className="flex items-baseline gap-2">
                  {active ? (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[color:var(--good)]">
                      ACTIVE
                    </span>
                  ) : downloaded ? (
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-[color:var(--muted)]">
                      DOWNLOADED
                    </span>
                  ) : null}
                  {selected && !active ? (
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
        <div className="grid gap-3">
          <div className="text-sm">
            {downloadedIds.has(modelId) ? "Loading" : "Downloading"}{" "}
            <strong>{activePreset.label}</strong>{" "}
            <span className="text-[color:var(--muted)]">
              ({activePreset.english}, ~{activePreset.approxSizeGB.toFixed(1)} GB)
            </span>
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
          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="text-xs text-[color:var(--muted)]/70 flex-1">
              Cancelling stops the download. Parts already on your device are
              kept, so resuming later picks up where you left off.
            </p>
            <button className="btn" onClick={cancelDownload}>
              Cancel
            </button>
          </div>
        </div>
      ) : status === "confirming" ? (
        <div className="panel p-4 grid gap-3 border-[color:var(--accent)]/40">
          <div>
            <div className="kicker mb-1">Confirm</div>
            {actionKind === "switch" ? (
              <>
                <p className="text-sm">
                  Switch to <strong>{activePreset.label}</strong>{" "}
                  <span className="text-[color:var(--muted)] italic">
                    ({activePreset.english})
                  </span>
                  ?
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-1">
                  Already on your device. Switching unloads the current teacher
                  and loads this one — no download needed.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm">
                  Download <strong>{activePreset.label}</strong>{" "}
                  <span className="text-[color:var(--muted)] italic">
                    ({activePreset.english})
                  </span>{" "}
                  — about <strong>{activePreset.approxSizeGB.toFixed(1)} GB</strong>?
                </p>
                <p className="text-xs text-[color:var(--muted)] mt-1">
                  One-time download. Can take several minutes on a slow
                  connection. You can cancel mid-download — already-saved
                  parts are kept.
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button className="btn" onClick={() => setStatus("idle")}>
              Pick different
            </button>
            <button className="btn btn-primary" onClick={start}>
              {actionKind === "switch" ? "Yes, switch" : "Yes, download"}
            </button>
          </div>
        </div>
      ) : actionKind === "active" ? (
        <div className="text-sm text-[color:var(--muted)] flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: "var(--good)", boxShadow: "0 0 8px var(--good)" }}
          />
          <strong className="text-[color:var(--foreground)]">{activePreset.label}</strong>
          is active. Tap another teacher above to switch or add a new one.
        </div>
      ) : (
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => setStatus("confirming")}>
            {actionKind === "switch"
              ? `Switch to ${activePreset.label}`
              : `Download ${activePreset.label}`}
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
