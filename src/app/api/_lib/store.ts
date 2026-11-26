/**
 * Live-run accounting (ADR-0008): per-IP sliding window, global daily cap, spend-limit suspension
 * and single-use case tokens. Only counters, flags and token IDs are stored, with a TTL: no request
 * bodies and no user data (ADR-0003).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const RUNS_PER_IP_PER_HOUR = 10;
/** How long live mode stays off after `enforced_spend_limit_reached` before one call probes again. */
export const SPEND_SUSPENSION_SECONDS = 6 * 60 * 60;

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface LiveStore {
  /** Counts one run against the IP's sliding window (10 per hour). */
  limitRun(ip: string): Promise<LimitResult>;
  /** Counts one live call against today's cap (UTC day `YYYY-MM-DD`); false when over the cap. */
  countDaily(day: string, cap: number): Promise<boolean>;
  isSuspended(): Promise<boolean>;
  suspend(seconds: number): Promise<void>;
  /** True the first time a token ID is seen; false on reuse. */
  consumeToken(jti: string, ttlSeconds: number): Promise<boolean>;
}

const PREFIX = "splitline";

/** The Upstash-backed store, or null when Upstash is not configured (then live mode stays off). */
export function upstashStore(env: Readonly<Record<string, string | undefined>> = process.env): LiveStore | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  const runs = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RUNS_PER_IP_PER_HOUR, "1 h"),
    prefix: `${PREFIX}:runs`,
    analytics: false,
  });
  return {
    async limitRun(ip) {
      const r = await runs.limit(ip);
      return { ok: r.success, retryAfterSeconds: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
    },
    async countDaily(day, cap) {
      const key = `${PREFIX}:daily:${day}`;
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, 2 * 24 * 60 * 60);
      return n <= cap;
    },
    async isSuspended() {
      return (await redis.get(`${PREFIX}:suspended`)) !== null;
    },
    async suspend(seconds) {
      await redis.set(`${PREFIX}:suspended`, "spend_limit", { ex: seconds });
    },
    async consumeToken(jti, ttlSeconds) {
      const res = await redis.set(`${PREFIX}:token:${jti}`, "1", { nx: true, ex: ttlSeconds });
      return res === "OK";
    },
  };
}

/** In-memory store for unit tests and local experiments. */
export function memoryStore(now: () => number = Date.now): LiveStore {
  const hits = new Map<string, number[]>();
  const daily = new Map<string, number>();
  const tokens = new Map<string, number>();
  let suspendedUntil = 0;
  return {
    async limitRun(ip) {
      const t = now();
      const window = (hits.get(ip) ?? []).filter((x) => x > t - 3_600_000);
      if (window.length >= RUNS_PER_IP_PER_HOUR) {
        hits.set(ip, window);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((window[0]! + 3_600_000 - t) / 1000)) };
      }
      window.push(t);
      hits.set(ip, window);
      return { ok: true, retryAfterSeconds: 0 };
    },
    async countDaily(day, cap) {
      const n = (daily.get(day) ?? 0) + 1;
      daily.set(day, n);
      return n <= cap;
    },
    async isSuspended() {
      return now() < suspendedUntil;
    },
    async suspend(seconds) {
      suspendedUntil = now() + seconds * 1000;
    },
    async consumeToken(jti, ttlSeconds) {
      const t = now();
      const until = tokens.get(jti);
      if (until !== undefined && until > t) return false;
      tokens.set(jti, t + ttlSeconds * 1000);
      return true;
    },
  };
}
