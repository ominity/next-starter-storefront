export interface AuthSession {
  readonly userId?: number;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
  readonly expiresAt?: string;
}

export interface AuthMfaMethod {
  readonly method: string;
  readonly isEnabled: boolean;
  readonly verifiedAt?: string | null;
  readonly lastUsedAt?: string | null;
  readonly lastSentAt?: string | null;
}

export interface AuthAddress {
  readonly id: string;
  readonly label: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly street: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone?: string;
}

export interface AuthSignInInput {
  readonly email: string;
  readonly password: string;
}

export interface AuthRegisterInput {
  readonly firstName: string;
  readonly lastName?: string;
  readonly email: string;
  readonly password: string;
}

export interface AuthSignInResult {
  readonly session: AuthSession | null;
  readonly requiresMfa: boolean;
  readonly methods: ReadonlyArray<AuthMfaMethod>;
}
