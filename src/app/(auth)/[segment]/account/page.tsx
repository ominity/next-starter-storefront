import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { buildCommerceUtilityPaths } from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { generateLocaleStaticParamsForVariant } from "@/lib/ominity/site";
import { AuthAccountPage } from "@/components/auth";

interface AccountPageProps {
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

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "account",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    return {
      title: "Account Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildAuthFeatureMetadata({
    title: "Account",
    description: "Manage your account session and checkout profile.",
    canonicalPath: resolved.paths.account,
  });
}

export default async function AccountPageRoute({ params }: AccountPageProps) {
  const config = getStarterOminityConfig();
  const routeParams = await params;
  const resolved = await resolveAuthFeaturePage({
    feature: "account",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    notFound();
  }

  const commercePaths = buildCommerceUtilityPaths(resolved.locale);

  return (
    <AuthAccountPage
      paths={{
        login: resolved.paths.login,
        register: resolved.paths.register,
        mfa: resolved.paths.mfa,
        cart: commercePaths.cart,
        checkout: commercePaths.checkout,
        wishlist: commercePaths.wishlist,
      }}
      features={{
        wishlist: config.enableCommerceWishlist,
        checkout: config.enableCommerceCheckout,
      }}
    />
  );
}
