import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { deviceFromUa, ipHash, sessionHash, type EventType } from "./analytics-core";
import { getUser, isAdmin } from "./auth";
import { env } from "./env";
import { getStore, NotFoundError, SlugTakenError, type AuditInput, type SessionUser, type Store } from "./store";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

export function clientIp(req: Request): string {
  const h = req.headers;
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}
export const clientCountry = (req: Request) => req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
export const doNotTrack = (req: Request) => req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1";

/** Structured (JSON-lines) logging for API routes. */
export function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export type Ctx<B> = {
  req: NextRequest;
  body: B;
  user: SessionUser | null;
  store: Store;
  ip: string;
  /** Writes an audit entry (never throws). */
  audit: (entry: Omit<AuditInput, "ipHash" | "actorUserId"> & { actorUserId?: string | null }) => Promise<void>;
  /** Records a server-side analytics event (skipped when the visitor sends DNT / GPC). */
  event: (type: EventType, fields?: { portfolioId?: string | null; props?: Record<string, string | number | boolean>; force?: boolean }) => Promise<void>;
};

type Options<S extends z.ZodTypeAny | undefined> = {
  /** "user": signed in · "admin": signed in + in ADMIN_EMAILS · "public": anyone */
  auth: "user" | "admin" | "public";
  body?: S;
  /** Token bucket per client IP: `capacity` burst, refilled at `perMinute`. */
  rate?: { name: string; capacity: number; perMinute: number };
};

/**
 * Wraps a route handler with: auth, Zod body validation, rate limiting,
 * uniform JSON errors and one structured log line per request.
 */
export function route<S extends z.ZodTypeAny | undefined = undefined, P = Record<string, string>>(
  opts: Options<S>,
  fn: (ctx: Ctx<S extends z.ZodTypeAny ? z.infer<S> : undefined> & { user: SessionUser | null }, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, segment: { params: Promise<P> }): Promise<Response> => {
    const started = Date.now();
    const requestId = crypto.randomUUID().slice(0, 8);
    const path = new URL(req.url).pathname;
    let status = 500;
    let userId: string | null = null;
    try {
      const store = getStore();
      const ip = clientIp(req);
      if (opts.rate) {
        const key = `${opts.rate.name}:${(await ipHash(env.saltSecret, ip)).slice(0, 16)}`;
        if (!(await store.takeToken(key, opts.rate.capacity, opts.rate.perMinute / 60))) {
          throw new HttpError(429, "Too many requests. Please slow down.");
        }
      }
      const user = opts.auth === "public" ? await getUser().catch(() => null) : await getUser();
      userId = user?.id ?? null;
      if (opts.auth !== "public" && !user) throw new HttpError(401, "Sign in required");
      if (opts.auth === "admin" && !isAdmin(user)) throw new HttpError(403, "Admins only");

      let body: unknown = undefined;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = JSON.parse(await req.text());
        } catch {
          throw new HttpError(400, "Body must be valid JSON");
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) {
          throw new HttpError(422, "Validation failed", parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message })));
        }
        body = parsed.data;
      }

      const ctx = {
        req,
        body: body as S extends z.ZodTypeAny ? z.infer<S> : undefined,
        user,
        store,
        ip,
        audit: async (entry: Omit<AuditInput, "ipHash" | "actorUserId"> & { actorUserId?: string | null }) => {
          try {
            await store.insertAudit({ ...entry, actorUserId: entry.actorUserId === undefined ? userId : entry.actorUserId, ipHash: await ipHash(env.saltSecret, ip) });
          } catch (e) {
            log("error", "audit write failed", { requestId, error: String(e) });
          }
        },
        event: async (type: EventType, fields: { portfolioId?: string | null; props?: Record<string, string | number | boolean>; force?: boolean } = {}) => {
          if (doNotTrack(req) && !fields.force) return;
          try {
            const ua = req.headers.get("user-agent") || "";
            await store.insertEvents([
              {
                ts: new Date().toISOString(),
                type,
                sessionHash: await sessionHash(env.saltSecret, ip, ua),
                userId,
                portfolioId: fields.portfolioId ?? null,
                path,
                referrerDomain: null,
                country: clientCountry(req),
                device: deviceFromUa(ua),
                props: fields.props ?? {},
              },
            ]);
          } catch (e) {
            log("error", "event write failed", { requestId, error: String(e) });
          }
        },
      };
      const res = await fn(ctx, await segment.params);
      status = res.status;
      return res;
    } catch (e) {
      if (e instanceof HttpError) {
        status = e.status;
        return json({ error: e.message, ...(e.details ? { details: e.details } : {}) }, { status });
      }
      if (e instanceof NotFoundError) {
        status = 404;
        return json({ error: e.message }, { status });
      }
      if (e instanceof SlugTakenError) {
        status = 409;
        return json({ error: e.message, code: "slug_taken" }, { status });
      }
      log("error", "unhandled route error", { requestId, path, error: e instanceof Error ? (e.stack ?? e.message) : String(e) });
      return json({ error: "Something went wrong on our side." }, { status: 500 });
    } finally {
      log(status >= 500 ? "error" : "info", "request", { requestId, method: req.method, path, status, ms: Date.now() - started, userId });
    }
  };
}
