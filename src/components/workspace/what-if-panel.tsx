"use client";

import { useEffect, useMemo, useState } from "react";
import { WhatIfDrawer } from "@/components/splitline/what-if-drawer";
import { diffChips, type DiffChip } from "@/components/splitline/what-if.logic";
import type { ConfirmedDecomposition, Dynamism, IntakeInputRaw, TierLevel, Verdict } from "@/engine/types";
import { baseValues, changedToggles, isChanged, whatIfControls, withControl, type WhatIfValues } from "./what-if-controls";

/** Custom event that opens the What-if drawer (e.g. from the Summary "Try a what-if" button). */
export const OPEN_WHATIF_EVENT = "splitline:open-whatif";

type EngineModule = typeof import("@/engine/whatif") & { computeCase: typeof import("@/engine").computeCase };

interface Snapshot {
  verdict: Verdict;
  tier: TierLevel;
  rulesCount: number;
  blockersCount: number;
  chips: DiffChip[];
}

async function loadEngine(): Promise<EngineModule> {
  const [whatif, engine] = await Promise.all([import("@/engine/whatif"), import("@/engine")]);
  return { ...whatif, computeCase: engine.computeCase };
}

/**
 * What-if for a workspace. The engine (and its rule catalogue) loads on first open, so it stays out
 * of the page's initial JavaScript; every change then recomputes synchronously (SPEC §7.6).
 * Presets are fixed, so there is no "Apply"; the drawer explains that instead.
 */
export function WhatIfPanel({
  intake,
  decomposition,
  dynamism,
  today,
  base,
}: {
  intake: IntakeInputRaw;
  decomposition: ConfirmedDecomposition;
  /** The engine's (possibly derived) dynamism for this case. */
  dynamism: Dynamism;
  today: string;
  /** Engine results of the unchanged case, computed on the server. */
  base: Omit<Snapshot, "chips">;
}) {
  const [open, setOpen] = useState(false);
  const [engine, setEngine] = useState<EngineModule | null>(null);
  const initial = useMemo(() => baseValues(intake, dynamism), [intake, dynamism]);
  const [values, setValues] = useState<WhatIfValues>(initial);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_WHATIF_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_WHATIF_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open || engine) return;
    let cancelled = false;
    loadEngine().then((m) => {
      if (!cancelled) setEngine(m);
    });
    return () => {
      cancelled = true;
    };
  }, [open, engine]);

  const baseResult = useMemo(
    () => (engine ? engine.computeCase(intake, decomposition, { today }) : null),
    [engine, intake, decomposition, today],
  );

  const snapshot: Snapshot = useMemo(() => {
    if (!engine || !baseResult || !isChanged(initial, values)) return { ...base, chips: [] };
    const { result, diff } = engine.computeWhatIf(baseResult, intake, decomposition, changedToggles(initial, values), { today });
    return {
      verdict: result.verdict.verdict,
      tier: result.tier.level,
      rulesCount: result.triggeredRules.length,
      blockersCount: result.triggeredRules.filter((t) => t.severity === "blocker").length,
      chips: diffChips(diff),
    };
  }, [engine, baseResult, initial, values, intake, decomposition, today, base]);

  const changedWithoutEffect = !!engine && isChanged(initial, values) && snapshot.chips.length === 0;

  return (
    <WhatIfDrawer
      open={open}
      onOpenChange={setOpen}
      toggles={whatIfControls(values)}
      onToggle={(id, c) => setValues((v) => withControl(v, id, c))}
      onSelect={(id, val) => setValues((v) => withControl(v, id, val))}
      chips={snapshot.chips.length > 0 || !changedWithoutEffect ? snapshot.chips : [{ kind: "note", text: "No effect on tier, verdict, rules or split" }]}
      verdict={snapshot.verdict}
      tier={snapshot.tier}
      rulesCount={snapshot.rulesCount}
      blockersCount={snapshot.blockersCount}
      pending={open && !engine}
      footerNote="Presets are fixed. Start your own to keep changes."
    />
  );
}
