import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/track/identify/route";
import { completeJson, llmConfig } from "@/lib/server/llm";
import { IDENTIFICATION_VERSION } from "@/lib/identification";

const request = () =>
  new Request("http://localhost/api/track/identify", {
    method: "POST",
    body: JSON.stringify({ videoId: "AbCdEf123_-" }),
  });
const completion = (value: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });
beforeEach(() => {
  for (const name of [
    "GROQ_API_KEY",
    "TRANSLATION_API_KEY",
    "TRANSLATION_BASE_URL",
    "TRANSLATION_MODEL",
    "YOUTUBE_API_KEY",
  ])
    vi.stubEnv(name, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LLM song identification", () => {
  it.each([
    "Quiet morning - Test Artist (Official MV)",
    "Test Artist - Quiet morning (Official MV)",
    "Quiet morning | Test Artist | full song",
  ])(
    "identifies %s from metadata rather than delimiter order",
    async (title) => {
      vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ title, author_name: "Music uploader" }),
        )
        .mockResolvedValueOnce(
          completion({ trackTitle: "Quiet morning", artist: "Test Artist" }),
        );
      vi.stubGlobal("fetch", fetch);
      const response = await POST(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        trackTitle: "Quiet morning",
        artist: "Test Artist",
        metadataSource: "oembed",
        identificationVersion: IDENTIFICATION_VERSION,
      });
      expect(fetch.mock.calls[1][0]).toBe(
        "https://api.groq.com/openai/v1/chat/completions",
      );
      const options = fetch.mock.calls[1][1];
      const body = JSON.parse(options.body);
      expect(options.headers.Authorization).toBe("Bearer gsk_test_only");
      expect(body).toMatchObject({
        model: "qwen/qwen3.8-27b",
        response_format: { type: "json_object" },
        reasoning_format: "hidden",
        reasoning_effort: "none",
      });
      expect(JSON.parse(body.messages[1].content)).toMatchObject({
        videoTitle: title,
        channel: "Music uploader",
      });
    },
  );
  it("retries malformed identification once", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ title: "A song | Artist", author_name: "Uploader" }),
      )
      .mockResolvedValueOnce(completion({ song: "wrong schema" }))
      .mockResolvedValueOnce(
        completion({ trackTitle: "A song", artist: "Artist" }),
      );
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request())).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("fails cleanly after two malformed responses", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ title: "A song", author_name: "Uploader" }),
      )
      .mockImplementation(async () => completion({ song: "wrong schema" }));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("IDENTIFICATION_FAILED");
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("offers manual entry for an ambiguous video rather than inventing a title", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ title: "My favorite mix", author_name: "Uploader" }),
        )
        .mockResolvedValueOnce(completion({ trackTitle: null, artist: "" })),
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      trackTitle: "",
      identificationNotice: expect.stringContaining("single song"),
    });
  });
  it("returns a setup notice when the Groq key is missing", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ title: "Song - Artist", author_name: "Uploader" }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).message).toContain("GROQ_API_KEY");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("retains rate-limit recovery for identification", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ title: "Song", author_name: "Uploader" }),
        )
        .mockResolvedValueOnce(
          new Response("", { status: 429, headers: { "Retry-After": "20" } }),
        ),
    );
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("20");
  });
});
describe("shared Groq provider", () => {
  it("uses Groq defaults and accepts the old key variable", () => {
    vi.stubEnv("TRANSLATION_API_KEY", "legacy_key");
    expect(llmConfig()).toMatchObject({
      apiKey: "legacy_key",
      baseUrl: "https://api.groq.com/openai/v1",
      model: "qwen/qwen3.8-27b",
    });
    vi.stubEnv("GROQ_API_KEY", "groq_key");
    expect(llmConfig().apiKey).toBe("groq_key");
  });
  it("does not send Groq-only reasoning parameters to another provider", async () => {
    vi.stubEnv("TRANSLATION_API_KEY", "other_key");
    vi.stubEnv("TRANSLATION_BASE_URL", "https://provider.example/v1");
    vi.stubEnv("TRANSLATION_MODEL", "custom-model");
    const fetch = vi.fn().mockResolvedValue(completion({ ok: true }));
    vi.stubGlobal("fetch", fetch);
    await completeJson([{ role: "user", content: "Return JSON" }], {
      code: "FAILED",
      action: "Test",
      maxTokens: 100,
    });
    expect(
      JSON.parse(fetch.mock.calls[0][1].body).reasoning_format,
    ).toBeUndefined();
  });
});
