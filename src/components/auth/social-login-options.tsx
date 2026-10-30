"use client";

import { useAuth, type OminitySocialProvider } from "@ominity/next/react";
import { useEffect, useState } from "react";

export function SocialLoginOptions() {
  const auth = useAuth();
  const [providers, setProviders] = useState<ReadonlyArray<OminitySocialProvider>>([]);
  const { listSocialProviders } = auth;

  useEffect(() => {
    void listSocialProviders().then(setProviders, () => setProviders([]));
    // Load once; the provider list does not change while the page is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
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
