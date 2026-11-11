"use client";

import { Plus, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, type KeyboardEvent } from "react";
import { emptyValue, type FieldDef, type FieldType, type ImageValue, type LinkValue } from "@runtime/schema/portfolio";
import { read } from "@runtime/render/view";
import { Button, FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { ImageInput } from "./ImageInput";

// Tiptap is heavy: only loaded when a rich-text field is actually on screen.
const RichText = dynamic(() => import("./RichText"), { ssr: false, loading: () => <div className="skeleton h-32" aria-label="Loading editor" /> });

function val<T extends FieldType>(type: T, value: unknown) {
  return read(type, value) ?? emptyValue(type);
}

function TagInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const commit = (raw: string) => {
    const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts].slice(0, 60));
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(text);
    } else if (e.key === "Backspace" && text === "" && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-edge bg-panel p-1.5 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand">
      {value.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-panel2 py-0.5 pl-2 pr-0.5 text-[0.8125rem]">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-5 place-items-center rounded hover:bg-rule">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input id={id} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={() => text && commit(text)} placeholder={value.length ? "" : (placeholder ?? "Type and press Enter")} className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-dim" />
    </div>
  );
}

function LinkInput({ id, value, onChange, invalid }: { id: string; value: LinkValue; onChange: (v: LinkValue) => void; invalid?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[2fr_3fr]">
      <Input id={id} aria-label="Link label" placeholder="Label" value={value.label} onChange={(e) => onChange({ ...value, label: e.target.value })} />
      <Input aria-label="Link URL" placeholder="https://… , mailto:… or #section" value={value.href} aria-invalid={invalid} onChange={(e) => onChange({ ...value, href: e.target.value.trim() })} />
    </div>
  );
}

const DATE_HINT = "YYYY, YYYY-MM or YYYY-MM-DD";

