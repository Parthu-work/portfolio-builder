import { PortfolioSchema, SCHEMA_VERSION, emptyValue, FIELD_TYPES, type FieldType, type Portfolio } from "./portfolio";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/**
 * v0 was the pre-release shape:
 *  - no `schemaVersion`
 *  - `theme.template` / `theme.palette` / `theme.font` instead of the *Id names
 *  - `theme.animations: boolean` instead of `theme.motion`
 *  - sections used `type` instead of `kind` and `hidden` instead of `visible`
 *  - items were flat objects (`{ id, title, … }`) instead of `{ id, values, visible }`
 *  - image values were bare URL strings
 */
function v0ToV1(input: Json): Json {
  const theme = isObj(input.theme) ? input.theme : {};
  const meta = isObj(input.meta) ? input.meta : {};
  const profile = isObj(input.profile) ? input.profile : {};

  const fixValue = (type: unknown, value: unknown): unknown => {
    if ((type === "image") && typeof value === "string") return { src: value, alt: "" };
    if (type === "gallery") return arr(value).map((v) => (typeof v === "string" ? { src: v, alt: "" } : v));
    return value;
  };

  const sections = arr(input.sections).filter(isObj).map((s, i) => {
    const itemSchema = arr(s.itemSchema).filter(isObj);
    const types = new Map(itemSchema.map((d) => [str(d.key), d.type]));
    const items = Array.isArray(s.items)
      ? s.items.filter(isObj).map((it, j) => {
          const raw = isObj(it.values) ? it.values : Object.fromEntries(Object.entries(it).filter(([k]) => !["id", "hidden", "visible"].includes(k)));
          const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, fixValue(types.get(k), v)]));
          return { id: str(it.id, `it_${i}_${j}`), values, visible: it.visible !== undefined ? it.visible !== false : it.hidden !== true };
        })
      : undefined;
    return {
      id: str(s.id, `sec_${i}`),
      kind: str(s.kind, str(s.type, "custom")),
      title: str(s.title),
      ...(typeof s.subtitle === "string" ? { subtitle: s.subtitle } : {}),
      visible: s.visible !== undefined ? s.visible !== false : s.hidden !== true,
      ...(typeof s.layout === "string" ? { layout: s.layout } : {}),
      fields: arr(s.fields).filter(isObj).map((fl) => ({ ...fl, value: fixValue(fl.type, fl.value) })),
      ...(items ? { items } : {}),
      ...(itemSchema.length ? { itemSchema } : {}),
    };
  });

  return {
    schemaVersion: 1,
    meta: { language: "en", ...meta },
    profile: {
      ...profile,
      socials: arr(profile.socials),
      ...(typeof profile.avatar === "string" ? { avatar: { src: profile.avatar, alt: str(profile.name) } } : {}),
    },
    theme: {
      templateId: str(theme.templateId, str(theme.template, "swiss")),
      paletteId: str(theme.paletteId, str(theme.palette, "default")),
      fontPairId: str(theme.fontPairId, str(theme.font, "default")),
      mode: str(theme.mode, "system"),
      motion: str(theme.motion, theme.animations === false ? "none" : "full"),
      radius: str(theme.radius, "soft"),
    },
    sections,
  };
}

/** One step per historical version: MIGRATIONS[n] upgrades version n to n + 1. */
const MIGRATIONS: Record<number, (input: Json) => Json> = {
  0: v0ToV1,
};

export class MigrationError extends Error {}

/**
 * Upgrades a stored portfolio of any older schemaVersion to the current one
 * and validates the result. Throws `MigrationError` when the input cannot be
 * understood (e.g. it was written by a newer version of Persona).
 */
export function migrate(input: unknown): Portfolio {
  if (!isObj(input)) throw new MigrationError("Portfolio must be an object");
  let version = typeof input.schemaVersion === "number" ? input.schemaVersion : 0;
  if (version > SCHEMA_VERSION) {
    throw new MigrationError(`Portfolio schemaVersion ${version} is newer than supported version ${SCHEMA_VERSION}`);
  }
  let data: Json = input;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new MigrationError(`No migration from schemaVersion ${version}`);
    data = step(data);
    version += 1;
  }
  const parsed = PortfolioSchema.safeParse(repair(data));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new MigrationError(`Invalid portfolio: ${first?.path.join(".")} — ${first?.message}`);
  }
  return parsed.data;
}

/** Drops field definitions with unknown types and fills missing values, so one bad field never bricks a site. */
function repair(data: Json): Json {
  const known = (t: unknown): t is FieldType => typeof t === "string" && (FIELD_TYPES as readonly string[]).includes(t);
  const sections = arr(data.sections).filter(isObj).map((s) => ({
    ...s,
    fields: arr(s.fields)
      .filter(isObj)
      .filter((fl) => known(fl.type))
      .map((fl) => ({ ...fl, value: fl.value ?? emptyValue(fl.type as FieldType) })),
    ...(Array.isArray(s.itemSchema) ? { itemSchema: s.itemSchema.filter(isObj).filter((d) => known(d.type)) } : {}),
  }));
  return { ...data, sections };
}
