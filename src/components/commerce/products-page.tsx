import type { Category, Paginated, Product } from "@ominity/api-typescript/models";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Pagination, ProductCard } from "./product-card";

/** Sort values the products API accepts, with their labels. */
export const PRODUCT_SORTS = {
  "": "Featured",
  title: "Name A-Z",
  "-title": "Name Z-A",
  price: "Price low-high",
  "-price": "Price high-low",
  "-created_at": "Newest",
} as const;

export interface ProductsQuery {
  readonly q: string;
  readonly category: string;
  readonly sort: keyof typeof PRODUCT_SORTS;
}

export interface CommerceProductsPageProps {
  readonly products: Paginated<Product>;
  readonly categories: ReadonlyArray<Category>;
  readonly query: ProductsQuery;
  readonly locale: string;
  readonly path: string;
}

export function CommerceProductsPage({ products, categories, query, locale, path }: CommerceProductsPageProps) {
  const href = (page: number) => {
    const search = new URLSearchParams(Object.entries({ ...query, page: String(page) }).filter(([, value]) => value));
    return `${path}?${search}`;
  };
  const select = "h-9 rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Products</h1>

      <form action={path} method="get" className="grid gap-3 md:grid-cols-4">
        <Input name="q" defaultValue={query.q} placeholder="Search products" className="md:col-span-2" />
        <select name="category" defaultValue={query.category} className={select} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select name="sort" defaultValue={query.sort} className={select} aria-label="Sort">
          {Object.entries(PRODUCT_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className={buttonVariants({ variant: "default" })}>Apply</button>
      </form>

      <p className="text-sm text-muted-foreground">{products.count} products</p>
      {products.items.length === 0
        ? <p className="text-sm text-muted-foreground">No products match these filters.</p>
        : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.items.map((product) => <ProductCard key={product.id} product={product} locale={locale} />)}
          </div>
        )}
      <Pagination result={products} href={href} />
    </div>
  );
}
