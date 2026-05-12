import { Ominity } from "@ominity/api-typescript";
import { normalizeLocaleCode, parseLocaleCode, toLocaleCode, type CmsLocale } from "@ominity/next/cms";

import { getStarterOminityConfig } from "./env";
import { MOCK_CHANNEL, MOCK_LOCALES } from "./mock-data";
import { getOminityDebugHttpClient } from "./server/sdk-debug-fetcher";

const CHANNEL_INCLUDE = "languages,countries,currencies,defaultLanguage,defaultCountry,defaultCurrency";

type UnknownRecord = Record<string, unknown>;

interface NormalizedChannelLanguage {
  readonly id?: string;
  readonly code: string;
  readonly name?: string;
  readonly localeCode?: string;
  readonly localeTerritory?: string;
}

interface NormalizedChannelCountry {
  readonly code: string;
  readonly name?: string;
  readonly language?: string;
  readonly currency?: string;
}

interface NormalizedChannelCurrency {
  readonly code: string;
  readonly name?: string;
  readonly symbol?: string;
}

interface NormalizedStarterChannel {
  readonly id?: string;
  readonly identifier?: string;
  readonly defaultLanguageCode?: string;
  readonly defaultCountryCode?: string;
  readonly defaultCurrencyCode?: string;
  readonly languages: ReadonlyArray<NormalizedChannelLanguage>;
  readonly countries: ReadonlyArray<NormalizedChannelCountry>;
  readonly currencies: ReadonlyArray<NormalizedChannelCurrency>;
}

export interface StarterChannelContext {
  readonly id?: string;
  readonly identifier?: string;
  readonly defaultLocale: string;
  readonly defaultCountry?: string;
  readonly defaultCurrency?: string;
  readonly locales: ReadonlyArray<CmsLocale>;
  readonly languages: ReadonlyArray<string>;
  readonly countries: ReadonlyArray<string>;
  readonly countryCurrencyMap: Readonly<Record<string, string>>;
  readonly currencies: ReadonlyArray<string>;
}

