const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export function isVideoId(value: string) {
  return VIDEO_ID.test(value);
}
export function parseYouTubeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (
      ["youtu.be", "www.youtu.be"].includes(host) &&
      url.pathname.split("/").filter(Boolean).length === 1
    )
      id = url.pathname.slice(1);
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
      ].includes(host)
    ) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (/^\/(embed|shorts)\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname))
        id = url.pathname.split("/")[2];
    }
    return id && isVideoId(id) ? id : null;
  } catch {
    return null;
  }
}
export function normalizeMetadata(videoTitle: string, channel = "") {
  const clean = videoTitle
    .replace(
      /\s*[\[(](?:[^\])]*(?:official|lyrics?|music video|\bmv\b|\b4k\b|\bhd\b)[^\])]*?)[\])]/gi,
      "",
    )
    .replace(
      /\b(?:official\s*(?:music\s*)?(?:video|audio|mv)|lyrics?\s*video|4k|1080p)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  const parts = clean.split(/\s+[-–—]\s+/);
  return {
    trackTitle: parts.length > 1 ? parts.slice(1).join(" - ").trim() : clean,
    artist:
      parts.length > 1
        ? parts[0].trim()
        : /\s*-\s*Topic$/i.test(channel)
          ? channel.replace(/\s*-\s*Topic$/i, "").trim()
          : "",
  };
}
export function parseDuration(value: string): number | undefined {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  return match
    ? Number(match[1] || 0) * 3600 +
        Number(match[2] || 0) * 60 +
        Number(match[3] || 0)
    : undefined;
}
