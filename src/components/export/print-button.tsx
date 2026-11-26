"use client";

import { PrinterIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonVariants({ size: "lg" })}>
      <PrinterIcon aria-hidden /> Print or save as PDF
    </button>
  );
}
