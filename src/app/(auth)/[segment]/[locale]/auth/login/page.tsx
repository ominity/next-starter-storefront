import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { generateLocaleStaticParamsForVariant } from "@/lib/ominity/locale-variant";
import { AuthLoginPage } from "@/components/auth";

interface LoginPageProps {
  params: Promise<{
    segment: string;
    locale: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateLocaleStaticParamsForVariant("country-language");
  return params.map((entry) => ({
    segment: entry.country,
    locale: entry.locale,
  }));
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "login",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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
