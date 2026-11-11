"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Stats } from "@/lib/stats";

const axis = { stroke: "var(--edge)", tick: { fill: "var(--dim)", fontSize: 12 }, tickLine: false } as const;
const tooltip = {
  contentStyle: { background: "var(--panel)", border: "1px solid var(--rule)", borderRadius: 10, color: "var(--fg)", fontSize: 13 },
  labelStyle: { color: "var(--fg)", fontWeight: 600 },
  itemStyle: { color: "var(--fg)" },
  cursor: { fill: "var(--panel2)", stroke: "var(--edge)" },
} as const;
const legend = { formatter: (value: string) => <span style={{ color: "var(--fg)", fontSize: 13 }}>{value}</span> } as const;

function Frame({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <div role="img" aria-label={label} className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function VisitorsChart({ series }: { series: Stats["series"] }) {
  return (
    <Frame label="Line chart of unique visitors over time. The same numbers are in the data table below.">
      <LineChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis allowDecimals={false} {...axis} axisLine={false} />
        <Tooltip {...tooltip} />
        <Line type="monotone" dataKey="visitors" name="Unique visitors" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--panel)", strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </Frame>
  );
}

export function DeploysChart({ series }: { series: Stats["series"] }) {
  return (
    <Frame label="Bar chart of deploy clicks and confirmed deployments over time. The same numbers are in the data table below.">
      <BarChart data={series} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis allowDecimals={false} {...axis} axisLine={false} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Bar dataKey="deployClicks" name="Deploy clicks" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        <Bar dataKey="deployConfirmed" name="Confirmed" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function TemplatesChart({ templates }: { templates: Stats["templates"] }) {
  return (
    <Frame label="Bar chart comparing how often each template was selected and deployed. The same numbers are in the data table below.">
      <BarChart data={templates} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="templateId" {...axis} interval={0} />
        <YAxis allowDecimals={false} {...axis} axisLine={false} />
        <Tooltip {...tooltip} />
        <Legend {...legend} />
        <Bar dataKey="selected" name="Selected" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        <Bar dataKey="deployed" name="Deployed" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}
