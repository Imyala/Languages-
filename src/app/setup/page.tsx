"use client";

import Link from "next/link";
import { ModelLoader } from "@/components/ModelLoader";

export default function SetupPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 grid gap-6">
      <div>
        <div className="kicker mb-2">Setup</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Kies jou onderwyser
        </h1>
        <p className="text-[color:var(--muted)] mt-2 max-w-prose">
          Your in-app teacher reads, grades, and quests with you — fully on
          your device. First launch downloads the chosen teacher (~1–3 GB, one
          time) and caches it. After that it works offline and your writing
          never leaves your device.
        </p>
      </div>

      <ModelLoader />

      <div className="panel p-5 text-sm text-[color:var(--muted)] grid gap-2">
        <p>
          <span className="kicker mr-2">Heads up</span>
          Running entirely in your browser, every onderwyser is smaller than a
          frontier cloud system — they can miss subtle Afrikaans-specific
          errors and occasionally produce shaky structured output. Every
          response is validated and auto-repaired; if a grading fails you can
          resubmit.
        </p>
        <p>
          <span className="kicker mr-2">Browser support</span>
          Requires WebGPU. Chrome / Edge on desktop and Android work today. iOS
          Safari support is still experimental at the OS level.
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
