import type { CmsLinkTarget } from "@ominity/next/cms";
import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cmsLinkResolver } from "@/lib/ominity/routing";
import type { StarterRenderContext } from "@/lib/ominity/types";

import { asString } from "./helpers";

const resolveTarget = (value: unknown): CmsLinkTarget => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (record.resource === "route" && typeof record.name === "string") {
      return value as CmsLinkTarget;
    }
  }

  return "#";
};

export function ButtonLinkBlock({
  component,
  context,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const label = asString(component.fields.label, "Read more");
  const target = resolveTarget(component.fields.target);
  const resolvedTarget = cmsLinkResolver.resolve(target, {
    locale: context.locale,
  });

  if (resolvedTarget.external) {
    return (
      <a
        href={resolvedTarget.href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      href={resolvedTarget.href as Route}
      className={buttonVariants({ variant: "default", size: "lg" })}
    >
      {label}
    </Link>
  );
}
