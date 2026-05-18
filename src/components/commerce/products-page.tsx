import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  resolveCurrency,
  resolveUnitPrice,
  type StarterResolvedCommerceCategory,
  type StarterResolvedCommerceProduct,
} from "@/lib/ominity/commerce";
import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";

type QueryValue = string | readonly string[] | undefined;

type ProductSort = "featured" | "name-asc" | "name-desc" | "price-asc" | "price-desc";
type ProductView = "grid" | "list";

const SORT_OPTIONS: ReadonlyArray<{
  readonly value: ProductSort;
  readonly label: string;
}> = [
  { value: "featured", label: "Featured" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "price-asc", label: "Price low-high" },
  { value: "price-desc", label: "Price high-low" },
];

const VIEW_OPTIONS: ReadonlyArray<ProductView> = ["grid", "list"];
const PER_PAGE_OPTIONS: ReadonlyArray<number> = [12, 24, 48];

interface CategoryOption {
  readonly id: string;
  readonly numericId?: number;
  readonly slug: string;
  readonly name: string;
  readonly path: string;
}

export interface CommerceProductsPageProps {
  readonly locale: string;
  readonly currentPath: string;
  readonly searchParams: Readonly<Record<string, QueryValue>>;
  readonly products: ReadonlyArray<StarterResolvedCommerceProduct>;
  readonly categories: ReadonlyArray<StarterResolvedCommerceCategory>;
}

function firstValue(value: QueryValue): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return undefined;
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parsePage(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function parsePerPage(value: string | undefined): number {
  if (!value) {
    return PER_PAGE_OPTIONS[0] ?? 12;
  }

  const parsed = Number.parseInt(value, 10);
  if (!PER_PAGE_OPTIONS.includes(parsed)) {
    return PER_PAGE_OPTIONS[0] ?? 12;
  }

  return parsed;
}

function parseSort(value: string | undefined): ProductSort {
  if (!value) {
    return "featured";
  }

  if (SORT_OPTIONS.some((entry) => entry.value === value)) {
    return value as ProductSort;
  }

  return "featured";
}

function parseView(value: string | undefined): ProductView {
  if (!value) {
    return "grid";
  }

  if (VIEW_OPTIONS.includes(value as ProductView)) {
    return value as ProductView;
  }

  return "grid";
}

function buildCategoryOptions(
  categories: ReadonlyArray<StarterResolvedCommerceCategory>,
): ReadonlyArray<CategoryOption> {
  return categories
    .map((category) => ({
      id: category.record.id,
      ...(typeof category.record.numericId === "number" ? { numericId: category.record.numericId } : {}),
      slug: category.slugSegments.join("/"),
      name: category.record.name,
      path: category.canonicalPath,
    }));
}

function createSearchParams(input: Readonly<Record<string, QueryValue>>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const first = firstValue(value);
    if (typeof first === "string" && first.length > 0) {
      params.set(key, first);
    }
  }

  return params;
}

function buildPageNumbers(current: number, total: number): ReadonlyArray<number> {
  if (total <= 1) {
    return [1];
  }

  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  if (!pages.includes(total)) {
    pages.push(total);
  }

  return Array.from(new Set(pages));
}

