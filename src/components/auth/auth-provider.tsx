"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthAddress,
  AuthMfaMethod,
  AuthRegisterInput,
  AuthSession,
  AuthSignInInput,
  AuthSignInResult,
} from "./types";

const STORAGE_PREFIX = "ominity-starter:auth:addresses";

interface ApiSession {
  readonly userId?: number;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
  readonly expiresAt?: string;
}

interface ApiUser {
  readonly id?: number;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly isMfaEnabled?: boolean;
}

interface ApiAuthResponse {
  readonly authenticated?: boolean;
  readonly session?: ApiSession;
  readonly user?: ApiUser;
}

interface ApiMfaMethodsResponse {
  readonly items?: ReadonlyArray<AuthMfaMethod>;
}

interface ApiMfaStatusResponse {
  readonly ok?: boolean;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function requestHeaders(init?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(init ?? {}),
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders(init?.headers),
    cache: "no-store",
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {}

  if (!response.ok) {
    const message = typeof payload === "object"
      && payload !== null
      && typeof (payload as { error?: unknown }).error === "string"
      ? (payload as { error: string }).error
      : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function normalizeAuthSession(response: ApiAuthResponse): AuthSession | null {
  const session = response.session;
  const user = response.user;
  const authenticated = response.authenticated === true || !!session || !!user;
  if (!authenticated) {
    return null;
  }

  return {
    ...(typeof session?.userId === "number"
      ? { userId: session.userId }
      : typeof user?.id === "number"
        ? { userId: user.id }
        : {}),
    ...(typeof session?.email === "string"
      ? { email: session.email }
      : typeof user?.email === "string"
        ? { email: user.email }
        : {}),
    ...(typeof session?.firstName === "string"
      ? { firstName: session.firstName }
      : typeof user?.firstName === "string"
        ? { firstName: user.firstName }
        : {}),
    ...(typeof session?.lastName === "string"
      ? { lastName: session.lastName }
      : typeof user?.lastName === "string"
        ? { lastName: user.lastName }
        : {}),
    ...(typeof session?.isMfaEnabled === "boolean"
      ? { isMfaEnabled: session.isMfaEnabled }
      : typeof user?.isMfaEnabled === "boolean"
        ? { isMfaEnabled: user.isMfaEnabled }
        : {}),
    ...(typeof session?.expiresAt === "string" ? { expiresAt: session.expiresAt } : {}),
  };
}

function normalizeAddressList(value: unknown): ReadonlyArray<AuthAddress> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry): AuthAddress[] => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const label = typeof record.label === "string" ? record.label : "";
    const firstName = typeof record.firstName === "string" ? record.firstName : "";
    const lastName = typeof record.lastName === "string" ? record.lastName : "";
    const street = typeof record.street === "string" ? record.street : "";
    const city = typeof record.city === "string" ? record.city : "";
    const postalCode = typeof record.postalCode === "string" ? record.postalCode : "";
    const country = typeof record.country === "string" ? record.country : "";

    if (
      id.length === 0
      || label.length === 0
      || firstName.length === 0
      || lastName.length === 0
      || street.length === 0
      || city.length === 0
      || postalCode.length === 0
      || country.length === 0
    ) {
      return [];
    }

    return [{
      id,
      label,
      firstName,
      lastName,
      street,
      city,
      postalCode,
      country,
      ...(typeof record.phone === "string" && record.phone.length > 0 ? { phone: record.phone } : {}),
    }];
  });
}

function addressesStorageKey(session: AuthSession | null): string | null {
  if (!session?.email) {
    return null;
  }

  return `${STORAGE_PREFIX}:${session.email.toLowerCase()}`;
}

