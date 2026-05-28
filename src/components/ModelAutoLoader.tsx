"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ensureEngine,
  getDownloadedModelIds,
  isModelReady,
} from "@/lib/local-ai";
import { getSetting } from "@/lib/storage";

// On app boot, silently re-load the previously-used teacher so the user
// doesn't have to re-pick after every page refresh (incl. the SW auto-
// update reload). Runs only if a saved model id exists and is in the
// downloaded-models registry — never triggers a fresh download.
//
// Skips on /setup because that's where the user goes to explicitly manage
// teachers; we don't want a background load to fight a manual selection.
export function ModelAutoLoader() {
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (pathname.startsWith("/setup")) return;

    let cancelled = false;
    (async () => {
      if (isModelReady()) return;
      const savedId = await getSetting("modelId");
      if (!savedId) return;
      const downloaded = await getDownloadedModelIds();
      if (!downloaded.includes(savedId)) return;
      if (cancelled) return;
      try {
        await ensureEngine(savedId);
      } catch {
        // Swallow — the user can recover from /setup if the load fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
