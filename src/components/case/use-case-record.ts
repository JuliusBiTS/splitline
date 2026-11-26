"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CaseIdSchema, type CaseRecord } from "@/case/case";
import { decodeShare, SHARE_ERROR_MESSAGES } from "@/case/share";
import { loadCase, saveCase } from "@/case/storage";

export type CaseState =
  | { status: "loading" }
  | { status: "ready"; record: CaseRecord }
  | { status: "missing" }
  | { status: "error"; message: string };

/**
 * Loads `/case/<id>` from this browser, or from the share-link hash (ADR-0008, ADR-0020). A case
 * opened from a link is saved locally, so it survives a reload without the hash. A local record
 * the creator made wins over the hash, so the description and narrative stay with them.
 */
export function useCaseRecord(): [CaseState, (r: CaseRecord) => void] {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [state, setState] = useState<CaseState>({ status: "loading" });
  // A pasted share link may change only the hash, which is a same-document navigation.
  const [hashTick, setHashTick] = useState(0);
  useEffect(() => {
    const onHash = () => setHashTick((n) => n + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const done = (s: CaseState) => {
      if (!cancelled) setState(s);
    };
    (async () => {
      if (!CaseIdSchema.safeParse(id).success) return done({ status: "missing" });
      const local = loadCase(id);
      if (local) return done({ status: "ready", record: local });
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return done({ status: "missing" });
      const decoded = await decodeShare(hash);
      if (!decoded.ok) return done({ status: "error", message: SHARE_ERROR_MESSAGES[decoded.reason] });
      const record: CaseRecord = {
        v: 1,
        id,
        asOf: decoded.payload.asOf,
        intake: decoded.payload.intake,
        fromShareLink: true,
        proposed: null,
        decomposition: decoded.payload.decomposition,
        entry: "shared",
      };
      saveCase(record);
      done({ status: "ready", record });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, hashTick]);

  const update = useCallback((r: CaseRecord) => {
    saveCase(r);
    setState({ status: "ready", record: r });
  }, []);

  return [state, update];
}
