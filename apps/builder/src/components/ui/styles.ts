import { cva } from "class-variance-authority";

/** Shared button look. Lives outside the client module so Server Components can style links as buttons. */
export const buttonStyles = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-fg hover:brightness-110",
        secondary: "border border-edge bg-panel text-fg hover:bg-panel2",
        ghost: "text-fg hover:bg-panel2",
        danger: "border border-bad text-bad hover:bg-bad hover:text-bg",
        link: "text-brand underline underline-offset-4 hover:decoration-2",
      },
      size: { sm: "h-8 px-2.5 text-[0.8125rem]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base", icon: "size-9", iconSm: "size-8" },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

