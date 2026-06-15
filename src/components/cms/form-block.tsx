import type { CmsComponentRenderProps } from "@ominity/next/cms/rendering";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CmsRenderContext as StarterRenderContext } from "@ominity/next/cms";

import { asString, isOminityForm } from "./helpers";
import { FormBlockClient } from "./form-block-client";

export function FormBlock({
  component,
  context,
}: CmsComponentRenderProps<StarterRenderContext>) {
  const form = component.fields.form;
  const title = asString(component.fields.title, "Contact");
  const description = asString(component.fields.description, "");

  if (!isOminityForm(form)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Form block is configured, but no valid form payload was provided by CMS.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <FormBlockClient form={form} locale={context.locale} title={title} description={description} />;
}
