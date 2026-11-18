"use client";

import { readEmailCodeLink, safeReturnTo, useAuth, useResendCountdown } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import {
  authErrorMessage,
  clearPendingEmailCode,
  readPendingEmailCode,
  rememberPendingEmailCode,
  type PendingEmailCode,
} from "./email-code";
import { InputMfaCode } from "./input-mfa-code";

export interface AuthVerifyEmailCodePageProps {
  readonly paths: { readonly login: string; readonly account: string; readonly mfa: string };
  readonly returnTo?: string;
}

interface Initial {
  readonly pending: PendingEmailCode | null;
  /** The code from the email's link, when the page was opened from it. */
  readonly linkCode: string | null;
}

const subscribe = () => () => {};

/** The email and code from the link's fragment, else what the send step stored. */
function readInitial(verificationEmail: string | null): Initial {
  const link = readEmailCodeLink();
  const stored = readPendingEmailCode();
  const email = link.email ?? verificationEmail ?? stored?.email ?? null;
  if (!email) return { pending: null, linkCode: null };

  const same = stored?.email === email;
  return {
    pending: { email, resendAvailableAt: same ? stored.resendAvailableAt : null, returnTo: same ? stored.returnTo : null },
    linkCode: link.email === email ? link.code : null,
  };
}

/**
 * Step two of a passwordless sign-in or a sign-up: the 6-digit code Ominity emailed. Opened from the email's link the
 * code is filled in and the user confirms it; the link itself never signs anyone in, because mail scanners open links.
 */
export function AuthVerifyEmailCodePage(props: AuthVerifyEmailCodePageProps) {
  const auth = useAuth();
  // The fragment and sessionStorage only exist in the browser.
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  if (!hydrated || !auth.ready) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  }

  return <VerifyForm {...props} initial={readInitial(auth.verification?.email ?? null)} />;
}

function VerifyForm({ paths, returnTo, initial }: AuthVerifyEmailCodePageProps & { readonly initial: Initial }) {
  const router = useRouter();
  const auth = useAuth();
  const [pending, setPending] = useState(initial.pending);
  const [code, setCode] = useState(initial.linkCode ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const resendAt = pending?.resendAvailableAt ?? auth.verification?.resendAvailableAt ?? null;
  const countdown = useResendCountdown(resendAt);

  // Keep the email for a reload, and take the code out of the address bar.
  useEffect(() => {
    if (!window.location.hash) return;
    if (initial.pending) rememberPendingEmailCode(initial.pending);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [initial.pending]);

  if (!pending) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>We don&apos;t know which email to check. Ask for a new code from the login page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={paths.login as Route} className="text-sm font-medium text-primary hover:underline">Go to login</Link>
        </CardContent>
      </Card>
    );
  }

  const verify = async () => {
    if (code.length !== 6) {
      setMessage("Enter the 6-digit code from the email.");
      return;
    }
    setBusy("verify");
    setMessage(null);
    try {
      const state = await auth.verifyEmailCode({ email: pending.email, code });
      const target = safeReturnTo(returnTo ?? pending.returnTo, paths.account);
      clearPendingEmailCode();
      router.replace((state.status === "mfa_required" ? `${paths.mfa}?returnTo=${encodeURIComponent(target)}` : target) as Route);
    } catch (error) {
      setMessage(authErrorMessage(error, "That code didn't work."));
      setBusy(null);
    }
  };

  const resend = async () => {
    setBusy("resend");
    setMessage(null);
    try {
      const sent = await auth.sendEmailCode(pending.email);
      const next = { ...pending, resendAvailableAt: sent.resendAvailableAt };
      setPending(next);
      rememberPendingEmailCode(next);
      setCode("");
      setMessage("We sent a new code.");
    } catch (error) {
      setMessage(authErrorMessage(error, "We couldn't send a new code."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          {initial.linkCode && code === initial.linkCode
            ? <>Confirm the code we sent to <strong>{pending.email}</strong>.</>
            : <>We sent a 6-digit code to <strong>{pending.email}</strong>. It expires in 15 minutes.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void verify(); }}>
          <InputMfaCode value={code} onChange={(next) => { setCode(next); setMessage(null); }} disabled={busy !== null} autoFocus />
          <Button type="submit" disabled={busy !== null || code.length !== 6}>{busy === "verify" ? "Checking…" : "Continue"}</Button>
        </form>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or{" "}
          {countdown.canResend
            ? <Button variant="link" className="h-auto p-0" disabled={busy !== null} onClick={() => { void resend(); }}>send a new code</Button>
            : <>send a new code in {countdown.label}</>}
          .
        </p>
        <Link href={paths.login as Route} className="text-sm font-medium text-primary hover:underline">Use a different email</Link>
      </CardContent>
    </Card>
  );
}
