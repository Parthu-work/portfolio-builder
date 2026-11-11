"use client";

import { ArrowLeft, Check, CloudOff, Download, Eye, FileDown, FileUp, History, Loader2, Monitor, MoreHorizontal, PencilLine, Redo2, Rocket, Smartphone, Tablet, TriangleAlert, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { migrate, MigrationError } from "@runtime/schema/migrate";
import type { Portfolio } from "@runtime/schema/portfolio";
import { Button, buttonStyles, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/client";
import { track } from "@/lib/track";
import { ChecksPanel } from "./ChecksPanel";
import { EditorContext } from "./context";
import { Preview, type Device } from "./Preview";
import { ProfilePanel } from "./ProfilePanel";
import { SectionList } from "./SectionList";
import { clearBackup, readBackup, useAutosave, useHistory, useIssues, type SaveStatus } from "./state";
import { ThemePanel } from "./ThemePanel";
import { VersionHistory } from "./VersionHistory";

const STATUS: Record<SaveStatus, { label: string; tone: string }> = {
  saved: { label: "Saved", tone: "text-ok" },
  dirty: { label: "Unsaved changes", tone: "text-dim" },
  saving: { label: "Saving…", tone: "text-dim" },
  offline: { label: "Offline — will sync", tone: "text-warn" },
  invalid: { label: "Fix errors to save", tone: "text-bad" },
  error: { label: "Not saved", tone: "text-bad" },
};

function SaveIndicator({ status, message }: { status: SaveStatus; message: string | null }) {
  const s = STATUS[status];
  const Icon = status === "saved" ? Check : status === "saving" ? Loader2 : status === "offline" ? CloudOff : status === "dirty" ? PencilLine : TriangleAlert;
  return (
    <p role="status" aria-live="polite" title={message ?? undefined} data-testid="save-status" data-status={status} className={cn("flex items-center gap-1.5 text-[0.8125rem] font-medium", s.tone)}>
      <Icon className={cn("size-4", status === "saving" && "animate-spin")} aria-hidden="true" />
      <span className="max-sm:sr-only">{s.label}</span>
    </p>
  );
}

export function Editor({ id, initial, userId, initialPublishedAt, initialPublished }: { id: string; initial: Portfolio; userId: string; initialPublishedAt: string | null; initialPublished: Portfolio | null }) {
  const router = useRouter();
  const { portfolio, update, replace, undo, redo, canUndo, canRedo } = useHistory(initial);
  const issues = useIssues(portfolio);
  const { status, message, flush } = useAutosave(id, portfolio, issues.valid);
  const [device, setDevice] = useState<Device>("desktop");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [tab, setTab] = useState("content");
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [published, setPublished] = useState<Portfolio | null>(initialPublished);
  const [publishing, setPublishing] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const offered = useRef(false);

  const hasUnpublished = useMemo(() => !published || JSON.stringify(published) !== JSON.stringify(portfolio), [published, portfolio]);
  const ctx = useMemo(() => ({ userId, portfolioId: id, issueAt: issues.at }), [userId, id, issues.at]);

  // Offer to restore a newer local backup (e.g. the tab was closed while offline).
  useEffect(() => {
    if (offered.current) return;
    offered.current = true;
    const backup = readBackup(id);
    if (!backup || JSON.stringify(backup.draft) === JSON.stringify(initial)) return void clearBackup(id);
    try {
      const draft = migrate(backup.draft);
      toast("Unsaved changes from your last session were found on this device.", {
        duration: 20000,
        action: { label: "Restore", onClick: () => replace(draft) },
        cancel: { label: "Discard", onClick: () => clearBackup(id) },
      });
    } catch {
      clearBackup(id);
    }
  }, [id, initial, replace]);

  const publish = async () => {
    setPublishing(true);
    try {
      if (!(await flush())) throw new ApiError(422, issues.valid ? "Could not save your latest changes. Check your connection and try again." : "Fix the highlighted errors before publishing.");
      const res = await api<{ publishedAt: string }>(`/api/portfolios/${id}/publish`, { method: "POST" });
      setPublishedAt(res.publishedAt);
      setPublished(portfolio);
      toast.success("Published. Deployed sites pick this up within the hour.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not publish. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(portfolio, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${portfolio.meta.slug}.persona.json`;
    a.click();
    URL.revokeObjectURL(url);
    track("json_exported", { portfolioId: id });
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = migrate(JSON.parse(await file.text()));
      replace({ ...next, meta: { ...next.meta, slug: portfolio.meta.slug } });
      toast.success("Imported. Undo restores what you had.");
    } catch (e) {
      toast.error(e instanceof MigrationError ? e.message : "That file is not a valid Persona portfolio.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  };

  const goDeploy = async () => {
    await flush();
    router.push(`/deploy/${id}`);
  };

  const jump = (sectionId: string) => {
    setTab("content");
    setOpenSection(sectionId);
    setPane("edit");
  };

  return (
    <EditorContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col bg-bg">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-rule bg-panel px-2 sm:px-3">
          <Link href="/dashboard" className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="Back to dashboard">
            <ArrowLeft />
          </Link>
          <h1 className="min-w-0 truncate font-display text-base font-semibold max-md:hidden">{portfolio.meta.title || portfolio.profile.name || "Untitled portfolio"}</h1>
          <SaveIndicator status={status} message={message} />

          <div className="ml-auto flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled={!canUndo} onClick={undo}>
              <Undo2 />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Redo" title="Redo (Ctrl/⌘ Shift Z)" disabled={!canRedo} onClick={redo}>
              <Redo2 />
            </Button>
            <div role="group" aria-label="Preview size" className="mx-1 hidden rounded-lg bg-panel2 p-0.5 lg:flex">
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                <button key={d} type="button" aria-label={`${d} preview`} aria-pressed={device === d} onClick={() => setDevice(d)} className={cn("grid size-8 place-items-center rounded-md text-dim hover:text-fg", device === d && "bg-panel text-fg shadow-sm")}>
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
            <Button size="icon" variant="ghost" className="lg:hidden" aria-label={pane === "edit" ? "Show preview" : "Show editor"} aria-pressed={pane === "preview"} onClick={() => setPane(pane === "edit" ? "preview" : "edit")}>
              {pane === "edit" ? <Eye /> : <PencilLine />}
            </Button>
            <Menu>
              <MenuTrigger className={buttonStyles({ variant: "ghost", size: "icon" })} aria-label="More actions">
                <MoreHorizontal />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem onSelect={() => setHistoryOpen(true)}>
                  <History /> Version history
                </MenuItem>
                <MenuItem onSelect={exportJson}>
                  <FileDown /> Export JSON
                </MenuItem>
                <MenuItem onSelect={() => importInput.current?.click()}>
                  <FileUp /> Import JSON…
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  onSelect={async () => {
                    await flush();
                    window.location.assign(`/api/portfolios/${id}/zip`);
                  }}
                >
                  <Download /> Download code (.zip)
                </MenuItem>
                {publishedAt ? (
                  <MenuItem onSelect={() => window.open(`/p/${portfolio.meta.slug}`, "_blank", "noopener")}>
                    <Eye /> Open hosted preview
                  </MenuItem>
                ) : null}
              </MenuContent>
            </Menu>
            <input ref={importInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => importJson(e.target.files?.[0])} />
            <Button variant="secondary" onClick={publish} disabled={publishing || (!hasUnpublished && Boolean(publishedAt))} data-testid="publish">
              {publishing ? "Publishing…" : !publishedAt ? "Publish" : hasUnpublished ? "Publish changes" : "Published"}
            </Button>
            <Button variant="primary" onClick={goDeploy} data-testid="deploy">
              <Rocket /> <span className="max-sm:sr-only">Deploy</span>
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside aria-label="Editor" className={cn("w-full shrink-0 overflow-y-auto border-r border-rule lg:block lg:w-[440px] xl:w-[480px]", pane === "preview" && "hidden")}>
            <Tabs value={tab} onValueChange={setTab} className="grid gap-4 p-3">
              <TabsList aria-label="Editor panels">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="theme">Theme</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="grid gap-3 outline-none">
                <ChecksPanel portfolio={portfolio} onJump={jump} />
                <SectionList portfolio={portfolio} update={update} undo={undo} open={openSection} setOpen={setOpenSection} />
              </TabsContent>
              <TabsContent value="theme" className="outline-none">
                <ThemePanel portfolio={portfolio} update={update} replace={replace} />
              </TabsContent>
              <TabsContent value="profile" className="outline-none">
                <ProfilePanel portfolio={portfolio} update={update} />
              </TabsContent>
            </Tabs>
          </aside>
          <main id="main" tabIndex={-1} aria-label="Live preview" className={cn("min-w-0 flex-1 bg-panel2 outline-none lg:block", pane === "edit" && "max-lg:hidden", device !== "desktop" && "lg:p-4")}>
            <Preview portfolio={portfolio} device={device} focus={openSection} />
          </main>
        </div>
      </div>
      <VersionHistory id={id} open={historyOpen} onOpenChange={setHistoryOpen} flush={flush} onRestore={(p) => replace({ ...p, meta: { ...p.meta, slug: portfolio.meta.slug } })} />
    </EditorContext.Provider>
  );
}
