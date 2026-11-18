"use client";

import { useAuth, type OminitySocialProvider } from "@ominity/next/react";
import type { ReactNode } from "react";

/**
 * Other ways to sign in under an "Or continue with" divider: `leading` (the passkey button) and the channel's social
 * providers. The page loads the providers on the server (`getSocialProviders` in `src/lib/ominity/auth.ts`), so they
 * are there in the first paint.
 */
export function SocialLoginOptions({ providers, leading }: {
  readonly providers: ReadonlyArray<OminitySocialProvider>;
  readonly leading?: ReactNode;
}) {
  const auth = useAuth();

  if (providers.length === 0 && !leading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {leading}
        {providers.map((provider) => (
          <a
            key={provider.id}
            href={auth.socialSignInUrl(provider.id)}
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition hover:bg-accent"
          >
            {provider.name || provider.provider}
          </a>
        ))}
      </div>
    </div>
  );
}
