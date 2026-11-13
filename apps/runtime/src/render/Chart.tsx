import type { CSSProperties, ReactNode } from "react";
import type { ChartValue } from "../schema/portfolio";

/**
 * Charts are static inline SVG painted with the active template's tokens, so
 * one implementation matches every palette in light and dark mode. Each has a
 * fixed viewBox (no layout shift), no animation at all, an accessible name
 * taken from `summary`, and the raw numbers in a visually hidden table.
 *
 * One hue only: `--sig` carries the data, `--line` the empty state and
 * guides, and text always wears `--ink` / `--mute`.
 */

type Point = ChartValue["points"][number];

const SIG: CSSProperties = { fill: "var(--sig)" };
const TRACK: CSSProperties = { fill: "var(--line)" };
const INK: CSSProperties = { fill: "var(--ink)" };
const MUTE: CSSProperties = { fill: "var(--mute)" };
const HIDDEN: CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };

const nf = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const fmt = (n: number) => (Math.abs(n) >= 10000 ? compact.format(n) : nf.format(n));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const name = (p: Point) => p.label || p.x;
const round = (n: number) => Math.round(n * 100) / 100;

function top(points: Point[], max?: number): number {
  const m = Math.max(0, ...points.map((p) => p.y), max ?? 0);
  return m > 0 ? m : 1;
}

/* ───────────── heatmap: one cell per point, a column per week ───────────── */

const CELL = 10;
const STEP = 12;
/** Four steps of one hue: enough to read "more", few enough to tell apart. */
const LEVELS = [0.3, 0.52, 0.76, 1];

function Heatmap({ chart }: { chart: ChartValue }) {
  const { points } = chart;
  const first = /^\d{4}-\d{2}-\d{2}$/.test(points[0]?.x ?? "") ? new Date(`${points[0]!.x}T00:00:00Z`).getUTCDay() : 0;
  const offset = Number.isFinite(first) ? first : 0;
  const cols = Math.ceil((offset + points.length) / 7);
  const max = top(points, chart.max);
  return {
    width: cols * STEP - (STEP - CELL),
    height: 7 * STEP - (STEP - CELL),
    maxWidth: `${Math.max(12, cols * 0.75)}rem`,
    body: points.map((p, i) => {
      const at = offset + i;
      const level = p.y > 0 ? LEVELS[Math.min(3, Math.ceil((p.y / max) * 4) - 1)] : undefined;
      return (
        <rect key={i} x={Math.floor(at / 7) * STEP} y={(at % 7) * STEP} width={CELL} height={CELL} rx={2} style={level ? { ...SIG, fillOpacity: level } : TRACK}>
          <title>{`${name(p)}: ${fmt(p.y)}${chart.unit ? ` ${chart.unit}` : ""}`}</title>
        </rect>
      );
    }),
  };
}

/* ───────────── line: change over time ───────────── */

