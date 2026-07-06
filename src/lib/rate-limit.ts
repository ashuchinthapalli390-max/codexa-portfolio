/**
 * In-memory rate limiter for admin access key attempts
 * Limits to 5 failed attempts per IP per 15 minutes
 *
 * For production with multiple servers, replace with Redis-based limiter
 * (e.g., @upstash/ratelimit)
 */

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 min block after limit reached

// Store: ip → AttemptRecord
const store = new Map<string, AttemptRecord>();

// Cleanup old entries every 30 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  store.forEach((record, ip) => {
    if (now - record.firstAttemptAt > WINDOW_MS * 2) {
      store.delete(ip);
    }
  });
}, 30 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number; // Unix timestamp ms when block lifts
}

/**
 * Check rate limit for an IP address.
 * Call BEFORE processing a login attempt.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const record = store.get(ip);

  if (!record) {
    return { allowed: true, remaining: MAX_FAILURES };
  }

  // If currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.blockedUntil,
    };
  }

  // If window has expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    store.delete(ip);
    return { allowed: true, remaining: MAX_FAILURES };
  }

  // Window still active
  const remaining = Math.max(0, MAX_FAILURES - record.count);
  return { allowed: remaining > 0, remaining, resetAt: record.firstAttemptAt + WINDOW_MS };
}

/**
 * Record a FAILED attempt for an IP.
 * Call AFTER a failed verification attempt.
 */
export function recordFailure(ip: string): RateLimitResult {
  const now = Date.now();
  const record = store.get(ip);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    // Fresh window
    store.set(ip, { count: 1, firstAttemptAt: now });
    return { allowed: true, remaining: MAX_FAILURES - 1 };
  }

  // Increment
  record.count += 1;

  if (record.count >= MAX_FAILURES) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    store.set(ip, record);
    return { allowed: false, remaining: 0, resetAt: record.blockedUntil };
  }

  store.set(ip, record);
  return {
    allowed: true,
    remaining: MAX_FAILURES - record.count,
  };
}

/**
 * Clear all rate limit records for an IP (call on successful verification)
 */
export function clearRateLimit(ip: string): void {
  store.delete(ip);
}
