import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const COMMERCE_UTILITY_ROUTES = ["products", "cart", "wishlist", "checkout", "payment"] as const;
type CommerceUtilityRoute = (typeof COMMERCE_UTILITY_ROUTES)[number];

const DEFAULT_UTILITY_ROUTE_TEMPLATES: Readonly<Record<CommerceUtilityRoute, string>> = {
  products: "products",
  cart: "cart",
  wishlist: "wishlist",
  checkout: "checkout",
  payment: "payment",
};

const DEFAULT_PRODUCT_ROUTE_TEMPLATE = "p/{sku}-{slug}";
const DEFAULT_CATEGORY_ROUTE_TEMPLATE = "c/{slug}";

interface CommerceRouteTranslationFile extends Record<CommerceUtilityRoute | "product" | "category", string> {}

interface RewriteRule {
  source: string;
  destination: string;
}

function normalizeTemplate(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  return normalized.length > 0 ? normalized : fallback;
}

function splitTemplate(template: string): ReadonlyArray<string> {
  return normalizeTemplate(template, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function hasPlaceholder(segment: string): boolean {
  return /{[A-Za-z0-9_]+}/.test(segment);
}

function normalizeCommerceTranslations(
  input: Partial<CommerceRouteTranslationFile> | null | undefined,
): CommerceRouteTranslationFile {
  const source = input ?? {};

  return {
    products: normalizeTemplate(source.products, DEFAULT_UTILITY_ROUTE_TEMPLATES.products),
    cart: normalizeTemplate(source.cart, DEFAULT_UTILITY_ROUTE_TEMPLATES.cart),
    wishlist: normalizeTemplate(source.wishlist, DEFAULT_UTILITY_ROUTE_TEMPLATES.wishlist),
    checkout: normalizeTemplate(source.checkout, DEFAULT_UTILITY_ROUTE_TEMPLATES.checkout),
    payment: normalizeTemplate(source.payment, DEFAULT_UTILITY_ROUTE_TEMPLATES.payment),
    product: normalizeTemplate(source.product, DEFAULT_PRODUCT_ROUTE_TEMPLATE),
    category: normalizeTemplate(source.category, DEFAULT_CATEGORY_ROUTE_TEMPLATE),
  };
}

function readCommerceTranslationFiles(): ReadonlyArray<CommerceRouteTranslationFile> {
  const commerceRoutesDirectory = path.join(process.cwd(), "src/locales/routes/commerce");
  if (!fs.existsSync(commerceRoutesDirectory)) {
    return [normalizeCommerceTranslations(undefined)];
  }

  const files = fs.readdirSync(commerceRoutesDirectory).filter((entry) => entry.endsWith(".json"));
  const translations: CommerceRouteTranslationFile[] = [];

  for (const file of files) {
    const absolutePath = path.join(commerceRoutesDirectory, file);
    try {
      const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Partial<CommerceRouteTranslationFile>;
      translations.push(normalizeCommerceTranslations(parsed));
    } catch {
      // Ignore malformed translation files and continue with others.
    }
  }

  if (translations.length === 0) {
    return [normalizeCommerceTranslations(undefined)];
  }

  return translations;
}

function normalizeRoutePath(pathTemplate: string): string {
  const normalized = normalizeTemplate(pathTemplate, "");
  return normalized.length > 0 ? `/${normalized}` : "/";
}

function addLocalizedRewrite(
  ruleSet: Map<string, RewriteRule>,
  sourceTemplate: string,
  destinationTemplate: string,
): void {
  const sourcePath = normalizeRoutePath(sourceTemplate);
  const destinationPath = normalizeRoutePath(destinationTemplate);

  const candidates: ReadonlyArray<RewriteRule> = [
    { source: sourcePath, destination: destinationPath },
    { source: `/:segment${sourcePath === "/" ? "" : sourcePath}`, destination: `/:segment${destinationPath === "/" ? "" : destinationPath}` },
    {
      source: `/:segment/:locale${sourcePath === "/" ? "" : sourcePath}`,
      destination: `/:segment/:locale${destinationPath === "/" ? "" : destinationPath}`,
    },
  ];

  for (const candidate of candidates) {
    if (candidate.source === candidate.destination) {
      continue;
    }

    const key = `${candidate.source}=>${candidate.destination}`;
    if (!ruleSet.has(key)) {
      ruleSet.set(key, candidate);
    }
  }
}

function productTemplateToRewriteSource(template: string): string | null {
  const segments = splitTemplate(template);
  const dynamicSegments = segments.filter((segment) => hasPlaceholder(segment));
  if (dynamicSegments.length !== 1) {
    return null;
  }

  const sourceSegments = segments.map((segment) => (hasPlaceholder(segment) ? ":product" : segment));
  return sourceSegments.join("/");
}

function categoryTemplateToRewriteSource(template: string): string | null {
  const segments = splitTemplate(template);
  const dynamicIndexes = segments
    .map((segment, index) => (hasPlaceholder(segment) ? index : -1))
    .filter((index) => index >= 0);

  if (dynamicIndexes.length !== 1) {
    return null;
  }

  const dynamicIndex = dynamicIndexes[0];
  if (typeof dynamicIndex !== "number") {
    return null;
  }

  if (segments[dynamicIndex] !== "{slug}") {
    return null;
  }

  const sourceSegments = segments.map((segment, index) => (index === dynamicIndex ? ":slug*" : segment));
  return sourceSegments.join("/");
}

function buildLocalizedCommerceRewrites(): RewriteRule[] {
  const translations = readCommerceTranslationFiles();
  const ruleSet = new Map<string, RewriteRule>();

  for (const translation of translations) {
    for (const route of COMMERCE_UTILITY_ROUTES) {
      const sourceTemplate = normalizeTemplate(translation[route], DEFAULT_UTILITY_ROUTE_TEMPLATES[route]);
      const destinationTemplate = DEFAULT_UTILITY_ROUTE_TEMPLATES[route];
      addLocalizedRewrite(ruleSet, sourceTemplate, destinationTemplate);
    }

    const productSource = productTemplateToRewriteSource(
      normalizeTemplate(translation.product, DEFAULT_PRODUCT_ROUTE_TEMPLATE),
    );
    if (productSource) {
      addLocalizedRewrite(ruleSet, productSource, "p/:product");
    }

    const categorySource = categoryTemplateToRewriteSource(
      normalizeTemplate(translation.category, DEFAULT_CATEGORY_ROUTE_TEMPLATE),
    );
    if (categorySource) {
      addLocalizedRewrite(ruleSet, categorySource, "c/:slug*");
    }
  }

  return Array.from(ruleSet.values());
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ominity/api-module-forms"],
  async rewrites() {
    return buildLocalizedCommerceRewrites();
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.conditionNames = [
      "@ominity/api-modules-template/source",
      ...(config.resolve.conditionNames ?? []),
    ];
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };

    return config;
  },
};

export default nextConfig;
