import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceCartPage } from "@/components/commerce/cart-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import { buildCommerceFeatureMetadata, resolveCommerceFeaturePage } from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveCommerceFeaturePage({
    feature: "cart",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "Cart Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildCommerceFeatureMetadata({
    title: "Cart",
    description: "Review items in your shopping cart.",
    canonicalPath: resolved.paths.cart,
  });
}

export default async function CartPageRoute() {
  const config = getStarterOminityConfig();
  const resolved = await resolveCommerceFeaturePage({
    feature: "cart",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }
  const authPaths = buildAuthUtilityPaths(resolved.locale);

  return (
    <CommerceCartPage
      paths={{
        home: resolved.paths.home,
        checkout: resolved.paths.checkout,
        login: authPaths.login,
      }}
      features={{
        checkout: config.enableCommerceCheckout,
        auth: config.enableAuth,
        guestCheckout: config.checkoutAllowGuest,
      }}
    />
  );
}
