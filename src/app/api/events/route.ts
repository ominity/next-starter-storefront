import { createOminityTrackingProxyRouteHandlers } from "@ominity/next/tracking/proxy";

import { getStarterOminityConfig } from "@/lib/ominity/env";

const config = getStarterOminityConfig();

export const dynamic = "force-dynamic";

export const { GET, POST } = createOminityTrackingProxyRouteHandlers({
  ominityApiKey: config.apiKey,
  ominityBaseUrl: config.apiUrl,
  enabled: config.trackingEnabled && !config.useMockData && Boolean(config.apiKey && config.apiUrl),
  debug: config.debugLogs,
  logDebugSnapshots: config.debugLogs,
  disabledReason: () => [
    ...(!config.trackingEnabled ? ["OMINITY_TRACKING_ENABLED=false"] : []),
    ...(config.useMockData ? ["OMINITY_USE_MOCK_DATA=true"] : []),
    ...(!config.apiUrl ? ["OMINITY_API_URL is not configured"] : []),
    ...(!config.apiKey ? ["OMINITY_API_KEY is not configured"] : []),
  ],
});
