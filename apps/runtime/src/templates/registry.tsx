import type { Portfolio } from "../schema/portfolio";
import { DEFAULT_TEMPLATE_ID, TEMPLATES } from "./meta";
import type { Template, TemplateComponent } from "./types";
import Archive from "./archive";
import Kinetic from "./kinetic";
import Quiet from "./quiet";
import Card from "./card";
import Casefile from "./casefile";
import Paper from "./paper";
import Aurora from "./aurora";
import Brutal from "./brutal";
import Bento from "./bento";
import Cinematic from "./cinematic";
import Editorial from "./editorial";
import DesktopOs from "./os";
import Signal from "./signal";
import Swiss from "./swiss";

/** Template id → component. Adding a template = one entry here + one in meta.ts. */
export const TEMPLATE_COMPONENTS: Record<string, TemplateComponent> = {
  aurora: Aurora,
  brutal: Brutal,
  bento: Bento,
  cinematic: Cinematic,
  editorial: Editorial,
  os: DesktopOs,
  signal: Signal,
  swiss: Swiss,
  paper: Paper,
  casefile: Casefile,
  card: Card,
  quiet: Quiet,
  kinetic: Kinetic,
  archive: Archive,
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
