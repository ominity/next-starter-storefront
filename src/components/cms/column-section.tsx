import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";
import type { ReactNode } from "react";

import { asString } from "@/components/cms/helpers";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";
import { cn } from "@/lib/utils";

export type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Ominity column sections stack below the configured breakpoint and sit
 * side by side from that breakpoint up. Tailwind needs literal class names,
 * so every supported breakpoint/column pair is spelled out here.
 */
const GRID_CLASS: Readonly<Record<string, Readonly<Record<ColumnCount, string>>>> = {
  xs: { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" },
  sm: { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3", 4: "grid-cols-1 sm:grid-cols-4", 5: "grid-cols-1 sm:grid-cols-5", 6: "grid-cols-1 sm:grid-cols-6" },
  md: { 1: "grid-cols-1", 2: "grid-cols-1 md:grid-cols-2", 3: "grid-cols-1 md:grid-cols-3", 4: "grid-cols-1 md:grid-cols-4", 5: "grid-cols-1 md:grid-cols-5", 6: "grid-cols-1 md:grid-cols-6" },
  lg: { 1: "grid-cols-1", 2: "grid-cols-1 lg:grid-cols-2", 3: "grid-cols-1 lg:grid-cols-3", 4: "grid-cols-1 lg:grid-cols-4", 5: "grid-cols-1 lg:grid-cols-5", 6: "grid-cols-1 lg:grid-cols-6" },
  xl: { 1: "grid-cols-1", 2: "grid-cols-1 xl:grid-cols-2", 3: "grid-cols-1 xl:grid-cols-3", 4: "grid-cols-1 xl:grid-cols-4", 5: "grid-cols-1 xl:grid-cols-5", 6: "grid-cols-1 xl:grid-cols-6" },
  xxl: { 1: "grid-cols-1", 2: "grid-cols-1 2xl:grid-cols-2", 3: "grid-cols-1 2xl:grid-cols-3", 4: "grid-cols-1 2xl:grid-cols-4", 5: "grid-cols-1 2xl:grid-cols-5", 6: "grid-cols-1 2xl:grid-cols-6" },
};

function gridClass(breakpoint: string, columns: ColumnCount): string {
  return (GRID_CLASS[breakpoint] ?? GRID_CLASS.md!)[columns];
}

/**
 * Builds the renderer for one of the Ominity `<n>-column-section` blueprints.
 * Each blueprint exposes `header`, `breakpoint`, `css_class`, and a
 * `column_1..column_<n>` dynamic zone.
 */
export function createColumnSection(columns: ColumnCount) {
  function ColumnSection({
    component,
    renderer,
  }: CmsComponentRenderProps<StarterRenderContext>) {
    const header = asString(component.fields.header, "");
    const breakpoint = asString(component.fields.breakpoint, "md");
    const cssClass = asString(component.fields.css_class, "");
    const columnKeys = Array.from({ length: columns }, (_, index) => `column_${index + 1}`);

    return (
      <section className={cn("space-y-4", cssClass)}>
        {header.length > 0 ? (
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: header }}
          />
        ) : null}
        <div className={cn("grid gap-6", gridClass(breakpoint, columns))}>
          {columnKeys.map((key) => (
            <div key={key} className="space-y-4">
              {renderer.render(component.fields[key]) as ReactNode}
            </div>
          ))}
        </div>
      </section>
    );
  }

  ColumnSection.displayName = `ColumnSection${columns}`;

  return ColumnSection;
}
