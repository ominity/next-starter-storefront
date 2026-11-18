import { OminityActionError } from "@ominity/next/actions";
import { formatResendWait } from "@ominity/next/react";

/**
 * Between "send a code" and the code page, the email, when a new code may be sent and where to go afterwards live in
 * sessionStorage, never in the URL. The email's link carries the email and code in the fragment instead
 * (`readEmailCodeLink`), which browsers don't send to the server.
 */
const STORAGE_KEY = "ominity-starter.email-code";

export interface PendingEmailCode {
  readonly email: string;
  readonly resendAvailableAt: string | null;
  /** Same-origin path to continue to after signing in. */
  readonly returnTo: string | null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function rememberPendingEmailCode(pending: PendingEmailCode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Private mode or blocked storage: the code page asks for the email again.
  }
}

export function readPendingEmailCode(): PendingEmailCode | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PendingEmailCode> | null;
    if (!value || typeof value.email !== "string" || value.email === "") return null;
    return {
      email: value.email,
      resendAvailableAt: typeof value.resendAvailableAt === "string" ? value.resendAvailableAt : null,
      returnTo: typeof value.returnTo === "string" ? value.returnTo : null,
    };
  } catch {
    return null;
  }
}

export function clearPendingEmailCode(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * What to tell the user when an auth request fails: Ominity's wait in words for rate limits (codes sent, wrong codes,
 * passkey attempts), its message otherwise.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof OminityActionError) {
    if (error.status === 429) {
      return error.retryAfter
        ? `Too many attempts. Try again in ${formatResendWait(error.retryAfter)}.`
        : "Too many attempts. Wait a few minutes and try again.";
    }
    if (error.code === "INVALID_CODE") return "That code is wrong or has expired. Check the latest email, or send a new code.";
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
