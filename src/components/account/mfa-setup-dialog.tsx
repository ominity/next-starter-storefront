"use client";

import type { UserMfaMethod } from "@ominity/api-typescript/models/identity/user-mfa-method";
import type { useUser } from "@ominity/next/react";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { InputMfaCode } from "@/components/auth/input-mfa-code";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Seconds before another code can be requested. The API does not limit this; it only keeps the inbox sane. */
const RESEND_SECONDS = 60;
/** E.164, as the API requires for `sms`. */
const E164 = /^\+[1-9]\d{6,14}$/;

const TITLES: Readonly<Record<string, string>> = {
  authenticator: "Set up an authenticator app",
  email: "Set up email codes",
  sms: "Set up text message codes",
};

type Step = "phone" | "scan" | "verify";
type Profile = ReturnType<typeof useUser>;

function stepsOf(method: string): ReadonlyArray<Step> {
  if (method === "authenticator") return ["scan", "verify"];
  if (method === "sms") return ["phone", "verify"];
  return ["verify"];
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Counts down from `seconds` after `restart()`; `remaining` is 0 when it may run again. */
function useCountdown(seconds: number) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [now, until]);

  return {
    remaining: Math.max(0, Math.ceil((until - now) / 1000)),
    restart: () => {
      const started = Date.now();
      setNow(started);
      setUntil(started + seconds * 1000);
    },
  };
}

export interface MfaSetupDialogProps {
  /** The method being set up, or `null` when the dialog is closed. */
  readonly method: string | null;
  readonly profile: Profile;
  readonly onClose: () => void;
}

