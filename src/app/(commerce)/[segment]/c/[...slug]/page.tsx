import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveDraftMode } from "@ominity/next/next";

import { CommerceCategoryPage } from "@/components/commerce/category-page";
import {
  buildCategoryMetadata,
  generateCategoryStaticParamsForVariant,
  resolveCategoryPageData,
} from "@/lib/ominity/commerce";

interface CategoryPageProps {
  params: Promise<{
    segment: string;
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  const params = await generateCategoryStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
    slug: Array.isArray(entry.slug) ? [...entry.slug] : [],
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });

  const resolved = await resolveCategoryPageData({
    variant: "language",
    localeSegment: routeParams.segment,
    slugSegments: routeParams.slug,
    preview,
  });

  if (!resolved) {
    return {
      title: "Category Not Found",
      robots: { index: false, follow: false },
    };
  }

  return buildCategoryMetadata(resolved);
}

export default async function CategoryPageRoute({ params }: CategoryPageProps) {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });

  const resolved = await resolveCategoryPageData({
    variant: "language",
    localeSegment: routeParams.segment,
    slugSegments: routeParams.slug,
    preview,
  });

  if (!resolved) {
    notFound();
  }

  if (resolved.shouldRedirect) {
    redirect(resolved.category.canonicalPath as Route);
  }

  return <CommerceCategoryPage category={resolved.category} products={resolved.products} />;
}
