import type {
  CmsClient,
  CmsGetMenusInput,
  CmsGetPageByPathInput,
  CmsGetRoutesInput,
  CmsMenu,
  CmsPage,
  CmsRoute,
} from "@ominity/next/cms";
import { normalizeLocaleCode, parseLocaleCode } from "@ominity/next/cms";

import { getLiveCmsClient } from "./cms-client";
import { getStarterOminityConfig } from "./env";
import { mockCmsClient } from "./mock-data";

export const getCmsClient = (): CmsClient => {
  const config = getStarterOminityConfig();
  if (config.useMockData) {
    return mockCmsClient;
  }

  return getLiveCmsClient();
};

export const getCmsPageByPath = async (
  input: CmsGetPageByPathInput,
): Promise<CmsPage | null> => {
  const locale = typeof input.locale === "string"
    ? parseLocaleCode(normalizeLocaleCode(input.locale)).language
    : undefined;

  try {
    return await getCmsClient().getPageByPath({
      ...input,
      ...(typeof locale === "string" && locale.length > 0 ? { locale } : {}),
    });
  } catch {
    return null;
  }
};

export const getCmsRoutes = async (
  input?: CmsGetRoutesInput,
): Promise<ReadonlyArray<CmsRoute>> => {
  const locale = typeof input?.locale === "string"
    ? parseLocaleCode(normalizeLocaleCode(input.locale)).language
    : undefined;

  try {
    return await getCmsClient().getRoutes({
      ...input,
      ...(typeof locale === "string" && locale.length > 0 ? { locale } : {}),
    });
  } catch {
    return [];
  }
};

export const getCmsMenus = async (
  input?: CmsGetMenusInput,
): Promise<ReadonlyArray<CmsMenu>> => {
  const locale = typeof input?.locale === "string"
    ? parseLocaleCode(normalizeLocaleCode(input.locale)).language
    : undefined;

  try {
    return await getCmsClient().getMenus({
      ...input,
      ...(typeof locale === "string" && locale.length > 0 ? { locale } : {}),
    });
  } catch {
    return [];
  }
};

export const getMainMenu = async (
  locale?: string,
): Promise<CmsMenu | null> => {
  const menus = await getCmsMenus({
    key: "main",
    ...(locale ? { locale } : {}),
  });

  return menus[0] ?? null;
};
