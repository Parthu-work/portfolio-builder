"use client";

import dynamic from "next/dynamic";

/**
 * Thin client entry points. The implementation (which pulls in framer-motion)
 * is a separate chunk that is only downloaded by sites that use this template.
 */
export const ExpandableTile = dynamic(() => import("./impl").then((m) => m.ExpandableTile));
export const Spotlight = dynamic(() => import("./impl").then((m) => m.Spotlight));
