import type { ReactNode } from "react";

import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import type { StarterRenderContext } from "@/lib/ominity/types";

import { asString } from "./helpers";

export function HeroBlock({
  component,
  renderer,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const title = asString(component.fields.title, "Welcome");
  const subtitle = asString(component.fields.subtitle, "");

  const callToAction = renderer.render(component.fields.call_to_action) as ReactNode;
  const children = renderer.renderChildren(component) as ReactNode;

  return (
    <section className="rounded-2xl border bg-card px-6 py-10 shadow-sm">
      <div className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="text-base text-muted-foreground md:text-lg">{subtitle}</p>
        ) : null}

        {callToAction ? <div className="pt-2">{callToAction}</div> : null}
      </div>

      {children ? <div className="mx-auto mt-8 max-w-3xl">{children}</div> : null}
    </section>
  );
}

