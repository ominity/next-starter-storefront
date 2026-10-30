import type { CmsPageComponent } from "@ominity/next/cms";

export function UnknownBlock(component: CmsPageComponent) {
  return (
    <div key={component.id} className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Unknown CMS block key: <strong>{component.key}</strong>
    </div>
  );
}
