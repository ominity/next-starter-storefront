"use client";

import { parseLocaleCode } from "@ominity/next/cms";
import { useCart, useWishlist } from "@ominity/next/react";
import { ChevronDown, Heart, Menu, PackageSearch, UserCircle2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AccountSwitcher } from "@/components/account/account-switcher";
import { CartDrawer } from "@/components/site/cart-drawer";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { resolveUiDictionary } from "@/lib/i18n/ui-dictionary";
import type { RoutePaths } from "@/lib/ominity/routes";

interface HeaderLink {
  readonly label: string;
  readonly path: string;
}

export interface SiteHeaderClientProps {
  readonly locale: string;
  readonly paths: RoutePaths;
  readonly contactPath: string;
  readonly categories: ReadonlyArray<HeaderLink & { readonly id: number }>;
  /** Every channel locale with the current page's URL in it. */
  readonly locales: ReadonlyArray<HeaderLink & { readonly code: string }>;
}

const iconLink = "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground";

function rememberLocale(locale: string): void {
  document.cookie = `ominity_locale=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
}

export function SiteHeaderClient({ locale, paths, contactPath, categories, locales }: SiteHeaderClientProps) {
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const dictionary = resolveUiDictionary(locale);

  useEffect(() => rememberLocale(locale), [locale]);

  const switchLocale = (code: string) => {
    const target = locales.find((entry) => entry.code === code);
    if (!target) return;
    rememberLocale(code);
    const country = parseLocaleCode(code).country;
    if (country && cart.cart) void cart.setCountry(country);
    router.push(target.path as Route);
  };

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link href={paths.home as Route} className="font-semibold">{dictionary.brandName}</Link>

        <nav className="flex items-center gap-2">
          <Link href={contactPath as Route} className="text-sm text-muted-foreground hover:text-foreground">
            {dictionary.nav.contact}
          </Link>

          <Link href={paths.products as Route} className={iconLink} aria-label={dictionary.nav.product}>
            <PackageSearch className="h-4 w-4" />
          </Link>

          {categories.length > 0 && (
            <details className="group relative">
              <summary className="list-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground">
                  <Menu className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                  <span className="sr-only">{dictionary.nav.category}</span>
                </span>
              </summary>
              <div className="absolute right-0 top-10 z-40 min-w-48 rounded-md border bg-background p-2 shadow-xl">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={category.path as Route}
                    className="block rounded px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    {category.label}
                  </Link>
                ))}
                <Link href={paths.products as Route} className="mt-1 block rounded px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-accent">
                  Browse all products
                </Link>
              </div>
            </details>
          )}

          <CartDrawer
            title={dictionary.nav.cart}
            cartPath={paths.cart}
            checkoutPath={paths.checkout}
            emptyText="Your cart is empty."
            viewCartText="View cart"
            checkoutText="Checkout"
          />

          <Link href={paths.wishlist as Route} className={iconLink} aria-label={dictionary.nav.wishlist}>
            <Heart className="h-4 w-4" />
            {wishlist.items.length > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {wishlist.items.length > 99 ? "99+" : wishlist.items.length}
              </span>
            )}
          </Link>

          <AccountSwitcher className="hidden md:block" />

          <Link href={paths.account as Route} className={iconLink} aria-label={dictionary.nav.account}>
            <UserCircle2 className="h-4 w-4" />
          </Link>

          {locales.length > 1 && (
            <LocaleSwitcher
              label={dictionary.switcher.languageLabel}
              value={locale}
              options={locales.map((entry) => ({ code: entry.code, label: entry.label }))}
              onChange={switchLocale}
            />
          )}
        </nav>
      </div>
    </header>
  );
}
