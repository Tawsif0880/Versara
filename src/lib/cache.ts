import { openDB } from "idb";
import type { SongSession } from "./types";
import { z } from "zod";

const sessionSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  youtubeUrl: z.string(),
  videoTitle: z.string(),
  trackTitle: z.string(),
  artist: z.string(),
  metadataSource: z.enum(["youtube", "oembed", "manual"]),
  identificationVersion: z.string().optional(),
  identificationNotice: z.string().optional(),
  durationSeconds: z.number().optional(),
  lrclibId: z.number().optional(),
  lyricMode: z.enum(["synced", "plain", "unavailable"]),
  sourceLanguage: z.string().optional(),
  targetLanguage: z.literal("en"),
  translationVersion: z.string().optional(),
  offsetSeconds: z.number().min(-30).max(30),
  updatedAt: z.number(),
  lines: z.array(
    z.object({
      id: z.string(),
      startMs: z.number().nullable(),
      originalText: z.string(),
      englishText: z.string().optional(),
    }),
  ),
});
const db = () =>
  openDB("versara", 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("songs"))
        database.createObjectStore("songs", { keyPath: "videoId" });
      if (!database.objectStoreNames.contains("resources"))
        database.createObjectStore("resources", { keyPath: "key" });
    },
  });
// Recording-level resources are shared by different videos of the same recording.
export async function cachedResource(key: string): Promise<unknown> {
  try {
    const database = await db();
    try {
      return (await database.get("resources", key))?.value;
    } finally {
      database.close();
    }
  } catch {
    return undefined;
  }
}
export async function saveResource(key: string, value: unknown) {
  const database = await db();
  try {
    await database.put("resources", { key, value, updatedAt: Date.now() });
    const rows = (
      (await database.getAll("resources")) as {
        key: string;
        updatedAt: number;
      }[]
    ).sort((a, b) => b.updatedAt - a.updatedAt);
    const transaction = database.transaction("resources", "readwrite");
    for (const row of rows.slice(100)) await transaction.store.delete(row.key);
    await transaction.done;
  } finally {
    database.close();
  }
}
export async function recentSongs(): Promise<SongSession[]> {
  const database = await db();
  try {
    const rows: unknown[] = await database.getAll("songs");
    return rows
      .flatMap((r) => {
        const parsed = sessionSchema.safeParse(r);
        return parsed.success ? [parsed.data] : [];
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);
  } finally {
    database.close();
  }
}
export async function saveSong(song: SongSession) {
  const database = await db();
  try {
    await database.put("songs", sessionSchema.parse(song));
    const rows = ((await database.getAll("songs")) as SongSession[]).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
    const transaction = database.transaction("songs", "readwrite");
    for (const row of rows.slice(20))
      await transaction.store.delete(row.videoId);
    await transaction.done;
    if (song.lrclibId)
      await saveResource(
        `offset:${song.videoId}:${song.lrclibId}`,
        song.offsetSeconds,
      );
  } finally {
    database.close();
  }
}
export async function clearSongs() {
  const database = await db();
  try {
    const transaction = database.transaction(
      ["songs", "resources"],
      "readwrite",
    );
    await transaction.objectStore("songs").clear();
    await transaction.objectStore("resources").clear();
    await transaction.done;
  } finally {
    database.close();
  }
}
