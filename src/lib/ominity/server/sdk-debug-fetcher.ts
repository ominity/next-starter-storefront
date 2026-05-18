import {
  getCachedOminityDebugHttpClient,
  type OminityDebugSource,
} from "@ominity/next/debug";

import { getStarterOminityConfig } from "@/lib/ominity/env";

export function getOminityDebugHttpClient(source: OminityDebugSource) {
  return getCachedOminityDebugHttpClient({
    source,
    enabled: getStarterOminityConfig().debugBar,
  });
}
