import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, resolveCurrency, resolveUnitPrice } from "@/lib/ominity/commerce";
import type {
  StarterResolvedCommerceCategory,
  StarterResolvedCommerceProduct,
} from "@/lib/ominity/commerce";

export interface CommerceCategoryPageProps {
  readonly category: StarterResolvedCommerceCategory;
  readonly products: ReadonlyArray<StarterResolvedCommerceProduct>;
}

export function CommerceCategoryPage(props: CommerceCategoryPageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{props.category.record.name}</CardTitle>
          {props.category.record.description && (
            <CardDescription>{props.category.record.description}</CardDescription>
          )}
        </CardHeader>
        {props.category.record.coverImage && (
          <CardContent>
            <Image
              src={props.category.record.coverImage}
              alt={props.category.record.name}
              width={1280}
              height={720}
              unoptimized
              className="h-auto w-full rounded-md border object-cover"
            />
          </CardContent>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Products</h2>
        {props.products.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No products are linked to this category yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {props.products.map((product) => (
              <Card key={product.record.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.record.title}</CardTitle>
                  <CardDescription>SKU {product.record.sku}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {product.record.shortDescription && (
                    <p className="text-sm text-muted-foreground">
                      {product.record.shortDescription}
                    </p>
                  )}
                  <p className="text-sm font-medium">
                    {formatMoney(
                      resolveUnitPrice(product.record.price),
                      resolveCurrency(product.record.currency),
                    )}
                  </p>
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    href={product.canonicalPath as Route}
                  >
                    View product
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
