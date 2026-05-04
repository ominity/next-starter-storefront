import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildAuthFeatureMetadata, resolveAuthFeaturePage } from "@/lib/ominity/auth";
import { buildCommerceUtilityPaths } from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { AuthAccountPage } from "@/components/auth";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveAuthFeaturePage({
    feature: "account",
    variant: "none",
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

export default async function AccountPageRoute() {
  const config = getStarterOminityConfig();
  const resolved = await resolveAuthFeaturePage({
    feature: "account",
    variant: "none",
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
