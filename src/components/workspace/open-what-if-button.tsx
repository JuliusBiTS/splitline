"use client";

import type { ReactNode } from "react";
import { OPEN_WHATIF_EVENT } from "./what-if-panel";

/** Opens the workspace What-if drawer from anywhere on the page. */
export function OpenWhatIfButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_WHATIF_EVENT))}>
      {children}
    </button>
  );
}
