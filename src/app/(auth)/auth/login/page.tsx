import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { AuthLoginPage } from "@/components/auth";

interface LoginPageProps {
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveAuthFeaturePage({
    feature: "login",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "Login Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildAuthFeatureMetadata({
    title: "Login",
    description: "Sign in to your account.",
    canonicalPath: resolved.paths.login,
  });
}

export default async function LoginPageRoute({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const resolved = await resolveAuthFeaturePage({
    feature: "login",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }

  return (
    <AuthLoginPage
      paths={{
        register: resolved.paths.register,
        account: resolved.paths.account,
        mfa: resolved.paths.mfa,
      }}
      {...(typeof query.returnTo === "string" ? { returnTo: query.returnTo } : {})}
    />
  );
}
