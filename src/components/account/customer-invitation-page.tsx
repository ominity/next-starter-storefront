"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOminityCustomerAccounts } from "@ominity/next/customer-accounts/react";

import { useAuth } from "@ominity/next/react";
import { rememberPendingEmailCode } from "@/components/auth/email-code";
import { InputPassword } from "@/components/auth/input-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CustomerInvitationPageProps {
  readonly token: string;
  readonly paths: {
    readonly account: string;
    readonly login: string;
    readonly register: string;
    readonly mfa: string;
    readonly verify: string;
  };
}

type InvitationAuthMode = "login" | "register";

export function CustomerInvitationPage({ token, paths }: CustomerInvitationPageProps) {
  const router = useRouter();
  const pathname = usePathname() ?? paths.account;
  const auth = useAuth();
  const accounts = useOminityCustomerAccounts();
  const inspectInvitation = accounts.inspectInvitation;
  const invitation = accounts.inspectedInvitation;
  const [mode, setMode] = useState<InvitationAuthMode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void inspectInvitation(token)
      .then((next) => setMode(next.requiresAccountCreation ? "register" : "login"))
      .catch(() => undefined);
  }, [inspectInvitation, token]);

  const finish = () => {
    router.replace(paths.account as Route);
    router.refresh();
  };

  const accept = async () => {
    setMessage(null);
    try {
      await accounts.acceptInvitation(token);
      finish();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept the invitation.");
    }
  };

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;
    if (password.length < 4) {
      setMessage("Enter your password.");
      return;
    }

    setMessage(null);
    try {
      const result = mode === "register"
        ? await accounts.registerAndAcceptInvitation(token, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: invitation.email,
          password,
        })
        : await accounts.signInAndAcceptInvitation(token, {
          email: invitation.email,
          password,
        });

      if (result.status === "requires-mfa") {
        router.replace(`${paths.mfa}?returnTo=${encodeURIComponent(pathname)}` as Route);
        return;
      }
      if (result.status === "requires-sign-in" && mode === "register") {
        // The new account confirms its email first: Ominity emailed a code. After it, the user comes back here.
        rememberPendingEmailCode({ email: invitation.email, resendAvailableAt: null, returnTo: pathname });
        router.push(paths.verify as Route);
        return;
      }
      if (result.status === "accepted") finish();
      else setMessage("Sign in, then return here to accept the invitation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete authentication.");
    }
  };

  if (!invitation && !accounts.error) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading invitation…</CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>{accounts.error?.message ?? "This invitation could not be loaded."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={paths.account as Route} className="text-sm font-medium text-primary hover:underline">Go to account</Link>
        </CardContent>
      </Card>
    );
  }

  const sessionEmail = auth.user?.email?.trim().toLowerCase();
  const invitationEmail = invitation.email.trim().toLowerCase();
  const emailMatches = sessionEmail === invitationEmail;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Join {invitation.customer?.name ?? "customer account"}</CardTitle>
        <CardDescription>
          You were invited as {invitation.role?.name ?? `role ${invitation.roleId}`} using {invitation.email}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p><span className="text-muted-foreground">Status:</span> {invitation.status}</p>
          <p><span className="text-muted-foreground">Expires:</span> {new Date(invitation.expiresAt).toLocaleString()}</p>
          {invitation.role?.description && <p className="mt-2 text-muted-foreground">{invitation.role.description}</p>}
        </div>

        {auth.user ? (
          emailMatches ? (
            <Button type="button" disabled={accounts.isMutationPending("accept-invitation")} onClick={() => { void accept(); }}>
              {accounts.isMutationPending("accept-invitation") ? "Accepting…" : "Accept invitation"}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-destructive">
                You are signed in as {auth.user.email}. Sign in as {invitation.email} to accept this invitation.
              </p>
              <Button type="button" variant="outline" onClick={() => { void auth.signOut(); }}>Sign out</Button>
            </div>
          )
        ) : (
          <form className="space-y-4" onSubmit={(event) => { void authenticate(event); }}>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={mode === "login" ? "default" : "outline"} onClick={() => setMode("login")}>Sign in</Button>
              <Button type="button" size="sm" variant={mode === "register" ? "default" : "outline"} onClick={() => setMode("register")}>Create account</Button>
            </div>
            {mode === "register" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invitation-first-name">First name</Label>
                  <Input id="invitation-first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invitation-last-name">Last name</Label>
                  <Input id="invitation-last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invitation-email">Email</Label>
              <Input id="invitation-email" value={invitation.email} readOnly aria-readonly="true" />
            </div>
            <InputPassword value={password} onChange={setPassword} autoComplete={mode === "register" ? "new-password" : "current-password"} />
            <Button type="submit" disabled={accounts.isMutationPending("accept-invitation")}>
              {mode === "register" ? "Create account and accept" : "Sign in and accept"}
            </Button>
            <p className="text-xs text-muted-foreground">
              This uses the normal registration or sign-in endpoint. The invitation is accepted only after authentication succeeds and the emails match.
            </p>
          </form>
        )}

        {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
      </CardContent>
    </Card>
  );
}
