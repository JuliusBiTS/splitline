"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const WORKSPACE_TABS = [
  { value: "summary", label: "Summary" },
  { value: "triage", label: "Triage" },
  { value: "model", label: "Operating model" },
  { value: "rollout", label: "Rollout" },
  { value: "export", label: "Export" },
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]["value"];

function isTab(v: unknown): v is WorkspaceTab {
  return WORKSPACE_TABS.some((t) => t.value === v);
}

/** Custom event other components dispatch to switch tabs (e.g. "Design the operating model"). */
export const SELECT_TAB_EVENT = "splitline:select-tab";
const TAB_CHANGED_EVENT = "splitline:tab-changed";

/** The active tab lives in the URL (`?tab=`), so it can be linked; Summary is the default. */
function readTab(): WorkspaceTab {
  const v = new URLSearchParams(window.location.search).get("tab");
  return isTab(v) ? v : "summary";
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(TAB_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(TAB_CHANGED_EVENT, onChange);
  };
}

function selectTab(v: WorkspaceTab) {
  const url = new URL(window.location.href);
  if (v === "summary") url.searchParams.delete("tab");
  else url.searchParams.set("tab", v);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(TAB_CHANGED_EVENT));
}

/** Result workspace tabs (SPEC §4). Panels are rendered on the server and passed in. */
export function WorkspaceTabs({ panels }: { panels: Record<WorkspaceTab, ReactNode> }) {
  const tab = useSyncExternalStore(subscribe, readTab, () => "summary" as const);

  useEffect(() => {
    const onSelect = (e: Event) => {
      const v = (e as CustomEvent<unknown>).detail;
      if (isTab(v)) {
        selectTab(v);
        window.scrollTo({ top: 0 });
      }
    };
    window.addEventListener(SELECT_TAB_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_TAB_EVENT, onSelect);
  }, []);

  return (
    <Tabs value={tab} onValueChange={(v) => isTab(v) && selectTab(v)}>
      <TabsList aria-label="Result sections">
        {WORKSPACE_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {WORKSPACE_TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="pt-4">
          {panels[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Button that switches the workspace to another tab. */
export function TabLinkButton({ tab, className, children }: { tab: WorkspaceTab; className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new CustomEvent(SELECT_TAB_EVENT, { detail: tab }))}>
      {children}
    </button>
  );
}
