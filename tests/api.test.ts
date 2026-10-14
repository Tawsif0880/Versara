import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/translate/route";
import { GET as search } from "@/app/api/lyrics/search/route";
import { GET as getLyrics } from "@/app/api/lyrics/[id]/route";

const payload = {
  trackTitle: "Test song",
  artist: "Test artist",
  lines: [{ id: "l0001", startMs: 1000, originalText: "Hola" }],
};
const request = () =>
  new Request("http://localhost/api/translate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
const translation = {
  sourceLanguage: "es",
  targetLanguage: "en",
  translationVersion: "v1",
  lines: [{ id: "l0001", englishText: "Hello" }],
};
const provider = (content: unknown) =>
  Response.json({
    choices: [{ message: { content: JSON.stringify(content) } }],
  });
beforeEach(() => {
  for (const name of [
    "GROQ_API_KEY",
    "TRANSLATION_API_KEY",
    "TRANSLATION_BASE_URL",
    "TRANSLATION_MODEL",
  ])
    vi.stubEnv(name, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("translation route", () => {
  it("uses the configured Groq Qwen model for translation too", async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_test_only");
    const fetch = vi.fn().mockResolvedValue(provider(translation));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.groq.com/openai/v1/chat/completions",
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      model: "qwen/qwen3.8-27b",
      reasoning_format: "hidden",
      reasoning_effort: "none",
    });
  });
  it("returns a setup notice when no provider key is configured", async () => {
    vi.stubEnv("TRANSLATION_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("TRANSLATION_NOT_CONFIGURED");
  });
  it("retries a malformed response once and returns a validated mapping", async () => {
    vi.stubEnv("TRANSLATION_API_KEY", "test-only-secret");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(provider({ ...translation, lines: [] }))
      .mockResolvedValueOnce(provider(translation));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual(translation);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(data).includes("test-only-secret")).toBe(false);
  });
  it("fails after two invalid results and keeps timestamps out of the response", async () => {
    vi.stubEnv("TRANSLATION_API_KEY", "test-only-secret");
    const fetch = vi.fn().mockImplementation(async () =>
      provider({
        ...translation,
        lines: [{ ...translation.lines[0], startMs: 99 }],
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("TRANSLATION_FAILED");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("honors rate limits without making an automatic retry", async () => {
    vi.stubEnv("TRANSLATION_API_KEY", "test-only-secret");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 429, headers: { "Retry-After": "45" } }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
describe("lyrics search route", () => {
  it("fetches and parses a selected record using LRCLIB's get-by-ID endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        id: 42,
        trackName: "Test song",
        artistName: "Test artist",
        albumName: "",
        duration: null,
        instrumental: false,
        syncedLyrics: "[00:01.50]Test",
        plainLyrics: "Test",
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await getLyrics(
      new Request("http://localhost/api/lyrics/42"),
      { params: Promise.resolve({ id: "42" }) },
    );
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe("https://lrclib.net/api/get/42");
    expect(await response.json()).toMatchObject({
      lyricMode: "synced",
      lines: [{ id: "l0001", startMs: 1500, originalText: "Test" }],
    });
  });
  it("accepts missing durations in real LRCLIB records", async () => {
    const record = {
      id: 42,
      trackName: "Test song",
      artistName: "Test artist",
      albumName: "",
      duration: null,
      instrumental: false,
      syncedLyrics: "[00:01]Test",
      plainLyrics: "Test",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          Response.json(url.includes("/get?") ? record : [record]),
        ),
    );
    const response = await search(
      new Request(
        "http://localhost/api/lyrics/search?title=Test%20song&artist=Test%20artist",
      ),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.candidates[0].duration).toBe(0);
    expect(data.selectedId).toBe(42);
  });
  it("includes the artist in the initial lyrics search", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(
      Response.json([
        {
          id: 1,
          trackName: "Test song",
          artistName: "Test artist",
          albumName: "",
          duration: 100,
          instrumental: false,
          syncedLyrics: "[00:01]Hello",
          plainLyrics: "Hello",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetch);
    const response = await search(
      new Request(
        "http://localhost/api/lyrics/search?title=Test%20song&artist=Test%20artist",
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).selectedId).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain("track_name=Test+song");
    expect(
      new URL(fetch.mock.calls[0][0]).searchParams.get("artist_name"),
    ).toBe("Test artist");
    expect(fetch.mock.calls[0][1].headers["User-Agent"]).toContain("Versara");
  });
  it("uses only the title in its broad-query fallback", async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const response = await search(
      new Request(
        "http://localhost/api/lyrics/search?title=Test%20song&artist=Wrong",
      ),
    );
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[1][0]).toBe(
      "https://lrclib.net/api/search?track_name=Test+song",
    );
    expect(fetch.mock.calls[2][0]).toBe(
      "https://lrclib.net/api/search?q=Test+song",
    );
  });
  it("finds title-only results when the detected artist has no matches", async () => {
    const record = {
      id: 7,
      trackName: "Test song",
      artistName: "Actual artist",
      albumName: "",
      duration: 100,
      instrumental: false,
      syncedLyrics: "[00:01]Test",
      plainLyrics: "Test",
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([record]));
    vi.stubGlobal("fetch", fetch);
    const response = await search(
      new Request(
        "http://localhost/api/lyrics/search?title=Test%20song&artist=Wrong",
      ),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.candidates[0].id).toBe(7);
    expect(data.selectedId).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("propagates LRCLIB rate limits and Retry-After", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("", { status: 429, headers: { "Retry-After": "12" } }),
        ),
    );
    const response = await search(
      new Request(
        "http://localhost/api/lyrics/search?title=Song&artist=Artist",
      ),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
  });
});
