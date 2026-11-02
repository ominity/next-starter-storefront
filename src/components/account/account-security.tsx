"use client";

import type { UserRecoveryCode } from "@ominity/api-typescript/models/identity/user-recovery-code";
import { useLoginActivity, useUser } from "@ominity/next/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MfaSetupDialog } from "./mfa-setup-dialog";

const LABELS: Readonly<Record<string, string>> = { authenticator: "Authenticator app", email: "Email", sms: "SMS" };
const label = (method: string) => LABELS[method] ?? method;

function date(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : "—";
}

/** The signed-in user's profile, MFA methods, recovery codes and sign-in history. */
export function AccountSecurity() {
  const profile = useUser();
  const activity = useLoginActivity({ pageSize: 10 });
  const [setupMethod, setSetupMethod] = useState<string | null>(null);
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
          {/* Ominity lists the methods the channel offers, each with `isEnabled` for this user. */}
          {profile.mfaLoading && profile.mfaMethods.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!profile.mfaLoading && profile.mfaMethods.length === 0 && <p className="text-sm text-muted-foreground">No two-factor methods are available yet.</p>}
          {profile.mfaMethods.map(({ method, isEnabled, lastUsedAt }) => (
            <div key={method} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>
                <span className="font-medium">{label(method)}</span>
                {isEnabled && lastUsedAt && <span className="block text-xs text-muted-foreground">Last used {date(lastUsedAt)}</span>}
              </span>
              {isEnabled
                ? <Button size="sm" variant="outline" disabled={profile.pending} onClick={() => { void attempt(() => profile.disableMfa(method), `${label(method)} turned off.`); }}>Turn off</Button>
                : <Button size="sm" disabled={profile.pending} onClick={() => setSetupMethod(method)}>Set up</Button>}
            </div>
          ))}

          <Button size="sm" variant="secondary" disabled={profile.pending} onClick={() => { void attempt(async () => setRecoveryCodes(await profile.regenerateRecoveryCodes())); }}>
            New recovery codes
          </Button>
          {recoveryCodes && (
            <p className="font-mono text-xs">{recoveryCodes.map((entry) => entry.code).join("  ")}</p>
          )}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <MfaSetupDialog
            method={setupMethod}
            profile={profile}
            onClose={() => { setSetupMethod(null); setMessage(null); }}
          />
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
