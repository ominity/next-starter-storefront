"use client";

import { useAuth } from "@ominity/next/react";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Route } from "next";

import { InputPassword } from "./input-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AuthResetPasswordPageProps {
  readonly loginPath: string;
  readonly initialEmail?: string;
  readonly token?: string;
}

export function AuthResetPasswordPage(props: AuthResetPasswordPageProps) {
  const auth = useAuth();
  const [email, setEmail] = useState(props.initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!props.token || !email.includes("@") || password.length < 6 || password !== confirmation) {
      setMessage("Enter the reset email, a matching password of at least 6 characters, and a valid token link.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await auth.resetPassword({ email: email.trim().toLowerCase(), token: props.token, password });
      setCompleted(true);
      setMessage("Password updated. You can sign in now.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset the password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Choose a new password for your user account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!completed && (
          <form className="space-y-4" onSubmit={(event) => { void submit(event); }}>
            <div className="space-y-2">
              <Label htmlFor="reset-password-email">Email</Label>
              <Input id="reset-password-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
            </div>
            <InputPassword value={password} onChange={setPassword} label="New password" autoComplete="new-password" disabled={submitting} />
            <InputPassword value={confirmation} onChange={setConfirmation} label="Confirm password" autoComplete="new-password" disabled={submitting} />
            <Button type="submit" disabled={submitting}>{submitting ? "Updating…" : "Update password"}</Button>
          </form>
        )}
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <Link href={props.loginPath as Route} className="text-sm font-medium text-primary hover:underline">Go to login</Link>
      </CardContent>
    </Card>
  );
}
