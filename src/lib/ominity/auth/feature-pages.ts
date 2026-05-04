import type { Metadata } from "next";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { resolveLocaleForVariant, type StarterLocaleVariant } from "@/lib/ominity/locale-variant";

import { buildAuthUtilityPaths, type AuthUtilityPaths } from "./paths";

export type AuthFeature = "login" | "register" | "account" | "mfa";

export interface ResolveAuthFeaturePageInput {
  readonly feature: AuthFeature;
  readonly variant: StarterLocaleVariant;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export interface ResolvedAuthFeaturePage {
  readonly locale: string;
  readonly paths: AuthUtilityPaths;
}

export function isAuthFeatureEnabled(_feature: AuthFeature): boolean {
  const config = getStarterOminityConfig();
  return config.enableAuth;
}

export async function resolveAuthFeaturePage(
  input: ResolveAuthFeaturePageInput,
): Promise<ResolvedAuthFeaturePage | null> {
  if (!isAuthFeatureEnabled(input.feature)) {
    return null;
  }

  const locale = await resolveLocaleForVariant({
    variant: input.variant,
    ...(typeof input.localeSegment === "string" ? { localeSegment: input.localeSegment } : {}),
    ...(typeof input.countrySegment === "string" ? { countrySegment: input.countrySegment } : {}),
  });

  if (!locale) {
    return null;
  }

  return {
    locale,
    paths: buildAuthUtilityPaths(locale),
  };
}

export function buildAuthFeatureMetadata(input: {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string;
}): Metadata {
  const config = getStarterOminityConfig();
  const canonicalUrl = new URL(input.canonicalPath, config.siteUrl).toString();

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonicalUrl,
    },
  };
}
