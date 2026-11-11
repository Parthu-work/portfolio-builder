"use client";

import { ChevronDown, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { newId, SECTION_KINDS, type Portfolio } from "@runtime/schema/portfolio";
import { createSection, presetFor, SECTION_PRESETS } from "@runtime/schema/presets";
import { Button, buttonStyles, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui";
import { cn } from "@/lib/cn";
import { track } from "@/lib/track";
import { useEditorContext } from "./context";
import { SectionEditor } from "./SectionEditor";
import { arrayMove, SortableList } from "./Sortable";
import type { Update } from "./state";

export function SectionList({ portfolio, update, undo, open, setOpen }: { portfolio: Portfolio; update: Update; undo: () => void; open: string | null; setOpen: (id: string | null) => void }) {
  const { issueAt } = useEditorContext();

  const add = (kind: string) => {
    const section = createSection(kind);
    update((d) => void d.sections.push(section));
    setOpen(section.id);
    if (kind === "custom") track("custom_section_added", { props: { name: section.title } });
    else track("section_added", { props: { kind } });
  };

  return (
    <div className="grid gap-3">
      <SortableList
        items={portfolio.sections}
        getId={(s) => s.id}
        label="Sections: reorder"
        onMove={(from, to) => update((d) => void (d.sections = arrayMove(d.sections, from, to)))}
        className="grid gap-2"
        itemClassName="rounded-xl border border-rule bg-panel"
      >
        {(section, i, handle) => {
          const isOpen = open === section.id;
          const name = section.title || presetFor(section.kind).label;
          const count = section.items?.length;
          return (
            <div data-section={section.kind}>
              <div className="flex items-center gap-1 p-1.5">
                {handle}
                <button type="button" aria-expanded={isOpen} aria-controls={`panel-${section.id}`} onClick={() => setOpen(isOpen ? null : section.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-2 text-left hover:bg-panel2">
                  <ChevronDown className={cn("size-4 shrink-0 text-dim transition-transform", !isOpen && "-rotate-90")} aria-hidden="true" />
                  <span className={cn("truncate text-sm font-medium", !section.visible && "text-dim line-through")}>{name}</span>
                  <span className="shrink-0 text-xs text-dim">
                    {section.kind === "custom" ? "Custom" : presetFor(section.kind).label}
                    {count !== undefined ? ` · ${count}` : ""}
                  </span>
                  {issueAt(`sections.${i}`) ? <span className="ml-auto shrink-0 rounded-full bg-bad px-1.5 text-xs font-medium text-bg">!</span> : null}
                </button>
                <Button size="iconSm" variant="ghost" aria-label={section.visible ? `Hide section ${name}` : `Show section ${name}`} aria-pressed={!section.visible} onClick={() => update((d) => void (d.sections[i]!.visible = !section.visible))}>
                  {section.visible ? <Eye /> : <EyeOff />}
                </Button>
                <Button
                  size="iconSm"
                  variant="ghost"
                  aria-label={`Duplicate section ${name}`}
                  onClick={() =>
                    update((d) => {
                      const copy = structuredClone(section);
                      copy.id = newId("sec");
                      copy.title = `${section.title} copy`.slice(0, 120);
                      for (const it of copy.items ?? []) it.id = newId("it");
                      d.sections.splice(i + 1, 0, copy);
                    })
                  }
                >
                  <Copy />
                </Button>
                <Button
                  size="iconSm"
                  variant="ghost"
                  aria-label={`Delete section ${name}`}
                  onClick={() => {
                    update((d) => void d.sections.splice(i, 1));
                    toast(`Deleted “${name}”`, { action: { label: "Undo", onClick: undo }, duration: 8000 });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              {isOpen ? (
                <div id={`panel-${section.id}`}>
                  <SectionEditor section={section} index={i} update={update} templateId={portfolio.theme.templateId} />
                </div>
              ) : null}
            </div>
          );
        }}
      </SortableList>

      <Menu>
        <MenuTrigger className={cn(buttonStyles({ variant: "secondary" }), "w-full border-dashed")}>
          <Plus /> Add section
        </MenuTrigger>
        <MenuContent align="start" className="w-72">
          <MenuItem onSelect={() => add("custom")}>
            <span className="grid">
              <span className="font-medium">Custom section</span>
              <span className="text-xs text-dim">{SECTION_PRESETS.custom.description}</span>
            </span>
          </MenuItem>
          <MenuSeparator />
          <MenuLabel>Presets</MenuLabel>
          {SECTION_KINDS.filter((k) => k !== "custom").map((k) => (
            <MenuItem key={k} onSelect={() => add(k)}>
              <span className="grid">
                <span className="font-medium">{SECTION_PRESETS[k].label}</span>
                <span className="text-xs text-dim">{SECTION_PRESETS[k].description}</span>
              </span>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    </div>
  );
}