function Line({ chart }: { chart: ChartValue }) {
  const { points } = chart;
  const W = 320;
  const H = 132;
  const L = 4;
  const R = 316;
  const T = 16;
  const B = 106;
  const ys = points.map((p) => p.y);
  const hi = Math.max(...ys, chart.max ?? -Infinity);
  const lo = Math.min(...ys);
  const span = hi - lo || 1;
  const px = (i: number) => round(points.length === 1 ? (L + R) / 2 : L + (i / (points.length - 1)) * (R - L));
  const py = (y: number) => round(B - ((y - lo) / span) * (B - T));
  const path = points.map((p, i) => `${px(i)},${py(p.y)}`).join(" ");
  const last = points[points.length - 1]!;
  return {
    width: W,
    height: H,
    maxWidth: "34rem",
    body: (
      <>
        <line x1={L} x2={R} y1={T} y2={T} style={{ stroke: "var(--line)" }} strokeWidth={1} strokeDasharray="2 3" />
        <line x1={L} x2={R} y1={B} y2={B} style={{ stroke: "var(--line)" }} strokeWidth={1} />
        {points.length > 1 ? <polygon points={`${px(0)},${B} ${path} ${px(points.length - 1)},${B}`} style={{ ...SIG, fillOpacity: 0.1 }} /> : null}
        {points.length > 1 ? <polyline points={path} fill="none" style={{ stroke: "var(--sig)" }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /> : null}
        <circle cx={px(points.length - 1)} cy={py(last.y)} r={3.5} style={{ ...SIG, stroke: "var(--ground)" }} strokeWidth={1.5} />
        <text x={L} y={T - 5} fontSize={10} style={MUTE}>{`${fmt(hi)}${chart.unit ? ` ${chart.unit}` : ""}`}</text>
        <text x={L} y={H - 12} fontSize={10} style={MUTE}>{clip(points[0]!.x, 20)}</text>
        {points.length > 1 ? <text x={R} y={H - 12} fontSize={10} textAnchor="end" style={MUTE}>{clip(last.x, 20)}</text> : null}
        <text x={R} y={T - 5} fontSize={10} textAnchor="end" fontWeight={600} style={INK}>{`${clip(name(last), 18)} · ${fmt(last.y)}`}</text>
      </>
    ),
  };
}

/* ───────────── bars: magnitude by category ───────────── */

const MAX_BARS = 10;

function Bars({ chart }: { chart: ChartValue }) {
  const points = chart.points.slice(0, MAX_BARS);
  const ROW = 20;
  const max = top(points, chart.max);
  const x0 = 104;
  const x1 = 276;
  return {
    width: 320,
    height: points.length * ROW,
    maxWidth: "34rem",
    body: points.map((p, i) => {
      const w = Math.max(p.y > 0 ? 2 : 0, round((Math.max(0, p.y) / max) * (x1 - x0)));
      const y = i * ROW;
      return (
        <g key={i}>
          <text x={0} y={y + 13.5} fontSize={11} style={INK}>{clip(name(p), 17)}</text>
          <rect x={x0} y={y + 6} width={x1 - x0} height={8} rx={4} style={{ ...TRACK, fillOpacity: 0.6 }} />
          {w ? <rect x={x0} y={y + 6} width={w} height={8} rx={4} style={SIG} /> : null}
          <text x={320} y={y + 13.5} fontSize={11} textAnchor="end" style={{ ...MUTE, fontVariantNumeric: "tabular-nums" }}>{`${fmt(p.y)}${chart.unit ?? ""}`}</text>
        </g>
      );
    }),
  };
}

/* ───────────── rings: a few parts against a whole ───────────── */

const MAX_RINGS = 6;

function Rings({ chart }: { chart: ChartValue }) {
  const points = chart.points.slice(0, MAX_RINGS);
  const whole = chart.max && chart.max > 0 ? chart.max : points.reduce((n, p) => n + Math.max(0, p.y), 0) || 1;
  const r = 27;
  const c = 2 * Math.PI * r;
  const cell = 84;
  return {
    width: points.length * cell,
    height: 96,
    maxWidth: `${points.length * 7.5}rem`,
    body: points.map((p, i) => {
      const cx = i * cell + cell / 2;
      const part = Math.min(1, Math.max(0, p.y) / whole);
      return (
        <g key={i}>
          <circle cx={cx} cy={36} r={r} fill="none" style={{ stroke: "var(--line)" }} strokeWidth={6} />
          {part > 0 ? (
            <circle cx={cx} cy={36} r={r} fill="none" style={{ stroke: "var(--sig)" }} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${round(part * c)} ${round(c)}`} transform={`rotate(-90 ${cx} 36)`} />
          ) : null}
          <text x={cx} y={41} fontSize={14} fontWeight={700} textAnchor="middle" style={{ ...INK, fontVariantNumeric: "tabular-nums" }}>{fmt(p.y)}</text>
          <text x={cx} y={88} fontSize={10} textAnchor="middle" style={MUTE}>{clip(name(p), 14)}</text>
        </g>
      );
    }),
  };
}

const DRAW: Record<ChartValue["variant"], (p: { chart: ChartValue }) => { width: number; height: number; maxWidth: string; body: ReactNode }> = {
  heatmap: Heatmap,
  line: Line,
  bars: Bars,
  rings: Rings,
};

export function Chart({ chart }: { chart: ChartValue }) {
  if (!chart.points.length) return null;
  const { width, height, maxWidth, body } = DRAW[chart.variant]({ chart });
  const label = chart.summary || chart.title || "Chart";
  return (
    <figure className="pf-chart" data-variant={chart.variant} style={{ margin: 0, display: "grid", gap: "0.5rem", minWidth: 0, position: "relative" }}>
      {chart.title ? (
        <p aria-hidden="true" style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--mute)" }}>
          {chart.title}
        </p>
      ) : null}
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMinYMid meet"
        style={{ display: "block", width: "100%", maxWidth, height: "auto", aspectRatio: `${width} / ${height}`, fontFamily: "inherit" }}
      >
        {body}
      </svg>
      {chart.summary ? (
        <figcaption aria-hidden="true" style={{ fontSize: "0.8125rem", lineHeight: 1.45, color: "var(--mute)" }}>
          {chart.summary}
        </figcaption>
      ) : null}
      <table style={HIDDEN}>
        <caption>{chart.title || label}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">{chart.unit || "Value"}</th>
          </tr>
        </thead>
        <tbody>
          {chart.points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{name(p)}</th>
              <td>{nf.format(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
