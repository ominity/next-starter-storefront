"use client";

import type { CmsLocale, CmsLocaleSegmentStrategy, CmsRouteObject, CmsRoutingConfig } from "@ominity/next/cms";
import {
  createRoutingConfig,
  localePrefixSegments,
  matchLocaleFromSegments,
  normalizeLocaleCode,
  parseLocaleCode,
} from "@ominity/next/cms";
import { buildLocalizedRoutePath, buildLocalizedStaticPath } from "@ominity/next/next";
import { ChevronDown, Heart, Menu, PackageSearch, UserCircle2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useCommerce } from "@/components/commerce/commerce-provider";
import { CartDrawer } from "@/components/site/cart-drawer";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import {
  localizedCommerceSlugMapForRoute,
  localizedCommerceTemplateMapForRoute,
} from "@/lib/ominity/commerce/route-translations";
import { resolveUiDictionary } from "@/lib/i18n/ui-dictionary";

interface LanguageOption {
  readonly language: string;
  readonly label: string;
}

interface CountryOption {
  readonly code: string;
  readonly label: string;
  readonly currency?: string;
}

interface SiteHeaderCategory {
  readonly id: string;
  readonly name: string;
  readonly routes: Readonly<Record<string, CmsRouteObject>>;
}

interface SiteHeaderClientProps {
  readonly defaultLocale: string;
  readonly defaultCountry?: string;
  readonly defaultCurrency?: string;
  readonly locales: ReadonlyArray<CmsLocale>;
  readonly countries: ReadonlyArray<string>;
  readonly countryCurrencyMap: Readonly<Record<string, string>>;
  readonly currencies: ReadonlyArray<string>;
  readonly categories: ReadonlyArray<SiteHeaderCategory>;
  readonly localeSegmentStrategy: CmsLocaleSegmentStrategy;
  readonly trailingSlash: boolean;
  readonly basePath: string;
  readonly enableCommerceProducts: boolean;
  readonly enableCommerceCategories: boolean;
  readonly enableCommerceCart: boolean;
  readonly enableCommerceWishlist: boolean;
  readonly enableCommerceCheckout: boolean;
  readonly enableAuth: boolean;
}

const CATEGORY_TEMPLATE_BY_LOCALE = localizedCommerceTemplateMapForRoute("category");

function normalizePath(path: string): string {
  if (path.length === 0) {
    return "/";
  }

  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.replace(/\/+$/, "");
}

function splitPath(path: string): ReadonlyArray<string> {
  return normalizePath(path).split("/").filter((segment) => segment.length > 0);
}

function normalizePathSegments(value: unknown): ReadonlyArray<string> {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => `${entry}`.split("/"))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split("/")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "number") {
    return [`${value}`];
  }

  return [];
}

function joinPath(segments: ReadonlyArray<string>): string {
  if (segments.length === 0) {
    return "/";
  }

  return `/${segments.join("/")}`;
}

function removeBasePath(path: string, basePath: string): string {
  if (basePath.length === 0 || basePath === "/") {
    return normalizePath(path);
  }

  const normalizedPath = normalizePath(path);
  const normalizedBasePath = normalizePath(basePath);

  if (normalizedPath === normalizedBasePath) {
    return "/";
  }

  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizePath(normalizedPath.slice(normalizedBasePath.length));
  }

  return normalizedPath;
}

function localizeRelativePath(path: string, locale: string, routing: CmsRoutingConfig): string {
  const routeSegments = splitPath(path);
  const prefixSegments = localePrefixSegments(locale, routing);
  const combined = [...prefixSegments, ...routeSegments];
  const localizedPath = joinPath(combined);

  const withBasePath = routing.basePath.length > 0
    ? normalizePath(`${routing.basePath}${localizedPath === "/" ? "" : localizedPath}`)
    : localizedPath;

  if (routing.trailingSlash && withBasePath !== "/") {
    return `${withBasePath}/`;
  }

  return withBasePath;
}

function localizedCommerceUtilityPath(
  route: "products" | "cart" | "wishlist" | "checkout" | "payment",
  locale: string,
  routing: CmsRoutingConfig,
): string {
  return buildLocalizedStaticPath({
    routing,
    locale,
    prefixPath: "/",
    slugByLocale: localizedCommerceSlugMapForRoute(route),
  });
}

function localeCandidates(locale: string): ReadonlyArray<string> {
  const normalizedLocale = normalizeLocaleCode(locale);
  const parsed = parseLocaleCode(normalizedLocale);
  return Array.from(new Set([normalizedLocale, parsed.language].filter((entry) => entry.length > 0)));
}

