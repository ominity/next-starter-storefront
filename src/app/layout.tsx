import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OminityDevTool } from "@ominity/next/dev-tool";

import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site/site-header";
import { createStarterDevToolSnapshot } from "@/lib/ominity/dev-tool";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getStarterDevToolChannelInfo } from "@/lib/ominity/site";

import "./globals.css";

const config = getStarterOminityConfig();
const trackingEnabled = config.trackingEnabled && !config.useMockData && Boolean(config.apiUrl && config.apiKey);

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  applicationName: "Ominity Next Starter",
  title: {
    default: "Ominity Next Starter",
    template: "%s | Ominity Next Starter",
  },
  description:
    "Production-ready Next.js starter with @ominity/next, Tailwind, shadcn, and App Router best practices.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const channel = await getStarterDevToolChannelInfo();
  const devToolSnapshot = createStarterDevToolSnapshot(config, channel);
  const trackingChannelId = typeof channel?.id === "string"
    ? channel.id
    : typeof channel?.id === "number"
      ? String(channel.id)
      : undefined;

  return (
    <html lang={channel?.defaultLocale ?? "en"} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers
          devToolEnabled={config.devTool}
          devToolSnapshot={devToolSnapshot}
          customerAccountsEnabled={config.enableCustomerAccounts}
          trackingEnabled={trackingEnabled}
          channelId={trackingChannelId}
        >
          <div className="relative flex min-h-screen flex-col">
            <SiteHeader />
            <main className="container flex-1 py-8 md:py-12">{children}</main>
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
