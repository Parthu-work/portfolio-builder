import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import badges from "../__fixtures__/credly/badges.json";
import { credlyProvider, type CredlyData } from "./credly";

const cfg = { id: "c1", provider: "credly", account: "maya-okafor", options: { images: true }, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
const respond = (status: number, body: unknown) => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("credly provider", () => {
  it("reads public, accepted badges only, with HTTPS images only", async () => {
    const fetch = respond(200, badges);
    const d = (await credlyProvider.fetch("maya-okafor", {}, ctx())) as unknown as CredlyData;
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://www.credly.com/users/maya-okafor/badges.json");
    expect(d.badges.map((b) => [b.name, b.issuer, b.issued, b.image])).toEqual([
      ["AWS Certified Solutions Architect – Associate", "Amazon Web Services Training and Certification", "2025-03-14", "https://images.credly.com/size/340x340/images/aws-saa.png"],
      ["Professional Cloud Developer", "Google Cloud", "2024-11-02", "https://images.credly.com/size/340x340/images/t.png"],
    ]);
  });

  it("maps into certifications that link to the issuer-backed badge page", async () => {
    respond(200, badges);
    const data = await credlyProvider.fetch("maya-okafor", {}, ctx());
    const [certs] = credlyProvider.toSections(data, cfg);
    expect(SectionSchema.safeParse(certs).success).toBe(true);
    expect(certs).toMatchObject({ id: "c1_certs", kind: "certifications" });
    expect(certs!.items![0]!.values).toMatchObject({ link: "https://www.credly.com/badges/0b7c1a52-3d4e-4f60-9a1b-2c3d4e5f6a7b", image: { src: "https://images.credly.com/size/340x340/images/aws-saa.png" } });
    const [plain] = credlyProvider.toSections(data, { ...cfg, options: { images: false } });
    expect(plain!.items!.every((i) => !("image" in i.values))).toBe(true);
    expect(credlyProvider.toSections({ badges: [] } as never, cfg)).toEqual([]);
  });

  it("is labelled as issuer-verified rather than owner-verified, and has no verify step", () => {
    expect(credlyProvider.unverifiedNote).toBe("Issuer-verified on Credly");
    expect(credlyProvider.verify).toBeUndefined();
    expect(credlyProvider.official).toBe(false);
  });

  it("reports missing users and unexpected answers", async () => {
    respond(404, {});
    await expect(credlyProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    respond(200, { message: "changed" });
    await expect(credlyProvider.fetch("maya-okafor", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
  });
});
