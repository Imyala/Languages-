"use client";

import { useEffect } from "react";

// PWA staleness guard. The Serwist worker installs new versions with
// skipWaiting + clientsClaim, which means a fresh deploy takes control
// of existing tabs as soon as the user opens them — but the *currently
// rendered* page still has the old JS in memory. controllerchange fires
// the moment the new worker becomes the controller; reloading there
// pulls the new HTML+JS so the user sees the latest code without
// needing to manually clear cache or close all tabs.
export function SWUpdater() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    function onControllerChange() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Poke the registration on mount so the browser re-fetches sw.js and
    // discovers a new build promptly — without this it can take a while
    // for the browser to notice that a deploy has happened.
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update().catch(() => {});
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
