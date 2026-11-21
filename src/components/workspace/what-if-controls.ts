/**
 * What-if controls for the workspace (SPEC §7.6): the current values of a case and the engine
 * toggles for the values the user changed. Type-only engine imports keep this client-light.
 */
import type { AiDecisionRole, Dynamism, Hosting, IntakeInputRaw, WhatIfToggles } from "@/engine/types";
import type { WhatIfControl } from "@/components/splitline/what-if-drawer";

export interface WhatIfValues {
  hosting: Hosting;
  aiDecisionRole: AiDecisionRole;
  quebecAffected: boolean;
  ontarioAffected: boolean;
  crisisContext: boolean;
  dynamism: Dynamism;
  customerFacingOutput: boolean;
}

export const HOSTING_OPTIONS: { value: Hosting; label: string }[] = [
  { value: "in_canada", label: "In Canada" },
  { value: "us_or_global_api", label: "US or global API" },
  { value: "unsure", label: "Unknown" },
];

export const ROLE_OPTIONS: { value: AiDecisionRole; label: string }[] = [
  { value: "informs", label: "AI informs" },
  { value: "recommends", label: "AI recommends" },
  { value: "decides_with_review", label: "AI decides, human reviews" },
  { value: "decides_alone", label: "AI decides alone" },
];

export const DYNAMISM_OPTIONS: { value: Dynamism; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/** Current values of a case. `dynamism` is the engine's derived value when the intake leaves it open. */
export function baseValues(intake: IntakeInputRaw, dynamism: Dynamism): WhatIfValues {
  return {
    hosting: intake.hosting,
    aiDecisionRole: intake.aiDecisionRole,
    quebecAffected: intake.jurisdictions.includes("quebec"),
    ontarioAffected: intake.jurisdictions.includes("ontario"),
    crisisContext: intake.crisisContext ?? false,
    dynamism,
    customerFacingOutput: intake.customerFacingOutput,
  };
}

/** Engine toggles for the values that differ from the base only, so untouched fields stay as entered. */
export function changedToggles(base: WhatIfValues, values: WhatIfValues): WhatIfToggles {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(base) as (keyof WhatIfValues)[]) {
    if (values[key] !== base[key]) out[key] = values[key];
  }
  return out as WhatIfToggles;
}

export function isChanged(base: WhatIfValues, values: WhatIfValues): boolean {
  return Object.keys(changedToggles(base, values)).length > 0;
}

/** Drawer controls in SPEC §7.6 order. */
export function whatIfControls(v: WhatIfValues): WhatIfControl[] {
  return [
    { kind: "select", id: "hosting", label: "Processing and storage", value: v.hosting, options: HOSTING_OPTIONS },
    { kind: "select", id: "aiDecisionRole", label: "AI decision role", value: v.aiDecisionRole, options: ROLE_OPTIONS },
    { kind: "switch", id: "quebecAffected", label: "Quebec residents affected", checked: v.quebecAffected },
    { kind: "switch", id: "ontarioAffected", label: "Ontario roles posted or residents affected", checked: v.ontarioAffected },
    { kind: "switch", id: "crisisContext", label: "Crisis context (temporary centralization)", checked: v.crisisContext },
    { kind: "select", id: "dynamism", label: "Pace of AI change (dynamism)", value: v.dynamism, options: DYNAMISM_OPTIONS },
    { kind: "switch", id: "customerFacingOutput", label: "Customer-facing generated output", checked: v.customerFacingOutput },
  ];
}

const SELECT_KEYS = { hosting: HOSTING_OPTIONS, aiDecisionRole: ROLE_OPTIONS, dynamism: DYNAMISM_OPTIONS } as const;
const SWITCH_KEYS = ["quebecAffected", "ontarioAffected", "crisisContext", "customerFacingOutput"] as const;

/** Applies one control change; unknown ids or values are ignored. */
export function withControl(v: WhatIfValues, id: string, value: string | boolean): WhatIfValues {
  if (typeof value === "boolean") {
    return (SWITCH_KEYS as readonly string[]).includes(id) ? { ...v, [id]: value } : v;
  }
  const options = SELECT_KEYS[id as keyof typeof SELECT_KEYS] as readonly { value: string }[] | undefined;
  return options?.some((o) => o.value === value) ? { ...v, [id]: value } : v;
}
