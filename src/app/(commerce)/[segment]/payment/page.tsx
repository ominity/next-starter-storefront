import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommercePaymentPage } from "@/components/commerce/payment-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import {
  buildCommerceFeatureMetadata,
  generateFixedCommerceStaticParamsForVariant,
  resolveCommerceFeaturePage,
} from "@/lib/ominity/commerce";

interface PaymentPageProps {
  params: Promise<{
    segment: string;
  }>;
  searchParams: Promise<{
    order?: string;
  }>;
}

export async function generateStaticParams() {
  const params = await generateFixedCommerceStaticParamsForVariant("language");
  return params.map((entry) => ({
    segment: entry.locale,
  }));
}

export async function generateMetadata({ params }: PaymentPageProps): Promise<Metadata> {
  const routeParams = await params;
  const resolved = await resolveCommerceFeaturePage({
    feature: "payment",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    return {
      title: "Payment Not Available",
      robots: { index: false, follow: false },
    };
  }

  return buildCommerceFeatureMetadata({
    title: "Payment",
    description: "Pay for your order.",
    canonicalPath: resolved.paths.payment,
  });
}

export default async function PaymentPageRoute({ params, searchParams }: PaymentPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const resolved = await resolveCommerceFeaturePage({
    feature: "payment",
    variant: "language",
    localeSegment: routeParams.segment,
  });

  if (!resolved) {
    notFound();
  }
  const authPaths = buildAuthUtilityPaths(resolved.locale);

  return (
    <CommercePaymentPage
      paths={{
        cart: resolved.paths.cart,
        account: authPaths.account,
        checkout: resolved.paths.checkout,
      }}
      {...(typeof query.order === "string" ? { orderId: query.order } : {})}
    />
  );
}
