import { generateCmsStaticParams, resolveDraftMode, resolveHomeLocaleRedirect } from "@ominity/next/next";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { SiteHeader } from "@/components/site/site-header";
import { config } from "@/lib/ominity/config";
import { resolvePage, type ResolvedPage } from "@/lib/ominity/pages";
import { routePaths } from "@/lib/ominity/routes";
import { getCmsRoutes, getRouting } from "@/lib/ominity/site";

import { viewFor } from "./_views";

export const revalidate = 300;

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

interface PageProps {
  readonly params: Promise<{ path?: string[] }>;
  readonly searchParams: Promise<SearchParams>;
}

function absolute(path: string): string {
  return new URL(path, config.siteUrl).toString();
}

/** CMS pages are generated at build time; everything else on first request. */
export async function generateStaticParams() {
  try {
    const params = generateCmsStaticParams({ routes: await getCmsRoutes(), routing: await getRouting(), catchAllParam: "path" });
    return params.map((entry) => ({ path: Array.isArray(entry.path) ? [...entry.path] : [] }));
  } catch {
    return [];
  }
}

async function load(props: PageProps): Promise<{ page: ResolvedPage | null; preview: boolean; segments: string[] }> {
  const segments = (await props.params).path ?? [];
  const preview = await resolveDraftMode({ useNextDraftMode: true });
  return { page: await resolvePage(segments.join("/"), preview), preview, segments };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { page } = await load(props);
  if (!page) return { title: "Not Found", robots: { index: false, follow: false } };

  const view = viewFor(page);
  const metadata: Metadata = view.metadata
    ? await view.metadata(page)
    : { ...(view.title ? { title: view.title } : {}), ...(view.indexed ? {} : { robots: { index: false, follow: true } }) };

  return {
    ...metadata,
    alternates: {
      canonical: absolute(page.canonicalPath),
      languages: Object.fromEntries(Object.entries(page.alternates).map(([locale, path]) => [locale, absolute(path)])),
    },
  };
}

/** The optional `/` redirect to the visitor's language (`OMINITY_HOME_LOCALE_REDIRECT_MODE`). */
async function redirectHome(): Promise<void> {
  if (config.homeLocaleRedirectMode === "off") return;
  const requestHeaders = await headers();
  const target = resolveHomeLocaleRedirect({
    incomingPath: "/",
    routing: await getRouting(),
    mode: config.homeLocaleRedirectMode,
    cookieName: config.homeLocaleRedirectCookieName,
    skipBots: config.homeLocaleRedirectSkipBots,
    cookieHeader: requestHeaders.get("cookie"),
    acceptLanguageHeader: requestHeaders.get("accept-language"),
    countryHeader: requestHeaders.get("x-vercel-ip-country") ?? requestHeaders.get("cf-ipcountry"),
    userAgentHeader: requestHeaders.get("user-agent"),
  });
  if (target) redirect(target.destinationPath as Route);
}

/** Every URL: resolve it to a CMS page, product, category or route, then render that page's view. */
export default async function Page(props: PageProps) {
  const { segments, preview, page } = await load(props);
  if (segments.length === 0) await redirectHome();
  if (!page) notFound();
  if (page.redirect) redirect(page.canonicalPath as Route);

  const paths = routePaths(page.locale, await getRouting());
  const content = await viewFor(page).render({
    page,
    paths,
    path: `/${segments.join("/")}`,
    preview,
    async param(name) {
      const value = (await props.searchParams)[name];
      return typeof value === "string" && value.length > 0 ? value : undefined;
    },
  });

  return (
    <>
      <SiteHeader locale={page.locale} paths={paths} alternates={page.alternates} />
      <main className="container flex-1 py-8 md:py-12">{content}</main>
    </>
  );
}
