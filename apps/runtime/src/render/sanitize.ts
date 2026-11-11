/**
 * Allowlist HTML sanitizer for rich text. Runs anywhere (no DOM needed).
 * Allowed: p, br, strong/b, em/i, a[href], ul, ol, li. Everything else is
 * stripped; dangerous containers (script, style, …) are dropped with their content.
 */
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "a", "ul", "ol", "li"]);
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "textarea", "title", "head", "select"]);
const TAG = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>?/g;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const escapeText = (text: string) =>
  text.replace(/&(?!(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function decodeEntities(v: string): string {
  return v
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(Math.min(parseInt(h, 16), 0x10ffff)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Math.min(parseInt(d, 10), 0x10ffff)))
    .replace(/&colon;/gi, ":")
    .replace(/&tab;|&newline;/gi, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Returns a safe href (http, https, mailto, tel, or #anchor) or null. */
export function safeHref(raw: string): string | null {
  const href = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "");
  if (/^https?:\/\/[^<>"']+$/i.test(href)) return href;
  if (/^mailto:[^<>"']+$/i.test(href)) return href;
  if (/^tel:[+\d().-]+$/i.test(href)) return href;
  if (/^#[\w-]*$/.test(href)) return href;
  if (/^\/(?!\/)[^<>"'\\]*$/.test(href)) return href;
  return null;
}

export function sanitizeRichText(input: string): string {
  if (!input) return "";
  let out = "";
  let last = 0;
  let dropUntil: string | null = null;
  const stack: string[] = [];
  TAG.lastIndex = 0;
  for (let m = TAG.exec(input); m; m = TAG.exec(input)) {
    if (!dropUntil) out += escapeText(input.slice(last, m.index));
    last = m.index + m[0].length;
    const name = m[2]?.toLowerCase();
    if (!name) continue; // comment
    const closing = m[1] === "/";
    if (dropUntil) {
      if (closing && name === dropUntil) dropUntil = null;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !/\/\s*$/.test(m[3] ?? "")) dropUntil = name;
      continue;
    }
    if (!ALLOWED.has(name)) continue;
    if (name === "br") {
      if (!closing) out += "<br>";
      continue;
    }
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at === -1) continue;
      while (stack.length > at) out += `</${stack.pop()}>`;
      continue;
    }
    if (name === "a") {
      const attr = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(m[3] ?? "");
      const href = attr ? safeHref(attr[1] ?? attr[2] ?? attr[3] ?? "") : null;
      if (stack.includes("a")) continue; // no nested links
      out += href
        ? `<a href="${escapeHtml(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener noreferrer nofollow"' : ""}>`
        : "<a>";
    } else {
      out += `<${name}>`;
    }
    stack.push(name);
  }
  if (!dropUntil) out += escapeText(input.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/** Plain multi-line text → safe paragraphs. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<\/(p|li|ul|ol)>/gi, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}
