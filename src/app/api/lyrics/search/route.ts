import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/server/http";
import { lrclib, recordSchema } from "@/lib/server/lrclib";
import { chooseAutomatic, rankCandidates } from "@/lib/lyrics";
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const title = z.string().trim().min(1).max(300).parse(query.get("title"));
    const artist = z
      .string()
      .trim()
      .max(300)
      .parse(query.get("artist") || "");
    const params = new URLSearchParams({ track_name: title });
    if (artist) params.set("artist_name", artist);
    const records = [
      ...z.array(recordSchema).parse(await lrclib("search", params)),
    ];
    if (!records.length && artist) {
      params.delete("artist_name");
      records.push(
        ...z.array(recordSchema).parse(await lrclib("search", params)),
      );
    }
    if (!records.length)
      records.push(
        ...z
          .array(recordSchema)
          .parse(await lrclib("search", new URLSearchParams({ q: title }))),
      );
    const candidates = rankCandidates(records, title, artist).slice(0, 12);
    return NextResponse.json({
      candidates,
      selectedId: chooseAutomatic(candidates),
    });
  } catch (error) {
    return apiError(error);
  }
}
