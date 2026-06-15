import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { generateLocaleStaticParamsForVariant } from "@/lib/ominity/site";
import { AuthRegisterPage } from "@/components/auth";

interface RegisterPageProps {
  params: Promise<{
    segment: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateLocaleStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
  }));
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "register",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    return {
      title: "Register Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildAuthFeatureMetadata({
    title: "Register",
    description: "Create an account for checkout and order history.",
    canonicalPath: resolved.paths.register,
  });
}

export default async function RegisterPageRoute({ params }: RegisterPageProps) {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "register",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    notFound();
  }

  return (
    <AuthRegisterPage
      paths={{
        login: resolved.paths.login,
        account: resolved.paths.account,
      }}
    />
  );
}
