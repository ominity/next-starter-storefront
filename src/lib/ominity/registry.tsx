import type { CmsRendererOptions } from "@ominity/next/cms/rendering";
import { createCmsRegistry, defineCmsComponent } from "@ominity/next/cms/rendering";

import { ButtonLinkBlock } from "@/components/cms/button-link-block";
import { FormBlock } from "@/components/cms/form-block";
import { HeroBlock } from "@/components/cms/hero-block";
import { RichTextBlock } from "@/components/cms/rich-text-block";
import { SliderBlock } from "@/components/cms/slider-block";
import { TextBlock } from "@/components/cms/text-block";
import { TwoColumnSection } from "@/components/cms/two-column-section";

import { getStarterOminityConfig } from "./env";
import type { StarterRenderContext } from "./types";

const config = getStarterOminityConfig();

export const cmsRegistry = createCmsRegistry<StarterRenderContext>([
  defineCmsComponent("hero", HeroBlock),
  defineCmsComponent("button_link", ButtonLinkBlock),
  defineCmsComponent("rich_text", RichTextBlock),
  defineCmsComponent("text-block", TextBlock),
  defineCmsComponent("slider", SliderBlock),
  defineCmsComponent("form_block", FormBlock),
  defineCmsComponent("2-column-section", TwoColumnSection),
]);

export const cmsRendererOptions: CmsRendererOptions<StarterRenderContext> = {
  missingComponent: config.strictMissingComponents
    ? "throw"
    : (component) => (
      <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Unknown CMS block key: <strong>{component.key}</strong>
      </div>
    ),
  unsupportedValue: "ignore",
};
