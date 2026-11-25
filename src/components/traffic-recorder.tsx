"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Visit = { id: string; source: string; campaign: string; landingPath: string; lastSeen: number };
const storageKey = "ibiza_visit_v1";

function firstSource() {
  const params = new URLSearchParams(window.location.search);
  const tagged = params.get("utm_source")?.trim().slice(0, 80);
  if (tagged) return tagged.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "Campanha";
  if (!document.referrer) return "Direto";
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "").toLowerCase();
    return host === window.location.hostname ? "Direto" : host.slice(0, 80);
  } catch {
    return "Direto";
  }
}

export function TrafficRecorder() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/auth/") || pathname.startsWith("/admin")) return;
    try {
      let visit: Visit | null = null;
      const stored = sessionStorage.getItem(storageKey);
      if (stored) visit = JSON.parse(stored) as Visit;
      const currentTime = Date.now();
      if (!visit?.id || !/^[0-9a-f-]{36}$/i.test(visit.id) ||
          !visit.lastSeen || currentTime - visit.lastSeen > 30 * 60 * 1000) {
        visit = {
          id: crypto.randomUUID(),
          source: firstSource(),
          campaign: new URLSearchParams(window.location.search).get("utm_campaign")?.trim().slice(0, 100) || "",
          landingPath: pathname.slice(0, 160),
          lastSeen: currentTime,
        };
      }
      visit.lastSeen = currentTime;
      sessionStorage.setItem(storageKey, JSON.stringify(visit));
      void fetch("/api/traffic", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visit),
      });
    } catch {
      // The site remains usable when storage or measurement is unavailable.
    }
  }, [pathname]);

  return null;
}