function createAddressId(): string {
  return `addr_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMfaMethodName(method: string): string {
  const normalized = method.trim().toLowerCase();
  if (normalized === "totp") {
    return "otp";
  }

  return normalized;
}

function methodRequiresChallenge(method: AuthMfaMethod): boolean {
  if (!method.isEnabled) {
    return false;
  }

  const name = normalizeMfaMethodName(method.method);
  return name === "otp" || name === "email" || name === "sms";
}

function areMfaMethodsEqual(
  left: ReadonlyArray<AuthMfaMethod>,
  right: ReadonlyArray<AuthMfaMethod>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const previous = left[index];
    const next = right[index];
    if (!previous || !next) {
      return false;
    }

    if (
      previous.method !== next.method
      || previous.isEnabled !== next.isEnabled
      || (previous.verifiedAt ?? null) !== (next.verifiedAt ?? null)
      || (previous.lastUsedAt ?? null) !== (next.lastUsedAt ?? null)
      || (previous.lastSentAt ?? null) !== (next.lastSentAt ?? null)
    ) {
      return false;
    }
  }

  return true;
}

export interface AuthContextValue {
  readonly ready: boolean;
  readonly session: AuthSession | null;
  readonly mfaMethods: ReadonlyArray<AuthMfaMethod>;
  readonly mfaVerified: boolean;
  readonly savedAddresses: ReadonlyArray<AuthAddress>;
  refreshAuth(): Promise<void>;
  signIn(input: AuthSignInInput): Promise<AuthSignInResult>;
  register(input: AuthRegisterInput): Promise<AuthSession | null>;
  signOut(): Promise<void>;
  listMfaMethods(): Promise<ReadonlyArray<AuthMfaMethod>>;
  sendMfaCode(method: string): Promise<boolean>;
  validateMfaCode(method: string, code: string): Promise<boolean>;
  validateRecoveryCode(code: string): Promise<boolean>;
  saveAddress(address: Omit<AuthAddress, "id"> & { id?: string }): AuthAddress;
  deleteSavedAddress(addressId: string): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider(props: AuthProviderProps) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mfaMethods, setMfaMethods] = useState<ReadonlyArray<AuthMfaMethod>>([]);
  const [mfaVerified, setMfaVerified] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState<ReadonlyArray<AuthAddress>>([]);

  const loadSavedAddresses = useCallback((nextSession: AuthSession | null) => {
    const key = addressesStorageKey(nextSession);
    if (!key) {
      setSavedAddresses([]);
      return;
    }

    const list = normalizeAddressList(readStorage<unknown>(key, []));
    setSavedAddresses(list);
  }, []);

  const refreshAuth = useCallback(async () => {
    const response = await requestJson<ApiAuthResponse>("/api/auth/me");
    const nextSession = normalizeAuthSession(response);
    setSession(nextSession);
    loadSavedAddresses(nextSession);
  }, [loadSavedAddresses]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshAuth();
      } catch {
        setSession(null);
        setSavedAddresses([]);
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, [refreshAuth]);

  useEffect(() => {
    const key = addressesStorageKey(session);
    if (!ready || !key) {
      return;
    }

    writeStorage(key, savedAddresses);
  }, [ready, savedAddresses, session]);

  const listMfaMethods = useCallback(async (): Promise<ReadonlyArray<AuthMfaMethod>> => {
    const response = await requestJson<ApiMfaMethodsResponse>("/api/auth/mfa/methods");
    const list = Array.isArray(response.items) ? response.items : [];
    setMfaMethods((previous) => (areMfaMethodsEqual(previous, list) ? previous : list));
    return list;
  }, []);

  const signIn = useCallback(async (input: AuthSignInInput): Promise<AuthSignInResult> => {
    const response = await requestJson<ApiAuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const nextSession = normalizeAuthSession(response);
    setSession(nextSession);
    loadSavedAddresses(nextSession);

    let methods: ReadonlyArray<AuthMfaMethod> = [];
    try {
      methods = await listMfaMethods();
    } catch {
      methods = [];
      setMfaMethods([]);
    }

    const requiresMfa = methods.some((entry) => methodRequiresChallenge(entry));
    setMfaVerified(!requiresMfa);

    return {
      session: nextSession,
      requiresMfa,
      methods,
    };
  }, [listMfaMethods, loadSavedAddresses]);

  const register = useCallback(async (input: AuthRegisterInput): Promise<AuthSession | null> => {
    const response = await requestJson<ApiAuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const nextSession = normalizeAuthSession(response);
    setSession(nextSession);
    loadSavedAddresses(nextSession);
    setMfaMethods([]);
    setMfaVerified(true);
    return nextSession;
  }, [loadSavedAddresses]);

  const signOut = useCallback(async () => {
    await requestJson<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    });
    setSession(null);
    setMfaMethods([]);
    setMfaVerified(true);
    setSavedAddresses([]);
  }, []);

  const sendMfaCode = useCallback(async (method: string): Promise<boolean> => {
    const response = await requestJson<ApiMfaStatusResponse>("/api/auth/mfa/send", {
      method: "POST",
      body: JSON.stringify({
        method,
      }),
    });

    return response.ok === true;
  }, []);

  const validateMfaCode = useCallback(async (method: string, code: string): Promise<boolean> => {
    const response = await requestJson<ApiMfaStatusResponse>("/api/auth/mfa/validate", {
      method: "POST",
      body: JSON.stringify({
        method,
        code,
      }),
    });

    const ok = response.ok === true;
    if (ok) {
      setMfaVerified(true);
    }

    return ok;
  }, []);

  const validateRecoveryCode = useCallback(async (code: string): Promise<boolean> => {
    const response = await requestJson<ApiMfaStatusResponse>("/api/auth/mfa/recovery/validate", {
      method: "POST",
      body: JSON.stringify({
        code,
      }),
    });

    const ok = response.ok === true;
    if (ok) {
      setMfaVerified(true);
    }

    return ok;
  }, []);

  const saveAddress = useCallback((address: Omit<AuthAddress, "id"> & { id?: string }): AuthAddress => {
    const normalized: AuthAddress = {
      id: typeof address.id === "string" && address.id.length > 0 ? address.id : createAddressId(),
      label: address.label.trim(),
      firstName: address.firstName.trim(),
      lastName: address.lastName.trim(),
      street: address.street.trim(),
      city: address.city.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country.trim(),
      ...(typeof address.phone === "string" && address.phone.trim().length > 0
        ? { phone: address.phone.trim() }
        : {}),
    };

    setSavedAddresses((previous) => {
      const withoutCurrent = previous.filter((entry) => entry.id !== normalized.id);
      return [...withoutCurrent, normalized];
    });

    return normalized;
  }, []);

  const deleteSavedAddress = useCallback((addressId: string) => {
    setSavedAddresses((previous) => previous.filter((entry) => entry.id !== addressId));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    session,
    mfaMethods,
    mfaVerified,
    savedAddresses,
    refreshAuth,
    signIn,
    register,
    signOut,
    listMfaMethods,
    sendMfaCode,
    validateMfaCode,
    validateRecoveryCode,
    saveAddress,
    deleteSavedAddress,
  }), [
    ready,
    session,
    mfaMethods,
    mfaVerified,
    savedAddresses,
    refreshAuth,
    signIn,
    register,
    signOut,
    listMfaMethods,
    sendMfaCode,
    validateMfaCode,
    validateRecoveryCode,
    saveAddress,
    deleteSavedAddress,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return value;
}
