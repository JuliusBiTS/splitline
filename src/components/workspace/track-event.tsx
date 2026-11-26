"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

/** Fires one analytics event when the page mounts (e.g. `preset_open`). Renders nothing. */
export function TrackOnMount({ event }: { event: AnalyticsEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    trackEvent(JSON.parse(key) as AnalyticsEvent);
  }, [key]);
  return null;
}
