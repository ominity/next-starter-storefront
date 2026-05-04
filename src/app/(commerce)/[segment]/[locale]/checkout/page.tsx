import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceCheckoutPage } from "@/components/commerce/checkout-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import {
  buildCommerceFeatureMetadata,
  generateFixedCommerceStaticParamsForVariant,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

interface CheckoutPageProps {
  params: Promise<{
    segment: string;
    locale: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateFixedCommerceStaticParamsForVariant("country-language");
  return params.map((entry) => ({
    segment: entry.country,
    locale: entry.locale,
  }));
}

export async function generateMetadata({ params }: CheckoutPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "checkout",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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

export default async function CheckoutPageRoute({ params }: CheckoutPageProps) {
  const config = getStarterOminityConfig();
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "checkout",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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
