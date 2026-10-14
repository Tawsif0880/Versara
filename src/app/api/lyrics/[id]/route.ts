import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/http";
import { lrclib, recordSchema } from "@/lib/server/lrclib";
import { parseLrc, plainLines } from "@/lib/lyrics";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    z.string()
      .regex(/^\d{1,12}$/)
      .parse(id);
    const record = recordSchema.parse(await lrclib(`get/${id}`));
    const synced = record.syncedLyrics ? parseLrc(record.syncedLyrics) : [];
    const lines = record.instrumental
      ? []
      : synced.length
        ? synced
        : record.plainLyrics
          ? plainLines(record.plainLyrics)
          : [];
    return NextResponse.json({
      record,
      lines,
      lyricMode:
        synced.length && !record.instrumental
          ? "synced"
          : lines.length
            ? "plain"
            : "unavailable",
    });
  } catch (error) {
    return apiError(error);
  }
}
