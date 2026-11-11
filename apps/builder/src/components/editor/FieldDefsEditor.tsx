"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FIELD_TYPES, FieldTypeSchema, keyFromLabel, type FieldDef, type FieldType } from "@runtime/schema/portfolio";
import { Button, FieldError, Input, Label, Select } from "@/components/ui";
import { SortableList } from "./Sortable";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short text",
  longtext: "Long text",
  richtext: "Rich text",
  url: "URL",
  email: "Email",
  phone: "Phone",
  number: "Number",
  metric: "Metric (value + label)",
  date: "Date",
  daterange: "Date range",
  image: "Image",
  gallery: "Image gallery",
  tags: "Tags",
  link: "Link (label + URL)",
  linklist: "List of links",
  video: "Video URL",
  code: "Code snippet",
  select: "Choice",
};

const AddSchema = z.object({ label: z.string().trim().min(1, "Give the field a name").max(80), type: FieldTypeSchema });
type AddValues = z.infer<typeof AddSchema>;

/**
 * The field builder: add (choosing a FieldType), rename, reorder, mark
 * required and delete field definitions. Used both for a section's own fields
 * and for the shape of its repeatable items.
 */
export function FieldDefsEditor({
  idPrefix,
  defs,
  onAdd,
  onPatch,
  onRemove,
  onMove,
  legend,
}: {
  idPrefix: string;
  defs: FieldDef[];
  onAdd: (def: FieldDef) => void;
  onPatch: (index: number, patch: Partial<FieldDef>) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  legend: string;
}) {
  const { register, handleSubmit, reset, formState } = useForm<AddValues>({ resolver: zodResolver(AddSchema), defaultValues: { label: "", type: "text" } });
  const add = handleSubmit((v) => {
    onAdd({ key: keyFromLabel(v.label, defs.map((d) => d.key)), label: v.label, type: v.type });
    reset({ label: "", type: v.type });
  });

  return (
    <fieldset className="grid gap-3 rounded-xl border border-rule bg-panel2/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-dim">{legend}</legend>
      {defs.length ? (
        <SortableList items={defs} getId={(d) => d.key} onMove={onMove} label={`${legend}: reorder`} className="grid gap-1.5" itemClassName="rounded-lg border border-rule bg-panel">
          {(d, i, handle) => (
            <div className="grid gap-2 p-1.5">
              <div className="flex items-center gap-1.5">
                {handle}
                <Input aria-label={`Field name (${FIELD_TYPE_LABELS[d.type]})`} value={d.label} maxLength={80} className="h-8 flex-1" onChange={(e) => onPatch(i, { label: e.target.value })} />
                <span className="hidden shrink-0 rounded-md bg-panel2 px-1.5 py-1 text-xs text-dim sm:inline">{FIELD_TYPE_LABELS[d.type].split(" (")[0]}</span>
                <label className="flex shrink-0 items-center gap-1 text-xs text-dim">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={Boolean(d.required)} onChange={(e) => onPatch(i, { required: e.target.checked })} />
                  Required
                </label>
                <Button size="iconSm" variant="ghost" aria-label={`Delete field ${d.label}`} onClick={() => onRemove(i)}>
                  <Trash2 />
                </Button>
              </div>
              {d.type === "select" ? (
                <Input
                  aria-label={`Choices for ${d.label} (comma separated)`}
                  placeholder="Choices, comma separated"
                  className="h-8"
                  defaultValue={(d.options ?? []).join(", ")}
                  onBlur={(e) => onPatch(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 40) })}
                />
              ) : null}
            </div>
          )}
        </SortableList>
      ) : (
        <p className="px-1 text-[0.8125rem] text-dim">No fields yet.</p>
      )}
      <form onSubmit={add} noValidate className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-new-label`} className="text-xs">
            New field name
          </Label>
          <Input id={`${idPrefix}-new-label`} placeholder="e.g. Patent no." className="h-9" aria-invalid={Boolean(formState.errors.label)} {...register("label")} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${idPrefix}-new-type`} className="text-xs">
            Type
          </Label>
          <Select id={`${idPrefix}-new-type`} className="h-9" {...register("type")}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="sm" className="h-9">
          <Plus /> Add field
        </Button>
        <div className="sm:col-span-3">
          <FieldError>{formState.errors.label?.message}</FieldError>
        </div>
      </form>
    </fieldset>
  );
}
