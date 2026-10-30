"use client";

import { useAuth } from "@ominity/next/react";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForgotPasswordPage({ paths }: {
  readonly paths: { readonly login: string; readonly resetPassword: string };
}) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await auth.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectUrl: new URL(paths.resetPassword, window.location.origin).toString(),
      });
      setMessage("If the account exists, a reset link has been sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request a password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>Request a secure password reset link.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={(event) => { void submit(event); }}>
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input id="forgot-password-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
          </div>
          <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</Button>
        </form>
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        <Link href={paths.login as Route} className="text-sm font-medium text-primary hover:underline">Back to login</Link>
      </CardContent>
    </Card>
  );
}
