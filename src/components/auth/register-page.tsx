"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useAuth } from "./auth-provider";
import { resolvePasswordStrength } from "./password-strength";
import { InputPassword } from "./input-password";
import { PasswordStrengthBar } from "./password-strength-bar";

export interface AuthRegisterPageProps {
  readonly paths: {
    readonly login: string;
    readonly account: string;
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

  const passwordStrength = useMemo(() => resolvePasswordStrength(password), [password]);

  const submit = async () => {
    if (firstName.trim().length < 2) {
      setMessage("Enter a valid first name.");
      return;
    }

    if (email.trim().length < 3 || !email.includes("@")) {
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
      await auth.register({
        firstName: firstName.trim(),
        ...(lastName.trim().length > 0 ? { lastName: lastName.trim() } : {}),
        email: email.trim().toLowerCase(),
        password,
      });

      router.replace(props.paths.account as Route);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not register.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>Create an account for faster checkout.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="First name"
          autoComplete="given-name"
          disabled={submitting}
        />
        <Input
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Last name (optional)"
          autoComplete="family-name"
          disabled={submitting}
        />
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          disabled={submitting}
        />
        <div className="space-y-2">
          <InputPassword
            value={password}
            onChange={setPassword}
            placeholder="Password"
            autoComplete="new-password"
            disabled={submitting}
          />
          <PasswordStrengthBar password={password} />
        </div>
        <Button disabled={submitting} onClick={() => { void submit(); }}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
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
