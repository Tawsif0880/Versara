import type { Candidate, LyricLine, LyricsRecord } from "./types";

export function parseLrc(input: string): LyricLine[] {
  const rows: { startMs: number; originalText: string; order: number }[] = [];
  const offset = Number(input.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0);
  for (const row of input.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const stamps = [
      ...row.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g),
    ];
    const text = row.replace(/\[[^\]]*\]/g, "").trim();
    for (const stamp of stamps) {
      if (Number(stamp[2]) >= 60) continue;
      rows.push({
        startMs: Math.max(
          0,
          Number(stamp[1]) * 60000 +
            Number(stamp[2]) * 1000 +
            Number((stamp[3] || "").padEnd(3, "0")) +
            offset,
        ),
        originalText: text,
        order: rows.length,
      });
    }
  }
  const grouped = new Map<number, string[]>();
  rows
    .sort((a, b) => a.startMs - b.startMs || a.order - b.order)
    .forEach((row) => {
      const texts = grouped.get(row.startMs) || [];
      if (!texts.includes(row.originalText)) texts.push(row.originalText);
      grouped.set(row.startMs, texts);
    });
  return [...grouped].map(([startMs, texts], i) => ({
    id: `l${String(i + 1).padStart(4, "0")}`,
    startMs,
    originalText: texts.filter(Boolean).join(" / "),
  }));
}
export function plainLines(input: string): LyricLine[] {
  return input.split(/\r?\n/).map((text, i) => ({
    id: `l${String(i + 1).padStart(4, "0")}`,
    startMs: null,
    originalText: text.trim(),
  }));
}
export function activeLineIndex(
  lines: LyricLine[],
  playerSeconds: number,
  offsetSeconds = 0,
): number {
  const time = (playerSeconds - offsetSeconds) * 1000;
  let low = 0,
    high = lines.length - 1,
    found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const start = lines[mid].startMs;
    if (start === null) return -1;
    if (start <= time) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}
export function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
function similarity(a: string, b: string) {
  a = normalizeText(a);
  b = normalizeText(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = new Set(a.split(" ")),
    bb = new Set(b.split(" "));
  return [...aa].filter((x) => bb.has(x)).length / new Set([...aa, ...bb]).size;
}
export function rankCandidates(
  records: LyricsRecord[],
  title: string,
  artist = "",
): Candidate[] {
  return [...new Map(records.map((r) => [r.id, r])).values()]
    .map((r) => ({
      id: r.id,
      trackName: r.trackName,
      artistName: r.artistName,
      albumName: r.albumName,
      duration: r.duration,
      instrumental: r.instrumental,
      synced: !!r.syncedLyrics && !r.instrumental,
      hasLyrics: !!(r.syncedLyrics || r.plainLyrics) && !r.instrumental,
      score:
        similarity(title, r.trackName) * (artist ? 0.6 : 0.88) +
        (artist ? similarity(artist, r.artistName) * 0.28 : 0) +
        (r.syncedLyrics && !r.instrumental ? 0.12 : 0),
    }))
    .sort((a, b) => b.score - a.score);
}
export function chooseAutomatic(candidates: Candidate[]): number | null {
  const [first, second] = candidates;
  return first?.synced &&
    first.score >= 0.88 &&
    (!second || first.score - second.score >= 0.08)
    ? first.id
    : null;
}
export function formatTime(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
