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

interface ResolvedMedia {
  readonly url: string;
  readonly alt?: string;
  readonly width?: number;
  readonly height?: number;
}

const firstString = (record: Record<string, unknown>, keys: ReadonlyArray<string>): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
};

const firstNumber = (record: Record<string, unknown>, keys: ReadonlyArray<string>): number | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return Number.parseInt(value, 10);
    }
  }

  return undefined;
};

/**
 * Normalizes an Ominity `media` field value. The API may hand back a bare URL,
 * a media resource, or a single-entry list, so each shape is accepted here
 * instead of in every block that renders an image.
 */
export const asMedia = (value: unknown): ResolvedMedia | null => {
  if (typeof value === "string") {
    const url = value.trim();
    return url.length > 0 ? { url } : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = asMedia(entry);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const url = firstString(record, ["url", "src", "href", "path", "publicUrl", "downloadUrl"]);
  if (!url) {
    const embedded = record._embedded;
    if (typeof embedded === "object" && embedded !== null) {
      const embeddedRecord = embedded as Record<string, unknown>;
      for (const key of ["media", "file", "image"]) {
        const resolved = asMedia(embeddedRecord[key]);
        if (resolved) {
          return resolved;
        }
      }
    }

    return null;
  }

  const alt = firstString(record, ["alt", "altText", "title", "name"]);
  const width = firstNumber(record, ["width"]);
  const height = firstNumber(record, ["height"]);

  return {
    url,
    ...(alt ? { alt } : {}),
    ...(typeof width === "number" ? { width } : {}),
    ...(typeof height === "number" ? { height } : {}),
  };
};

/**
 * The blueprint stores width/height as a CSS length such as `300px` or `50%`.
 */
export const asCssLength = (value: unknown): string | undefined => {
  const raw = asString(value, "").trim();
  if (raw.length === 0) {
    return undefined;
  }

  return /^\d+$/.test(raw) ? `${raw}px` : raw;
};
