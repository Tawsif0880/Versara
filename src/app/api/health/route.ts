import { NextResponse } from "next/server";
import { llmConfig } from "@/lib/server/llm";
export function GET() {
  return NextResponse.json({
    ok: true,
    translationConfigured: !!llmConfig().apiKey,
    identificationConfigured: !!llmConfig().apiKey,
    youtubeMetadataConfigured: !!process.env.YOUTUBE_API_KEY,
  });
}
