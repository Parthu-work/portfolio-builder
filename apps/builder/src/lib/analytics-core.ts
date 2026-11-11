import { z } from "zod";
import { sha256 } from "./crypto";

export const EVENT_TYPES = [
  "page_view",
  "signup",
  "login",
  "portfolio_created",
  "template_selected",
  "template_switched",
  "section_added",
  "custom_section_added",
  "custom_field_added",
  "published",
  "deploy_clicked",
  "deploy_confirmed",
  "zip_downloaded",
  "json_exported",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Events a browser is allowed to report. The rest are only ever written by the server. */
export const CLIENT_EVENT_TYPES = [
  "page_view",
  "template_selected",
  "template_switched",
  "section_added",
  "custom_section_added",
  "custom_field_added",
  "deploy_clicked",
  "json_exported",
] as const satisfies readonly EventType[];

const PropValue = z.union([z.string().max(200), z.number().finite(), z.boolean()]);

export const TrackBatchSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.enum(CLIENT_EVENT_TYPES),
        path: z.string().max(300).optional(),
        referrer: z.string().max(300).optional(),
        portfolioId: z.string().uuid().optional(),
        props: z.record(z.string().max(40), PropValue).optional(),
      }),
    )
    .min(1)
    .max(25),
});
export type TrackBatch = z.infer<typeof TrackBatchSchema>;

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

/** The salt changes every UTC day, so a visitor cannot be followed from one day to the next. */
export async function dailySalt(secret: string, date = new Date()): Promise<string> {
  return sha256(`${secret}:${dayKey(date)}`);
}

/**
 * session_hash = sha256(daily_salt + ip + user_agent).
 * The raw IP is used only to compute this hash and is never stored.
 */
export async function sessionHash(secret: string, ip: string, userAgent: string, date = new Date()): Promise<string> {
  return sha256(`${await dailySalt(secret, date)}${ip}${userAgent}`);
}

/** Non-rotating hash for the audit log (so one actor's entries can be correlated). */
export async function ipHash(secret: string, ip: string): Promise<string> {
  return (await sha256(`audit:${secret}:${ip}`)).slice(0, 32);
}

export function deviceFromUa(ua: string): "mobile" | "tablet" | "desktop" | "bot" {
  if (/bot|crawl|spider|slurp|lighthouse|headless/i.test(ua)) return "bot";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Only the registrable host of a referrer is kept — never the full URL. */
export function referrerDomain(referrer: string | undefined, selfHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || host === selfHost.replace(/^www\./, "").split(":")[0]) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}
