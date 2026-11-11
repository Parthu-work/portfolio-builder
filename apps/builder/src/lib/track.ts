"use client";

import type { TrackBatch } from "./analytics-core";

type ClientEvent = TrackBatch["events"][number];

const queue: ClientEvent[] = [];
let timer: number | null = null;

/** Do-Not-Track and Global Privacy Control are both honoured: nothing is ever sent. */
export function trackingAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  const dnt = nav.doNotTrack ?? (window as Window & { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack;
  return !(dnt === "1" || dnt === "yes" || nav.globalPrivacyControl === true);
}

export function flush() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const events = queue.splice(0, 25);
  const body = JSON.stringify({ events });
  // sendBeacon survives page unloads and never blocks navigation.
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  if (!sent) void fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  if (queue.length) flush();
}

/** Queues an analytics event; batches are sent every few seconds and when the tab is hidden. */
export function track(type: ClientEvent["type"], fields: Omit<ClientEvent, "type" | "path"> = {}) {
  if (!trackingAllowed()) return;
  queue.push({ type, path: window.location.pathname, ...fields });
  if (queue.length >= 10) flush();
  else timer ??= window.setTimeout(flush, 4000);
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  window.addEventListener("pagehide", flush);
}
