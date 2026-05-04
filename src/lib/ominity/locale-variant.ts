import { matchLocaleFromSegments, normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";

import { getStarterChannelContext } from "@/lib/ominity/channel-context";
import { getStarterOminityConfig } from "@/lib/ominity/env";
import { getChannelAwareCmsRouting } from "@/lib/ominity/routing";

export type StarterLocaleVariant = "none" | "language" | "country-language";

export interface ResolveLocaleForVariantInput {
  readonly variant: StarterLocaleVariant;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export function variantMatchesCurrentStrategy(variant: StarterLocaleVariant): boolean {
  const config = getStarterOminityConfig();
  return config.localeSegmentStrategy === variant;
}

export async function resolveLocaleForVariant(
  input: ResolveLocaleForVariantInput,
): Promise<string | null> {
  const config = getStarterOminityConfig();
  if (config.localeSegmentStrategy !== input.variant) {
    return null;
  }

  const routing = await getChannelAwareCmsRouting();
  if (input.variant === "none") {
    return normalizeLocaleCode(routing.defaultLocale);
  }

  if (input.variant === "language") {
    if (!input.localeSegment) {
      return null;
    }

    const matched = matchLocaleFromSegments([input.localeSegment], routing);
    if (!matched || matched.consumedSegments !== 1) {
      return null;
    }

    return normalizeLocaleCode(matched.locale);
  }

  if (!input.countrySegment || !input.localeSegment) {
    return null;
  }

  const matched = matchLocaleFromSegments([input.countrySegment, input.localeSegment], routing);
  if (!matched || matched.consumedSegments !== 2) {
    return null;
  }

  return normalizeLocaleCode(matched.locale);
}

export async function generateLocaleStaticParamsForVariant(
  variant: StarterLocaleVariant,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  const config = getStarterOminityConfig();
  if (config.localeSegmentStrategy !== variant) {
    return [];
  }

  if (variant === "none") {
    return [{}];
  }

  const channelContext = await getStarterChannelContext();
  const result: Array<Readonly<Record<string, string>>> = [];
  for (const locale of channelContext.locales) {
    const parsed = parseLocaleCode(normalizeLocaleCode(locale.code));
    const language = parsed.language || locale.language;

    if (variant === "language") {
      if (language.length > 0) {
        result.push({ locale: language });
      }

      continue;
    }

    const country = parsed.country ?? locale.country;
    if (!country || language.length === 0) {
      continue;
    }

    result.push({
      country: country.toLowerCase(),
      locale: language,
    });
  }

  const deduped = new Map<string, Readonly<Record<string, string>>>();
  for (const entry of result) {
    deduped.set(JSON.stringify(entry), entry);
  }

  return Array.from(deduped.values());
}
