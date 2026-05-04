import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommercePaymentPage } from "@/components/commerce/payment-page";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import { buildCommerceFeatureMetadata, resolveCommerceFeaturePage } from "@/lib/ominity/commerce";

interface PaymentPageProps {
  searchParams: Promise<{
    order?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveCommerceFeaturePage({
    feature: "payment",
    variant: "none",
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

export default async function PaymentPageRoute({ searchParams }: PaymentPageProps) {
  const query = await searchParams;
  const resolved = await resolveCommerceFeaturePage({
    feature: "payment",
    variant: "none",
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
