"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

/** fetch wrapper for our own API: JSON in/out plus the CSRF header the middleware requires. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal; keepalive?: boolean } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: { "x-persona-csrf": "1", ...(init.body === undefined ? {} : { "content-type": "application/json" }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
    keepalive: init.keepalive,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(res.status, typeof data.error === "string" ? data.error : `Request failed (${res.status})`, typeof data.code === "string" ? data.code : undefined, Array.isArray(data.details) ? (data.details as { path: string; message: string }[]) : undefined);
  }
  return data as T;
}