function resolveCategoryRouteForLocale(
  routes: Readonly<Record<string, CmsRouteObject>>,
  locale: string,
): CmsRouteObject | null {
  for (const candidate of localeCandidates(locale)) {
    const direct = routes[normalizeLocaleCode(candidate)];
    if (direct && direct.name === "category") {
      return direct;
    }
  }

  for (const candidate of localeCandidates(locale)) {
    const normalizedCandidate = normalizeLocaleCode(candidate);
    for (const route of Object.values(routes)) {
      if (route.name !== "category") {
        continue;
      }

      const routeLocale = typeof route.locale === "string" && route.locale.length > 0
        ? normalizeLocaleCode(route.locale)
        : normalizedCandidate;

      if (routeLocale === normalizedCandidate) {
        return route;
      }
    }
  }

  return Object.values(routes).find((route) => route.name === "category") ?? null;
}

function localeLabel(locale: CmsLocale): string {
  const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
  if (typeof locale.label === "string" && locale.label.length > 0) {
    return locale.label;
  }

  return parsed.language.toUpperCase();
}

function buildLanguageOptions(locales: ReadonlyArray<CmsLocale>): ReadonlyArray<LanguageOption> {
  const unique = new Map<string, LanguageOption>();
  for (const locale of locales) {
    const normalizedCode = normalizeLocaleCode(locale.code);
    const parsed = parseLocaleCode(normalizedCode);
    if (parsed.language.length === 0 || unique.has(parsed.language)) {
      continue;
    }

    unique.set(parsed.language, {
      language: parsed.language,
      label: localeLabel(locale),
    });
  }

  return Array.from(unique.values());
}

function resolveLocaleForLanguageAndCountry(
  locales: ReadonlyArray<CmsLocale>,
  language: string,
  country: string | undefined,
  fallbackLocale: string,
): string {
  const normalizedLanguage = language.trim().toLowerCase();
  const normalizedCountry = typeof country === "string" ? country.trim().toUpperCase() : "";

  const exact = locales.find((locale) => {
    const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
    return parsed.language === normalizedLanguage
      && parsed.country === normalizedCountry;
  });
  if (exact) {
    return normalizeLocaleCode(exact.code);
  }

  const languageDefault = locales.find((locale) => {
    const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
    return parsed.language === normalizedLanguage && locale.default === true;
  });
  if (languageDefault) {
    return normalizeLocaleCode(languageDefault.code);
  }

  const firstLanguageMatch = locales.find((locale) => {
    const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
    return parsed.language === normalizedLanguage;
  });
  if (firstLanguageMatch) {
    return normalizeLocaleCode(firstLanguageMatch.code);
  }

  return normalizeLocaleCode(fallbackLocale);
}

function resolvePathContext(pathname: string, routing: CmsRoutingConfig): {
  readonly locale: string;
  readonly suffixSegments: ReadonlyArray<string>;
} {
  const relativePath = removeBasePath(pathname, routing.basePath);
  const segments = splitPath(relativePath);
  const matched = matchLocaleFromSegments(segments, routing);
  const matchedLocale = matched
    ? normalizeLocaleCode(matched.locale)
    : normalizeLocaleCode(routing.defaultLocale);
  const consumedSegments = routing.localeSegmentStrategy === "none"
    ? 0
    : matched && matched.consumedSegments > 0
      ? matched.consumedSegments
      : 0;

  return {
    locale: matchedLocale,
    suffixSegments: segments.slice(consumedSegments),
  };
}

function withQuery(path: string, query: string): string {
  return query.length > 0 ? `${path}?${query}` : path;
}

function countryCodesForLanguage(locales: ReadonlyArray<CmsLocale>, language: string): ReadonlyArray<string> {
  const normalizedLanguage = language.trim().toLowerCase();
  const values = new Set<string>();

  for (const locale of locales) {
    const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
    if (parsed.language !== normalizedLanguage || !parsed.country) {
      continue;
    }

    values.add(parsed.country.toUpperCase());
  }

  return Array.from(values.values());
}

function resolveCurrencyForCountry(input: {
  readonly country: string;
  readonly countryCurrencyMap: Readonly<Record<string, string>>;
  readonly availableCurrencies: ReadonlyArray<string>;
  readonly defaultCurrency?: string;
}): string | undefined {
  const normalizedCountry = input.country.trim().toUpperCase();
  const currencySet = new Set(input.availableCurrencies.map((entry) => entry.trim().toUpperCase()));
  const fromCountry = input.countryCurrencyMap[normalizedCountry]?.toUpperCase();
  if (fromCountry && (currencySet.size === 0 || currencySet.has(fromCountry))) {
    return fromCountry;
  }

  const defaultCurrency = input.defaultCurrency?.trim().toUpperCase();
  if (defaultCurrency && (currencySet.size === 0 || currencySet.has(defaultCurrency))) {
    return defaultCurrency;
  }

  return input.availableCurrencies[0]?.toUpperCase();
}

