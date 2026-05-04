"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth } from "./auth-provider";
import { InputMfaCode } from "./input-mfa-code";
import { InputRecoveryCode } from "./input-recovery-code";

type MfaViewMode = "otp" | "email" | "sms" | "recovery";

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function formatRecoveryCode(value: string): string {
  const compact = normalizeRecoveryCode(value);
  if (compact.length !== 6) {
    return compact;
  }

  return `${compact.slice(0, 3)}-${compact.slice(3)}`;
}

function normalizeMethodName(method: string): MfaViewMode | null {
  const normalized = method.trim().toLowerCase();
  if (normalized === "totp" || normalized === "otp") {
    return "otp";
  }
  if (normalized === "email") {
    return "email";
  }
  if (normalized === "sms") {
    return "sms";
  }

  return null;
}

export interface AuthMfaPageProps {
  readonly paths: {
    readonly login: string;
    readonly account: string;
  };
  readonly returnTo?: string;
}

export function AuthMfaPage(props: AuthMfaPageProps) {
  const router = useRouter();
  const auth = useAuth();
  const methodsLoadedForSessionRef = useRef<string | null>(null);
  const ready = auth.ready;
  const session = auth.session;
  const mfaMethods = auth.mfaMethods;
  const listMfaMethods = auth.listMfaMethods;
  const sendMfaCode = auth.sendMfaCode;
  const validateMfaCode = auth.validateMfaCode;
  const validateRecoveryCode = auth.validateRecoveryCode;

  const [selectedMode, setSelectedMode] = useState<MfaViewMode>("otp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready || !session) {
      methodsLoadedForSessionRef.current = null;
      return;
    }

    const sessionKey = typeof session.userId === "number"
      ? `id:${session.userId}`
      : typeof session.email === "string"
        ? `email:${session.email.toLowerCase()}`
        : "session";

    if (methodsLoadedForSessionRef.current === sessionKey) {
      return;
    }
    methodsLoadedForSessionRef.current = sessionKey;

    let cancelled = false;

    const run = async () => {
      try {
        const methods = await listMfaMethods();
        if (cancelled) {
          return;
        }

        const firstSupported = methods
          .map((entry) => normalizeMethodName(entry.method))
          .find((entry): entry is MfaViewMode => entry !== null);
        if (firstSupported) {
          setSelectedMode(firstSupported);
        }
      } catch {}
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    session,
    session?.userId,
    session?.email,
    listMfaMethods,
  ]);

  const availableModes = useMemo(() => {
    const values = new Set<MfaViewMode>();
    for (const method of mfaMethods) {
      const normalized = normalizeMethodName(method.method);
      if (normalized) {
        values.add(normalized);
      }
    }

    values.add("recovery");
    if (values.size === 1 && values.has("recovery")) {
      values.add("otp");
      values.add("email");
      values.add("sms");
    }

    return Array.from(values.values());
  }, [mfaMethods]);

  if (!ready) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading MFA…</CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">MFA verification</CardTitle>
          <CardDescription>You must be logged in first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={props.paths.login as Route} className="text-sm font-medium text-primary hover:underline">
            Go to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  const safeReturnTo = props.returnTo && props.returnTo.startsWith("/")
    ? props.returnTo
    : props.paths.account;

  const selectedMethod = selectedMode === "otp" ? "totp" : selectedMode;

  const sendCode = async () => {
    if (selectedMode !== "email" && selectedMode !== "sms") {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const ok = await sendMfaCode(selectedMode);
      setMessage(ok ? "A verification code was sent." : "Could not send code.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send code.");
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      let ok = false;
      if (selectedMode === "recovery") {
        const normalizedRecoveryCode = normalizeRecoveryCode(recoveryCode);
        if (normalizedRecoveryCode.length !== 6) {
          setMessage("Enter a valid recovery code in XXX-XXX format.");
          return;
        }
        ok = await validateRecoveryCode(formatRecoveryCode(normalizedRecoveryCode));
      } else {
        if (code.trim().length !== 6) {
          setMessage("Enter the 6-digit code.");
          return;
        }
        ok = await validateMfaCode(selectedMethod, code.trim());
      }

      if (!ok) {
        setMessage("Code was not accepted.");
        return;
      }

      router.replace(safeReturnTo as Route);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">MFA verification</CardTitle>
        <CardDescription>
          Verify your identity to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {availableModes.map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={mode === selectedMode ? "default" : "outline"}
              onClick={() => {
                setSelectedMode(mode);
                setCode("");
                setRecoveryCode("");
                setMessage(null);
              }}
            >
              {mode === "otp" ? "OTP app" : mode === "recovery" ? "Recovery code" : mode.toUpperCase()}
            </Button>
          ))}
        </div>

        {selectedMode === "otp" && (
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        )}
        {selectedMode === "email" && (
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code received via email.
          </p>
        )}
        {selectedMode === "sms" && (
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code received via SMS.
          </p>
        )}
        {selectedMode === "recovery" && (
          <p className="text-sm text-muted-foreground">
            Use a single-use recovery code if you cannot access your primary MFA methods.
          </p>
        )}

        {selectedMode === "recovery" ? (
          <InputRecoveryCode
            value={recoveryCode}
            onChange={(next) => setRecoveryCode(normalizeRecoveryCode(next))}
            disabled={submitting}
          />
        ) : (
          <InputMfaCode value={code} onChange={setCode} disabled={submitting} />
        )}

        {(selectedMode === "email" || selectedMode === "sms") && (
          <Button type="button" variant="secondary" disabled={submitting} onClick={() => { void sendCode(); }}>
            Send code
          </Button>
        )}

        <Button disabled={submitting} onClick={() => { void submit(); }}>
          {submitting ? "Verifying…" : "Verify"}
        </Button>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}

        <Link href={props.paths.account as Route} className="text-sm font-medium text-primary hover:underline">
          Back to account
        </Link>
      </CardContent>
    </Card>
  );
}