/** The form control for one field value, chosen purely by FieldType. */
export function FieldInput({ id, def, value, onChange, error }: { id: string; def: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string }) {
  const invalid = Boolean(error);
  const common = { id, "aria-invalid": invalid, "aria-describedby": error ? `${id}-error` : undefined, placeholder: def.placeholder };
  let control;
  switch (def.type) {
    case "text":
      control = <Input {...common} value={val("text", value)} maxLength={500} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "longtext":
      control = <Textarea {...common} value={val("longtext", value)} rows={3} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "richtext":
      control = <RichText id={id} label={def.label} value={val("richtext", value)} placeholder={def.placeholder} invalid={invalid} onChange={onChange} />;
      break;
    case "url":
    case "video":
      control = <Input {...common} type="url" inputMode="url" placeholder={def.placeholder ?? "https://"} value={val("url", value)} onChange={(e) => onChange(e.target.value.trim())} />;
      break;
    case "email":
      control = <Input {...common} type="email" inputMode="email" placeholder={def.placeholder ?? "you@example.com"} value={val("email", value)} onChange={(e) => onChange(e.target.value.trim())} />;
      break;
    case "phone":
      control = <Input {...common} type="tel" inputMode="tel" value={val("phone", value)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number": {
      const n = read("number", value);
      control = <Input {...common} type="number" inputMode="decimal" value={n ?? ""} onChange={(e) => onChange(e.target.value === "" || Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber)} />;
      break;
    }
    case "metric": {
      const m = val("metric", value);
      control = (
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
          <Input {...common} aria-label={`${def.label}: value`} placeholder="42%" value={m.value} onChange={(e) => onChange({ ...m, value: e.target.value })} />
          <Input aria-label={`${def.label}: what it measures`} placeholder="conversion uplift" value={m.label} onChange={(e) => onChange({ ...m, label: e.target.value })} />
        </div>
      );
      break;
    }
    case "date":
      control = <Input {...common} placeholder={DATE_HINT} inputMode="numeric" value={val("date", value)} onChange={(e) => onChange(e.target.value.trim())} />;
      break;
    case "daterange": {
      const r = val("daterange", value);
      control = (
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input {...common} aria-label={`${def.label}: start`} placeholder="Start · YYYY-MM" value={r.start} onChange={(e) => onChange({ ...r, start: e.target.value.trim() })} />
            <Input aria-label={`${def.label}: end`} placeholder="End · YYYY-MM" value={r.present ? "" : (r.end ?? "")} disabled={Boolean(r.present)} aria-invalid={invalid} onChange={(e) => onChange({ ...r, end: e.target.value.trim() })} />
          </div>
          <label className="flex w-fit items-center gap-2 text-[0.8125rem]">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={Boolean(r.present)} onChange={(e) => onChange({ ...r, present: e.target.checked, end: e.target.checked ? "" : r.end })} />
            Ongoing (shows “Present”)
          </label>
        </div>
      );
      break;
    }
    case "image":
      control = <ImageInput id={id} value={val("image", value)} invalid={invalid} onChange={onChange} />;
      break;
    case "gallery": {
      const g = val("gallery", value) as ImageValue[];
      control = (
        <div className="grid gap-3">
          {g.map((img, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-rule p-2">
              <ImageInput id={`${id}-${i}`} value={img} onChange={(v) => onChange(v.src === "" && img.src !== "" ? g.filter((_, j) => j !== i) : g.map((x, j) => (j === i ? v : x)))} />
              <Button size="sm" variant="ghost" className="w-fit" onClick={() => onChange(g.filter((_, j) => j !== i))}>
                <Trash2 /> Remove from gallery
              </Button>
            </div>
          ))}
          <Button size="sm" className="w-fit" disabled={g.length >= 24} onClick={() => onChange([...g, { src: "", alt: "" }])}>
            <Plus /> Add image
          </Button>
        </div>
      );
      break;
    }
    case "tags":
      control = <TagInput id={id} value={val("tags", value) as string[]} placeholder={def.placeholder} onChange={onChange} />;
      break;
    case "link":
      control = <LinkInput id={id} value={val("link", value)} invalid={invalid} onChange={onChange} />;
      break;
    case "linklist": {
      const list = val("linklist", value) as LinkValue[];
      control = (
        <div className="grid gap-2">
          {list.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1">
                <LinkInput id={`${id}-${i}`} value={l} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} />
              </div>
              <Button size="iconSm" variant="ghost" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button size="sm" className="w-fit" disabled={list.length >= 24} onClick={() => onChange([...list, { label: "", href: "" }])}>
            <Plus /> Add link
          </Button>
        </div>
      );
      break;
    }
    case "code": {
      const c = val("code", value);
      control = (
        <div className="grid gap-2">
          <Input aria-label={`${def.label}: language`} placeholder="Language (e.g. ts)" value={c.language} className="max-w-48" onChange={(e) => onChange({ ...c, language: e.target.value })} />
          <Textarea {...common} aria-label={`${def.label}: code`} rows={5} spellCheck={false} className="font-mono text-[0.8125rem]" value={c.code} onChange={(e) => onChange({ ...c, code: e.target.value })} />
        </div>
      );
      break;
    }
    case "select": {
      const options = def.options ?? [];
      const v = val("select", value);
      control = options.length ? (
        <Select {...common} value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {[...new Set([...options, ...(v && !options.includes(v) ? [v] : [])])].map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : (
        <Input {...common} value={v} placeholder="Add options in “Edit fields”, or type a value" onChange={(e) => onChange(e.target.value)} />
      );
      break;
    }
  }
  const grouped = ["metric", "daterange", "gallery", "linklist", "code", "link", "image", "richtext", "tags"].includes(def.type);
  return (
    <div className="grid gap-1.5" {...(grouped ? { role: "group", "aria-label": def.label } : {})}>
      <Label htmlFor={id}>
        {def.label}
        {def.required ? (
          <span className="text-bad" title="Required">
            {" "}
            *<span className="sr-only"> (required)</span>
          </span>
        ) : null}
      </Label>
      {control}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
