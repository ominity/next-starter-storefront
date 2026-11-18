"use client";

import {
  isPasskeyAutofillSupported,
  isPasskeySupported,
  passkeyErrorCode,
  safeReturnTo,
  useAuth,
  type OminityAuthState,
  type OminitySocialProvider,
} from "@ominity/next/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { authErrorMessage, isEmail, normalizeEmail, rememberPendingEmailCode } from "./email-code";
import { InputPassword } from "./input-password";
import { SocialLoginOptions } from "./social-login-options";

export interface AuthLoginPageProps {
  readonly paths: {
    readonly register: string;
    readonly account: string;
    readonly mfa: string;
    readonly verify: string;
    readonly forgotPassword: string;
  };
  readonly returnTo?: string;
  readonly socialError?: string;
  /** Loaded on the server (`getSocialProviders`) so they render with the page. */
  readonly socialProviders: ReadonlyArray<OminitySocialProvider>;
}

const PASSKEY_MESSAGES: Readonly<Record<string, string>> = {
  INVALID_PASSKEY: "That passkey wasn't accepted. Try again, or sign in another way.",
  PASSKEY_NOT_AVAILABLE: "Passkeys aren't available on this site. Add its domain to the channel in Ominity.",
  PASSKEY_RATE_LIMITED: "Too many passkey attempts. Wait a few minutes and try again.",
};

const subscribe = () => () => {};

/**
 * Sign-in with a password, a code by email, a passkey or a social provider. The email field also offers the browser's
 * saved passkeys in its autofill.
 */
export function AuthLoginPage(props: AuthLoginPageProps) {
  const router = useRouter();
  const auth = useAuth();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "code" | "passkey" | null>(null);
  const autofill = useRef<AbortController | null>(null);
  const target = safeReturnTo(props.returnTo, props.paths.account);
  // Same markup on the server; browsers without passkeys drop the button after hydration.
  const showPasskeyButton = !hydrated || isPasskeySupported();

  const continueWith = (state: OminityAuthState) => {
    if (state.status === "mfa_required") {
      router.replace(`${props.paths.mfa}?returnTo=${encodeURIComponent(target)}` as Route);
    } else if (state.status === "verification_required") {
      // The account hasn't confirmed its email yet; Ominity emailed it a code.
      rememberPendingEmailCode({ email: state.email, resendAvailableAt: state.resendAvailableAt, returnTo: target });
      router.push(props.paths.verify as Route);
    } else {
      router.replace(target as Route);
    }
  };

  const stopAutofill = () => {
    autofill.current?.abort();
    autofill.current = null;
  };

  /** Saved passkeys in the email field's autofill; aborted before any other way of signing in starts. */
  const startAutofill = () => {
    stopAutofill();
    const controller = new AbortController();
    autofill.current = controller;
    void isPasskeyAutofillSupported().then(async (supported) => {
      if (!supported || controller.signal.aborted) return;
      try {
        continueWith(await auth.signInWithPasskey({ conditional: true, signal: controller.signal }));
      } catch (error) {
        // Starting it can fail before the user picks anything (domain not set up): only report a rejected passkey.
        if (!controller.signal.aborted && passkeyErrorCode(error) === "INVALID_PASSKEY") {
          setMessage(PASSKEY_MESSAGES.INVALID_PASSKEY ?? null);
        }
      }
    });
  };

  const startAutofillOnMount = useEffectEvent(startAutofill);
  useEffect(() => {
    startAutofillOnMount();
    return () => autofill.current?.abort();
  }, []);

  const run = async (kind: "password" | "code" | "passkey", action: () => Promise<void>, fallback: string) => {
    stopAutofill();
    setBusy(kind);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setBusy(null);
      if (kind === "passkey") {
        const code = passkeyErrorCode(error);
        if (code !== "PASSKEY_CANCELLED") setMessage(PASSKEY_MESSAGES[code] ?? fallback);
      } else {
        setMessage(authErrorMessage(error, fallback));
      }
      startAutofill();
    }
  };

  const signInWithPassword = () => {
    if (!isEmail(email)) return setMessage("Enter a valid email address.");
    if (password.length === 0) return setMessage("Enter your password, or get a code by email.");
    void run("password", async () => continueWith(await auth.signIn({ email: normalizeEmail(email), password })), "Could not sign in.");
  };

  const sendCode = () => {
    if (!isEmail(email)) return setMessage("Enter your email address first.");
    void run("code", async () => {
      const normalized = normalizeEmail(email);
      const sent = await auth.sendEmailCode(normalized);
      rememberPendingEmailCode({ email: normalized, resendAvailableAt: sent.resendAvailableAt, returnTo: target });
      router.push(props.paths.verify as Route);
    }, "We couldn't send a code.");
  };

  const signInWithPasskey = () => {
    void run("passkey", async () => continueWith(await auth.signInWithPasskey()), "Signing in with your passkey didn't work.");
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Sign in with your password, a code by email or a passkey.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); signInWithPassword(); }}>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            // `webauthn` lets the browser offer saved passkeys in the field's autofill.
            autoComplete="username webauthn"
            disabled={busy !== null}
          />
          <InputPassword
            value={password}
            onChange={setPassword}
            placeholder="Password"
            autoComplete="current-password"
            disabled={busy !== null}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy !== null}>{busy === "password" ? "Signing in…" : "Login"}</Button>
            <Button type="button" variant="outline" disabled={busy !== null} onClick={sendCode}>
              {busy === "code" ? "Sending code…" : "Email me a code"}
            </Button>
          </div>
        </form>
        {props.socialError && (
          <p className="text-sm text-destructive">
            Social sign-in could not be completed ({props.socialError.replaceAll("_", " ").toLowerCase()}).
          </p>
        )}
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <Link href={props.paths.forgotPassword as Route} className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
        <SocialLoginOptions
          providers={props.socialProviders}
          leading={showPasskeyButton && (
            <Button type="button" variant="outline" disabled={busy !== null} onClick={signInWithPasskey}>
              {busy === "passkey" ? "Waiting for your passkey…" : "Sign in with a passkey"}
            </Button>
          )}
        />
        <p className="text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href={props.paths.register as Route} className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
