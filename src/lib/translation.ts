import { z } from "zod";
import type { LyricLine } from "./types";

export const translationSchema = z
  .object({
    sourceLanguage: z.string().min(2).max(40),
    targetLanguage: z.literal("en"),
    translationVersion: z.literal("v1"),
    lines: z.array(
      z.object({ id: z.string(), englishText: z.string().max(8000) }).strict(),
    ),
  })
  .strict();
export function validateTranslation(value: unknown, originals: LyricLine[]) {
  const result = translationSchema.parse(value);
  const ids = new Set(result.lines.map((l) => l.id));
  if (
    result.lines.length !== originals.length ||
    ids.size !== originals.length ||
    originals.some((l) => !ids.has(l.id))
  ) {
    throw new Error("Translation must contain every original ID exactly once.");
  }
  const byId = new Map(result.lines.map((l) => [l.id, l.englishText]));
  if (originals.some((l) => !l.originalText.trim() && byId.get(l.id)?.trim()))
    throw new Error("Empty segments must remain empty.");
  return {
    ...result,
    lines: originals.map((l) => ({ id: l.id, englishText: byId.get(l.id)! })),
  };
}
