import type { Product } from "@ominity/api-typescript/models";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { RoutePaths } from "@/lib/ominity/routes";

import { CommerceProductActions } from "./product-actions";

export interface CommerceProductPageProps {
  readonly product: Product;
  readonly canonicalPath: string;
  readonly paths: RoutePaths;
  readonly guestCheckout: boolean;
}

export function CommerceProductPage({ product, canonicalPath, paths, guestCheckout }: CommerceProductPageProps) {
  const offers = product.offers ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">SKU {product.sku}</div>
          <CardTitle className="text-3xl">{product.title}</CardTitle>
          {product.shortDescription && <CardDescription>{product.shortDescription}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {product.coverImage && (
            <Image
              src={product.coverImage}
              alt={product.title}
              width={1280}
              height={720}
              unoptimized
              className="h-auto w-full rounded-md border object-cover"
            />
          )}
          {product.description && <p className="leading-relaxed text-muted-foreground">{product.description}</p>}
          <div className="text-sm font-medium text-muted-foreground">Price: {formatPrice(offers)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CommerceProductActions product={product} canonicalPath={canonicalPath} paths={paths} guestCheckout={guestCheckout} />
        </CardContent>
      </Card>
    </div>
  );
}
