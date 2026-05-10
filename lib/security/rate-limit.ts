type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Sliding-window style limiter keyed by arbitrary string (e.g. IP + route scope).
 */
export function consumeRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
    return { ok: true };
  }

  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}
