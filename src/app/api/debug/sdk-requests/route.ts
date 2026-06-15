import { getStarterOminityConfig } from "@/lib/ominity/env";
import { createOminityDebugRouteHandlers } from "@ominity/next/debug";

export const dynamic = "force-dynamic";

export const { GET, DELETE } = createOminityDebugRouteHandlers({
  enabled: getStarterOminityConfig().debugBar,
  defaultLimit: 120,
  maxLimit: 300,
});