let cachedChannelContextPromise: Promise<StarterChannelContext> | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asArray(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function extractEmbedded(value: UnknownRecord): UnknownRecord | undefined {
  const embedded = value._embedded;
  return isRecord(embedded) ? embedded : undefined;
}

function normalizeChannelLanguage(input: unknown): NormalizedChannelLanguage | null {
  if (!isRecord(input)) {
    return null;
  }

  const code = asString(input.code);
  if (!code) {
    return null;
  }

  const localeRecord = isRecord(input.locale)
    ? input.locale
    : extractEmbedded(input) && isRecord(extractEmbedded(input)!.locale)
      ? extractEmbedded(input)!.locale as UnknownRecord
      : undefined;
  const id = asString(input.id);
  const name = asString(input.name);
  const localeCode = localeRecord ? asString(localeRecord.code) : undefined;
  const localeTerritory = localeRecord ? asString(localeRecord.territory) : undefined;

  return {
    code: normalizeLocaleCode(code),
    ...(id ? { id } : {}),
    ...(name ? { name } : {}),
    ...(localeCode ? { localeCode: normalizeLocaleCode(localeCode) } : {}),
    ...(localeTerritory ? { localeTerritory: localeTerritory.toUpperCase() } : {}),
  };
}

function normalizeChannelCountry(input: unknown): NormalizedChannelCountry | null {
  if (!isRecord(input)) {
    return null;
  }

  const code = asString(input.code);
  if (!code) {
    return null;
  }

  const name = asString(input.name);
  const language = asString(input.language);
  const currency = asString(input.currency);
  return {
    code: code.toUpperCase(),
    ...(name ? { name } : {}),
    ...(language ? { language: normalizeLocaleCode(language) } : {}),
    ...(currency ? { currency: currency.toUpperCase() } : {}),
  };
}

function normalizeChannelCurrency(input: unknown): NormalizedChannelCurrency | null {
  if (!isRecord(input)) {
    return null;
  }

  const code = asString(input.code);
  if (!code) {
    return null;
  }

  const name = asString(input.name);
  const symbol = asString(input.symbol);
  return {
    code: code.toUpperCase(),
    ...(name ? { name } : {}),
    ...(symbol ? { symbol } : {}),
  };
}

function mergeLocale(current: CmsLocale | undefined, incoming: CmsLocale): CmsLocale {
  if (!current) {
    return incoming;
  }

  return {
    code: incoming.code,
    language: incoming.language,
    ...(incoming.country ?? current.country ? { country: incoming.country ?? current.country } : {}),
    ...(incoming.label ?? current.label ? { label: incoming.label ?? current.label } : {}),
    ...((incoming.default === true || current.default === true) ? { default: true } : {}),
  };
}

function buildFallbackContext(fallbackLocale = "en"): StarterChannelContext {
  const normalizedFallback = normalizeLocaleCode(fallbackLocale);
  const parsedFallback = parseLocaleCode(normalizedFallback);
  const locale: CmsLocale = {
    code: normalizedFallback,
    language: parsedFallback.language || "en",
    ...(parsedFallback.country ? { country: parsedFallback.country } : {}),
    default: true,
  };

  return {
    defaultLocale: normalizedFallback,
    ...(parsedFallback.country ? { defaultCountry: parsedFallback.country } : {}),
    defaultCurrency: "EUR",
    locales: [locale],
    languages: [locale.language],
    countries: parsedFallback.country ? [parsedFallback.country] : [],
    countryCurrencyMap: parsedFallback.country ? { [parsedFallback.country]: "EUR" } : {},
    currencies: [],
  };
}

function normalizeLocalesFromChannel(channel: NormalizedStarterChannel): ReadonlyArray<CmsLocale> {
  const merged = new Map<string, CmsLocale>();

  for (const language of channel.languages) {
    const preferredCode = normalizeLocaleCode(language.localeCode ?? language.code);
    const parsedPreferred = parseLocaleCode(preferredCode);
    const country = parsedPreferred.country ?? language.localeTerritory;
    const locale: CmsLocale = {
      code: preferredCode,
      language: parsedPreferred.language,
      ...(country ? { country } : {}),
      ...(language.name ? { label: language.name } : {}),
    };
    merged.set(locale.code, mergeLocale(merged.get(locale.code), locale));
  }

  for (const country of channel.countries) {
    const languageCode = country.language ?? channel.defaultLanguageCode;
    if (!languageCode) {
      continue;
    }

    const parsedLanguage = parseLocaleCode(normalizeLocaleCode(languageCode));
    if (parsedLanguage.language.length === 0) {
      continue;
    }

    const localeCode = toLocaleCode({
      language: parsedLanguage.language,
      country: country.code,
    });

    const locale: CmsLocale = {
      code: localeCode,
      language: parsedLanguage.language,
      country: country.code,
    };
    merged.set(locale.code, mergeLocale(merged.get(locale.code), locale));
  }

  return Array.from(merged.values());
}

function withDefaultLocale(
  locales: ReadonlyArray<CmsLocale>,
  channel: NormalizedStarterChannel,
): StarterChannelContext {
  const fallback = buildFallbackContext(channel.defaultLanguageCode ?? "en");
  if (locales.length === 0) {
    return {
      ...fallback,
      ...(channel.id ? { id: channel.id } : {}),
      ...(channel.identifier ? { identifier: channel.identifier } : {}),
      currencies: channel.currencies.map((entry) => entry.code),
    };
  }

  const candidateLocales: string[] = [];
  if (channel.defaultLanguageCode && channel.defaultCountryCode) {
    candidateLocales.push(toLocaleCode({
      language: parseLocaleCode(channel.defaultLanguageCode).language,
      country: channel.defaultCountryCode.toUpperCase(),
    }));
  }
  if (channel.defaultLanguageCode) {
    candidateLocales.push(normalizeLocaleCode(channel.defaultLanguageCode));
  }
  if (channel.languages.length > 0) {
    candidateLocales.push(channel.languages[0]!.code);
  }
  candidateLocales.push(locales[0]!.code);

  const normalizedCandidates = candidateLocales.map((entry) => normalizeLocaleCode(entry));
  const localeByCode = new Map(locales.map((entry) => [normalizeLocaleCode(entry.code), entry]));
  const chosenDefault = normalizedCandidates.find((entry) => localeByCode.has(entry))
    ?? normalizeLocaleCode(locales[0]!.code);

  const normalizedLocales = locales.map((entry) => ({
    code: normalizeLocaleCode(entry.code),
    language: parseLocaleCode(normalizeLocaleCode(entry.code)).language || entry.language,
    ...(entry.country ? { country: entry.country.toUpperCase() } : {}),
    ...(entry.label ? { label: entry.label } : {}),
    ...(normalizeLocaleCode(entry.code) === chosenDefault ? { default: true } : {}),
  }));

  const languageCodes = Array.from(new Set(normalizedLocales.map((entry) => entry.language)));
  const countryCodes = Array.from(
    new Set(
      normalizedLocales
        .map((entry) => entry.country)
        .filter((entry): entry is string => typeof entry === "string"),
    ),
  );
  const currencyCodes = Array.from(new Set(channel.currencies.map((entry) => entry.code)));
  const countryCurrencyMap = Object.fromEntries(
    channel.countries
      .filter((entry) => typeof entry.currency === "string" && entry.currency.length > 0)
      .map((entry) => [entry.code.toUpperCase(), entry.currency!.toUpperCase()]),
  );
  const defaultCountry = channel.defaultCountryCode
    ?? parseLocaleCode(chosenDefault).country
    ?? countryCodes[0];
  const defaultCurrency = channel.defaultCurrencyCode
    ?? (typeof defaultCountry === "string" ? countryCurrencyMap[defaultCountry.toUpperCase()] : undefined)
    ?? currencyCodes[0];

  return {
    ...(channel.id ? { id: channel.id } : {}),
    ...(channel.identifier ? { identifier: channel.identifier } : {}),
    defaultLocale: chosenDefault,
    ...(typeof defaultCountry === "string" ? { defaultCountry: defaultCountry.toUpperCase() } : {}),
    ...(typeof defaultCurrency === "string" ? { defaultCurrency: defaultCurrency.toUpperCase() } : {}),
    locales: normalizedLocales,
    languages: languageCodes,
    countries: countryCodes,
    countryCurrencyMap,
    currencies: currencyCodes,
  };
}

function normalizeStarterChannel(input: unknown): NormalizedStarterChannel {
  if (!isRecord(input)) {
    return {
      languages: [],
      countries: [],
      currencies: [],
    };
  }

  const embedded = extractEmbedded(input);

  const languages = asArray(input.languages ?? embedded?.languages)
    .map((entry) => normalizeChannelLanguage(entry))
    .filter((entry): entry is NormalizedChannelLanguage => entry !== null);
  const countries = asArray(input.countries ?? embedded?.countries)
    .map((entry) => normalizeChannelCountry(entry))
    .filter((entry): entry is NormalizedChannelCountry => entry !== null);
  const currencies = asArray(input.currencies ?? embedded?.currencies)
    .map((entry) => normalizeChannelCurrency(entry))
    .filter((entry): entry is NormalizedChannelCurrency => entry !== null);

  const defaultLanguageRecord = isRecord(input.defaultLanguage)
    ? input.defaultLanguage
    : embedded && isRecord(embedded.defaultLanguage)
      ? embedded.defaultLanguage as UnknownRecord
      : embedded && isRecord(embedded.default_language)
        ? embedded.default_language as UnknownRecord
      : undefined;
  const defaultCountryRecord = isRecord(input.defaultCountry)
    ? input.defaultCountry
    : embedded && isRecord(embedded.defaultCountry)
      ? embedded.defaultCountry as UnknownRecord
      : embedded && isRecord(embedded.default_country)
        ? embedded.default_country as UnknownRecord
      : undefined;
  const defaultCurrencyRecord = isRecord(input.defaultCurrency)
    ? input.defaultCurrency
    : embedded && isRecord(embedded.defaultCurrency)
      ? embedded.defaultCurrency as UnknownRecord
      : embedded && isRecord(embedded.default_currency)
        ? embedded.default_currency as UnknownRecord
      : undefined;

  const defaultLanguageCode = defaultLanguageRecord && asString(defaultLanguageRecord.code)
    ? normalizeLocaleCode(asString(defaultLanguageRecord.code)!)
    : undefined;
  const defaultCountryCode = defaultCountryRecord && asString(defaultCountryRecord.code)
    ? asString(defaultCountryRecord.code)!.toUpperCase()
    : undefined;
  const defaultCurrencyCode = defaultCurrencyRecord && asString(defaultCurrencyRecord.code)
    ? asString(defaultCurrencyRecord.code)!.toUpperCase()
    : undefined;
  const id = asString(input.id);
  const identifier = asString(input.identifier);

  return {
    ...(id ? { id } : {}),
    ...(identifier ? { identifier } : {}),
    ...(defaultLanguageCode ? { defaultLanguageCode } : {}),
    ...(defaultCountryCode ? { defaultCountryCode } : {}),
    ...(defaultCurrencyCode ? { defaultCurrencyCode } : {}),
    languages,
    countries,
    currencies,
  };
}

function mockChannelContext(): StarterChannelContext {
  const locales = MOCK_LOCALES.map((locale) => ({
    code: normalizeLocaleCode(locale.code),
    language: parseLocaleCode(normalizeLocaleCode(locale.code)).language || locale.language,
    ...(locale.country ? { country: locale.country.toUpperCase() } : {}),
    ...(locale.label ? { label: locale.label } : {}),
    ...(locale.default === true ? { default: true } : {}),
  }));
  const defaultLocale = locales.find((entry) => entry.default)?.code ?? locales[0]?.code ?? "en";
  const defaultCountry = parseLocaleCode(normalizeLocaleCode(defaultLocale)).country
    ?? MOCK_CHANNEL.countries[0]?.code
    ?? undefined;

  return {
    id: MOCK_CHANNEL.id,
    identifier: MOCK_CHANNEL.identifier,
    defaultLocale: normalizeLocaleCode(defaultLocale),
    ...(typeof defaultCountry === "string" ? { defaultCountry: defaultCountry.toUpperCase() } : {}),
    defaultCurrency: "EUR",
    locales,
    languages: MOCK_CHANNEL.languages.map((entry) => normalizeLocaleCode(entry.code)),
    countries: MOCK_CHANNEL.countries.map((entry) => entry.code.toUpperCase()),
    countryCurrencyMap: Object.fromEntries(
      MOCK_CHANNEL.countries
        .flatMap((entry) => {
          const currency = (entry as { currency?: string }).currency;
          if (!currency) {
            return [];
          }

          return [[entry.code.toUpperCase(), currency.toUpperCase()] as const];
        }),
    ),
    currencies: ["EUR"],
  };
}

async function fetchLiveChannelContext(): Promise<StarterChannelContext> {
  const config = getStarterOminityConfig();
  if (!config.apiUrl || !config.apiKey) {
    return buildFallbackContext(config.defaultLocale);
  }

  const debugHttpClient = getOminityDebugHttpClient("sdk");
  const sdk = new Ominity({
    serverURL: config.apiUrl,
    ...(debugHttpClient ? { httpClient: debugHttpClient } : {}),
    security: {
      apiKey: config.apiKey,
    },
    ...(typeof config.channelId === "string" ? { channelId: config.channelId } : {}),
  });

  const channel = typeof config.channelId === "string"
    ? await sdk.channels.get({
      id: config.channelId,
      include: CHANNEL_INCLUDE,
    })
    : await sdk.channels.current({
      include: CHANNEL_INCLUDE,
    });

  const normalizedChannel = normalizeStarterChannel(channel);
  const locales = normalizeLocalesFromChannel(normalizedChannel);

  return withDefaultLocale(locales, normalizedChannel);
}

export function resetStarterChannelContextCache(): void {
  cachedChannelContextPromise = null;
}

export async function getStarterChannelContext(): Promise<StarterChannelContext> {
  if (cachedChannelContextPromise) {
    return cachedChannelContextPromise;
  }

  cachedChannelContextPromise = (async () => {
    const config = getStarterOminityConfig();
    if (config.useMockData) {
      return mockChannelContext();
    }

    try {
      return await fetchLiveChannelContext();
    } catch {
      return buildFallbackContext(config.defaultLocale);
    }
  })();

  return cachedChannelContextPromise;
}
