import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
    public retryAfter?: string,
  ) {
    super(message);
  }
}
export function apiError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError)
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Please check the supplied song details.",
        retryable: false,
      },
      { status: 400 },
    );
  const known = error instanceof ApiError;
  return NextResponse.json(
    {
      code: known ? error.code : "SERVICE_UNAVAILABLE",
      message: known
        ? error.message
        : "The service could not be reached. Please try again.",
      retryable: known ? error.status >= 429 : true,
    },
    {
      status: known ? error.status : 502,
      headers:
        known && error.retryAfter ? { "Retry-After": error.retryAfter } : {},
    },
  );
}
export async function remoteJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  if (response.status === 429)
    throw new ApiError(
      "RATE_LIMITED",
      "The service is busy. Please try again shortly.",
      429,
      response.headers.get("Retry-After") || "30",
    );
  if (!response.ok)
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      "The service could not complete this request. Please try again.",
      response.status === 404 ? 404 : 502,
    );
  return response.json();
}
