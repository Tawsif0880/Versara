import { z } from "zod";
import { ApiError } from "./http";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function llmConfig() {
  return {
    apiKey:
      process.env.GROQ_API_KEY?.trim() ||
      process.env.TRANSLATION_API_KEY?.trim(),
    baseUrl: (
      process.env.TRANSLATION_BASE_URL?.trim() ||
      "https://api.groq.com/openai/v1"
    ).replace(/\/$/, ""),
    model: process.env.TRANSLATION_MODEL?.trim() || "qwen/qwen3.8-27b",
  };
}

// Identification and translation share the same server-only provider configuration.
export async function completeJson(
  messages: LlmMessage[],
  options: {
    code: string;
    action: string;
    maxTokens: number;
    timeoutMs?: number;
  },
) {
  const config = llmConfig();
  if (!config.apiKey)
    throw new ApiError(
      "LLM_NOT_CONFIGURED",
      "Add GROQ_API_KEY to .env.local and restart the app to enable AI song identification and English translation.",
      503,
    );
  const groqQwen =
    new URL(config.baseUrl).hostname === "api.groq.com" &&
    config.model.startsWith("qwen/");
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: "json_object" },
        max_completion_tokens: options.maxTokens,
        ...(groqQwen
          ? { reasoning_format: "hidden", reasoning_effort: "none" }
          : {}),
      }),
      signal: AbortSignal.timeout(options.timeoutMs || 50000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      options.code,
      `${options.action} could not reach the AI provider. Please try again.`,
    );
  }
  if (response.status === 429)
    throw new ApiError(
      "RATE_LIMITED",
      `${options.action} is busy. Please retry shortly.`,
      429,
      response.headers.get("Retry-After") || "30",
    );
  if ([401, 403].includes(response.status))
    throw new ApiError(
      "LLM_CONFIGURATION_ERROR",
      "The AI provider rejected the API key. Check GROQ_API_KEY in .env.local and restart the app.",
      503,
    );
  if ([400, 404].includes(response.status))
    throw new ApiError(
      "LLM_CONFIGURATION_ERROR",
      "The AI provider could not use the configured model. Check TRANSLATION_MODEL and TRANSLATION_BASE_URL in .env.local.",
      503,
    );
  if (!response.ok)
    throw new ApiError(
      options.code,
      `${options.action} could not complete. Please try again.`,
    );
  const parsed = z
    .object({
      choices: z.array(
        z.object({ message: z.object({ content: z.string().nullable() }) }),
      ),
    })
    .safeParse(await response.json().catch(() => null));
  // Callers schema-validate the content and make one corrective retry when malformed.
  return parsed.success ? parsed.data.choices[0]?.message.content || "" : "";
}
