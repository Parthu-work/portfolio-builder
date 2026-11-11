"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import type { ImageValue } from "@runtime/schema/portfolio";
import { Button, Dialog, DialogContent, Input, Label, Select } from "@/components/ui";
import { browserClient } from "@/lib/supabase/browser";
import { useEditorContext } from "./context";

const MAX_SIDE = 1600;
const MAX_BYTES = 2 * 1024 * 1024;

/** Crops to `area`, scales so the longest side is ≤ 1600px and encodes WebP under 2 MB — all in the browser. */
async function cropToWebp(src: string, area: Area): Promise<{ blob: Blob; width: number; height: number }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height));
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height);
  for (const quality of [0.86, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_BYTES) return { blob, width, height };
  }
  throw new Error("That image is too large even after compression.");
}

async function upload(blob: Blob, userId: string): Promise<string> {
  const supabase = browserClient();
  if (supabase) {
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from("portfolio-assets").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return supabase.storage.from("portfolio-assets").getPublicUrl(path).data.publicUrl;
  }
  const res = await fetch("/api/upload", { method: "POST", headers: { "content-type": "image/webp", "x-persona-csrf": "1" }, body: blob });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

const ASPECTS = [
  ["free", "Original"],
  ["1", "Square 1:1"],
  ["1.3333", "Landscape 4:3"],
  ["1.7778", "Wide 16:9"],
  ["0.8", "Portrait 4:5"],
] as const;

export function ImageInput({ id, value, onChange, invalid }: { id: string; value: ImageValue; onChange: (v: ImageValue) => void; invalid?: boolean }) {
  const { userId } = useEditorContext();
  const file = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<{ url: string; ratio: number } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<string>("free");
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|avif|gif)$/.test(f.type)) return void toast.error("Choose a PNG, JPEG, WebP or AVIF image.");
    if (f.size > 15 * 1024 * 1024) return void toast.error("Choose an image smaller than 15 MB.");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      return void toast.error("That image could not be read.");
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspect("free");
    setSource({ url, ratio: img.naturalWidth / img.naturalHeight });
  };

  const close = useCallback(() => {
    if (source) URL.revokeObjectURL(source.url);
    setSource(null);
    if (file.current) file.current.value = "";
  }, [source]);

  const confirm = async () => {
    if (!source || !area) return;
    setBusy(true);
    try {
      const { blob, width, height } = await cropToWebp(source.url, area);
      const src = await upload(blob, userId);
      onChange({ ...value, src, width, height });
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-3">
        {value.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.src} alt="" className="size-16 shrink-0 rounded-lg border border-rule object-cover" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-edge text-dim">
            <ImagePlus className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => file.current?.click()}>
              {value.src ? "Replace" : "Upload"} image
            </Button>
            {value.src ? (
              <Button size="sm" variant="ghost" onClick={() => onChange({ src: "", alt: "" })}>
                <Trash2 /> Remove
              </Button>
            ) : null}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <Input id={id} type="url" inputMode="url" placeholder="…or paste an image URL (https://)" value={value.src} aria-invalid={invalid} aria-label="Image URL" onChange={(e) => onChange({ src: e.target.value.trim(), alt: value.alt })} />
        </div>
      </div>
      {value.src ? (
        <div className="grid gap-1">
          <Label htmlFor={`${id}-alt`} className="text-xs text-dim">
            Alt text — describe the image for people who cannot see it
          </Label>
          <Input id={`${id}-alt`} value={value.alt} maxLength={300} placeholder="e.g. Dashboard showing weekly active users" onChange={(e) => onChange({ ...value, alt: e.target.value })} />
        </div>
      ) : null}

      <Dialog open={Boolean(source)} onOpenChange={(o) => !o && !busy && close()}>
        {source ? (
          <DialogContent title="Crop image" description="Drag to reposition. The image is resized to at most 1600px and saved as WebP." className="max-w-2xl">
            <div className="grid gap-4">
              <div className="relative h-[46dvh] min-h-64 overflow-hidden rounded-xl bg-black">
                <Cropper image={source.url} crop={crop} zoom={zoom} aspect={aspect === "free" ? source.ratio : Number(aspect)} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="crop-aspect">Shape</Label>
                  <Select id="crop-aspect" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                    {ASPECTS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="crop-zoom">Zoom</Label>
                  <input id="crop-zoom" type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-10 accent-[var(--brand)]" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={close} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={confirm} disabled={busy || !area}>
                  {busy ? "Uploading…" : "Crop & upload"}
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
