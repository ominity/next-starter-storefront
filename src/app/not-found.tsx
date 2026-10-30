import Link from "next/link";

import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";
import { routePaths } from "@/lib/ominity/routes";
import { getChannel, getRouting } from "@/lib/ominity/site";

export default async function NotFound() {
  const [channel, routing] = await Promise.all([getChannel(), getRouting()]);
  const paths = routePaths(channel.defaultLocale, routing);

  return (
    <>
      <SiteHeader locale={channel.defaultLocale} paths={paths} />
      <main className="container flex-1 py-8 md:py-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <Link href={paths.home} className={buttonVariants({ variant: "default", size: "default" })}>
            Go back home
          </Link>
        </div>
      </main>
    </>
  );
}
