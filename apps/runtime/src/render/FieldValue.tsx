import type { ChartValue, CodeValue, DateRangeValue, FieldDef, ImageValue, LinkValue, MetricValue } from "../schema/portfolio";
import { Chart } from "./Chart";
import { Img } from "./Img";
import { sanitizeRichText, textToHtml } from "./sanitize";
import { formatDate, formatRange, hostLabel, isEmptyValue, isExternal, read, SYNC_KEY, type Slot } from "./view";

const ext = (href: string) => (isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {});

/** Sanitized HTML block. `html` MUST come from sanitizeRichText / textToHtml. */
export function Prose({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`pf-prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Tags({ tags, className = "" }: { tags: string[]; className?: string }) {
  return (
    <ul className={`pf-tags ${className}`}>
      {tags.map((t, i) => (
        <li key={`${t}-${i}`} className="pf-tag">
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Links({ links, className = "", primaryFirst = false }: { links: LinkValue[]; className?: string; primaryFirst?: boolean }) {
  if (!links.length) return null;
  return (
    <ul className={`pf-links ${className}`}>
      {links.map((l, i) => (
        <li key={`${l.href}-${i}`}>
          <a href={l.href} {...ext(l.href)} className={primaryFirst && i === 0 ? "pf-btn" : primaryFirst ? "pf-btn pf-btn-ghost" : "pf-link"}>
            {l.label}
            {isExternal(l.href) ? <span aria-hidden="true"> ↗</span> : null}
            {isExternal(l.href) ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function videoEmbed(url: string): { kind: "file" | "link"; label: string } {
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: "file", label: "Video" };
  return { kind: "link", label: `Watch on ${hostLabel(url)}` };
}

/**
 * The generic renderer: draws any value purely from its FieldType, styled
 * with the active template's tokens. This is what makes user-defined fields
 * and sections render in every template.
 */
export function FieldValue({ def, value, lang = "en" }: { def: Pick<FieldDef, "type" | "label">; value: unknown; lang?: string }) {
  if (isEmptyValue(def.type, value)) return null;
  switch (def.type) {
    case "text":
    case "select":
      return <span>{read("text", value)}</span>;
    case "longtext":
      return <Prose html={textToHtml(read("longtext", value) ?? "")} />;
    case "richtext":
      return <Prose html={sanitizeRichText(read("richtext", value) ?? "")} />;
    case "url": {
      const href = read("url", value) ?? "";
      return (
        <a className="pf-link" href={href} {...ext(href)}>
          {hostLabel(href)}
          <span aria-hidden="true"> ↗</span>
        </a>
      );
    }
    case "email": {
      const v = read("email", value) ?? "";
      return (
        <a className="pf-link" href={`mailto:${v}`}>
          {v}
        </a>
      );
    }
    case "phone": {
      const v = read("phone", value) ?? "";
      return (
        <a className="pf-link" href={`tel:${v.replace(/[^+\d]/g, "")}`}>
          {v}
        </a>
      );
    }
    case "number": {
      const n = read("number", value);
      return <span className="pf-num">{typeof n === "number" ? new Intl.NumberFormat("en").format(n) : null}</span>;
    }
    case "metric": {
      const m = read("metric", value) as MetricValue;
      return (
        <span className="pf-metric">
          <span className="pf-metric-value">{m.value}</span>
          {m.label ? <span className="pf-metric-label">{m.label}</span> : null}
        </span>
      );
    }
    case "date":
      return <time dateTime={read("date", value)}>{formatDate(read("date", value) ?? "", lang)}</time>;
    case "daterange":
      return <span>{formatRange(read("daterange", value) as DateRangeValue, lang)}</span>;
    case "image":
      return <Img image={read("image", value) as ImageValue} sizes="(min-width: 768px) 480px, 100vw" className="pf-media" />;
    case "gallery":
      return (
        <ul className="pf-gallery">
          {(read("gallery", value) as ImageValue[])
            .filter((i) => i.src)
            .map((img, i) => (
              <li key={`${img.src}-${i}`}>
                <Img image={img} aspect="1 / 1" sizes="(min-width: 768px) 240px, 50vw" className="pf-media" />
              </li>
            ))}
        </ul>
      );
    case "tags":
      return <Tags tags={(read("tags", value) as string[]).filter((t) => t.trim())} />;
    case "link": {
      const l = read("link", value) as LinkValue;
      return <Links links={[{ href: l.href, label: l.label || hostLabel(l.href) }]} />;
    }
    case "linklist":
      return <Links links={(read("linklist", value) as LinkValue[]).filter((l) => l.href).map((l) => ({ href: l.href, label: l.label || hostLabel(l.href) }))} />;
    case "video": {
      const url = read("video", value) ?? "";
      const v = videoEmbed(url);
      return v.kind === "file" ? (
        <video className="pf-media w-full" controls preload="none" src={url} aria-label={def.label} />
      ) : (
        <a className="pf-link" href={url} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">▶ </span>
          {v.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
    case "code": {
      const c = read("code", value) as CodeValue;
      return (
        <pre className="pf-code" tabIndex={0} aria-label={`${def.label}${c.language ? ` (${c.language})` : ""}`}>
          <code>{c.code}</code>
        </pre>
      );
    }
    case "chart":
      return <Chart chart={read("chart", value) as ChartValue} />;
    default:
      return null;
  }
}

const WIDE = { gridColumn: "1 / -1" } as const;

/** Labelled list of leftover fields — the tail of every entry. */
export function Rest({ slots, lang, className = "" }: { slots: Slot[]; lang?: string; className?: string }) {
  if (!slots.length) return null;
  return (
    <dl className={`pf-dl ${className}`}>
      {slots.map(({ def, value }) =>
        def.key === SYNC_KEY ? (
          // Provenance of a synced section: present, but quieter than any content.
          <div key={def.key} className="pf-dl-row pf-sync" style={WIDE}>
            <dd style={{ fontSize: "0.75rem", lineHeight: 1.5, color: "var(--mute)" }}>{String(value)}</dd>
          </div>
        ) : (
          <div key={def.key} className="pf-dl-row" style={def.type === "chart" ? WIDE : undefined}>
            {def.label && def.type !== "chart" ? <dt>{def.label}</dt> : null}
            <dd>
              <FieldValue def={def} value={value} lang={lang} />
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}

/** Tags, links and leftover fields of an entry — the shared tail every layout ends with. */
export function Tail({ e, lang, className = "" }: { e: { tags?: string[]; links: LinkValue[]; rest: Slot[] }; lang?: string; className?: string }) {
  if (!e.tags?.length && !e.links.length && !e.rest.length) return null;
  return (
    <div className={`pf-tail grid gap-3 ${className}`}>
      {e.tags?.length ? <Tags tags={e.tags} /> : null}
      <Rest slots={e.rest} lang={lang} />
      <Links links={e.links} />
    </div>
  );
}

/** Social profile links as text (no brand assets), with rel="me". */
export function Socials({ socials, className = "", linkClassName = "pf-link" }: { socials: { url: string; label: string }[]; className?: string; linkClassName?: string }) {
  if (!socials.length) return null;
  return (
    <ul className={className}>
      {socials.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer me" className={linkClassName}>
            {s.label}
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A metric as value + label, sized by the surrounding font-size. */
export function Metric({ metric, className = "" }: { metric: MetricValue; className?: string }) {
  return (
    <span className={`pf-metric ${className}`}>
      <span className="pf-metric-value">{metric.value}</span>
      {metric.label ? <span className="pf-metric-label">{metric.label}</span> : null}
    </span>
  );
}
