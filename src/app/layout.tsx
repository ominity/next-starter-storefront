import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OminityDebugBar } from "@ominity/next/debug";

import { CommerceProvider } from "@/components/commerce/commerce-provider";
import { SiteHeader } from "@/components/site/site-header";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { AuthProvider } from "@/components/auth";

import "./globals.css";

const config = getStarterOminityConfig();

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: "Ominity Next Starter",
    template: "%s | Ominity Next Starter",
  },
  description:
    "Production-ready Next.js starter with @ominity/next, Tailwind, shadcn, and App Router best practices.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <CommerceProvider>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <main className="container flex-1 py-8 md:py-12">{children}</main>
              <footer className="border-t py-6 text-center text-xs text-muted-foreground">
                Ominity Next Starter · Built for reusable CMS-driven projects.
              </footer>
              <OminityDebugBar enabled={config.debugBar} endpoint="/api/debug/sdk-requests" />
            </div>
          </CommerceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