export function SiteHeaderClient(props: SiteHeaderClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const commerce = useCommerce();

  const routing = useMemo(() => createRoutingConfig({
    defaultLocale: props.defaultLocale,
    locales: props.locales,
    localeSegmentStrategy: props.localeSegmentStrategy,
    trailingSlash: props.trailingSlash,
    basePath: props.basePath,
  }), [
    props.basePath,
    props.defaultLocale,
    props.localeSegmentStrategy,
    props.locales,
    props.trailingSlash,
  ]);

  const pathContext = useMemo(() => resolvePathContext(pathname, routing), [pathname, routing]);
  const currentLocale = pathContext.locale;
  const currentLanguage = parseLocaleCode(currentLocale).language;
  const countryFromLocale = parseLocaleCode(currentLocale).country;
  const activeCountry = countryFromLocale
    ?? commerce.cartCountry
    ?? props.defaultCountry
    ?? props.countries[0];

  const languageOptions = useMemo(
    () => buildLanguageOptions(props.locales),
    [props.locales],
  );
  const activeLanguage = languageOptions.some((entry) => entry.language === currentLanguage)
    ? currentLanguage
    : languageOptions[0]?.language
      ?? currentLanguage;

  const countryOptions = useMemo<ReadonlyArray<CountryOption>>(() => {
    const fromLocales = countryCodesForLanguage(props.locales, activeLanguage);
    const fallback = props.countries.map((entry) => entry.toUpperCase());
    const unique = new Set<string>([...fromLocales, ...fallback]);
    const sorted = Array.from(unique.values()).sort((left, right) => left.localeCompare(right));

    return sorted.map((countryCode) => {
      const currency = resolveCurrencyForCountry({
        country: countryCode,
        countryCurrencyMap: props.countryCurrencyMap,
        availableCurrencies: props.currencies,
        ...(typeof props.defaultCurrency === "string" ? { defaultCurrency: props.defaultCurrency } : {}),
      });

      return {
        code: countryCode,
        label: currency ? `${countryCode} (${currency})` : countryCode,
        ...(currency ? { currency } : {}),
      };
    });
  }, [activeLanguage, props.countries, props.countryCurrencyMap, props.currencies, props.defaultCurrency, props.locales]);
  const activeCountryCode = countryOptions.some((entry) => entry.code === activeCountry)
    ? activeCountry
    : countryOptions[0]?.code;

  const dictionary = useMemo(() => resolveUiDictionary(currentLocale), [currentLocale]);
  const showLocaleSwitcher = props.localeSegmentStrategy !== "none"
    && (
      languageOptions.length > 1
      || (props.localeSegmentStrategy === "country-language" && countryOptions.length > 1)
    );

  useEffect(() => {
    document.cookie = `ominity_locale=${encodeURIComponent(currentLocale)}; path=/; max-age=31536000; samesite=lax`;
    if (activeCountryCode) {
      document.cookie = `ominity_country=${encodeURIComponent(activeCountryCode)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [activeCountryCode, currentLocale]);

  const homePath = localizeRelativePath("/", currentLocale, routing);
  const contactPath = localizeRelativePath("/contact", currentLocale, routing);
  const productsPath = localizedCommerceUtilityPath("products", currentLocale, routing);
  const cartPath = localizedCommerceUtilityPath("cart", currentLocale, routing);
  const checkoutPath = localizedCommerceUtilityPath("checkout", currentLocale, routing);
  const wishlistPath = localizedCommerceUtilityPath("wishlist", currentLocale, routing);
  const accountPath = localizeRelativePath("/account", currentLocale, routing);
  const categoryLinks = useMemo(
    () => props.categories
      .map((entry) => {
        const route = resolveCategoryRouteForLocale(entry.routes, currentLocale);
        if (!route) {
          return null;
        }

        const slugSegments = normalizePathSegments(route.parameters.slug);
        if (slugSegments.length === 0) {
          return null;
        }

        let path: string;
        try {
          path = buildLocalizedRoutePath({
            routing,
            locale: currentLocale,
            templateByLocale: CATEGORY_TEMPLATE_BY_LOCALE,
            params: {
              slug: [...slugSegments],
            },
          });
        } catch {
          return null;
        }

        return {
          id: entry.id,
          label: entry.name,
          path,
        };
      })
      .filter((entry): entry is { readonly id: string; readonly label: string; readonly path: string } => entry !== null),
    [currentLocale, props.categories, routing],
  );

  const navigateToLocale = (nextLocaleCode: string, nextCountryCode?: string) => {
    const currentQuery = typeof window !== "undefined"
      ? window.location.search.replace(/^\?/, "")
      : "";
    const nextPath = localizeRelativePath(
      joinPath(pathContext.suffixSegments),
      nextLocaleCode,
      routing,
    );

    document.cookie = `ominity_locale=${encodeURIComponent(nextLocaleCode)}; path=/; max-age=31536000; samesite=lax`;
    if (nextCountryCode) {
      document.cookie = `ominity_country=${encodeURIComponent(nextCountryCode)}; path=/; max-age=31536000; samesite=lax`;
      const nextCurrency = resolveCurrencyForCountry({
        country: nextCountryCode,
        countryCurrencyMap: props.countryCurrencyMap,
        availableCurrencies: props.currencies,
        ...(typeof props.defaultCurrency === "string" ? { defaultCurrency: props.defaultCurrency } : {}),
      });
      if (nextCurrency) {
        document.cookie = `ominity_currency=${encodeURIComponent(nextCurrency)}; path=/; max-age=31536000; samesite=lax`;
      }
    }

    router.push(withQuery(nextPath, currentQuery) as Route);
  };

  const onLanguageChange = (nextLanguage: string) => {
    const nextLocale = resolveLocaleForLanguageAndCountry(
      props.locales,
      nextLanguage,
      activeCountryCode,
      currentLocale,
    );
    const parsed = parseLocaleCode(normalizeLocaleCode(nextLocale));
    const nextCountryCode = parsed.country ?? activeCountryCode;

    if (nextCountryCode && props.enableCommerceCart) {
      void commerce.setCartCountry(nextCountryCode);
    }

    navigateToLocale(nextLocale, nextCountryCode);
  };

  const onCountryChange = (nextCountryCode: string) => {
    const nextLocale = resolveLocaleForLanguageAndCountry(
      props.locales,
      activeLanguage,
      nextCountryCode,
      currentLocale,
    );

    if (props.enableCommerceCart) {
      void commerce.setCartCountry(nextCountryCode);
    }

    navigateToLocale(nextLocale, nextCountryCode);
  };

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link href={homePath as Route} className="font-semibold">
          {dictionary.brandName}
        </Link>

        <nav className="flex items-center gap-2">
          <Link href={contactPath as Route} className="text-sm text-muted-foreground hover:text-foreground">
            {dictionary.nav.contact}
          </Link>

          {props.enableCommerceProducts && (
            <Link
              href={productsPath as Route}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
              aria-label={dictionary.nav.product}
            >
              <PackageSearch className="h-4 w-4" />
            </Link>
          )}

          {props.enableCommerceCategories && categoryLinks.length > 0 && (
            <details className="group relative">
              <summary className="list-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground">
                  <Menu className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                  <span className="sr-only">{dictionary.nav.category}</span>
                </span>
              </summary>

              <div className="absolute right-0 top-10 z-40 min-w-48 rounded-md border bg-background p-2 shadow-xl">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Categories
                </p>
                {categoryLinks.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.path as Route}
                    className="block rounded px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  >
                    {entry.label}
                  </Link>
                ))}
                <Link
                  href={productsPath as Route}
                  className="mt-1 block rounded px-2 py-1.5 text-xs font-medium text-primary transition hover:bg-accent"
                >
                  Browse all products
                </Link>
              </div>
            </details>
          )}

          {props.enableCommerceCart && (
            <CartDrawer
              title={dictionary.nav.cart}
              cartPath={cartPath}
              checkoutPath={checkoutPath}
              checkoutEnabled={props.enableCommerceCheckout}
              emptyText="Your cart is empty."
              viewCartText="View cart"
              checkoutText="Checkout"
            />
          )}

          {props.enableCommerceWishlist && (
            <Link
              href={wishlistPath as Route}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
              aria-label={dictionary.nav.wishlist}
            >
              <Heart className="h-4 w-4" />
              {commerce.wishlist.length > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {commerce.wishlist.length > 99 ? "99+" : commerce.wishlist.length}
                </span>
              )}
            </Link>
          )}

          {props.enableAuth && (
            <Link
              href={accountPath as Route}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
              aria-label={dictionary.nav.account}
            >
              <UserCircle2 className="h-4 w-4" />
            </Link>
          )}

          {showLocaleSwitcher && (
            <LocaleSwitcher
              languageLabel={dictionary.switcher.languageLabel}
              languageValue={activeLanguage}
              languageOptions={languageOptions.map((entry) => ({
                code: entry.language,
                label: entry.label,
              }))}
              onLanguageChange={onLanguageChange}
              {...(props.localeSegmentStrategy === "country-language" && activeCountryCode
                ? {
                  countryLabel: dictionary.switcher.countryLabel,
                  countryValue: activeCountryCode,
                  countryOptions: countryOptions.map((entry) => ({
                    code: entry.code,
                    label: entry.label,
                  })),
                  onCountryChange,
                }
                : {})}
            />
          )}
        </nav>
      </div>
    </header>
  );
}
