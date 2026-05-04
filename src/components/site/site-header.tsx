import type { CmsLinkTarget } from "@ominity/next/cms";
import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { buildAuthUtilityPaths } from "@/lib/ominity/auth";
import { getStarterChannelContext } from "@/lib/ominity/channel-context";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { buildCommerceUtilityPaths } from "@/lib/ominity/commerce";
import { cmsLinkResolver } from "@/lib/ominity/routing";

const renderLink = (target: CmsLinkTarget, label: string, className: string, locale?: string) => {
  const resolved = cmsLinkResolver.resolve(target, locale ? { locale } : undefined);

  if (resolved.external) {
    return (
      <a href={resolved.href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={resolved.href as Route} className={className}>
      {label}
    </Link>
  );
};

export async function SiteHeader() {
  const config = getStarterOminityConfig();
  const channelContext = await getStarterChannelContext();
  const commercePaths = buildCommerceUtilityPaths(channelContext.defaultLocale);
  const authPaths = buildAuthUtilityPaths(channelContext.defaultLocale);

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        {renderLink(
          {
            resource: "route",
            name: "page",
            parameters: { slug: "" },
          },
          "Ominity Starter",
          "font-semibold",
          channelContext.defaultLocale,
        )}

        <nav className="flex items-center gap-2">
          {renderLink(
            {
              resource: "route",
              name: "page",
              parameters: { slug: "contact" },
            },
            "Contact",
            "text-sm text-muted-foreground hover:text-foreground",
            channelContext.defaultLocale,
          )}

          {config.enableCommerceProducts && renderLink(
            {
              resource: "route",
              name: "product",
              parameters: {
                sku: "SKU-001",
                slug: "starter-ergonomic-chair",
              },
            },
            "Product",
            buttonVariants({ variant: "secondary", size: "sm" }),
            channelContext.defaultLocale,
          )}

          {config.enableCommerceCategories && renderLink(
            {
              resource: "route",
              name: "category",
              parameters: {
                slug: "office/chairs",
              },
            },
            "Category",
            "text-sm text-muted-foreground hover:text-foreground",
            channelContext.defaultLocale,
          )}

          {config.enableCommerceCart && (
            <Link
              href={commercePaths.cart as Route}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cart
            </Link>
          )}

          {config.enableCommerceWishlist && (
            <Link
              href={commercePaths.wishlist as Route}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Wishlist
            </Link>
          )}

          {config.enableAuth && (
            <Link
              href={authPaths.account as Route}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Account
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
