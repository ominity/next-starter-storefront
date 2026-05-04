import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceWishlistPage } from "@/components/commerce/wishlist-page";
import { buildCommerceFeatureMetadata, resolveCommerceFeaturePage } from "@/lib/ominity/commerce";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveCommerceFeaturePage({
    feature: "wishlist",
    variant: "none",
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

export default async function WishlistPageRoute() {
  const config = getStarterOminityConfig();
  const resolved = await resolveCommerceFeaturePage({
    feature: "wishlist",
    variant: "none",
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
