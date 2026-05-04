import type { FormRendererProps } from "@ominity/next/forms";

type OminityForm = FormRendererProps["form"];

export const asString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
};

export const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

export const isOminityForm = (value: unknown): value is OminityForm => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const form = value as Partial<OminityForm>;
  if (form.resource !== "form") {
    return false;
  }

  if (typeof form.id !== "number") {
    return false;
  }

  if (!form._embedded || !Array.isArray(form._embedded.form_fields)) {
    return false;
  }

  return true;
};
