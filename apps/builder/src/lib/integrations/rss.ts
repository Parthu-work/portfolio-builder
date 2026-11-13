/**
 * A deliberately tiny RSS 2.0 reader: pulls title, link, date and summary out
 * of <item>s with bounded regexes. No DTDs or entity expansion beyond the
 * five XML entities and numeric references, so nothing can be smuggled in.
 */

export type FeedItem = { title: string; link: string; date: string; summary: string };

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi, (m, e: string) => {
    if (e[0] !== "#") return NAMED[e.toLowerCase()] ?? m;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });

/** Plain text from a bit of HTML: tags dropped, entities decoded, whitespace collapsed. */
export const plainText = (html: string, max = 300) => {
  const text = decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(?:p|br|div|li|ul|ol|h[1-6]|blockquote|tr|td)\b[^>]{0,2000}>/gi, " ")
      .replace(/<[^>]{0,2000}>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

const field = (item: string, tag: string): string => {
  const m = new RegExp(`<${tag}(?:\\s[^>]{0,200})?>([\\s\\S]{0,20000}?)</${tag}>`, "i").exec(item);
  if (!m) return "";
  const raw = m[1]!.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(raw);
  return cdata ? cdata[1]! : decode(raw);
};

export const isoDay = (s: string): string => {
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "";
};

export function parseRss(xml: string, limit = 20): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item(?:\s[^>]{0,200})?>([\s\S]{0,200000}?)<\/item>/gi)) {
    const body = m[1]!;
    const link = field(body, "link").trim();
    const title = plainText(field(body, "title"), 200);
    if (!title || !/^https:\/\/[^\s<>"']+$/.test(link)) continue;
    items.push({ title, link, date: isoDay(field(body, "pubDate")), summary: plainText(field(body, "description")) });
    if (items.length >= limit) break;
  }
  return items;
}
