"use client";

import { Copy, ExternalLink, MoreHorizontal, Rocket, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, buttonStyles, Dialog, DialogClose, DialogContent, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui";
import { api, ApiError } from "@/lib/client";

export type Card = { id: string; slug: string; title: string; templateName: string; updatedAt: string; publishedAt: string | null; unpublishedChanges: boolean; liveUrl: string | null };

const when = (iso: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        await api("/api/auth/signout", { method: "POST" }).catch(() => {});
        router.replace("/");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}

export function PortfolioCard({ card }: { card: Card }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="grid content-between gap-5 rounded-2xl border border-rule bg-panel p-5 shadow-sm transition-shadow hover:shadow-md" aria-busy={busy}>
      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-semibold leading-snug">
            <Link href={`/edit/${card.id}`} className="underline-offset-4 hover:underline">
              {card.title}
            </Link>
          </h2>
          <Menu>
            <MenuTrigger className={buttonStyles({ variant: "ghost", size: "iconSm" })} aria-label={`More actions for ${card.title}`}>
              <MoreHorizontal />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem
                onSelect={() =>
                  run(async () => {
                    await api(`/api/portfolios/${card.id}/duplicate`, { method: "POST" });
                    toast.success("Duplicated");
                  })
                }
              >
                <Copy /> Duplicate
              </MenuItem>
              <MenuItem className="text-bad" onSelect={() => setConfirm(true)}>
                <Trash2 /> Delete…
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <p className="font-mono text-xs text-dim">/{card.slug}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{card.templateName}</Badge>
          {card.liveUrl ? <Badge tone="ok">Live</Badge> : card.publishedAt ? <Badge tone="brand">Published</Badge> : <Badge>Draft</Badge>}
          {card.unpublishedChanges ? <Badge tone="warn">Unpublished changes</Badge> : null}
        </div>
        <p className="text-xs text-dim">Edited {when(card.updatedAt)}</p>
        {card.liveUrl ? (
          <a href={card.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand underline underline-offset-4">
            {card.liveUrl.replace("https://", "")} <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Link href={`/edit/${card.id}`} className={`${buttonStyles({ variant: "primary", size: "sm" })} flex-1`}>
          Edit
        </Link>
        <Link href={`/deploy/${card.id}`} className={`${buttonStyles({ variant: "secondary", size: "sm" })} flex-1`}>
          <Rocket /> Deploy
        </Link>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title={`Delete “${card.title}”?`} description="The portfolio is removed from Persona. A site you already deployed keeps working with its last published content.">
          <div className="flex justify-end gap-2">
            <DialogClose className={buttonStyles({ variant: "secondary" })}>Cancel</DialogClose>
            <Button
              variant="danger"
              onClick={() =>
                run(async () => {
                  await api(`/api/portfolios/${card.id}`, { method: "DELETE" });
                  setConfirm(false);
                  toast.success("Portfolio deleted");
                })
              }
            >
              Delete portfolio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
