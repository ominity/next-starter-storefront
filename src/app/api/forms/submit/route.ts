import { createOminityFormSubmitHandler } from "@ominity/next/forms";

import { getStarterOminityConfig } from "@/lib/ominity/env";
import { verifyOminityFormExists } from "@/lib/ominity/forms-module";

const config = getStarterOminityConfig();

const formSubmitHandler = createOminityFormSubmitHandler({
  ominityApiKey: config.apiKey ?? "missing-api-key",
  ...(config.apiUrl ? { ominityBaseUrl: config.apiUrl } : {}),
  ...(config.formsRecaptchaSecret ? { recaptchaSecret: config.formsRecaptchaSecret } : {}),
  ...(config.useMockData
    ? {
      forwardSubmission: async ({ payload }: { payload: unknown }) => ({
        status: 201,
        body: {
          ok: true,
          mode: "mock",
          payload,
        },
      }),
    }
    : {}),
});

export async function POST(request: Request) {
  if (!config.useMockData && !config.apiKey) {
    return new Response(
      JSON.stringify({
        error: "OMINITY_API_KEY is required when OMINITY_USE_MOCK_DATA=false.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  if (
    !config.useMockData
    && config.formsValidateFormId
    && config.apiKey
    && config.apiUrl
  ) {
    const clonedRequest = request.clone();

    try {
      const payload = await clonedRequest.json() as unknown;
      if (typeof payload === "object" && payload !== null) {
        const record = payload as Record<string, unknown>;
        const formId = record.formId;

        if (typeof formId === "number" || typeof formId === "string") {
          const formExists = await verifyOminityFormExists({
            apiUrl: config.apiUrl,
            apiKey: config.apiKey,
            formId,
          });

          if (!formExists) {
            return new Response(
              JSON.stringify({
                error: "Invalid form ID.",
              }),
              {
                status: 400,
                headers: {
                  "Content-Type": "application/json",
                },
              },
            );
          }
        }
      }
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON payload.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }

  return formSubmitHandler(request);
}
