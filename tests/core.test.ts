import { describe, expect, it } from "vitest";
import {
  normalizeMetadata,
  parseDuration,
  parseYouTubeUrl,
} from "@/lib/youtube";
import {
  activeLineIndex,
  chooseAutomatic,
  parseLrc,
  plainLines,
  rankCandidates,
} from "@/lib/lyrics";
import { validateTranslation } from "@/lib/translation";
import type { LyricsRecord } from "@/lib/types";

describe("YouTube URLs", () => {
  it.each([
    " https://www.youtube.com/watch?v=AbCdEf123_-&list=ignored ",
    "https://youtu.be/AbCdEf123_-?si=abc",
    "https://music.youtube.com/watch?v=AbCdEf123_-",
    "https://m.youtube.com/watch?v=AbCdEf123_-",
    "https://youtube.com/shorts/AbCdEf123_-",
  ])("accepts %s", (input) =>
    expect(parseYouTubeUrl(input)).toBe("AbCdEf123_-"),
  );
  it.each([
    "https://youtube.com.evil.test/watch?v=AbCdEf123_-",
    "https://notyoutube.com/watch?v=AbCdEf123_-",
    "javascript:alert(1)",
    "AbCdEf123_-",
    "https://youtu.be/short",
    "https://youtu.be/AbCdEf123_-/extra",
    "https://youtube.com/watch?v=AbCdEf123_-%00",
    "https://user:pass@youtube.com/watch?v=AbCdEf123_-",
  ])("rejects %s", (input) => expect(parseYouTubeUrl(input)).toBeNull());
  it("cleans metadata without treating an arbitrary channel as artist", () => {
    expect(
      normalizeMetadata("Artist - A song (Official Music Video) [4K]"),
    ).toEqual({ trackTitle: "A song", artist: "Artist" });
    expect(normalizeMetadata("A song", "Video curator").artist).toBe("");
    expect(normalizeMetadata("A song", "Artist - Topic").artist).toBe("Artist");
    expect(parseDuration("PT1H2M3S")).toBe(3723);
  });
});
describe("LRC and timing", () => {
  it("sorts timestamps, preserves Unicode, empty segments and repeated cues", () => {
    const lines = parseLrc(
      "[ar:artist]\n[00:20.500]世界\n[00:01.2][00:03.250]Hello\n[00:02.00]\n[00:03.250]Hello\n[00:03.250]Harmony\nplain text",
    );
    expect(lines.map((l) => [l.startMs, l.originalText])).toEqual([
      [1200, "Hello"],
      [2000, ""],
      [3250, "Hello / Harmony"],
      [20500, "世界"],
    ]);
    expect(lines.map((l) => l.id)).toEqual([
      "l0001",
      "l0002",
      "l0003",
      "l0004",
    ]);
  });
  it("handles millisecond metadata offsets and invalid seconds", () => {
    expect(
      parseLrc("[offset:500]\n[01:02.345]word\n[00:70]invalid")[0].startMs,
    ).toBe(62845);
  });
  const lines = parseLrc("[00:10.00]First\n[00:20.00]Second\n[00:30.00]Third");
  it.each([
    [0, 0, -1],
    [9.999, 0, -1],
    [10, 0, 0],
    [19.999, 0, 0],
    [20, 0, 1],
    [100, 0, 2],
    [21.999, 12, -1],
    [22, 12, 0],
    [32, 12, 1],
    [8, -2, 0],
    [18, -2, 1],
  ])("selects player=%s offset=%s → %s", (time, offset, index) =>
    expect(activeLineIndex(lines, time, offset)).toBe(index),
  );
  it("immediately follows seeks and does not invent elapsed time during pause", () => {
    expect([25, 25, 11, 0, 31].map((t) => activeLineIndex(lines, t))).toEqual([
      1, 1, 0, -1, 2,
    ]);
  });
  it("plain lyrics have no timestamps or active line", () => {
    const plain = plainLines("One\n\nThree");
    expect(plain.every((l) => l.startMs === null)).toBe(true);
    expect(activeLineIndex(plain, 100)).toBe(-1);
  });
});
describe("translation mapping", () => {
  const source = parseLrc("[00:01]Hola\n[00:02]Mundo\n[00:03]");
  const good = {
    sourceLanguage: "es",
    targetLanguage: "en",
    translationVersion: "v1",
    lines: [
      { id: "l0002", englishText: "World" },
      { id: "l0001", englishText: "Hello" },
      { id: "l0003", englishText: "" },
    ],
  };
  it("maps by ID and restores canonical order", () =>
    expect(validateTranslation(good, source).lines[0]).toEqual({
      id: "l0001",
      englishText: "Hello",
    }));
  it("rejects duplicates, missing IDs, extra IDs and timestamp fields", () => {
    const duplicate = {
      ...good,
      lines: [good.lines[0], good.lines[0], good.lines[2]],
    };
    expect(() => validateTranslation(duplicate, source)).toThrow();
    expect(() =>
      validateTranslation({ ...good, lines: good.lines.slice(1) }, source),
    ).toThrow();
    expect(() =>
      validateTranslation(
        {
          ...good,
          lines: [...good.lines, { id: "new", englishText: "extra" }],
        },
        source,
      ),
    ).toThrow();
    expect(() =>
      validateTranslation(
        { ...good, lines: good.lines.map((l) => ({ ...l, startMs: 999 })) },
        source,
      ),
    ).toThrow();
  });
  it("never permits invented words in instrumental segments", () =>
    expect(() =>
      validateTranslation(
        {
          ...good,
          lines: good.lines.map((l) =>
            l.id === "l0003" ? { ...l, englishText: "invented" } : l,
          ),
        },
        source,
      ),
    ).toThrow());
});
describe("LRCLIB ranking", () => {
  const record = (
    id: number,
    title: string,
    artist = "Artist",
    synced = true,
  ): LyricsRecord => ({
    id,
    trackName: title,
    artistName: artist,
    albumName: "",
    duration: 180,
    instrumental: false,
    syncedLyrics: synced ? "[00:01]words" : null,
    plainLyrics: "words",
  });
  it("ranks exact synced records over poor partial matches", () => {
    const list = rankCandidates(
      [
        record(1, "Other", "Unknown"),
        record(2, "A Song"),
        record(3, "A Song live", "Artist", false),
      ],
      "A Song",
    );
    expect(list[0].id).toBe(2);
    expect(chooseAutomatic(list)).toBe(2);
  });
  it("requires user choice for ambiguous, low-confidence or plain-only results", () => {
    expect(
      chooseAutomatic(
        rankCandidates([record(1, "A Song"), record(2, "A Song")], "A Song"),
      ),
    ).toBeNull();
    expect(
      chooseAutomatic(rankCandidates([record(1, "Other")], "A Song")),
    ).toBeNull();
    expect(
      chooseAutomatic(
        rankCandidates([record(1, "A Song", "Artist", false)], "A Song"),
      ),
    ).toBeNull();
  });
  it("uses artist names to distinguish recordings with the same title", () => {
    const list = rankCandidates(
      [
        record(1, "A Song", "First Artist"),
        record(2, "A Song", "Different Artist"),
      ],
      "A Song",
      "Different Artist",
    );
    expect(list[0].id).toBe(2);
    expect(list[0].score).toBeGreaterThan(list[1].score);
    expect(chooseAutomatic(list)).toBe(2);
  });
});
