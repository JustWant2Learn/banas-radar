"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds. Renders nothing. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failures are non-fatal; the app still works online.
    });
  }, []);
  return null;
}
