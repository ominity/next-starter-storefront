"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useAuth } from "@ominity/next/react";
import { authErrorMessage, isEmail, normalizeEmail, rememberPendingEmailCode } from "./email-code";
import { resolvePasswordStrength } from "./password-strength";
import { InputPassword } from "./input-password";
import { PasswordStrengthBar } from "./password-strength-bar";

export interface AuthRegisterPageProps {
  readonly paths: {
    readonly login: string;
    readonly account: string;
    readonly verify: string;
  };
}

export function AuthRegisterPage(props: AuthRegisterPageProps) {
  const router = useRouter();
  const auth = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const passwordStrength = useMemo(() => resolvePasswordStrength(password), [password]);

  const submit = async () => {
    if (firstName.trim().length < 2) {
      setMessage("Enter a valid first name.");
      return;
    }

    if (!isEmail(email)) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 8 || passwordStrength.score < 2) {
      setMessage("Use a stronger password (minimum 8 chars).");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await auth.register({
        firstName: firstName.trim(),
        ...(lastName.trim().length > 0 ? { lastName: lastName.trim() } : {}),
        email: normalizeEmail(email),
        password,
      });

      if (result.status === "verification_required") {
        // Ominity emailed a code; the account can sign in once the email is confirmed.
        rememberPendingEmailCode({ email: result.email, resendAvailableAt: result.resendAvailableAt, returnTo: props.paths.account });
        router.push(props.paths.verify as Route);
        return;
      }
      router.replace((result.status === "authenticated" ? props.paths.account : props.paths.login) as Route);
    } catch (error) {
      setMessage(authErrorMessage(error, "Could not register."));
    } finally {
      setSubmitting(false);
    }
  };

  /** A signup without a password: Ominity emails a code, and entering it creates the account. */
  const signUpWithCode = async () => {
    if (!isEmail(email)) {
      setMessage("Enter your email address first.");
      return;
    }

    setSendingCode(true);
    setMessage(null);
    try {
      const normalized = normalizeEmail(email);
      const sent = await auth.sendEmailCode(normalized);
      rememberPendingEmailCode({ email: normalized, resendAvailableAt: sent.resendAvailableAt, returnTo: props.paths.account });
      router.push(props.paths.verify as Route);
    } catch (error) {
      setMessage(authErrorMessage(error, "We couldn't send a code."));
      setSendingCode(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>Create an account for faster checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            disabled={submitting || sendingCode}
          />
          <Input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Last name (optional)"
            autoComplete="family-name"
            disabled={submitting || sendingCode}
          />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            disabled={submitting || sendingCode}
          />
          <div className="space-y-2">
            <InputPassword
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoComplete="new-password"
              disabled={submitting || sendingCode}
            />
            <PasswordStrengthBar password={password} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting || sendingCode}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
            <Button type="button" variant="outline" disabled={submitting || sendingCode} onClick={() => { void signUpWithCode(); }}>
              {sendingCode ? "Sending code…" : "No password: email me a code"}
            </Button>
          </div>
        </form>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={props.paths.login as Route} className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
