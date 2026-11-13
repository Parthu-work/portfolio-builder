"use client";

import { ChevronDown, Copy, Eye, EyeOff, Lock, Plus, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { emptyValue, newId, type FieldDef, type Section } from "@runtime/schema/portfolio";
import { createItem, presetFor } from "@runtime/schema/presets";
import { toEntry } from "@runtime/render/view";
import { getTemplateMeta } from "@runtime/templates/meta";
import { Button, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { toggles } from "@/lib/integrations/sections";
import { track } from "@/lib/track";
import { useEditorContext } from "./context";
import { FieldDefsEditor } from "./FieldDefsEditor";
import { FieldInput } from "./FieldInput";
import { arrayMove, SortableList } from "./Sortable";
import type { Update } from "./state";

const LAYOUT_LABELS: Record<string, string> = { timeline: "Timeline", grid: "Cards", list: "List", quotes: "Quotes", metrics: "Big numbers", tags: "Tag groups" };

/**
 * A section filled from a connected account: its content comes from the
 * provider and is rebuilt on every refresh, so only the title (and, from the
 * list, order and visibility) are the user's to change.
 */
function SyncedSection({ section, index, update, onManageSynced }: { section: Section; index: number; update: Update; onManageSynced?: () => void }) {
  const sync = section.sync!;
  const sid = `s-${section.id}`;
  const contents = toggles(section, { id: section.id.split("_")[0]! });
  return (
    <div className="grid gap-4 border-t border-rule p-3 pt-4">
      <div className="grid gap-1.5">
        <Label htmlFor={`${sid}-title`}>Section title</Label>
        <Input id={`${sid}-title`} value={section.title} maxLength={120} onChange={(e) => update((d) => void (d.sections[index]?.id === section.id && (d.sections[index]!.title = e.target.value)), `${section.id}:title`)} />
      </div>
      <div className="grid gap-2 rounded-lg bg-panel2 p-3 text-[0.8125rem]">
        <p className="flex items-center gap-1.5 font-medium">
          <Lock className="size-3.5" aria-hidden="true" /> Synced from {sync.source ?? sync.provider} · {sync.account}
        </p>
        <p className="text-dim">This content updates itself and is read-only. Rename, reorder or hide the section here; choose which numbers, charts and entries appear under Accounts.</p>
        {contents.length ? (
          <ul className="grid list-disc gap-0.5 pl-5" aria-label="Synced contents">
            {contents.map((c) => (
              <li key={c.key}>{c.label}</li>
            ))}
          </ul>
        ) : null}
        {onManageSynced ? (
          <Button size="sm" className="w-fit" onClick={onManageSynced}>
            Choose what appears
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SectionEditor({ section, index, update, templateId, onManageSynced }: { section: Section; index: number; update: Update; templateId: string; onManageSynced?: () => void }) {
  if (section.sync) return <SyncedSection section={section} index={index} update={update} onManageSynced={onManageSynced} />;
  return <EditableSection section={section} index={index} update={update} templateId={templateId} />;
}

function EditableSection({ section, index, update, templateId }: { section: Section; index: number; update: Update; templateId: string }) {
  const { issueAt } = useEditorContext();
  const [shaping, setShaping] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const preset = presetFor(section.kind);
  const itemSchema = section.itemSchema ?? [];
  const repeatable = section.itemSchema !== undefined;
  const sid = `s-${section.id}`;
  const base = `sections.${index}`;

  /** Mutates this section inside the draft. */
  const edit = (fn: (s: Section) => void, key?: string) =>
    update((d) => {
      const s = d.sections[index];
      if (s && s.id === section.id) fn(s);
    }, key ? `${section.id}:${key}` : undefined);

  const addDef = (target: "fields" | "itemSchema") => (def: FieldDef) => {
    edit((s) => {
      if (target === "fields") s.fields.push({ ...def, value: emptyValue(def.type) });
      else {
        s.itemSchema = [...(s.itemSchema ?? []), def];
        s.items ??= [];
        for (const it of s.items) it.values[def.key] = emptyValue(def.type);
      }
    });
    track("custom_field_added", { props: { fieldType: def.type, sectionKind: section.kind, target } });
  };

  return (
    <div className="grid gap-5 border-t border-rule p-3 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${sid}-title`}>Section title</Label>
          <Input id={`${sid}-title`} value={section.title} maxLength={120} onChange={(e) => edit((s) => void (s.title = e.target.value), "title")} />
        </div>
        {repeatable ? (
          <div className="grid gap-1.5">
            <Label htmlFor={`${sid}-layout`}>Layout</Label>
            <Select id={`${sid}-layout`} value={section.layout ?? ""} onChange={(e) => edit((s) => void (e.target.value ? (s.layout = e.target.value) : delete s.layout))}>
              <option value="">Automatic</option>
              {getTemplateMeta(templateId).layouts.map((l) => (
                <option key={l} value={l}>
                  {LAYOUT_LABELS[l] ?? l}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`${sid}-subtitle`}>Subtitle (optional)</Label>
          <Input id={`${sid}-subtitle`} value={section.subtitle ?? ""} maxLength={300} onChange={(e) => edit((s) => void (e.target.value ? (s.subtitle = e.target.value) : delete s.subtitle), "subtitle")} />
        </div>
      </div>

      {section.fields.length ? (
        <div className="grid gap-4">
          {section.fields.map((f, j) => (
            <FieldInput key={f.key} id={`${sid}-f-${f.key}`} def={f} value={f.value} error={issueAt(`${base}.fields.${j}.value`)} onChange={(v) => edit((s) => void (s.fields[j]!.value = v), `f:${f.key}`)} />
          ))}
        </div>
      ) : null}

      {repeatable ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[0.8125rem] font-semibold">
              {section.items?.length ?? 0} {(section.items?.length ?? 0) === 1 ? (preset.itemLabel ?? "entry") : `${preset.itemLabel ?? "entr"}${preset.itemLabel ? "s" : "ies"}`}
            </h4>
            <Button
              size="sm"
              onClick={() => {
                const item = createItem(itemSchema);
                edit((s) => void (s.items = [...(s.items ?? []), item]));
                setOpenItem(item.id);
              }}
            >
              <Plus /> Add {preset.itemLabel ?? "entry"}
            </Button>
          </div>
          {section.items?.length ? (
            <SortableList
              items={section.items}
              getId={(it) => it.id}
              label={`${section.title}: reorder entries`}
              onMove={(from, to) => edit((s) => void (s.items = arrayMove(s.items ?? [], from, to)))}
              className="grid gap-1.5"
              itemClassName="rounded-lg border border-rule bg-panel"
            >
              {(item, k, handle) => {
                const entry = toEntry(item.id, itemSchema, item.values);
                const label = entry.title || entry.metric?.value || entry.subtitle || `Untitled ${preset.itemLabel ?? "entry"}`;
                const open = openItem === item.id;
                return (
                  <div>
                    <div className="flex items-center gap-1 p-1">
                      {handle}
                      <button type="button" aria-expanded={open} aria-controls={`${sid}-item-${item.id}`} onClick={() => setOpenItem(open ? null : item.id)} className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-panel2", !item.visible && "text-dim line-through")}>
                        <ChevronDown className={cn("size-4 shrink-0 text-dim transition-transform", !open && "-rotate-90")} aria-hidden="true" />
                        <span className="truncate">{label}</span>
                        {issueAt(`${base}.items.${k}`) ? <span className="ml-auto shrink-0 text-xs text-bad">Needs attention</span> : null}
                      </button>
                      <Button size="iconSm" variant="ghost" aria-label={item.visible ? `Hide ${label}` : `Show ${label}`} aria-pressed={!item.visible} onClick={() => edit((s) => void (s.items![k]!.visible = !item.visible))}>
                        {item.visible ? <Eye /> : <EyeOff />}
                      </Button>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        aria-label={`Duplicate ${label}`}
                        onClick={() => edit((s) => void s.items!.splice(k + 1, 0, { ...structuredClone(item), id: newId("it") }))}
                      >
                        <Copy />
                      </Button>
                      <Button size="iconSm" variant="ghost" aria-label={`Delete ${label}`} onClick={() => edit((s) => void s.items!.splice(k, 1))}>
                        <Trash2 />
                      </Button>
                    </div>
                    {open ? (
                      <div id={`${sid}-item-${item.id}`} className="grid gap-4 border-t border-rule p-3">
                        {itemSchema.length === 0 ? <p className="text-sm text-dim">This section has no item fields yet — add some under “Edit fields”.</p> : null}
                        {itemSchema.map((def) => (
                          <FieldInput
                            key={def.key}
                            id={`${sid}-i-${item.id}-${def.key}`}
                            def={def}
                            value={item.values[def.key]}
                            error={issueAt(`${base}.items.${k}.values.${def.key}`)}
                            onChange={(v) => edit((s) => void (s.items![k]!.values[def.key] = v), `i:${item.id}:${def.key}`)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              }}
            </SortableList>
          ) : (
            <p className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-[0.8125rem] text-dim">Nothing here yet. Empty sections are simply left off your site.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-3">
        <Button size="sm" variant="ghost" className="w-fit" aria-expanded={shaping} onClick={() => setShaping(!shaping)}>
          <Settings2 /> {shaping ? "Done editing fields" : "Edit fields"}
        </Button>
        {shaping ? (
          <>
            <FieldDefsEditor
              idPrefix={`${sid}-defs`}
              legend="Section fields"
              defs={section.fields}
              onAdd={addDef("fields")}
              onPatch={(j, patch) => edit((s) => void Object.assign(s.fields[j]!, patch), `def:${j}`)}
              onRemove={(j) => edit((s) => void s.fields.splice(j, 1))}
              onMove={(from, to) => edit((s) => void (s.fields = arrayMove(s.fields, from, to)))}
            />
            <FieldDefsEditor
              idPrefix={`${sid}-shape`}
              legend={repeatable ? "Fields of each entry" : "Make this section repeatable: fields of each entry"}
              defs={itemSchema}
              onAdd={addDef("itemSchema")}
              onPatch={(j, patch) => edit((s) => void Object.assign(s.itemSchema![j]!, patch), `shape:${j}`)}
              onRemove={(j) =>
                edit((s) => {
                  const [gone] = s.itemSchema!.splice(j, 1);
                  if (gone) for (const it of s.items ?? []) delete it.values[gone.key];
                })
              }
              onMove={(from, to) => edit((s) => void (s.itemSchema = arrayMove(s.itemSchema ?? [], from, to)))}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