/** Step-by-step setup of one MFA method: scan or phone number first where needed, then the code that turns it on. */
export function MfaSetupDialog({ method, profile, onClose }: MfaSetupDialogProps) {
  const progress = useRef({ started: false, completed: false });

  // Closing before the code is confirmed removes the half-enabled method, so no unverified secret is left behind.
  const close = () => {
    if (method && progress.current.started && !progress.current.completed) {
      void profile.disableMfa(method).catch(() => undefined);
    }
    progress.current = { started: false, completed: false };
    onClose();
  };

  return (
    <Dialog open={method !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="sm:max-w-md">
        {method && (
          <MfaSetup
            key={method}
            method={method}
            profile={profile}
            onStarted={() => { progress.current.started = true; }}
            onCompleted={() => { progress.current.completed = true; close(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function MfaSetup({ method, profile, onStarted, onCompleted }: {
  readonly method: string;
  readonly profile: Profile;
  /** The method was enabled and is waiting for its code; closing now removes it again. */
  readonly onStarted: () => void;
  readonly onCompleted: () => void;
}) {
  const steps = stepsOf(method);
  const [step, setStep] = useState<Step>(steps[0] ?? "verify");
  const [setup, setSetup] = useState<UserMfaMethod | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The authenticator and email start right away, so they open busy.
  const [busy, setBusy] = useState(method !== "sms");
  const resend = useCountdown(RESEND_SECONDS);
  const started = useRef(false);
  const sendsCodes = method === "email" || method === "sms";

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(message(caught, fallback));
    } finally {
      setBusy(false);
    }
  };

  // The authenticator and email start right away; SMS starts once the phone number is known. A ref, not state, so
  // StrictMode's second effect run does not enable twice (that would replace the secret behind the QR code).
  useEffect(() => {
    if (started.current || method === "sms") return;
    started.current = true;
    onStarted();
    void (async () => {
      try {
        setSetup(await profile.enableMfa(method));
        if (sendsCodes) {
          await profile.sendMfaCode(method);
          resend.restart();
        }
      } catch (caught) {
        setError(message(caught, "This method could not be set up."));
      } finally {
        setBusy(false);
      }
    })();
    // Runs once per dialog; `method` cannot change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedPhone = phone.replace(/[\s().-]/g, "");

  const submitPhone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!E164.test(normalizedPhone)) {
      setError("Enter the number in international format, starting with + and the country code.");
      return;
    }
    void run(async () => {
      onStarted();
      setSetup(await profile.enableMfa(method, { phone: normalizedPhone }));
      await profile.sendMfaCode(method);
      resend.restart();
      setCode("");
      setStep("verify");
    }, "This phone number could not be used.");
  };

  const confirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    void run(async () => {
      if (!(await profile.confirmMfa(method, code))) throw new Error("That code was not accepted.");
      onCompleted();
    }, "That code was not accepted.");
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const position = steps.indexOf(step) + 1;
  const footer = (primary: ReactNode) => (
    <DialogFooter className="gap-2">
      {step === "verify" && method === "authenticator" && (
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setError(null); setStep("scan"); }}>Back</Button>
      )}
      {step === "verify" && method === "sms" && (
        <Button type="button" variant="ghost" disabled={busy} onClick={() => { setError(null); setStep("phone"); }}>Change number</Button>
      )}
      {primary}
    </DialogFooter>
  );

  return (
    <div className="space-y-5">
      <DialogHeader>
        {steps.length > 1 && <p className="text-xs font-medium text-muted-foreground">Step {position} of {steps.length}</p>}
        <DialogTitle>{TITLES[method] ?? `Set up ${method}`}</DialogTitle>
        <DialogDescription>
          {step === "phone" && "We'll text a code to this number whenever you sign in."}
          {step === "scan" && "Scan this QR code with an authenticator app such as Google Authenticator, 1Password or Authy."}
          {step === "verify" && method === "authenticator" && "Enter the 6-digit code your authenticator app shows."}
          {step === "verify" && method === "email" && `Enter the 6-digit code we sent to ${profile.user?.email ?? "your email address"}.`}
          {step === "verify" && method === "sms" && `Enter the 6-digit code we sent to ${normalizedPhone}.`}
        </DialogDescription>
      </DialogHeader>

      {step === "phone" && (
        <form className="space-y-5" onSubmit={submitPhone}>
          <div className="space-y-1">
            <Label htmlFor="mfa-phone">Phone number</Label>
            <Input
              id="mfa-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+32 470 12 34 56"
              value={phone}
              onChange={(event) => { setPhone(event.target.value); setError(null); }}
              disabled={busy}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Include the country code. Standard text message rates may apply.</p>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {footer(<Button type="submit" disabled={busy || !phone.trim()}>{busy ? "Sending code…" : "Send code"}</Button>)}
        </form>
      )}

      {step === "scan" && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            {setup?.details?.qrCode ? (
              <Image src={setup.details.qrCode} alt="QR code for your authenticator app" width={200} height={200} unoptimized className="rounded-md border bg-white p-2" />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-md bg-muted" />
            )}
            {setup?.details?.uri && (
              <a href={setup.details.uri} className="text-sm font-medium text-primary hover:underline sm:hidden">Open in authenticator app</a>
            )}
            {setup?.details?.secret && (showSecret ? (
              <div className="flex w-full flex-col gap-1">
                <p className="text-xs text-muted-foreground">Enter this key in your app instead:</p>
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <code className="flex-1 break-all text-xs">{setup.details.secret}</code>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { void copySecret(setup.details?.secret ?? ""); }}>
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => setShowSecret(true)}>
                Can&apos;t scan it? Show the setup key
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {footer(<Button type="button" disabled={busy || !setup} onClick={() => { setError(null); setStep("verify"); }}>Next</Button>)}
        </div>
      )}

      {step === "verify" && (
        <form className="space-y-5" onSubmit={confirm}>
          <div className="flex flex-col items-center gap-3">
            <InputMfaCode value={code} onChange={(next) => { setCode(next); setError(null); }} disabled={busy || (sendsCodes && !setup)} autoFocus />
            {sendsCodes && (
              resend.remaining > 0 ? (
                <p className="text-xs text-muted-foreground" aria-live="polite">You can request a new code in {resend.remaining}s</p>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                  disabled={busy || !setup}
                  onClick={() => { void run(async () => { await profile.sendMfaCode(method); resend.restart(); }, "The code could not be sent."); }}
                >
                  Send a new code
                </button>
              )
            )}
          </div>
          {error && <p className="text-center text-sm text-destructive" role="alert">{error}</p>}
          {footer(<Button type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Turn on"}</Button>)}
        </form>
      )}
    </div>
  );
}
