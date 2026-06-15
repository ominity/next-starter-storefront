import {
  generateLocaleStaticParamsForVariant,
  resolveLocaleForVariant,
  variantMatchesCurrentStrategy as variantMatchesCurrentStrategyGeneric,
  type ResolveLocaleForVariantInput,
} from "@/lib/ominity/site";

import type { CommerceLocaleVariant } from "./types";

export interface ResolveCommerceLocaleInput {
  readonly variant: CommerceLocaleVariant;
  readonly localeSegment?: string;
  readonly countrySegment?: string;
}

export function variantMatchesCurrentStrategy(variant: CommerceLocaleVariant): boolean {
  return variantMatchesCurrentStrategyGeneric(variant);
}

export function resolveLocaleForCommerceVariant(
  input: ResolveCommerceLocaleInput,
): Promise<string | null> {
  return resolveLocaleForVariant(input as ResolveLocaleForVariantInput);
}

export function generateLocaleStaticParamsForCommerceVariant(
  variant: CommerceLocaleVariant,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  return generateLocaleStaticParamsForVariant(variant);
}
