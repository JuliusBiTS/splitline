import type { Metadata } from "next";
import { ComingLater } from "@/components/splitline/coming-later";

export const metadata: Metadata = { title: "Living Lab", robots: { index: false } };

export default function LabPage() {
  return (
    <ComingLater
      title="Living Lab"
      text="A log-based demo on a fictional claims-intake workflow: the same AI, organized two ways, and how the reinforcement differs. Lab metrics are an own log-based operationalization of the thesis constructs: illustrative, not validated. The thesis propositions are untested."
    />
  );
}
