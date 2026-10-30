import { SiteHeaderClient } from "@/components/site/site-header-client";
import type { RoutePaths } from "@/lib/ominity/routes";
import { ominity } from "@/lib/ominity/sdk";
import { cmsLinkResolver, getChannel, linkTo } from "@/lib/ominity/site";

export interface SiteHeaderProps {
  readonly locale: string;
  readonly paths: RoutePaths;
  /** The current page in other languages, by locale code; languages without it link to their home page. */
  readonly alternates?: Readonly<Record<string, string>> | undefined;
}

export async function SiteHeader({ locale, paths, alternates = {} }: SiteHeaderProps) {
  const [channel, categories] = await Promise.all([
    getChannel(),
    ominity(locale).commerce.categories.list({ limit: 5 }).catch(() => null),
  ]);

  return (
    <SiteHeaderClient
      locale={locale}
      paths={paths}
      contactPath={cmsLinkResolver.resolve("/contact", { locale }).href}
      categories={(categories?.items ?? []).flatMap((category) => {
        const path = linkTo(category, locale);
        return path ? [{ id: category.id, label: category.name, path }] : [];
      })}
      locales={channel.locales.map((entry) => ({
        code: entry.code,
        label: entry.label ?? entry.code,
        path: alternates[entry.code] ?? cmsLinkResolver.resolve("/", { locale: entry.code }).href,
      }))}
    />
  );
}
