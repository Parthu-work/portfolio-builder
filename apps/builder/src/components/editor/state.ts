"use client";

import { produce } from "immer";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { PortfolioSchema, issuesByPath, type Portfolio } from "@runtime/schema/portfolio";
import { api, ApiError } from "@/lib/client";

/* ───────────── undo / redo ───────────── */

type History = { past: Portfolio[]; present: Portfolio; future: Portfolio[]; lastKey: string | null; lastAt: number };
type Action = { type: "apply"; next: Portfolio; key: string | null; at: number } | { type: "undo" } | { type: "redo" } | { type: "reset"; next: Portfolio };

const LIMIT = 100;

export function historyReducer(h: History, a: Action): History {
  switch (a.type) {
    case "apply": {
      if (a.next === h.present) return h;
      // Consecutive edits to the same field within a second collapse into one undo step.
      const coalesce = a.key !== null && a.key === h.lastKey && a.at - h.lastAt < 1000;
      return { past: coalesce ? h.past : [...h.past, h.present].slice(-LIMIT), present: a.next, future: [], lastKey: a.key, lastAt: a.at };
    }
    case "undo": {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], lastKey: null, lastAt: 0 };
    }
    case "redo": {
      const next = h.future[0];
      if (!next) return h;
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1), lastKey: null, lastAt: 0 };
    }
    case "reset":
      return { past: [...h.past, h.present].slice(-LIMIT), present: a.next, future: [], lastKey: null, lastAt: 0 };
  }
}

export type Update = (recipe: (draft: Portfolio) => void | Portfolio, coalesceKey?: string) => void;

export function useHistory(initial: Portfolio) {
  const [h, dispatch] = useReducer(historyReducer, { past: [], present: initial, future: [], lastKey: null, lastAt: 0 });
  const present = useRef(h.present);
  present.current = h.present;

  const update = useCallback<Update>((recipe, key) => {
    dispatch({ type: "apply", next: produce(present.current, recipe), key: key ?? null, at: Date.now() });
  }, []);
  const replace = useCallback((next: Portfolio) => dispatch({ type: "reset", next }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      // Let rich-text editors keep their own character-level undo.
      if ((e.target as HTMLElement | null)?.closest?.(".ProseMirror")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { portfolio: h.present, update, replace, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

/* ───────────── validation ───────────── */

export function useIssues(portfolio: Portfolio) {
  return useMemo(() => {
    const res = PortfolioSchema.safeParse(portfolio);
    const map = res.success ? {} : issuesByPath(res.error);
    const keys = Object.keys(map);
    /** First error at or below a path such as "sections.2.fields.0.value". */
    const at = (prefix: string): string | undefined => {
      const k = keys.find((x) => x === prefix || x.startsWith(`${prefix}.`));
      return k ? map[k] : undefined;
    };
    return { valid: res.success, count: keys.length, at };
  }, [portfolio]);
}

/* ───────────── autosave ───────────── */

export type SaveStatus = "saved" | "dirty" | "saving" | "offline" | "invalid" | "error";

const backupKey = (id: string) => `persona:draft:${id}`;

export function readBackup(id: string): { draft: unknown; at: number } | null {
  try {
    const raw = window.localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as { draft: unknown; at: number }) : null;
  } catch {
    return null;
  }
}
export function clearBackup(id: string) {
  try {
    window.localStorage.removeItem(backupKey(id));
  } catch {}
}

/**
 * Debounced (1s) autosave that tolerates being offline: the latest draft is
 * mirrored to localStorage, failed saves are retried with backoff and again
 * as soon as the browser comes back online. Only the newest draft is ever sent.
 */
export function useAutosave(id: string, portfolio: Portfolio, valid: boolean) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [message, setMessage] = useState<string | null>(null);
  const saved = useRef(portfolio);
  const latest = useRef(portfolio);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<number | null>(null);
  const attempt = useRef(0);
  latest.current = portfolio;

  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      await inFlight.current;
    }
    const draft = latest.current;
    if (draft === saved.current) {
      setStatus("saved");
      return true;
    }
    if (!PortfolioSchema.safeParse(draft).success) {
      setStatus("invalid");
      return false;
    }
    setStatus("saving");
    const run = (async () => {
      try {
        await api(`/api/portfolios/${id}`, { method: "PATCH", body: { draft } });
        saved.current = draft;
        attempt.current = 0;
        setMessage(null);
        if (latest.current === draft) {
          clearBackup(id);
          setStatus("saved");
        } else {
          setStatus("dirty");
          schedule(300);
        }
        return true;
      } catch (e) {
        const offline = !(e instanceof ApiError) || !navigator.onLine;
        if (e instanceof ApiError && (e.status === 409 || e.status === 422 || e.status === 401 || e.status === 404)) {
          setStatus("error");
          setMessage(e.status === 401 ? "You were signed out. Sign in again to keep saving." : e.message);
          return false;
        }
        attempt.current += 1;
        setStatus(offline ? "offline" : "error");
        setMessage(offline ? "You are offline. Changes are kept on this device and will sync when you reconnect." : "Could not save. Retrying…");
        schedule(Math.min(30_000, 1500 * 2 ** attempt.current));
        return false;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const schedule = useCallback(
    (ms: number) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void save();
      }, ms);
    },
    [save],
  );

  useEffect(() => {
    if (portfolio === saved.current) {
      // Undo/redo landed back on the saved draft.
      if (!inFlight.current) setStatus("saved");
      return;
    }
    try {
      window.localStorage.setItem(backupKey(id), JSON.stringify({ draft: portfolio, at: Date.now() }));
    } catch {}
    if (!valid) {
      setStatus("invalid");
      return;
    }
    setStatus((s) => (s === "saving" ? s : "dirty"));
    schedule(1000);
  }, [portfolio, valid, id, schedule]);

  useEffect(() => {
    const online = () => void save();
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) e.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", warn);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [save]);

  /** Marks a server-provided draft as already saved (after restoring a version, for example). */
  const markSaved = useCallback((p: Portfolio) => {
    saved.current = p;
  }, []);

  return { status, message, flush: save, markSaved };
}
