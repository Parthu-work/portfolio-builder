"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Portfolio } from "@runtime/schema/portfolio";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { api, ApiError } from "@/lib/client";

type Version = { id: string; label: string | null; createdAt: string };

export function VersionHistory({ id, open, onOpenChange, onRestore, flush }: { id: string; open: boolean; onOpenChange: (o: boolean) => void; onRestore: (p: Portfolio) => void; flush: () => Promise<boolean> }) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ versions: Version[] }>(`/api/portfolios/${id}/versions`)
      .then((r) => setVersions(r.versions))
      .catch(() => setVersions([]));

  useEffect(() => {
    if (open) {
      setVersions(null);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id]);

  const snapshot = async () => {
    setBusy(true);
    try {
      await flush();
      await api(`/api/portfolios/${id}/versions`, { body: { label: "Manual snapshot" } });
      await load();
      toast.success("Snapshot saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save a snapshot");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (v: Version) => {
    setBusy(true);
    try {
      const { data } = await api<{ data: Portfolio }>(`/api/portfolios/${id}/versions/${v.id}`);
      onRestore(data);
      onOpenChange(false);
      toast.success("Version restored — undo brings your previous draft back");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not restore that version");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Version history" description="The 20 most recent snapshots. One is taken when you publish, on request, and automatically every ten minutes while you edit.">
        <div className="grid gap-4">
          <Button onClick={snapshot} disabled={busy} className="w-fit">
            Save a snapshot now
          </Button>
          {versions === null ? (
            <div className="grid gap-2" aria-busy="true">
              <div className="skeleton h-12" />
              <div className="skeleton h-12" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-dim">No snapshots yet.</p>
          ) : (
            <ol className="grid gap-2">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-rule px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{v.label ?? "Snapshot"}</p>
                    <p className="text-xs text-dim">
                      <time dateTime={v.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v.createdAt))}</time>
                    </p>
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => restore(v)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
