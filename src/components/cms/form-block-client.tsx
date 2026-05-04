"use client";

import { useMemo, useState } from "react";

import {
  FormRenderer,
  createShadcnFormComponents,
  tailwindDefaultTheme,
  type FormRendererProps,
} from "@ominity/next/forms";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const shadcnFormComponents = createShadcnFormComponents({
  Input,
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

  const recaptcha = useMemo(() => {
    const siteKey = process.env.NEXT_PUBLIC_OMINITY_FORMS_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      return undefined;
    }

    return {
      version: "v3" as const,
      siteKey,
      action: "form_submit",
    };
  }, []);

  const recaptchaProps = recaptcha ? { recaptcha } : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your message has been sent successfully.
          </div>
        ) : null}

        <FormRenderer
          form={form}
          submitUrl="/api/forms/submit"
          locale={locale}
          styled
          themeOverride={tailwindDefaultTheme}
          components={shadcnFormComponents}
          {...recaptchaProps}
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

