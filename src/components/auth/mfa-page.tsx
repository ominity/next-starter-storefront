"use client";

import { safeReturnTo, useAuth } from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { authErrorMessage } from "./email-code";
import { InputMfaCode } from "./input-mfa-code";
import { InputRecoveryCode } from "./input-recovery-code";

const RECOVERY = "recovery";
const LABELS: Readonly<Record<string, string>> = {
  authenticator: "Authenticator app",
  email: "Email",
  sms: "SMS",
  [RECOVERY]: "Recovery code",
};
const HINTS: Readonly<Record<string, string>> = {
  authenticator: "Enter the 6-digit code from your authenticator app.",
  email: "Send a code to your email address, then enter it here.",
  sms: "Send a code to your phone, then enter it here.",
  [RECOVERY]: "Use one of your single-use recovery codes.",
};

function recoveryCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return compact.length === 6 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

export interface AuthMfaPageProps {
  readonly paths: { readonly login: string; readonly account: string };
  readonly returnTo?: string;
}

/** The second step of a sign-in: the methods come from the pending session in `useAuth`. */
export function AuthMfaPage({ paths, returnTo }: AuthMfaPageProps) {
  const router = useRouter();
  const auth = useAuth();
  const methods = [...auth.mfaMethods.map((method) => method.method), RECOVERY];
  const [selected, setSelected] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const method = selected ?? methods[0] ?? RECOVERY;
  const target = safeReturnTo(returnTo, paths.account) as Route;

  useEffect(() => {
    if (auth.status === "authenticated") router.replace(target);
  }, [auth.status, router, target]);

  if (!auth.ready) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;
  }

  if (auth.status !== "mfa_required") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Two-factor authentication</CardTitle>
          <CardDescription>Sign in first; this step only appears when your account has two-factor authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={paths.login as Route} className="text-sm font-medium text-primary hover:underline">Go to login</Link>
        </CardContent>
      </Card>
    );
  }

  const verify = async () => {
    setMessage(null);
    try {
      await (method === RECOVERY ? auth.verifyRecoveryCode(recoveryCode(code)) : auth.verifyMfa(method, code.trim()));
    } catch (error) {
      // Ominity allows 5 wrong codes in 15 minutes (20 a day); past that it says how long to wait.
      setMessage(authErrorMessage(error, "Verification failed."));
    }
  };

  const send = async () => {
    setMessage(null);
    try {
      await auth.sendMfaCode(method);
      setMessage("A code is on its way.");
    } catch (error) {
      setMessage(authErrorMessage(error, "Could not send a code."));
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Two-factor authentication</CardTitle>
        <CardDescription>Verify your identity to finish signing in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {methods.map((entry) => (
            <Button
              key={entry}
              size="sm"
              variant={entry === method ? "default" : "outline"}
              onClick={() => {
                setSelected(entry);
                setCode("");
                setMessage(null);
              }}
            >
              {LABELS[entry] ?? entry}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{HINTS[method] ?? "Enter the code."}</p>

        {method === RECOVERY
          ? <InputRecoveryCode value={code} onChange={(next) => setCode(recoveryCode(next))} disabled={auth.pending} />
          : <InputMfaCode value={code} onChange={setCode} disabled={auth.pending} />}

        <div className="flex flex-wrap gap-2">
          {(method === "email" || method === "sms") && (
            <Button type="button" variant="secondary" disabled={auth.pending} onClick={() => { void send(); }}>Send code</Button>
          )}
          <Button disabled={auth.pending} onClick={() => { void verify(); }}>{auth.pending ? "Verifying…" : "Verify"}</Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Button variant="link" className="px-0" onClick={() => { void auth.signOut(); }}>Cancel and sign out</Button>
      </CardContent>
    </Card>
  );
}
