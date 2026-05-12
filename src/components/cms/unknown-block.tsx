import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import type { StarterRenderContext } from "@/lib/ominity/types";

export function UnknownBlock({
  component,
}: CmsComponentRenderProps<StarterRenderContext>) {
  return (
    <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Unknown CMS block key: <strong>{component.key}</strong>
    </div>
  );
}

