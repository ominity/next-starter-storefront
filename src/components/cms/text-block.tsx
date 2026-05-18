import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import { asString } from "@/components/cms/helpers";
import type { StarterRenderContext } from "@/lib/ominity/types";

export function TextBlock({
  component,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const content = asString(component.fields.content, "");
  const cssClass = asString(component.fields.css_class, "");

  if (content.length === 0) {
    return <div className={cssClass} />;
  }

  return <div className={cssClass} dangerouslySetInnerHTML={{ __html: content }} />;
}
