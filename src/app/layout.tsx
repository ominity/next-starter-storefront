import { createOminityDevToolSnapshot, OminityDevTool } from "@ominity/next/dev-tool";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { config } from "@/lib/ominity/config";
import { getDevToolChannelInfo } from "@/lib/ominity/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  applicationName: "Ominity Next Starter",
  title: {
    default: "Ominity Next Starter",
    template: "%s | Ominity Next Starter",
  },
  description: "Next.js starter for Ominity: CMS pages, commerce and customer accounts with @ominity/next.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const channel = await getDevToolChannelInfo();
  const channelId = channel?.id === undefined ? undefined : String(channel.id);
  const devToolSnapshot = createOminityDevToolSnapshot({
    appName: "Ominity Next Starter",
    environment: config.nodeEnv,
    apiUrl: config.apiUrl,
    debugLogs: config.debugLogs,
    enabled: config.devTool,
    localeSegmentStrategy: config.localeSegmentStrategy,
    basePath: config.basePath || "/",
    trailingSlash: config.trailingSlash,
    canonicalRedirectPolicy: config.canonicalRedirectPolicy,
    ...(channelId ? { channelId } : {}),
    requiredEnvironment: [
      { name: "OMINITY_API_KEY", value: config.apiKey, message: "Required for every Ominity request." },
      { name: "OMINITY_AUTH_CLIENT_ID", value: config.authClientId, message: "Required for sign-in." },
      { name: "OMINITY_AUTH_CLIENT_SECRET", value: config.authClientSecret, message: "Required for sign-in." },
      { name: "OMINITY_AUTH_SESSION_SECRET", value: config.authSessionSecret, message: "Signs the session cookie." },
    ],
  });

  return (
    <html lang={channel?.defaultLocale ?? "en"} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers
          devToolEnabled={config.devTool}
          devToolSnapshot={{ ...devToolSnapshot, ...(channel ? { channel } : {}) }}
          trackingEnabled={config.trackingEnabled}
          channelId={channelId}
        >
          <div className="relative flex min-h-screen flex-col">
            {children}
            <footer className="border-t py-6 text-center text-xs text-muted-foreground">
              Ominity Next Starter · Built for reusable CMS-driven projects.
            </footer>
            <OminityDevTool enabled={config.devTool} endpoint="/api/dev-tool/requests" />
          </div>
        </Providers>
      </body>
    </html>
  );
}
