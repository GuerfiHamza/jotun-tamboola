type Record_ = { count: number; resetAt: number };
const attempts = new Map<string, Record_>();
const MAX_ENTRIES = 10_000;

// Sweep expired entries so the Map can't grow without bound (memory DoS).
function sweep(now: number) {
  for (const [k, v] of attempts) {
    if (now > v.resetAt) attempts.delete(k);
  }
}

export function checkRateLimit(ip: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  if (attempts.size > MAX_ENTRIES) sweep(now);

  const record = attempts.get(ip);
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxAttempts) return false;
  record.count++;
  return true;
}

// NOTE: in-memory limits reset on deploy and don't share state across
// serverless instances. On Vercel/multi-instance, use Upstash Redis instead.
