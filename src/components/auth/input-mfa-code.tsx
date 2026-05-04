"use client";

import { useId } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export interface InputMfaCodeProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly disabled?: boolean;
  readonly id?: string;
}

function normalizeMfaCode(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 6);
}

export function InputMfaCode(props: InputMfaCodeProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const normalizedValue = normalizeMfaCode(props.value);

  return (
    <InputOTP
      id={inputId}
      value={normalizedValue}
      onChange={(next) => props.onChange(normalizeMfaCode(next))}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      disabled={props.disabled}
    >
      <InputOTPGroup className="gap-2 [&>[data-slot=input-otp-slot]]:rounded-md [&>[data-slot=input-otp-slot]]:border">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}
