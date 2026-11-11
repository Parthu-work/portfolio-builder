"use client";

import { Plus, Trash2 } from "lucide-react";
import { SOCIAL_PLATFORMS, type Portfolio } from "@runtime/schema/portfolio";
import { SOCIAL_LABELS } from "@runtime/render/view";
import { Button, FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { useEditorContext } from "./context";
import { ImageInput } from "./ImageInput";
import type { Update } from "./state";

export function ProfilePanel({ portfolio, update }: { portfolio: Portfolio; update: Update }) {
  const { issueAt } = useEditorContext();
  const { profile, meta } = portfolio;
  const text = (id: string, label: string, value: string, set: (d: Portfolio, v: string) => void, path: string, extra: { type?: string; placeholder?: string; help?: string; mono?: boolean } = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={extra.type ?? "text"} value={value} placeholder={extra.placeholder} className={extra.mono ? "font-mono" : undefined} aria-invalid={Boolean(issueAt(path))} aria-describedby={`${id}-help`} onChange={(e) => update((d) => set(d, e.target.value), id)} />
      {extra.help ? (
        <p id={`${id}-help`} className="text-xs text-dim">
          {extra.help}
        </p>
      ) : null}
      <FieldError>{issueAt(path)}</FieldError>
    </div>
  );
  return (
    <div className="grid gap-6">
      <section className="grid gap-4" aria-labelledby="profile-h">
        <h3 id="profile-h" className="font-display text-base font-semibold">
          You
        </h3>
        {text("p-name", "Name", profile.name, (d, v) => void (d.profile.name = v), "profile.name")}
        {text("p-headline", "Headline", profile.headline, (d, v) => void (d.profile.headline = v), "profile.headline", { placeholder: "Product designer for complicated things" })}
        {text("p-location", "Location", profile.location ?? "", (d, v) => void (v ? (d.profile.location = v) : delete d.profile.location), "profile.location")}
        {text("p-email", "Public email", profile.email ?? "", (d, v) => void (v.trim() ? (d.profile.email = v.trim()) : delete d.profile.email), "profile.email", { type: "email", help: "Shown on your site so people can reach you." })}
        <div className="grid gap-1.5" role="group" aria-label="Avatar">
          <Label htmlFor="p-avatar">Avatar</Label>
          <ImageInput id="p-avatar" value={profile.avatar ?? { src: "", alt: "" }} invalid={Boolean(issueAt("profile.avatar"))} onChange={(v) => update((d) => void (v.src ? (d.profile.avatar = v) : delete d.profile.avatar))} />
          <FieldError>{issueAt("profile.avatar")}</FieldError>
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="social-h">
        <h3 id="social-h" className="font-display text-base font-semibold">
          Social links
        </h3>
        {profile.socials.map((s, i) => (
          <div key={i} className="grid gap-1">
            <div className="flex gap-2">
              <Select aria-label={`Platform for link ${i + 1}`} value={s.platform} className="w-36 shrink-0" onChange={(e) => update((d) => void (d.profile.socials[i]!.platform = e.target.value as (typeof SOCIAL_PLATFORMS)[number]))}>
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {SOCIAL_LABELS[p]}
                  </option>
                ))}
              </Select>
              <Input aria-label={`URL for link ${i + 1}`} type="url" placeholder="https://" value={s.url} aria-invalid={Boolean(issueAt(`profile.socials.${i}`))} onChange={(e) => update((d) => void (d.profile.socials[i]!.url = e.target.value.trim()), `social-${i}`)} />
              <Button size="icon" variant="ghost" aria-label={`Remove link ${i + 1}`} onClick={() => update((d) => void d.profile.socials.splice(i, 1))}>
                <Trash2 />
              </Button>
            </div>
            <FieldError>{issueAt(`profile.socials.${i}`)}</FieldError>
          </div>
        ))}
        <Button size="sm" className="w-fit" disabled={profile.socials.length >= 16} onClick={() => update((d) => void d.profile.socials.push({ platform: "website", url: "" }))}>
          <Plus /> Add social link
        </Button>
      </section>

      <section className="grid gap-4" aria-labelledby="seo-h">
        <h3 id="seo-h" className="font-display text-base font-semibold">
          Site & SEO
        </h3>
        {text("m-title", "Page title", meta.title, (d, v) => void (d.meta.title = v), "meta.title", { help: "Shown in the browser tab and search results." })}
        <div className="grid gap-1.5">
          <Label htmlFor="m-desc">Description</Label>
          <Textarea id="m-desc" rows={2} maxLength={300} value={meta.description} onChange={(e) => update((d) => void (d.meta.description = e.target.value), "m-desc")} />
          <p className="text-xs text-dim">{meta.description.length}/300 — one or two sentences for search engines and link previews.</p>
        </div>
        {text("m-slug", "Address", meta.slug, (d, v) => void (d.meta.slug = v.toLowerCase().replace(/[^a-z0-9-]/g, "-")), "meta.slug", { mono: true, help: "Lowercase letters, digits and dashes. Used for the preview link and Vercel project name." })}
        {text("m-lang", "Language code", meta.language, (d, v) => void (d.meta.language = v.trim()), "meta.language", { mono: true, help: "e.g. en, es, pt-BR — sets the page language and date formats." })}
      </section>
    </div>
  );
}
