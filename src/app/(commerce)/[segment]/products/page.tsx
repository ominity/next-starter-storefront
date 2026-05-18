import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommerceProductsPage } from "@/components/commerce/products-page";
import {
  buildCommerceFeatureMetadata,
  generateFixedCommerceStaticParamsForVariant,
  listResolvedCommerceCategories,
  listResolvedCommerceProducts,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";

interface ProductsPageProps {
  params: Promise<{
    segment: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateStaticParams() {
  const params = await generateFixedCommerceStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
  }));
}

export async function generateMetadata({ params }: ProductsPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "products",
    variant: "language",
    localeSegment: routeParams.segment,
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

export default async function ProductsPageRoute({ params, searchParams }: ProductsPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const resolved = await resolveCommerceFeaturePage({
    feature: "products",
    variant: "language",
    localeSegment: routeParams.segment,
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
