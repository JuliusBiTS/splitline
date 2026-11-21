import type { Metadata } from "next";
import { ComingLater } from "@/components/splitline/coming-later";

export const metadata: Metadata = { title: "Start your own", robots: { index: false } };

export default function NewCasePage() {
  return (
    <ComingLater
      title="Start your own"
      text="Describe a use case in plain words, confirm the subtask breakdown, and get the same results workspace as the presets."
    />
  );
}
