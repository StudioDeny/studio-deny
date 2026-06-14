interface Record {
  attempts: number[];
  lockedUntil?: number;
}

function load(key: string): Record {
  try {
    const raw = localStorage.getItem(`rl_${key}`);
    return raw ? JSON.parse(raw) : { attempts: [] };
  } catch {
    return { attempts: [] };
  }
}

function save(key: string, record: Record): void {
  localStorage.setItem(`rl_${key}`, JSON.stringify(record));
}

export interface RateLimitResult {
  allowed: boolean;
  lockedUntil: number | null;
  attemptsLeft: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockoutMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = load(key);

  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, lockedUntil: record.lockedUntil, attemptsLeft: 0 };
  }

  const recent = record.attempts.filter((t) => t > now - windowMs);
  const attemptsLeft = maxAttempts - recent.length;

  return { allowed: attemptsLeft > 0, lockedUntil: null, attemptsLeft: Math.max(0, attemptsLeft) };
}

export function recordAttempt(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockoutMs = 15 * 60 * 1000
): void {
  const now = Date.now();
  const record = load(key);
  const recent = record.attempts.filter((t) => t > now - windowMs);
  recent.push(now);
  const lockedUntil = recent.length >= maxAttempts ? now + lockoutMs : record.lockedUntil;
  save(key, { attempts: recent, lockedUntil });
}

export function clearRateLimit(key: string): void {
  localStorage.removeItem(`rl_${key}`);
}

export function formatMs(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.ceil(sec / 60);
  return `${min} min`;
}
