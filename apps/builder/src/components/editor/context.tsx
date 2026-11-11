"use client";

import { createContext, useContext } from "react";

export type EditorContextValue = {
  userId: string;
  portfolioId: string;
  /** First validation error at or below a path, e.g. "sections.2.fields.0.value". */
  issueAt: (path: string) => string | undefined;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("EditorContext is missing");
  return ctx;
}
