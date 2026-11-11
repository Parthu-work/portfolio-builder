"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

/** Sends one cookie-less page_view per navigation (unless DNT / GPC is on). */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    track("page_view", { referrer: document.referrer || undefined });
  }, [pathname]);
  return null;
}
