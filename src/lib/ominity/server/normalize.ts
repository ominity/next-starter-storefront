import { asString, isRecord } from "./http";

export interface StarterApiUser {
  readonly id?: number;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
}

export function normalizeUser(input: unknown): StarterApiUser | null {
  if (!isRecord(input)) {
    return null;
  }

  if (input.resource !== "user") {
    return null;
  }

  const email = asString(input.email);
  const firstName = asString(input.firstName);
  const lastName = asString(input.lastName);

  return {
    ...(typeof input.id === "number" ? { id: input.id } : {}),
    ...(typeof email === "string" ? { email } : {}),
    ...(typeof firstName === "string" ? { firstName } : {}),
    ...(typeof lastName === "string" ? { lastName } : {}),
    ...(typeof input.isMfaEnabled === "boolean" ? { isMfaEnabled: input.isMfaEnabled } : {}),
  };
}
