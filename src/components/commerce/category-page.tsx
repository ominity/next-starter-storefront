import type { Category, Paginated, Product } from "@ominity/api-typescript/models";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Pagination, ProductCard } from "./product-card";

export interface CommerceCategoryPageProps {
  readonly category: Category;
  readonly products: Paginated<Product>;
  readonly locale: string;
  readonly canonicalPath: string;
}

export function CommerceCategoryPage({ category, products, locale, canonicalPath }: CommerceCategoryPageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{category.name}</CardTitle>
          {category.description && <CardDescription>{category.description}</CardDescription>}
        </CardHeader>
        {category.coverImage && (
          <CardContent>
            <Image
              src={category.coverImage}
              alt={category.name}
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
        {products.items.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">No products are linked to this category yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {products.items.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}
          </div>
        )}
        <Pagination result={products} href={(page) => `${canonicalPath}?page=${page}`} />
      </section>
    </div>
  );
}
