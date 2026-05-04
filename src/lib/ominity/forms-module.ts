import { Ominity } from "@ominity/api-typescript";
import { formsModule } from "@ominity/api-module-forms";

export interface VerifyOminityFormExistsInput {
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly formId: number | string;
}

export const verifyOminityFormExists = async (
  input: VerifyOminityFormExistsInput,
): Promise<boolean> => {
  const ominity = new Ominity({
    serverURL: input.apiUrl,
    security: {
      apiKey: input.apiKey,
    },
    modules: [formsModule()],
  });

  try {
    const response = await ominity.modules.forms.forms.list({
      page: 1,
      limit: 1,
      filter: {
        id: input.formId,
      },
      include: ["form_fields"],
    });

    return response.items.length > 0;
  } catch {
    return false;
  }
};
