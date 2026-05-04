export interface ApiErrorBody {
  readonly error: string;
  readonly code: string;
  readonly details?: unknown;
}

export function jsonError(
  status: number,
  code: string,
  error: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = {
    error,
    code,
    ...(typeof details !== "undefined" ? { details } : {}),
  };

  return Response.json(body, { status });
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}
