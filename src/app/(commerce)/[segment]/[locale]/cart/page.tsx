import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceCartPage } from "@/components/commerce/cart-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import {
  buildCommerceFeatureMetadata,
  generateFixedCommerceStaticParamsForVariant,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

interface CartPageProps {
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

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "cart",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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

export default async function CartPageRoute({ params }: CartPageProps) {
  const config = getStarterOminityConfig();
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "cart",
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
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
