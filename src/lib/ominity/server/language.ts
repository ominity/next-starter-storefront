import { matchLocaleFromSegments, normalizeLocaleCode, parseLocaleCode, type CmsRoutingConfig } from "@ominity/next/cms";

import { getStarterChannelContext } from "@/lib/ominity/channel-context";
import { getChannelAwareCmsRouting } from "@/lib/ominity/routing";

const LOCALE_COOKIE_NAME = "ominity_locale";
const COUNTRY_COOKIE_NAME = "ominity_country";

function asNonEmpty(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

function cookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return undefined;
  }

  const entries = cookieHeader.split(";");
  for (const entry of entries) {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = entry.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }

    const raw = entry.slice(separatorIndex + 1).trim();
    if (!raw) {
      return undefined;
    }

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return undefined;
}

function localeCandidate(value: string | null | undefined): string | undefined {
  const raw = asNonEmpty(value);
  if (!raw) {
    return undefined;
  }

  const token = raw.split(",")[0]?.split(";")[0]?.trim();
  if (!token) {
    return undefined;
  }

  return normalizeLocaleCode(token.replaceAll("_", "-"));
}

function countryCandidate(value: string | null | undefined): string | undefined {
  const raw = asNonEmpty(value);
  if (!raw) {
    return undefined;
  }

  const token = raw.split(",")[0]?.split(";")[0]?.trim();
  if (!token) {
    return undefined;
  }

  const uppercase = token.toUpperCase().replaceAll("_", "-");
  if (!/^[A-Z]{2}$/.test(uppercase)) {
    return undefined;
  }

  if (uppercase === "XX" || uppercase === "T1") {
    return undefined;
  }

  return uppercase;
}

function countryFromLocale(locale: string | undefined): string | undefined {
  if (typeof locale !== "string" || locale.length === 0) {
    return undefined;
  }

  const country = parseLocaleCode(normalizeLocaleCode(locale)).country;
  return typeof country === "string" && country.length > 0 ? country.toUpperCase() : undefined;
}

function explicitCountryFromRequestHeaders(request: Request): string | undefined {
  const candidates = [
    request.headers.get("x-ominity-country"),
    request.headers.get("x-country"),
    request.headers.get("x-country-code"),
  ];

  for (const candidate of candidates) {
    const normalized = countryCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function detectedCountryFromRequestHeaders(request: Request): string | undefined {
  const candidates = [
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("cf-ipcountry"),
    request.headers.get("cloudfront-viewer-country"),
    request.headers.get("fastly-country-code"),
    request.headers.get("x-appengine-country"),
  ];

  for (const candidate of candidates) {
    const normalized = countryCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function pathnameFromUrlLike(value: string | null | undefined): string | undefined {
  const trimmed = asNonEmpty(value);
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    return new URL(trimmed).pathname;
  } catch {
    return undefined;
  }
}

function localeFromPath(pathname: string, routing: CmsRoutingConfig): string | undefined {
  if (routing.localeSegmentStrategy === "none") {
    return undefined;
  }

  const relativePath = removeBasePath(pathname, routing.basePath);
  const segments = splitPath(relativePath);
  const matched = matchLocaleFromSegments(segments, routing);
  if (!matched || matched.consumedSegments <= 0) {
    return undefined;
  }

  return normalizeLocaleCode(matched.locale);
}

function sdkLanguageFromLocale(locale: string): string | undefined {
  const language = parseLocaleCode(normalizeLocaleCode(locale)).language;
  return language.length > 0 ? language : undefined;
}

async function localeFromRoutingContext(request: Request): Promise<string | undefined> {
  const routing = await getChannelAwareCmsRouting();
  const refererPath = pathnameFromUrlLike(request.headers.get("referer"));
  if (refererPath) {
    const fromReferer = localeFromPath(refererPath, routing);
    if (fromReferer) {
      return fromReferer;
    }
  }

  const requestPath = pathnameFromUrlLike(request.url);
  if (requestPath) {
    return localeFromPath(requestPath, routing);
  }

  return undefined;
}

export async function resolveRequestLocale(request: Request): Promise<string | undefined> {
  const fromLocaleHeader = localeCandidate(request.headers.get("x-ominity-locale"));
  if (fromLocaleHeader) {
    return fromLocaleHeader;
  }

  const fromLanguageHeader = localeCandidate(request.headers.get("x-ominity-language"));
  if (fromLanguageHeader) {
    return fromLanguageHeader;
  }

  const fromLocaleCookie = localeCandidate(cookieValue(request.headers.get("cookie"), LOCALE_COOKIE_NAME));
  if (fromLocaleCookie) {
    return fromLocaleCookie;
  }

  const fromRouting = await localeFromRoutingContext(request);
  if (fromRouting) {
    return fromRouting;
  }

  return localeCandidate(request.headers.get("accept-language"));
}

export async function resolveRequestSdkLanguage(request: Request): Promise<string | undefined> {
  const locale = await resolveRequestLocale(request);
  if (!locale) {
    return undefined;
  }

  return sdkLanguageFromLocale(locale);
}

export async function resolveRequestCountry(request: Request): Promise<string | undefined> {
  const channelContext = await getStarterChannelContext();
  const allowedCountries = new Set(channelContext.countries.map((entry) => entry.toUpperCase()));
  const isAllowedCountry = (country: string): boolean => {
    if (allowedCountries.size === 0) {
      return true;
    }

    return allowedCountries.has(country.toUpperCase());
  };

  const tryCountry = (value: string | undefined): string | undefined => {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase();
    return isAllowedCountry(normalized) ? normalized : undefined;
  };

  const fromExplicitHeader = tryCountry(explicitCountryFromRequestHeaders(request));
  if (fromExplicitHeader) {
    return fromExplicitHeader;
  }

  const fromCountryCookie = tryCountry(cookieValue(request.headers.get("cookie"), COUNTRY_COOKIE_NAME));
  if (fromCountryCookie) {
    return fromCountryCookie;
  }

  const routing = await getChannelAwareCmsRouting();
  if (routing.localeSegmentStrategy === "country-language") {
    const locale = await resolveRequestLocale(request);
    const fromLocale = tryCountry(countryFromLocale(locale));
    if (fromLocale) {
      return fromLocale;
    }
  }

  const fromDetectedHeaders = tryCountry(detectedCountryFromRequestHeaders(request));
  if (fromDetectedHeaders) {
    return fromDetectedHeaders;
  }

  const fromAcceptLanguage = tryCountry(countryFromLocale(localeCandidate(request.headers.get("accept-language"))));
  if (fromAcceptLanguage) {
    return fromAcceptLanguage;
  }

  const fromDefaultCountry = tryCountry(channelContext.defaultCountry);
  if (fromDefaultCountry) {
    return fromDefaultCountry;
  }

  const fromDefaultLocale = tryCountry(countryFromLocale(channelContext.defaultLocale));
  if (fromDefaultLocale) {
    return fromDefaultLocale;
  }

  return channelContext.countries[0]?.toUpperCase();
}
