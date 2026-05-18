import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceProductsPage } from "@/components/commerce/products-page";
import {
  buildCommerceFeatureMetadata,
  listResolvedCommerceCategories,
  listResolvedCommerceProducts,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveCommerceFeaturePage({
    feature: "products",
    variant: "none",
  });

  if (!resolved) {
    return {
      title: "Products Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildCommerceFeatureMetadata({
    title: "Products",
    description: "Browse all products with filtering and sorting.",
    canonicalPath: resolved.paths.products,
  });
}

export default async function ProductsPageRoute({ searchParams }: ProductsPageProps) {
  const query = await searchParams;
  const resolved = await resolveCommerceFeaturePage({
    feature: "products",
    variant: "none",
  });

  if (!resolved) {
    notFound();
  }

  const [products, categories] = await Promise.all([
    listResolvedCommerceProducts(resolved.locale),
    listResolvedCommerceCategories(resolved.locale),
  ]);

  return (
    <CommerceProductsPage
      locale={resolved.locale}
      currentPath={resolved.paths.products}
      searchParams={query}
      products={products}
      categories={categories}
    />
  );
}
