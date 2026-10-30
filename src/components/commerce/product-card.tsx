import type { Paginated, Product } from "@ominity/api-typescript/models";
import type { Route } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { linkTo } from "@/lib/ominity/site";

export function ProductCard({ product, locale }: { readonly product: Product; readonly locale: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{product.title}</CardTitle>
        <CardDescription>SKU {product.sku}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {product.shortDescription && <p className="text-sm text-muted-foreground">{product.shortDescription}</p>}
        <p className="text-sm font-medium">{formatPrice(product.offers)}</p>
        <Link className="text-sm font-medium text-primary hover:underline" href={(linkTo(product, locale) ?? "#") as Route}>
          View product
        </Link>
      </CardContent>
    </Card>
  );
}

/** Previous/next links for an SDK `Paginated` result; `href` builds the link for a page number. */
export function Pagination({ result, href }: { readonly result: Paginated<unknown>; readonly href: (page: number) => string }) {
  if (result.totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between text-sm">
      {result.hasPrevious
        ? <Link className="font-medium text-primary hover:underline" href={href(result.page - 1) as Route}>Previous</Link>
        : <span />}
      <span className="text-muted-foreground">Page {result.page} of {result.totalPages}</span>
      {result.hasNext
        ? <Link className="font-medium text-primary hover:underline" href={href(result.page + 1) as Route}>Next</Link>
        : <span />}
    </nav>
  );
}
