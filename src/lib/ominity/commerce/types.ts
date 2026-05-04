import type { CmsRouteObject } from "@ominity/next/cms";
import type { StarterLocaleVariant } from "@/lib/ominity/locale-variant";

export type CommerceLocaleVariant = StarterLocaleVariant;

export interface StarterCommerceProductRecord {
  readonly id: string;
  readonly numericId?: number;
  readonly sku: string;
  readonly title: string;
  readonly price?: number;
  readonly currency?: string;
  readonly shortDescription?: string;
  readonly description?: string;
  readonly coverImage?: string;
  readonly stock?: number;
  readonly categoryId?: number;
  readonly categorySlugs?: Readonly<Record<string, string>>;
  readonly routes: Readonly<Record<string, CmsRouteObject>>;
}

export interface StarterCommerceCategoryRecord {
  readonly id: string;
  readonly numericId?: number;
  readonly name: string;
  readonly description?: string;
  readonly coverImage?: string;
  readonly productsCount?: number;
  readonly fullSlug?: string;
  readonly routes: Readonly<Record<string, CmsRouteObject>>;
}

export interface StarterResolvedCommerceProduct {
  readonly record: StarterCommerceProductRecord;
  readonly locale: string;
  readonly route: CmsRouteObject;
  readonly routeSegment: string;
  readonly canonicalPath: string;
}

export interface StarterResolvedCommerceCategory {
  readonly record: StarterCommerceCategoryRecord;
  readonly locale: string;
  readonly route: CmsRouteObject;
  readonly slugSegments: ReadonlyArray<string>;
  readonly canonicalPath: string;
}

export interface StarterCommerceProductRouteEntry {
  readonly locale: string;
  readonly routeSegment: string;
}

export interface StarterCommerceCategoryRouteEntry {
  readonly locale: string;
  readonly slugSegments: ReadonlyArray<string>;
}
