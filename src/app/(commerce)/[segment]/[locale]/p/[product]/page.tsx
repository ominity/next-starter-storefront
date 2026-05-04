import type { Metadata, Route } from "next";
import { notFound, redirect } from "next/navigation";

import { resolveDraftMode } from "@ominity/next/next";

import { CommerceProductPage } from "@/components/commerce/product-page";
import {
  buildProductMetadata,
  generateProductStaticParamsForVariant,
  resolveProductPageData,
} from "@/lib/ominity/commerce";

interface ProductPageProps {
  params: Promise<{
    segment: string;
    locale: string;
    product: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateProductStaticParamsForVariant("country-language");
  return params.map((entry) => ({
    segment: entry.country,
    locale: entry.locale,
    product: entry.product,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });

  const resolved = await resolveProductPageData({
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
    productSegment: routeParams.product,
    preview,
  });

  if (!resolved) {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  return buildProductMetadata(resolved);
}

export default async function ProductPageRoute({ params }: ProductPageProps) {
  const routeParams = await params;
  const preview = await resolveDraftMode({ useNextDraftMode: true });

  const resolved = await resolveProductPageData({
    variant: "country-language",
    countrySegment: routeParams.segment,
    localeSegment: routeParams.locale,
    productSegment: routeParams.product,
    preview,
  });

  if (!resolved) {
    notFound();
  }

  if (resolved.shouldRedirect) {
    redirect(resolved.product.canonicalPath as Route);
  }

  return <CommerceProductPage locale={resolved.locale} product={resolved.product} />;
}
