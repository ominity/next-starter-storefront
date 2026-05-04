import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceWishlistPage } from "@/components/commerce/wishlist-page";
import {
  buildCommerceFeatureMetadata,
  generateFixedCommerceStaticParamsForVariant,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

interface WishlistPageProps {
  params: Promise<{
    segment: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateFixedCommerceStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
  }));
}

export async function generateMetadata({ params }: WishlistPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "wishlist",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    return {
      title: "Wishlist Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildCommerceFeatureMetadata({
    title: "Wishlist",
    description: "Saved products you want to revisit.",
    canonicalPath: resolved.paths.wishlist,
  });
}

export default async function WishlistPageRoute({ params }: WishlistPageProps) {
  const config = getStarterOminityConfig();
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "wishlist",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    notFound();
  }

  return (
    <CommerceWishlistPage
      paths={{
        home: resolved.paths.home,
        cart: resolved.paths.cart,
      }}
      features={{
        cart: config.enableCommerceCart,
      }}
    />
  );
}
