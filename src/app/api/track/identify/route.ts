import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, remoteJson } from "@/lib/server/http";
import { parseDuration } from "@/lib/youtube";
import type { Track } from "@/lib/types";
import { identifySong } from "@/lib/server/identify-song";
import { IDENTIFICATION_VERSION } from "@/lib/identification";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const { videoId } = z
      .object({ videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/) })
      .parse(await request.json());
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = "",
      channel = "",
      description = "",
      durationSeconds: number | undefined;
    let metadataSource: Track["metadataSource"] = "manual";
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const data = z
          .object({
            items: z.array(
              z.object({
                snippet: z.object({
                  title: z.string(),
                  channelTitle: z.string(),
                  description: z.string().optional(),
                }),
                contentDetails: z.object({ duration: z.string() }),
              }),
            ),
          })
          .parse(
            await remoteJson(
              `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "snippet,contentDetails", id: videoId, key: process.env.YOUTUBE_API_KEY })}`,
            ),
          );
        const item = data.items[0];
        if (item) {
          title = item.snippet.title;
          channel = item.snippet.channelTitle;
          description = item.snippet.description?.slice(0, 4000) || "";
          durationSeconds = parseDuration(item.contentDetails.duration);
          metadataSource = "youtube";
        }
      } catch {
        /* Fall back to public metadata when a key is invalid or quota is exhausted. */
      }
    }
    if (!title) {
      try {
        const data = z
          .object({ title: z.string(), author_name: z.string() })
          .parse(
            await remoteJson(
              `https://www.youtube.com/oembed?${new URLSearchParams({ url: youtubeUrl, format: "json" })}`,
            ),
          );
        title = data.title;
        channel = data.author_name;
        metadataSource = "oembed";
      } catch {
        /* Playback and manual song matching remain available. */
      }
    }
    let trackTitle = "",
      artist = "",
      identificationNotice: string | undefined;
    if (title) {
      const identified = await identifySong({
        videoTitle: title.slice(0, 1000),
        channel: channel.slice(0, 300),
        description,
      });
      trackTitle = identified.trackTitle || "";
      artist = identified.artist;
      if (!trackTitle)
        identificationNotice =
          "The video metadata doesn’t identify a single song. Enter the song name to find its lyrics.";
    } else
      identificationNotice =
        "Video details are unavailable. Enter the song name to find its lyrics.";
    return NextResponse.json({
      videoId,
      youtubeUrl,
      videoTitle: title || "YouTube song",
      trackTitle,
      artist,
      identificationNotice,
      identificationVersion: trackTitle ? IDENTIFICATION_VERSION : undefined,
      durationSeconds,
      metadataSource,
    } satisfies Track);
  } catch (error) {
    return apiError(error);
  }
}
