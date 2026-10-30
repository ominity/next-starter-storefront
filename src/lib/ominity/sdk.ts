import "server-only";

import { Ominity } from "@ominity/api-typescript";
import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";

import { config } from "./config";
import { getDevToolHttpClient } from "./site";

const instances = new Map<string, Ominity>();

/**
 * The Ominity SDK for server components, authenticated with the API key. Pass the page's locale to get translated
 * content. Client components use `useOminitySdk()` from `@ominity/next/sdk/react` instead.
 *
 * ```ts
 * const products = await ominity(locale).commerce.products.list({ include: "offers", limit: 24 });
 * ```
 */
export function ominity(locale?: string): Ominity {
  const language = locale ? parseLocaleCode(normalizeLocaleCode(locale)).language : "";
  let sdk = instances.get(language);
  if (!sdk) {
    const httpClient = config.devTool ? getDevToolHttpClient("sdk") : undefined;
    sdk = new Ominity({
      serverURL: config.apiUrl,
      ...(config.apiKey ? { security: { apiKey: config.apiKey } } : {}),
      ...(language ? { language } : {}),
      ...(httpClient ? { httpClient } : {}),
    });
    instances.set(language, sdk);
  }
  return sdk;
}
