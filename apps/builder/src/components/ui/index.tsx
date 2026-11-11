"use client";

import type { VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as RDialog, DropdownMenu as RMenu, Switch as RSwitch, Tabs as RTabs } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { buttonStyles } from "./styles";

export { buttonStyles };

/* shadcn/ui-style primitives: Radix behaviour + Tailwind styling, owned by this repo. */

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
});

const field =
  "w-full rounded-lg border border-edge bg-panel px-3 text-sm text-fg placeholder:text-dim transition-colors hover:border-fg/60 aria-[invalid=true]:border-bad disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(field, "h-10", className)} {...props} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(field, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(field, "h-10 pr-8", className)} {...props} />;
});

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[0.8125rem] font-medium text-fg", className)} {...props} />;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-[0.8125rem] text-bad">
      {children}
    </p>
  );
}

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: "neutral" | "ok" | "warn" | "bad" | "brand" }) {
  const tones = { neutral: "border-rule text-dim", ok: "border-ok/50 text-ok", warn: "border-warn/50 text-warn", bad: "border-bad/50 text-bad", brand: "border-brand/50 text-brand" };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border bg-panel px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}

export function Switch({ className, ...props }: ComponentProps<typeof RSwitch.Root>) {
  return (
    <RSwitch.Root className={cn("relative h-6 w-10 shrink-0 rounded-full border border-edge bg-panel2 transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand", className)} {...props}>
      <RSwitch.Thumb className="block size-4 translate-x-[3px] rounded-full bg-fg transition-transform data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-brand-fg" />
    </RSwitch.Root>
  );
}

export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;
export function DialogContent({ title, description, children, className, wide }: { title: string; description?: string; children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <RDialog.Portal>
      <RDialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" />
      <RDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-rule bg-panel shadow-2xl",
          wide ? "max-w-5xl" : "max-w-lg",
          className,
        )}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div>
            <RDialog.Title className="font-display text-lg font-semibold">{title}</RDialog.Title>
            {description ? <RDialog.Description className="mt-1 text-sm text-dim">{description}</RDialog.Description> : null}
          </div>
          <RDialog.Close className={buttonStyles({ variant: "ghost", size: "iconSm" })} aria-label="Close">
            <X />
          </RDialog.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </RDialog.Content>
    </RDialog.Portal>
  );
}

export const Menu = RMenu.Root;
export const MenuTrigger = RMenu.Trigger;
export function MenuContent({ className, ...props }: ComponentProps<typeof RMenu.Content>) {
  return (
    <RMenu.Portal>
      <RMenu.Content sideOffset={6} collisionPadding={8} className={cn("z-50 max-h-[70dvh] min-w-48 overflow-y-auto rounded-xl border border-rule bg-panel p-1 shadow-xl", className)} {...props} />
    </RMenu.Portal>
  );
}
export function MenuItem({ className, ...props }: ComponentProps<typeof RMenu.Item>) {
  return <RMenu.Item className={cn("flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-panel2 data-[disabled]:opacity-50 [&_svg]:size-4", className)} {...props} />;
}
export const MenuLabel = ({ className, ...props }: ComponentProps<typeof RMenu.Label>) => <RMenu.Label className={cn("px-2.5 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-dim", className)} {...props} />;
export const MenuSeparator = () => <RMenu.Separator className="my-1 h-px bg-rule" />;

export const Tabs = RTabs.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof RTabs.List>) {
  return <RTabs.List className={cn("flex gap-1 rounded-xl bg-panel2 p-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof RTabs.Trigger>) {
  return (
    <RTabs.Trigger
      className={cn("flex-1 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-dim transition-colors hover:text-fg data-[state=active]:bg-panel data-[state=active]:text-fg data-[state=active]:shadow-sm", className)}
      {...props}
    />
  );
}
export const TabsContent = RTabs.Content;
