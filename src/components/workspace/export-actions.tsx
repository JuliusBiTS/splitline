"use client";

import { DownloadIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { charterFileName } from "@/export/charter";
import { trackEvent } from "@/lib/analytics";
import type { InventoryRecord } from "./model";

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Charter and inventory downloads (SPEC §11). Everything is generated in the browser; nothing is uploaded. */
export function ExportActions({
  title,
  markdown,
  record,
  charterHref,
  source,
}: {
  title: string;
  markdown: string;
  record: InventoryRecord;
  charterHref: string;
  source: "preset" | "case";
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className={buttonVariants({ variant: "default" })}
        onClick={() => {
          download(charterFileName(title, "md"), "text/markdown;charset=utf-8", markdown);
          trackEvent({ name: "charter_export", props: { format: "markdown", source } });
          toast.success("Charter downloaded");
        }}
      >
        <DownloadIcon aria-hidden /> Download charter (Markdown)
      </button>
      <Link
        href={charterHref}
        className={buttonVariants({ variant: "outline" })}
        onClick={() => trackEvent({ name: "charter_export", props: { format: "print", source } })}
      >
        <PrinterIcon aria-hidden /> Open the printable charter
      </Link>
      <button
        type="button"
        className={buttonVariants({ variant: "outline" })}
        onClick={() => {
          download(charterFileName(title, "json", "splitline-inventory"), "application/json", `${JSON.stringify(record, null, 2)}\n`);
          trackEvent({ name: "charter_export", props: { format: "json", source } });
          toast.success("Inventory record downloaded");
        }}
      >
        <DownloadIcon aria-hidden /> Download inventory record (JSON)
      </button>
    </div>
  );
}
