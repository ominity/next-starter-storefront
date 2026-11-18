"use client";

import type { OminityMfaProof, useUser } from "@ominity/next/react";
import { useState } from "react";

import { authErrorMessage } from "@/components/auth/email-code";
import { InputMfaCode } from "@/components/auth/input-mfa-code";
import { InputRecoveryCode } from "@/components/auth/input-recovery-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RECOVERY = "recovery";
const LABELS: Readonly<Record<string, string>> = {
  authenticator: "Authenticator app",
  email: "Email",
  sms: "SMS",
  [RECOVERY]: "Recovery code",
};

function recoveryCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return compact.length === 6 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

export interface MfaProofDialogProps {
  readonly title: string;
  readonly description: string;
  /** The enabled methods that may prove it's the user; a recovery code is always offered too. */
  readonly methods: ReadonlyArray<string>;
  readonly confirmLabel: string;
  readonly profile: ReturnType<typeof useUser>;
  onConfirm(proof: OminityMfaProof): Promise<void>;
  onClose(): void;
}

/**
 * Asks for proof before a two-factor change Ominity protects (turning a method off, new recovery codes): a current code
 * of an enabled method, or an unused recovery code. Ominity limits wrong codes, and the message says how long to wait.
 */
export function MfaProofDialog({ title, description, methods, confirmLabel, profile, onConfirm, onClose }: MfaProofDialogProps) {
  const options = [...methods, RECOVERY];
  const [method, setMethod] = useState(options[0] ?? RECOVERY);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<"send" | "confirm" | null>(null);
  const complete = method === RECOVERY ? code.replace("-", "").length === 6 : code.length === 6;

  const send = async () => {
    setBusy("send");
    setMessage(null);
    try {
      await profile.sendMfaCode(method);
      setMessage("A code is on its way.");
    } catch (error) {
      setMessage(authErrorMessage(error, "Could not send a code."));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy("confirm");
    setMessage(null);
    try {
      await onConfirm(method === RECOVERY ? { recoveryCode: recoveryCode(code) } : { method, code });
      onClose();
    } catch (error) {
      setMessage(authErrorMessage(error, "That code didn't work."));
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && busy === null) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {options.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {options.map((entry) => (
                <Button
                  key={entry}
                  size="sm"
                  variant={entry === method ? "default" : "outline"}
                  disabled={busy !== null}
                  onClick={() => { setMethod(entry); setCode(""); setMessage(null); }}
                >
                  {LABELS[entry] ?? entry}
                </Button>
              ))}
            </div>
          )}
          {method === RECOVERY
            ? <InputRecoveryCode value={code} onChange={(next) => setCode(recoveryCode(next))} disabled={busy !== null} />
            : <InputMfaCode value={code} onChange={setCode} disabled={busy !== null} />}
          {(method === "email" || method === "sms") && (
            <Button type="button" size="sm" variant="secondary" disabled={busy !== null} onClick={() => { void send(); }}>
              {busy === "send" ? "Sending…" : "Send code"}
            </Button>
          )}
          {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={busy !== null} onClick={onClose}>Cancel</Button>
          <Button disabled={busy !== null || !complete} onClick={() => { void confirm(); }}>
            {busy === "confirm" ? "Checking…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
