"use client";

import dynamic from "next/dynamic";

/** Thin client entry points; the window manager (framer-motion) is its own chunk, loaded only by sites using this template. */
export const Desktop = dynamic(() => import("./impl").then((m) => m.Desktop));
export const Window = dynamic(() => import("./impl").then((m) => m.Window));
