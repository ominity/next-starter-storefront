import { getStarterOminityConfig } from "@/lib/ominity/env";
import {
  buildOminityDebugDeleteResponse,
  buildOminityDebugGetResponse,
} from "@ominity/next/debug";

export const dynamic = "force-dynamic";

function isEnabled(): boolean {
  return getStarterOminityConfig().debugBar;
}

export async function GET(request: Request): Promise<Response> {
  return buildOminityDebugGetResponse(request, {
    enabled: isEnabled(),
    defaultLimit: 120,
    maxLimit: 300,
  });
}

export async function DELETE(): Promise<Response> {
  return buildOminityDebugDeleteResponse({
    enabled: isEnabled(),
  });
}
