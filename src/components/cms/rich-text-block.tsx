import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

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

