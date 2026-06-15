import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { generateLocaleStaticParamsForVariant } from "@/lib/ominity/site";
import { AuthLoginPage } from "@/components/auth";

interface LoginPageProps {
  params: Promise<{
    segment: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateLocaleStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
  }));
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "login",
    variant: "language",
    localeSegment: routeParams.segment,
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

export default async function LoginPageRoute({ params, searchParams }: LoginPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const resolved = await resolveAuthFeaturePage({
    feature: "login",
    variant: "language",
    localeSegment: routeParams.segment,
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
