"use client";

import type { UserMfaMethod } from "@ominity/api-typescript/models/identity/user-mfa-method";
import type { UserRecoveryCode } from "@ominity/api-typescript/models/identity/user-recovery-code";
import { useLoginActivity, useUser } from "@ominity/next/react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

import { InputMfaCode } from "@/components/auth/input-mfa-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const METHODS = ["totp", "email", "sms"] as const;

function date(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

/** The signed-in user's profile, MFA methods, recovery codes and sign-in history. */
export function AccountSecurity() {
  const profile = useUser();
  const activity = useLoginActivity({ pageSize: 10 });
  const [setup, setSetup] = useState<UserMfaMethod | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<ReadonlyArray<UserRecoveryCode> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const user = profile.user;
  if (!user) return null;

  const attempt = async (action: () => Promise<unknown>, done?: string) => {
    setMessage(null);
    try {
      await action();
      if (done) setMessage(done);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That did not work.");
    }
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void attempt(() => profile.update({
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
    }), "Profile saved.");
  };

  const enabled = new Map(profile.mfaMethods.map((method) => [method.method, method]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your personal details.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveProfile}>
            <div className="space-y-1"><Label htmlFor="profile-first">First name</Label><Input id="profile-first" name="firstName" defaultValue={user.firstName ?? ""} /></div>
            <div className="space-y-1"><Label htmlFor="profile-last">Last name</Label><Input id="profile-last" name="lastName" defaultValue={user.lastName ?? ""} /></div>
            <div className="space-y-1 sm:col-span-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" name="email" type="email" defaultValue={user.email ?? ""} /></div>
            <Button type="submit" disabled={profile.pending} className="sm:col-span-2 sm:w-fit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Two-factor authentication</CardTitle><CardDescription>{user.isMfaEnabled ? "On" : "Off"} for this account.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {METHODS.map((method) => {
            const current = enabled.get(method);
            return (
              <div key={method} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>
                  <span className="font-medium uppercase">{method}</span>
                  {current?.isEnabled && current.lastUsedAt && <span className="block text-xs text-muted-foreground">Last used {date(current.lastUsedAt)}</span>}
                </span>
                {current?.isEnabled
                  ? <Button size="sm" variant="outline" disabled={profile.pending} onClick={() => { void attempt(() => profile.disableMfa(method), `${method} turned off.`); }}>Turn off</Button>
                  : <Button size="sm" disabled={profile.pending} onClick={() => { void attempt(async () => setSetup(await profile.enableMfa(method))); }}>Set up</Button>}
              </div>
            );
          })}

          {setup && (
            <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
              {setup.details?.qrCode && <Image src={setup.details.qrCode} alt="Scan with your authenticator app" width={160} height={160} unoptimized />}
              {setup.details?.secret && <p className="font-mono text-xs">{setup.details.secret}</p>}
              <p>Enter the code from {setup.method === "totp" ? "your authenticator app" : `the ${setup.method} we sent`} to finish.</p>
              <InputMfaCode value={code} onChange={setCode} disabled={profile.pending} />
              <Button size="sm" disabled={profile.pending} onClick={() => {
                void attempt(async () => {
                  if (!(await profile.confirmMfa(setup.method, code))) throw new Error("The code is not valid.");
                  setSetup(null);
                  setCode("");
                }, "Two-factor authentication is on.");
              }}>Confirm</Button>
            </div>
          )}

          <Button size="sm" variant="secondary" disabled={profile.pending} onClick={() => { void attempt(async () => setRecoveryCodes(await profile.regenerateRecoveryCodes())); }}>
            New recovery codes
          </Button>
          {recoveryCodes && (
            <p className="font-mono text-xs">{recoveryCodes.map((entry) => entry.code).join("  ")}</p>
          )}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Recent sign-ins</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activity.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {activity.items.map((login) => (
            <div key={login.id} className="flex flex-wrap justify-between gap-2 rounded-md border p-3 text-sm">
              <span>{[login.browser, login.device].filter(Boolean).join(" on ") || "Unknown device"}</span>
              <span className="text-muted-foreground">{login.location ?? login.ipAddress} · {date(login.createdAt)}</span>
            </div>
          ))}
          {activity.hasNext && <Button size="sm" variant="outline" onClick={activity.next}>Older</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
