// ─── AUTH RATE LIMITER (Lockout 5 to 15 minutes after 5 failed attempts) ──────

export interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null; // timestamp ms
  lockoutLevel: number; // 1 = 5 min, 2 = 10 min, 3 = 15 min
  lastAttemptAt: number;
}

const STORAGE_PREFIX = 'saffo_auth_lockout_';
const MAX_ATTEMPTS = 5;

// Lockout durations in minutes: 5 min, 10 min, 15 min max
const LOCKOUT_MINUTES_SCHEDULE = [5, 10, 15];

function getStorageKey(email: string): string {
  const normalized = email.trim().toLowerCase() || 'anonymous_user';
  return `${STORAGE_PREFIX}${normalized}`;
}

export function getLockoutData(email: string): LockoutRecord {
  if (typeof window === 'undefined') {
    return { failedAttempts: 0, lockedUntil: null, lockoutLevel: 0, lastAttemptAt: 0 };
  }

  try {
    const raw = localStorage.getItem(getStorageKey(email));
    if (!raw) return { failedAttempts: 0, lockedUntil: null, lockoutLevel: 0, lastAttemptAt: 0 };
    const parsed: LockoutRecord = JSON.parse(raw);
    return parsed;
  } catch {
    return { failedAttempts: 0, lockedUntil: null, lockoutLevel: 0, lastAttemptAt: 0 };
  }
}

function saveLockoutData(email: string, data: LockoutRecord): void {
  try {
    localStorage.setItem(getStorageKey(email), JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Returns whether the given email is currently locked out, and how many seconds remain.
 */
export function checkLockoutStatus(email: string): {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  maxAttempts: number;
  lockoutMinutes: number;
} {
  const data = getLockoutData(email);
  const now = Date.now();

  if (data.lockedUntil && data.lockedUntil > now) {
    const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
    const index = Math.min(Math.max(data.lockoutLevel - 1, 0), LOCKOUT_MINUTES_SCHEDULE.length - 1);
    const lockoutMinutes = LOCKOUT_MINUTES_SCHEDULE[index];

    return {
      isLocked: true,
      remainingSeconds,
      failedAttempts: data.failedAttempts,
      maxAttempts: MAX_ATTEMPTS,
      lockoutMinutes,
    };
  }

  // If lockout expired, reset lockedUntil but preserve lockoutLevel in case of repeated immediate failures
  if (data.lockedUntil && data.lockedUntil <= now) {
    saveLockoutData(email, {
      ...data,
      lockedUntil: null,
      failedAttempts: 0, // Reset attempts counter after lockout period is served
    });
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: data.failedAttempts,
    maxAttempts: MAX_ATTEMPTS,
    lockoutMinutes: 0,
  };
}

/**
 * Record a failed password attempt.
 * If 5 failed attempts are reached, trigger a 5 to 15-minute patience lockout.
 */
export function recordFailedAttempt(email: string): {
  isNowLocked: boolean;
  failedAttempts: number;
  maxAttempts: number;
  lockoutMinutes: number;
  remainingSeconds: number;
} {
  const data = getLockoutData(email);
  const now = Date.now();

  const newAttempts = data.failedAttempts + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    // Escalate lockout: level 1 = 5 min, level 2 = 10 min, level 3 = 15 min
    const nextLevel = Math.min(data.lockoutLevel + 1, 3);
    const index = nextLevel - 1;
    const minutes = LOCKOUT_MINUTES_SCHEDULE[index];
    const durationMs = minutes * 60 * 1000;
    const lockedUntil = now + durationMs;

    const updated: LockoutRecord = {
      failedAttempts: newAttempts,
      lockedUntil,
      lockoutLevel: nextLevel,
      lastAttemptAt: now,
    };

    saveLockoutData(email, updated);

    return {
      isNowLocked: true,
      failedAttempts: newAttempts,
      maxAttempts: MAX_ATTEMPTS,
      lockoutMinutes: minutes,
      remainingSeconds: minutes * 60,
    };
  }

  saveLockoutData(email, {
    ...data,
    failedAttempts: newAttempts,
    lastAttemptAt: now,
  });

  return {
    isNowLocked: false,
    failedAttempts: newAttempts,
    maxAttempts: MAX_ATTEMPTS,
    lockoutMinutes: 0,
    remainingSeconds: 0,
  };
}

/**
 * Record a successful login — clears all lockout penalties for the email.
 */
export function recordSuccessfulLogin(email: string): void {
  try {
    localStorage.removeItem(getStorageKey(email));
  } catch {
    // ignore
  }
}
