import { createOminityDraftRouteHandlers } from "@ominity/next/next";
import { getStarterOminityConfig } from "@/lib/ominity/env";

export const { GET } = createOminityDraftRouteHandlers({
  draftToken: getStarterOminityConfig().draftToken,
});
