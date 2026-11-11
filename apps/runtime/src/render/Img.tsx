import Image from "next/image";
import type { CSSProperties } from "react";
import type { ImageValue } from "../schema/portfolio";

/**
 * next/image inside a fixed-aspect box, so there is never layout shift even
 * when the image's intrinsic size is unknown. In the builder's live preview
 * (NEXT_PUBLIC_PERSONA_UNOPTIMIZED=1) images bypass the optimizer.
 */
export function Img({
  image,
  sizes,
  aspect,
  className = "",
  priority = false,
  fit = "cover",
  style,
}: {
  image: ImageValue;
  sizes: string;
  /** CSS aspect-ratio, e.g. "4 / 3". Defaults to the image's own ratio, or 4 / 3. */
  aspect?: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  style?: CSSProperties;
}) {
  const ratio = aspect ?? (image.width && image.height ? `${image.width} / ${image.height}` : "4 / 3");
  const unoptimized = process.env.NEXT_PUBLIC_PERSONA_UNOPTIMIZED === "1" || /\.svg(\?|$)/i.test(image.src);
  return (
    <span className={`pf-img relative block overflow-hidden ${className}`} style={{ aspectRatio: ratio, ...style }}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        style={{ objectFit: fit }}
      />
    </span>
  );
}
