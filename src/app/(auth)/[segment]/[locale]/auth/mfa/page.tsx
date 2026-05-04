import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { generateLocaleStaticParamsForVariant } from "@/lib/ominity/locale-variant";
import { AuthMfaPage } from "@/components/auth";

interface MfaPageProps {
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

export async function generateMetadata({ params }: MfaPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "mfa",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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

export default async function MfaPageRoute({ params, searchParams }: MfaPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const resolved = await resolveAuthFeaturePage({
    feature: "mfa",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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
