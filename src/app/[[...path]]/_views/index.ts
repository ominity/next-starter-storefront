import { accountViews } from "./account";
import { authViews } from "./auth";
import { cmsViews } from "./cms";
import { commerceViews } from "./commerce";
import type { PageKind, PageOf, PageView, PageViews } from "./types";

export type { PageKind, PageOf, PageView, PageViews, ViewContext } from "./types";

/**
 * Every kind of page `resolvePage` can return, grouped by domain. A route added to `src/locales/routes` without a view
 * here fails the type check; removing a feature means removing its routes and its view.
 */
export const views: PageViews = {
  ...cmsViews,
  ...commerceViews,
  ...authViews,
  ...accountViews,
};

export function viewFor<K extends PageKind>(page: PageOf<K>): PageView<K> {
  return views[page.kind as K] as PageView<K>;
}
