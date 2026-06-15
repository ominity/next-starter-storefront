"use client";

import { useState, type ComponentProps } from "react";

import {
  FormRenderer,
  createShadcnFormComponents,
  type FormInputAdapterProps,
  tailwindDefaultTheme,
  type FormRendererProps,
} from "@ominity/next/forms";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolveUiDictionary } from "@/lib/i18n/ui-dictionary";

function FormInput({ inputMode, ...props }: FormInputAdapterProps) {
  return (
      <Input
        {...props}
        inputMode={inputMode as ComponentProps<typeof Input>["inputMode"]}
      />
    );
}

const shadcnFormComponents = createShadcnFormComponents({
  Input: FormInput,
  Textarea,
  Button,
});

interface FormBlockClientProps {
  readonly form: FormRendererProps["form"];
  readonly locale: string;
  readonly title: string;
  readonly description: string;
}

export function FormBlockClient({ form, locale, title, description }: FormBlockClientProps) {
  const [submitted, setSubmitted] = useState(false);
  const dictionary = resolveUiDictionary(locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {dictionary.forms.status.submitSuccess}
          </div>
        ) : null}

        <FormRenderer
          form={form}
          submitUrl="/api/forms/submit"
          locale={locale}
          messages={dictionary.forms}
          styled
          themeOverride={tailwindDefaultTheme}
          components={shadcnFormComponents}
          onSubmitSuccess={() => {
            setSubmitted(true);
          }}
          onSubmitError={() => {
            setSubmitted(false);
          }}
        />
      </CardContent>
    </Card>
  );
}
