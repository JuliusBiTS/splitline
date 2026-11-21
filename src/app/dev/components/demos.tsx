"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ProgressNarration } from "@/components/splitline/steps";
import { WhatIfDrawer, type WhatIfToggle } from "@/components/splitline/what-if-drawer";
import type { DiffChip } from "@/components/splitline/what-if.logic";
import type { TierLevel, Verdict } from "@/engine/types";

export interface WhatIfScenario {
  verdict: Verdict;
  tier: TierLevel;
  rulesCount: number;
  blockersCount: number;
  chips: DiffChip[];
}

/** WhatIfDrawer specimen: scenarios are precomputed by the engine on the server, keyed by toggle state. */
export function WhatIfDemo({
  toggleDefs,
  scenarios,
}: {
  toggleDefs: { id: string; label: string }[];
  /** Key: toggle ids that are on, sorted and joined with "+" ("" = none). */
  scenarios: Record<string, WhatIfScenario>;
}) {
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState<string[]>([]);
  const key = [...on].sort().join("+");
  const s = scenarios[key] ?? scenarios[""]!;
  const toggles: WhatIfToggle[] = toggleDefs.map((t) => ({ ...t, checked: on.includes(t.id) }));
  return (
    <div className="flex items-start gap-6">
      <p className="max-w-md text-[15px] text-ink-2">
        The handle sits on the right edge in the product. Here it is inline. Open it and turn on a switch: the engine
        results for each combination are computed on the server.
      </p>
      <WhatIfDrawer
        open={open}
        onOpenChange={setOpen}
        toggles={toggles}
        onToggle={(id, c) => setOn((prev) => (c ? [...prev, id] : prev.filter((x) => x !== id)))}
        chips={s.chips}
        verdict={s.verdict}
        tier={s.tier}
        rulesCount={s.rulesCount}
        blockersCount={s.blockersCount}
        onApply={() => {
          setOpen(false);
          toast.success("What-if applied to this specimen");
        }}
        handle="inline"
      />
    </div>
  );
}

const NARRATION = [
  "Matching rules for BC and federal scope",
  "Separating proposed rules from rules in force",
  "Mapping the split to guardrails",
  "Costing the operating model",
];

/** ProgressNarration specimen: steps advance about every 1.1 s after "Replay". No spinner. */
export function ProgressDemo() {
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || step >= NARRATION.length) return;
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      if (step + 1 >= NARRATION.length) setRunning(false);
    }, 1100);
    return () => clearTimeout(t);
  }, [running, step]);
  return (
    <div className="flex flex-col gap-3">
      <ProgressNarration
        heading={step >= NARRATION.length ? "Split confirmed by you · analysis ready" : "Split confirmed by you · analyzing"}
        steps={NARRATION}
        current={step}
        className="max-w-xl"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => {
          setStep(0);
          setRunning(true);
        }}
      >
        Replay
      </Button>
    </div>
  );
}

const JUDGMENT = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/** Primitive specimens: Button, Tabs (line + segmented), Select, Switch, Tooltip, Sonner. */
export function PrimitivesDemo() {
  const [sw, setSw] = useState(true);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Confirm split and analyze</Button>
        <Button variant="outline">Describe a use case</Button>
        <Button variant="ghost">Edit inputs</Button>
        <Button variant="link">Open source</Button>
        <Button size="xl">Start your own</Button>
        <Button size="sm" variant="outline" onClick={() => toast.success("Link copied")}>
          Copy link (toast)
        </Button>
      </div>

      <Tabs defaultValue="summary">
        <TabsList aria-label="Result sections">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="triage">Triage</TabsTrigger>
          <TabsTrigger value="model">Operating model</TabsTrigger>
          <TabsTrigger value="rollout">Rollout</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="text-[15px] text-ink-2">Summary panel.</TabsContent>
        <TabsContent value="triage" className="text-[15px] text-ink-2">Triage panel.</TabsContent>
        <TabsContent value="model" className="text-[15px] text-ink-2">Operating model panel.</TabsContent>
        <TabsContent value="rollout" className="text-[15px] text-ink-2">Rollout panel.</TabsContent>
        <TabsContent value="export" className="text-[15px] text-ink-2">Export panel.</TabsContent>
      </Tabs>

      <Tabs defaultValue="queue">
        <TabsList variant="segmented" aria-label="Living Lab views">
          <TabsTrigger value="queue">Review queue</TabsTrigger>
          <TabsTrigger value="autoplay">Autoplay compare</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="text-[15px] text-ink-2">Review queue panel.</TabsContent>
        <TabsContent value="autoplay" className="text-[15px] text-ink-2">Autoplay compare panel.</TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-6">
        <Select defaultValue="medium" items={JUDGMENT}>
          <SelectTrigger aria-label="Judgment" className="w-[108px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JUDGMENT.map((j) => (
              <SelectItem key={j.value} value={j.value}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-3 text-[15px] text-ink">
          <Switch checked={sw} onCheckedChange={setSw} aria-label="Specimen switch" />
          Switch is {sw ? "on" : "off"}
        </label>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="sm" />}>Tooltip on a source</TooltipTrigger>
          <TooltipContent>Verified November 20, 2026</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
