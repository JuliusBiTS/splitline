import type { Metadata } from "next";
import { ComingLater } from "@/components/splitline/coming-later";

export const metadata: Metadata = { title: "Reinforcement Pulse", robots: { index: false } };

export default function PulsePage() {
  return (
    <ComingLater
      title="Reinforcement Pulse"
      text="A nine-item survey that places a team on the 2×2 of both feeding directions and names the lagging driver. Illustrative, not validated."
    />
  );
}
