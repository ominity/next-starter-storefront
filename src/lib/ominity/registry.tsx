import type { CmsRendererOptions } from "@ominity/next/cms/rendering";
import { createCmsRegistry, defineCmsComponent } from "@ominity/next/cms/rendering";

import { ButtonBlock } from "@/components/cms/button-block";
import { createColumnSection } from "@/components/cms/column-section";
import { FormBlock } from "@/components/cms/form-block";
import { ImageBlock } from "@/components/cms/image-block";
import { TextBlock } from "@/components/cms/text-block";
import { UnknownBlock } from "@/components/cms/unknown-block";

import { getStarterOminityConfig } from "./env";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

const config = getStarterOminityConfig();

export const cmsRegistry = createCmsRegistry<StarterRenderContext>([
  defineCmsComponent("text-block", TextBlock),
  defineCmsComponent("button", ButtonBlock),
  defineCmsComponent("image", ImageBlock),
  defineCmsComponent("1-column-section", createColumnSection(1)),
  defineCmsComponent("2-column-section", createColumnSection(2)),
  defineCmsComponent("3-column-section", createColumnSection(3)),
  defineCmsComponent("4-column-section", createColumnSection(4)),
  defineCmsComponent("5-column-section", createColumnSection(5)),
  defineCmsComponent("6-column-section", createColumnSection(6)),
  defineCmsComponent("form_block", FormBlock),
]);

export const cmsRendererOptions: CmsRendererOptions<StarterRenderContext> = {
  missingComponent: config.strictMissingComponents ? "throw" : UnknownBlock,
  unsupportedValue: "ignore",
};
