"use client";

import { useId } from "react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export interface InputRecoveryCodeProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly disabled?: boolean;
  readonly id?: string;
}

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function InputRecoveryCode(props: InputRecoveryCodeProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const normalizedValue = normalizeRecoveryCode(props.value);

  return (
    <InputOTP
      id={inputId}
      value={normalizedValue}
      onChange={(next) => props.onChange(normalizeRecoveryCode(next))}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      disabled={props.disabled}
    >
      <InputOTPGroup className="gap-2 [&>[data-slot=input-otp-slot]]:rounded-md [&>[data-slot=input-otp-slot]]:border">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup className="gap-2 [&>[data-slot=input-otp-slot]]:rounded-md [&>[data-slot=input-otp-slot]]:border">
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}
