import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import month from "../__fixtures__/wakatime/month.json";
import pending from "../__fixtures__/wakatime/pending.json";
import priv from "../__fixtures__/wakatime/private.json";
import week from "../__fixtures__/wakatime/week.json";
import { PRIVATE_HELP, wakatimeProvider, type WakatimeData } from "./wakatime";

const cfg = { id: "c1", provider: "wakatime", account: "maya", options: { month: false }, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
function route(weekAnswer: [number, unknown], monthAnswer: [number, unknown]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const [status, body] = url.endsWith("/stats/last_7_days") ? weekAnswer : monthAnswer;
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wakatime provider", () => {
  it("reads both ranges so the 7/30-day choice needs no refetch", async () => {
    route([200, week], [200, month]);
    const data = await wakatimeProvider.fetch("maya", {}, ctx());
    const d = data as unknown as WakatimeData;
    expect(d.week).toMatchObject({ totalText: "21 hrs 4 mins", languages: [["TypeScript", 61.2], ["Go", 22.5], ["Markdown", 9.1], ["YAML", 4], ["Bash", 2], ["JSON", 1]] });
    expect(d.month!.languages).toEqual([]); // the user hid languages publicly

    const [weekly] = wakatimeProvider.toSections(data, cfg);
    expect(SectionSchema.safeParse(weekly).success).toBe(true);
    expect(weekly!.items!.map((i) => i.values.stat)).toEqual([
      { value: "21 hrs 4 mins", label: "coding, last 7 days" },
      { value: "3 hrs 0 mins", label: "daily average" },
    ]);
    expect(weekly!.fields.map((f) => f.key)).toEqual(["languages", "editors"]);
    expect((weekly!.fields[1]!.value as { summary: string }).summary).toBe("Editors in the last 7 days on WakaTime: VS Code 88%, Vim 12%");

    const [monthly] = wakatimeProvider.toSections(data, { ...cfg, options: { month: true } });
    expect(monthly!.items![0]!.values.stat).toEqual({ value: "88 hrs 53 mins", label: "coding, last 30 days" });
    expect(monthly!.fields).toEqual([]);
  });

  it("explains how to make private stats public", async () => {
    route([200, priv], [200, priv]);
    await expect(wakatimeProvider.fetch("maya", {}, ctx())).rejects.toMatchObject({ kind: "private", message: PRIVATE_HELP });
    route([403, { error: "Forbidden" }], [403, {}]);
    await expect(wakatimeProvider.fetch("maya", {}, ctx())).rejects.toMatchObject({ kind: "private" });
  });

  it("uses whichever range is ready, and waits when neither is", async () => {
    route([200, pending], [200, month]);
    const data = await wakatimeProvider.fetch("maya", {}, ctx());
    expect(wakatimeProvider.toSections(data, cfg)[0]!.items![0]!.values.stat).toEqual({ value: "88 hrs 53 mins", label: "coding, last 30 days" });
    route([200, pending], [200, pending]);
    await expect(wakatimeProvider.fetch("maya", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
    route([404, {}], [404, {}]);
    await expect(wakatimeProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });
});
