import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import type { StarterRenderContext } from "@/lib/ominity/types";

import { asString } from "./helpers";

export function RichTextBlock({
  component,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const html = asString(component.fields.html, "");
  if (!html) {
    return null;
  }

  return (
    <article
      className="prose prose-slate max-w-none text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

