import { z } from "zod";
import { remoteJson } from "./http";
export const recordSchema = z.object({
  id: z.number().int(),
  trackName: z.string(),
  artistName: z.string(),
  albumName: z
    .string()
    .nullish()
    .transform((v) => v || ""),
  duration: z
    .number()
    .nullish()
    .transform((value) => value ?? 0),
  instrumental: z.boolean().default(false),
  plainLyrics: z.string().nullable(),
  syncedLyrics: z.string().nullable(),
});
export async function lrclib(path: string, params?: URLSearchParams) {
  return remoteJson(
    `https://lrclib.net/api/${path}${params ? `?${params}` : ""}`,
    {
      headers: {
        "User-Agent":
          process.env.LRCLIB_USER_AGENT || "Versara/1.0 (personal lyrics PWA)",
        Accept: "application/json",
      },
    },
  );
}
