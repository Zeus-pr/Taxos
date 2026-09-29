/** In-memory sliding-window rate limiter (§38). Single-instance MVP; swap for Redis at scale. */
const buckets = new Map<string, { hits: number; resetAt: number }>();

export interface RateResult { ok: boolean; retryAfterSec?: number }

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  b.hits += 1;
  if (b.hits > limit) return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true };
}

/** Periodic cleanup to bound memory. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}, 60_000).unref?.();