export function CommerceProductsPage(props: CommerceProductsPageProps) {
  const query = firstValue(props.searchParams.q)?.trim() ?? "";
  const categoryFilter = firstValue(props.searchParams.category) ?? "";
  const sort = parseSort(firstValue(props.searchParams.sort));
  const view = parseView(firstValue(props.searchParams.view));
  const perPage = parsePerPage(firstValue(props.searchParams.perPage));
  const minPrice = parsePositiveNumber(firstValue(props.searchParams.minPrice));
  const maxPrice = parsePositiveNumber(firstValue(props.searchParams.maxPrice));
  const requestedPage = parsePage(firstValue(props.searchParams.page));

  const localeCode = normalizeLocaleCode(props.locale);
  const localeLanguage = parseLocaleCode(localeCode).language;
  const categoryOptions = buildCategoryOptions(props.categories);
  const selectedCategory = categoryOptions.find((entry) => entry.id === categoryFilter) ?? null;
  const searchNeedle = query.toLowerCase();

  const filteredProducts = props.products.filter((product) => {
    if (searchNeedle.length > 0) {
      const haystack = [
        product.record.title,
        product.record.sku,
        product.record.shortDescription ?? "",
        product.record.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(searchNeedle)) {
        return false;
      }
    }

    const unitPrice = resolveUnitPrice(product.record.price);
    if (typeof minPrice === "number" && unitPrice < minPrice) {
      return false;
    }

    if (typeof maxPrice === "number" && unitPrice > maxPrice) {
      return false;
    }

    if (selectedCategory) {
      const byId = typeof selectedCategory.numericId === "number"
        && typeof product.record.categoryId === "number"
        && selectedCategory.numericId === product.record.categoryId;
      const bySlug = selectedCategory.slug.length > 0
        && typeof product.record.categorySlugs === "object"
        && product.record.categorySlugs !== null
        && (
          product.record.categorySlugs[localeCode] === selectedCategory.slug
          || product.record.categorySlugs[localeLanguage] === selectedCategory.slug
        );

      if (!byId && !bySlug) {
        return false;
      }
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const leftPrice = resolveUnitPrice(a.record.price);
    const rightPrice = resolveUnitPrice(b.record.price);
    const leftTitle = a.record.title;
    const rightTitle = b.record.title;

    switch (sort) {
      case "name-asc":
        return leftTitle.localeCompare(rightTitle, undefined, { sensitivity: "base" });
      case "name-desc":
        return rightTitle.localeCompare(leftTitle, undefined, { sensitivity: "base" });
      case "price-asc":
        return leftPrice - rightPrice || leftTitle.localeCompare(rightTitle, undefined, { sensitivity: "base" });
      case "price-desc":
        return rightPrice - leftPrice || leftTitle.localeCompare(rightTitle, undefined, { sensitivity: "base" });
      default:
        return 0;
    }
  });

  const totalProducts = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / perPage));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * perPage;
  const pagedProducts = sortedProducts.slice(offset, offset + perPage);
  const pageNumbers = buildPageNumbers(page, totalPages);

  const buildHref = (
    updates: Readonly<Record<string, string | number | undefined>>,
    options: { readonly resetPage?: boolean } = {},
  ): string => {
    const params = createSearchParams(props.searchParams);
    if (options.resetPage ?? true) {
      params.delete("page");
    }

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "undefined" || String(value).trim().length === 0) {
        params.delete(key);
        continue;
      }

      params.set(key, String(value));
    }

    const queryString = params.toString();
    return queryString.length > 0 ? `${props.currentPath}?${queryString}` : props.currentPath;
  };

  const clearFiltersHref = props.currentPath;
  const hasFiltersApplied = query.length > 0
    || categoryFilter.length > 0
    || sort !== "featured"
    || typeof minPrice === "number"
    || typeof maxPrice === "number";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">All Products</CardTitle>
          <CardDescription>
            Browse all available products with filtering, sorting, and pagination.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <SlidersHorizontal className="h-4 w-4" />
            Filter & Sort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={props.currentPath} method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="products-search" className="text-xs font-medium text-muted-foreground">
                Search
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="products-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Title, SKU, description"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="products-category" className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                id="products-category"
                name="category"
                defaultValue={categoryFilter}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="products-sort" className="text-xs font-medium text-muted-foreground">
                Sort
              </label>
              <select
                id="products-sort"
                name="sort"
                defaultValue={sort}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="products-per-page" className="text-xs font-medium text-muted-foreground">
                Per page
              </label>
              <select
                id="products-per-page"
                name="perPage"
                defaultValue={String(perPage)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="products-min-price" className="text-xs font-medium text-muted-foreground">
                Min price
              </label>
              <Input
                id="products-min-price"
                name="minPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={typeof minPrice === "number" ? String(minPrice) : ""}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="products-max-price" className="text-xs font-medium text-muted-foreground">
                Max price
              </label>
              <Input
                id="products-max-price"
                name="maxPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={typeof maxPrice === "number" ? String(maxPrice) : ""}
                placeholder="9999.99"
              />
            </div>

            <input type="hidden" name="view" value={view} />

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-2">
              <button type="submit" className={buttonVariants({ variant: "default" })}>
                Apply
              </button>
              {hasFiltersApplied && (
                <Link href={clearFiltersHref as Route} className={buttonVariants({ variant: "outline" })}>
                  Reset
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {totalProducts === 0 ? 0 : offset + 1}-{Math.min(offset + perPage, totalProducts)} of {totalProducts}
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={buildHref({ view: "grid" }, { resetPage: false }) as Route}
            className={buttonVariants({ variant: view === "grid" ? "default" : "outline", size: "sm" })}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <Link
            href={buildHref({ view: "list" }, { resetPage: false }) as Route}
            className={buttonVariants({ variant: view === "list" ? "default" : "outline", size: "sm" })}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {pagedProducts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No products matched your filters.
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedProducts.map((product) => {
            const unitPrice = resolveUnitPrice(product.record.price);
            const currency = resolveCurrency(product.record.currency);
            return (
              <Card key={product.record.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{product.record.title}</CardTitle>
                  <CardDescription>SKU {product.record.sku}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {product.record.shortDescription ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{product.record.shortDescription}</p>
                  ) : null}
                  <p className="text-sm font-medium">{formatMoney(unitPrice, currency)}</p>
                  <Link href={product.canonicalPath as Route} className="text-sm font-medium text-primary hover:underline">
                    View product
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {pagedProducts.map((product) => {
            const unitPrice = resolveUnitPrice(product.record.price);
            const currency = resolveCurrency(product.record.currency);
            return (
              <Card key={product.record.id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold">{product.record.title}</p>
                    <p className="text-xs text-muted-foreground">SKU {product.record.sku}</p>
                    {product.record.shortDescription ? (
                      <p className="text-sm text-muted-foreground">{product.record.shortDescription}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{formatMoney(unitPrice, currency)}</span>
                    <Link
                      href={product.canonicalPath as Route}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href={buildHref({ page: Math.max(1, page - 1) }, { resetPage: false }) as Route}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Link>

          {pageNumbers.map((pageNumber) => (
            <Link
              key={pageNumber}
              href={buildHref({ page: pageNumber }, { resetPage: false }) as Route}
              className={cn(
                buttonVariants({ variant: pageNumber === page ? "default" : "outline", size: "sm" }),
                "min-w-9",
              )}
              aria-current={pageNumber === page ? "page" : undefined}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={buildHref({ page: Math.min(totalPages, page + 1) }, { resetPage: false }) as Route}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : 0}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
