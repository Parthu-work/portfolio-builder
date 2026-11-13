import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import datasets from "../__fixtures__/huggingface/datasets.json";
import models from "../__fixtures__/huggingface/models.json";
import overview from "../__fixtures__/huggingface/overview.json";
import spaces from "../__fixtures__/huggingface/spaces.json";
import { huggingfaceProvider, type HuggingfaceData } from "./huggingface";

const cfg = { id: "c1", provider: "huggingface", account: "maya", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
function route(table: [RegExp, number, unknown][]) {
  const fetch = vi.fn(async (url: string) => {
    const hit = table.find(([re]) => re.test(url));
    return hit ? new Response(JSON.stringify(hit[2]), { status: hit[1] }) : new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const full = (): [RegExp, number, unknown][] => [
  [/\/api\/users\/maya\/overview$/, 200, overview],
  [/\/api\/models\?author=maya&sort=downloads&direction=-1&limit=100$/, 200, models],
  [/\/api\/spaces\?author=maya&sort=likes/, 200, spaces],
  [/\/api\/datasets\?author=maya&sort=downloads/, 200, datasets],
];

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("huggingface provider", () => {
  it("reads the account's own models, Spaces and datasets", async () => {
    route(full());
    const d = (await huggingfaceProvider.fetch("maya", {}, ctx())) as unknown as HuggingfaceData;
    expect(d.models.map((m) => m.id)).toEqual(["maya/tiny-ner", "maya/qlora-7b"]);
    expect(d.spaces).toEqual([{ id: "maya/ner-demo", likes: 12, downloads: null, tag: "gradio" }]);
    expect(d.capped).toEqual([]);
  });

  it("maps into counts, likes and 30-day downloads, plus linked entries", async () => {
    route(full());
    const sections = huggingfaceProvider.toSections(await huggingfaceProvider.fetch("maya", {}, ctx()), cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    const [stats, repos] = sections;
    expect(stats!.items!.map((i) => i.values.stat)).toEqual([
      { value: "2", label: "models" },
      { value: "1", label: "Space" },
      { value: "1", label: "dataset" },
      { value: "63", label: "likes" },
      { value: "18,230", label: "model downloads (last 30 days)" },
    ]);
    expect(repos!.items!.map((i) => [i.id, i.values.summary, i.values.impact, (i.values.link as { href: string }).href])).toEqual([
      ["model-maya-tiny-ner", "Model · token-classification", { value: "18,230", label: "downloads (30 days)" }, "https://huggingface.co/maya/tiny-ner"],
      ["model-maya-qlora-7b", "Model · text-generation", { value: "3", label: "likes" }, "https://huggingface.co/maya/qlora-7b"],
      ["space-maya-ner-demo", "Space · gradio", { value: "12", label: "likes" }, "https://huggingface.co/spaces/maya/ner-demo"],
      ["dataset-maya-support-tickets", "Dataset", { value: "402", label: "downloads (30 days)" }, "https://huggingface.co/datasets/maya/support-tickets"],
    ]);
  });

  it("says when a list hit the page limit instead of under-counting", () => {
    const repo = (i: number) => ({ id: `maya/m${i}`, likes: 0, downloads: 0, tag: "" });
    const d: HuggingfaceData = { account: "maya", models: Array.from({ length: 100 }, (_, i) => repo(i)), spaces: [], datasets: [], capped: ["model"] };
    expect(huggingfaceProvider.toSections(d as never, cfg)[0]!.items![0]!.values.stat).toEqual({ value: "100+", label: "models" });
  });

  it("finds organizations too, and reports unknown names", async () => {
    route([
      [/\/api\/organizations\/acme\/overview$/, 200, {}],
      [/\/api\/(models|spaces|datasets)\?author=acme/, 200, []],
    ]);
    expect(huggingfaceProvider.toSections(await huggingfaceProvider.fetch("acme", {}, ctx()), cfg)).toEqual([]);
    route([]);
    await expect(huggingfaceProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });
});
