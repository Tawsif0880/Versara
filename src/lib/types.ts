export type LyricLine = {
  id: string;
  startMs: number | null;
  originalText: string;
  englishText?: string;
};
export type ViewMode = "both" | "english" | "original";
export type Track = {
  videoId: string;
  youtubeUrl: string;
  videoTitle: string;
  trackTitle: string;
  artist: string;
  durationSeconds?: number;
  metadataSource: "youtube" | "oembed" | "manual";
  identificationVersion?: string;
  identificationNotice?: string;
};
export type SongSession = Track & {
  lrclibId?: number;
  lyricMode: "synced" | "plain" | "unavailable";
  sourceLanguage?: string;
  targetLanguage: "en";
  translationVersion?: string;
  offsetSeconds: number;
  lines: LyricLine[];
  updatedAt: number;
};
export type LyricsRecord = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};
export type Candidate = Omit<LyricsRecord, "plainLyrics" | "syncedLyrics"> & {
  synced: boolean;
  hasLyrics: boolean;
  score: number;
};
