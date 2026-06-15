import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

import { asString, asStringArray } from "./helpers";
import { SliderBlockClient } from "./slider-block-client";

export function SliderBlock({
  component,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const title = asString(component.fields.title, "Slider");
  const items = asStringArray(component.fields.items);

  return <SliderBlockClient title={title} items={items} />;
}
