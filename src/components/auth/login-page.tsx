"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useAuth } from "@ominity/next/react";
import { InputPassword } from "./input-password";
import { SocialLoginOptions } from "./social-login-options";

export interface AuthLoginPageProps {
  readonly paths: {
    readonly register: string;
    readonly account: string;
    readonly mfa: string;
    readonly forgotPassword: string;
  };
  readonly returnTo?: string;
  readonly socialError?: string;
}

export function AuthLoginPage(props: AuthLoginPageProps) {
  const router = useRouter();
  const auth = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (email.trim().length < 3 || !email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 4) {
      setMessage("Password must contain at least 4 characters.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await auth.signIn({
        email: email.trim().toLowerCase(),
        password,
      });

      const safeReturnTo = props.returnTo && props.returnTo.startsWith("/")
        ? props.returnTo
        : props.paths.account;

      if (result.status === "mfa_required") {
        const target = `${props.paths.mfa}?returnTo=${encodeURIComponent(safeReturnTo)}`;
        router.replace(target as Route);
        return;
      }

      router.replace(safeReturnTo as Route);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Sign in with your account credentials.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            disabled={submitting}
          />
          <InputPassword
            value={password}
            onChange={setPassword}
            placeholder="Password"
            autoComplete="current-password"
            disabled={submitting}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Login"}
          </Button>
        </form>
        {props.socialError && (
          <p className="text-sm text-destructive">
            Social sign-in could not be completed ({props.socialError.replaceAll("_", " ").toLowerCase()}).
          </p>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        <Link href={props.paths.forgotPassword as Route} className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
        <SocialLoginOptions />
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
