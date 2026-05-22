"use client";

import Link from "next/link";
import { ModelLoader } from "@/components/ModelLoader";

export default function SetupPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
      <div>
        <div className="kicker mb-2">Setup</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          On-device AI
        </h1>
        <p className="text-[color:var(--muted)] mt-2 max-w-prose">
          The writing-quest grader runs in your browser via WebGPU. Pick a model
          below — first launch downloads the weights (one-time, ~1–2 GB) and
          caches them. After that it works offline and your writing never leaves
          your device.
        </p>
      </div>

      <ModelLoader />

      <div className="panel p-5 text-sm text-[color:var(--muted)] grid gap-2">
        <p>
          <span className="kicker mr-2">Heads up</span>
          Quality is lower than a frontier cloud model. Small on-device models
          can miss subtle Afrikaans-specific errors and occasionally produce
          shaky JSON. We validate every response and retry; if grading fails,
          you can try the same submission again.
        </p>
        <p>
          <span className="kicker mr-2">Browser support</span>
          WebGPU is required. Chrome / Edge on desktop and Android work today.
          iOS Safari support is still experimental at the OS level.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/" className="btn">
          Back to status
        </Link>
        <Link href="/write" className="btn btn-primary">
          Go to writing
        </Link>
      </div>
    </div>
  );
}
