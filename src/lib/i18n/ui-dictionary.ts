import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";

import en from "@/locales/ui/en.json";
import nl from "@/locales/ui/nl.json";

export type StarterUiDictionary = typeof en;

const UI_DICTIONARIES: Readonly<Record<string, StarterUiDictionary>> = {
  en,
  nl,
};

const FALLBACK_UI_DICTIONARY = en;

export function resolveUiDictionary(locale: string): StarterUiDictionary {
  const normalizedLocale = normalizeLocaleCode(locale);
  const language = parseLocaleCode(normalizedLocale).language;

  return UI_DICTIONARIES[language] ?? FALLBACK_UI_DICTIONARY;
}
