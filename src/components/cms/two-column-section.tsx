import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { ReactNode } from "react";

import { asString } from "@/components/cms/helpers";
import type { StarterRenderContext } from "@/lib/ominity/types";
import { cn } from "@/lib/utils";

function columnsClass(breakpoint: string): string {
  switch (breakpoint) {
    case "sm":
      return "sm:grid-cols-2";
    case "lg":
      return "lg:grid-cols-2";
    case "xl":
      return "xl:grid-cols-2";
    default:
      return "md:grid-cols-2";
  }
}

export function TwoColumnSection({
  component,
  renderer,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const header = asString(component.fields.header, "");
  const breakpoint = asString(component.fields.breakpoint, "md");
  const cssClass = asString(component.fields.css_class, "");
  const columnOne = renderer.render(component.fields.column_1) as ReactNode;
  const columnTwo = renderer.render(component.fields.column_2) as ReactNode;

  return (
    <section className={cn("space-y-4", cssClass)}>
      {header.length > 0 ? <h2 className="text-2xl font-semibold">{header}</h2> : null}
      <div className={cn("grid gap-6", columnsClass(breakpoint))}>
        <div className="space-y-4">{columnOne}</div>
        <div className="space-y-4">{columnTwo}</div>
      </div>
    </section>
  );
}
