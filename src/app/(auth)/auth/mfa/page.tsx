import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { AuthMfaPage } from "@/components/auth";

interface MfaPageProps {
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveAuthFeaturePage({
    feature: "mfa",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "MFA Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildAuthFeatureMetadata({
    title: "MFA verification",
    description: "Verify your identity before continuing.",
    canonicalPath: resolved.paths.mfa,
  });
}

export default async function MfaPageRoute({ searchParams }: MfaPageProps) {
  const query = await searchParams;
  const resolved = await resolveAuthFeaturePage({
    feature: "mfa",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }

  return (
    <AuthMfaPage
      paths={{
        login: resolved.paths.login,
        account: resolved.paths.account,
      }}
      {...(typeof query.returnTo === "string" ? { returnTo: query.returnTo } : {})}
    />
  );
}
