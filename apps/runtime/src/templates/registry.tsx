import type { Portfolio } from "../schema/portfolio";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "./meta";
import type { Template, TemplateComponent } from "./types";
import Swiss from "./swiss";

/** Template id → component. Adding a template = one entry here + one in meta.ts. */
export const TEMPLATE_COMPONENTS: Record<string, TemplateComponent> = {
  swiss: Swiss,
};

export const REGISTRY: Template[] = TEMPLATES.filter((t) => TEMPLATE_COMPONENTS[t.id]).map((t) => ({
  ...t,
  Component: TEMPLATE_COMPONENTS[t.id]!,
}));

/** Renders a portfolio with its chosen template (falling back to the default for unknown ids). */
export function TemplateView({ portfolio }: { portfolio: Portfolio }) {
  const Component = TEMPLATE_COMPONENTS[portfolio.theme.templateId] ?? TEMPLATE_COMPONENTS[DEFAULT_TEMPLATE_ID]!;
  return <Component portfolio={portfolio} />;
}
