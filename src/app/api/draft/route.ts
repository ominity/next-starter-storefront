import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

import { getStarterOminityConfig } from "@/lib/ominity/env";

export async function GET(request: Request) {
  const config = getStarterOminityConfig();
  const url = new URL(request.url);

  if (!config.draftToken) {
    return NextResponse.json(
      {
        error: "Draft mode is not configured. Set OMINITY_DRAFT_TOKEN.",
      },
      { status: 400 },
    );
  }

  const secret = url.searchParams.get("secret");
  if (secret !== config.draftToken) {
    return NextResponse.json({ error: "Invalid draft token." }, { status: 401 });
  }

  const disable = url.searchParams.get("disable") === "true";
  const redirectTo = url.searchParams.get("slug") ?? "/";

  const draft = await draftMode();
  if (disable) {
    draft.disable();
  } else {
    draft.enable();
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}

