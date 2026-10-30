import type { Metadata } from "next";
import type { ReactNode } from "react";

import type { ResolvedPage } from "@/lib/ominity/pages";
import type { RoutePaths } from "@/lib/ominity/routes";

export type PageKind = ResolvedPage["kind"];
export type PageOf<K extends PageKind> = ResolvedPage & { readonly kind: K };

export interface ViewContext<K extends PageKind> {
  readonly page: PageOf<K>;
  readonly paths: RoutePaths;
  /** The incoming path, e.g. `/en/about`. */
  readonly path: string;
  readonly preview: boolean;
  /** A query-string value. Reading one renders the page per request, so only views that need it do. */
  param(name: string): Promise<string | undefined>;
}

/** How one kind of page renders. The catch-all page adds the canonical and language alternates. */
export interface PageView<K extends PageKind> {
  /** The title for views without their own `metadata`. */
  readonly title?: string;
  /** Pages without their own `metadata` stay out of search results unless `indexed`. */
  readonly indexed?: boolean;
  metadata?(page: PageOf<K>): Metadata | Promise<Metadata>;
  render(context: ViewContext<K>): ReactNode | Promise<ReactNode>;
}

export type PageViews<K extends PageKind = PageKind> = { readonly [P in K]: PageView<P> };
