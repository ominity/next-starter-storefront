import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border bg-card px-6 py-12 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        404
      </p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The requested CMS route could not be resolved.
      </p>
      <Link href="/" className={buttonVariants({ variant: "default", size: "default" })}>
        Go back home
      </Link>
    </div>
  );
}
