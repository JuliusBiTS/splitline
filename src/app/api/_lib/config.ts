/**
 * Live-mode configuration from the environment (SPEC §8, §13, ADR-0008, ADR-0019). Server-only.
 * Live calls run only when the kill switch is on AND the key and the case-token secret are set.
 */
export const DEFAULT_DAILY_LIVE_RUN_CAP = 100;
export const MIN_TOKEN_SECRET_LENGTH = 32;

export interface LiveConfig {
  liveEnabled: boolean;
  dailyCap: number;
  tokenSecret: string | null;
}

export function readLiveConfig(env: Readonly<Record<string, string | undefined>> = process.env): LiveConfig {
  const secret = env.CASE_TOKEN_SECRET ?? "";
  const tokenSecret = secret.length >= MIN_TOKEN_SECRET_LENGTH ? secret : null;
  const cap = Number.parseInt(env.DAILY_LIVE_RUN_CAP ?? "", 10);
  return {
    liveEnabled: env.LIVE_MODE_ENABLED === "true" && Boolean(env.ANTHROPIC_API_KEY) && tokenSecret !== null,
    dailyCap: Number.isFinite(cap) && cap >= 0 ? cap : DEFAULT_DAILY_LIVE_RUN_CAP,
    tokenSecret,
  };
}
