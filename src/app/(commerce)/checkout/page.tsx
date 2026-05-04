import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceCheckoutPage } from "@/components/commerce/checkout-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import { buildCommerceFeatureMetadata, resolveCommerceFeaturePage } from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveCommerceFeaturePage({
    feature: "checkout",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "Checkout Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildCommerceFeatureMetadata({
    title: "Checkout",
    description: "Complete your order details and proceed to payment.",
    canonicalPath: resolved.paths.checkout,
  });
}

export default async function CheckoutPageRoute() {
  const config = getStarterOminityConfig();
  const resolved = await resolveCommerceFeaturePage({
    feature: "checkout",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }
  const authPaths = buildAuthUtilityPaths(resolved.locale);

  return (
    <CommerceCheckoutPage
      paths={{
        checkout: resolved.paths.checkout,
        cart: resolved.paths.cart,
        payment: resolved.paths.payment,
        login: authPaths.login,
        account: authPaths.account,
      }}
      features={{
        payment: config.enableCommercePayment,
        auth: config.enableAuth,
        guestCheckout: config.checkoutAllowGuest,
      }}
    />
  );
}
