"use client";

import type { UserPasskey } from "@ominity/api-typescript/models/identity/user-passkey";
import { isPasskeySupported, passkeyErrorCode, pathWithReturnTo, useAuth, usePasskeys } from "@ominity/next/react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADD_ERRORS: Readonly<Record<string, string>> = {
  PASSKEY_ALREADY_ADDED: "This device already has a passkey for your account.",
  PASSKEY_NOT_AVAILABLE: "Passkeys aren't available on this site. Add its domain to the channel in Ominity.",
  PASSKEY_RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
};

const subscribe = () => () => {};

function date(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export interface AccountPasskeysProps {
  readonly paths: { readonly login: string; readonly account: string };
}

/**
 * The user's passkeys: add one on this device (or a phone, through the browser's prompt), rename or remove them.
 * Removing one here doesn't delete it from the user's password manager; they can still sign in another way.
 */
export function AccountPasskeys({ paths }: AccountPasskeysProps) {
  const router = useRouter();
  const auth = useAuth();
  const { passkeys, loading, pending, addPasskey, renamePasskey, removePasskey } = usePasskeys();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [message, setMessage] = useState<string | null>(null);
  const [reauthenticate, setReauthenticate] = useState(false);
  const [renaming, setRenaming] = useState<UserPasskey | null>(null);
  const [removing, setRemoving] = useState<UserPasskey | null>(null);
  const unsupported = hydrated && !isPasskeySupported();

  /** Opens the browser's prompt straight from the click. The name defaults to the provider (iCloud Keychain, …). */
  const add = async () => {
    setMessage(null);
    try {
      const added = await addPasskey();
      setMessage(`Passkey "${added.name}" added.`);
    } catch (error) {
      const code = passkeyErrorCode(error);
      if (code === "PASSKEY_CANCELLED") return;
      if (code === "PASSKEY_REAUTHENTICATION_REQUIRED") setReauthenticate(true);
      else setMessage(ADD_ERRORS[code] ?? "We couldn't add the passkey.");
    }
  };

  /** Adding needs a sign-in from the last ten minutes: sign out and come back here after signing in. */
  const signInAgain = async () => {
    await auth.signOut().catch(() => undefined);
    router.push(pathWithReturnTo(paths.login, paths.account) as Route);
  };

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>Sign in with your fingerprint, face or device PIN. Your browser, phone or password manager keeps the passkey.</CardDescription>
        </div>
        <Button size="sm" disabled={unsupported || pending} onClick={() => { void add(); }}>Add a passkey</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {unsupported && <p className="text-sm text-muted-foreground">This browser can&apos;t create passkeys.</p>}
        {loading && passkeys.length === 0 && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && passkeys.length === 0 && <p className="text-sm text-muted-foreground">No passkeys yet.</p>}
        {passkeys.map((passkey) => (
          <div key={passkey.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{passkey.name}</span>
              <span className="block text-xs text-muted-foreground">
                {[passkey.authenticator, passkey.isSynced ? "Synced" : null, `Added ${date(passkey.createdAt)}`].filter(Boolean).join(" · ")}
                {" · "}
                {passkey.lastUsedAt ? `Last used ${date(passkey.lastUsedAt)}` : "Not used yet"}
              </span>
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setRenaming(passkey)}>Rename</Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setRemoving(passkey)}>Remove</Button>
            </span>
          </div>
        ))}
        {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        {reauthenticate && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
            <span>For your security, adding a passkey needs a recent sign-in.</span>
            <Button size="sm" onClick={() => { void signInAgain(); }}>Sign in again</Button>
          </div>
        )}
      </CardContent>

      {renaming && (
        <RenameDialog
          key={renaming.id}
          passkey={renaming}
          onRename={async (name) => { await renamePasskey(renaming.id, name); }}
          onClose={() => setRenaming(null)}
        />
      )}

      <Dialog open={removing !== null} onOpenChange={(open) => { if (!open && !pending) setRemoving(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove &ldquo;{removing?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              You won&apos;t be able to sign in with this passkey anymore. It stays in your password manager until you
              delete it there.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              disabled={pending}
              onClick={() => {
                if (!removing) return;
                void removePasskey(removing.id).then(
                  () => { setMessage(`Passkey "${removing.name}" removed.`); setRemoving(null); },
                  () => setMessage("We couldn't remove the passkey."),
                );
              }}
            >
              {pending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RenameDialog({ passkey, onRename, onClose }: {
  readonly passkey: UserPasskey;
  onRename(name: string): Promise<void>;
  onClose(): void;
}) {
  const [name, setName] = useState(passkey.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name.");
    if (trimmed === passkey.name) return onClose();

    setSaving(true);
    try {
      await onRename(trimmed);
      onClose();
    } catch {
      setError("We couldn't rename the passkey.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form className="space-y-4" onSubmit={(event) => { void save(event); }}>
          <DialogHeader>
            <DialogTitle>Rename passkey</DialogTitle>
            <DialogDescription>Pick a name that tells you which device or password manager it&apos;s on.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="passkey-name">Name</Label>
            <Input id="passkey-name" value={name} maxLength={100} autoFocus disabled={saving} onChange={(event) => { setName(event.target.value); setError(null); }} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
