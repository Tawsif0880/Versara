"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Headphones,
  History,
  Languages,
  Link2,
  LoaderCircle,
  Music2,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import type {
  Candidate,
  LyricLine,
  LyricsRecord,
  SongSession,
  ViewMode,
} from "@/lib/types";
import { activeLineIndex, formatTime } from "@/lib/lyrics";
import { parseYouTubeUrl } from "@/lib/youtube";
import { IDENTIFICATION_VERSION } from "@/lib/identification";
import {
  cachedResource,
  clearSongs,
  recentSongs,
  saveResource,
  saveSong,
} from "@/lib/cache";
import { validateTranslation } from "@/lib/translation";
import { YouTubePlayer } from "./youtube-player";
import type { YouTubeControls } from "./youtube-player";
import { PlaybackControls } from "./playback-controls";
import Image from "next/image";
import { usePwa } from "./pwa";

type Stage = "idle" | "identify" | "lyrics" | "translate";
class RequestError extends Error {
  constructor(
    message: string,
    public retryAfter = 0,
  ) {
    super(message);
  }
}
async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) {
    const retry = response.headers.get("Retry-After");
    const seconds = retry
      ? /^\d+$/.test(retry)
        ? Number(retry)
        : Math.ceil((Date.parse(retry) - Date.now()) / 1000)
      : 0;
    throw new RequestError(
      data.message || "Could not complete the request. Please try again.",
      Math.max(0, Math.min(3600, seconds || 0)),
    );
  }
  return data;
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      className="sheet clay"
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
      }}
    >
      <div className="sheet-heading">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ModeControl({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange(value: ViewMode): void;
}) {
  return (
    <div className="segments" role="group" aria-label="Lyrics display">
      {(["both", "english", "original"] as const).map((mode) => (
        <button
          key={mode}
          aria-pressed={value === mode}
          className={value === mode ? "selected" : ""}
          onClick={() => onChange(mode)}
        >
          {mode[0].toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );
}
function UrlForm({
  compact = false,
  value,
  onChange,
  onSubmit,
  onPaste,
  disabled,
  busy,
  inputRef,
}: {
  compact?: boolean;
  value: string;
  onChange(value: string): void;
  onSubmit(event: FormEvent): void;
  onPaste(): void;
  disabled: boolean;
  busy: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <form
      className={compact ? "url-form compact" : "url-form"}
      onSubmit={onSubmit}
    >
      <div className="input-trough">
        <Link2 size={20} />
        <input
          ref={inputRef}
          aria-label="YouTube song link"
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            compact ? "Paste another YouTube link" : "Paste a YouTube song link"
          }
        />
        {value && (
          <button
            type="button"
            className="clear-input"
            aria-label="Clear link"
            onClick={() => onChange("")}
          >
            <X size={16} />
          </button>
        )}
        {!compact && (
          <button type="button" className="paste-button" onClick={onPaste}>
            Paste
          </button>
        )}
      </div>
      <button className="primary" disabled={disabled} type="submit">
        {busy ? (
          <LoaderCircle size={18} className="spin" />
        ) : (
          <>
            {compact ? "Go" : "Open song"}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
export function VersaraApp() {
  const [song, setSong] = useState<SongSession | null>(null);
  const [recents, setRecents] = useState<SongSession[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [cacheError, setCacheError] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [mode, setMode] = useState<ViewMode>("both");
  const [modal, setModal] = useState<"settings" | "match" | "install" | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [time, setTime] = useState(0);
  const [playerState, setPlayerState] = useState(-1);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [expandedLyrics, setExpandedLyrics] = useState(false);
  const playerControls = useRef<YouTubeControls>(null);
  const [follow, setFollow] = useState(true);
  const [seek, setSeek] = useState<{ seconds: number; nonce: number } | null>(
    null,
  );
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const requestId = useRef(0);
  const activeRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelPending = useCallback(() => {
    requestId.current++;
  }, []);
  const { offline, standalone, install } = usePwa();
  const busy = stage !== "idle";
  const active =
    song?.lyricMode === "synced"
      ? activeLineIndex(song.lines, time, song.offsetSeconds)
      : -1;
  const hasTranslation = song?.lines.some((l) => l.englishText !== undefined);

  useEffect(() => {
    recentSongs()
      .then(setRecents)
      .catch(() =>
        setCacheError(
          "Local storage is unavailable. Songs will work, but won’t be saved on this device.",
        ),
      );
    api<{ translationConfigured: boolean }>("/api/health")
      .then((result) => setConfigured(result.translationConfigured))
      .catch(() => {});
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem("versara-view");
        if (["both", "english", "original"].includes(saved || ""))
          setMode(saved as ViewMode);
      } catch {
        /* Optional preference. */
      }
    });
    return cancelPending;
  }, [cancelPending]);
  useEffect(() => {
    if (!song) return;
    const timer = setTimeout(() => {
      saveSong(song)
        .then(() => recentSongs())
        .then(setRecents)
        .catch(() =>
          setCacheError(
            "This device couldn’t save the song. Listening is still available.",
          ),
        );
    }, 350);
    return () => clearTimeout(timer);
  }, [song]);
  useEffect(() => {
    if (!retryAt) return;
    const update = () =>
      setCooldown(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => {
    if (!expandedLyrics || !follow || active < 0 || !activeRef.current) return;
    const element = activeRef.current,
      panel = element.closest(".lyrics-scroll");
    if (panel)
      panel.scrollTo({
        top:
          element.offsetTop - (panel.clientHeight - element.clientHeight) / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [active, follow, mode, expandedLyrics]);
  function changeMode(value: ViewMode) {
    setMode(value);
    try {
      localStorage.setItem("versara-view", value);
    } catch {
      /* Optional preference. */
    }
  }
  function fail(err: unknown, token: number) {
    if (token !== requestId.current) return;
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again.",
    );
    if (err instanceof RequestError && err.retryAfter)
      setRetryAt(Date.now() + err.retryAfter * 1000);
    setStage("idle");
  }
  async function translate(current: SongSession, token: number, force = false) {
    if (!current.lines.length || cooldown > 0) return;
    setStage("translate");
    setError("");
    try {
      const originals = current.lines.map(({ id, startMs, originalText }) => ({
        id,
        startMs,
        originalText,
      }));
      const signature = JSON.stringify(originals);
      const key = `translation:${current.lrclibId}:en:v1`;
      const saved =
        !force && current.lrclibId
          ? ((await cachedResource(key)) as
              { signature?: string; translation?: unknown } | undefined)
          : undefined;
      if (token !== requestId.current) return;
      let cached: unknown;
      if (saved?.signature === signature) {
        try {
          cached = validateTranslation(saved.translation, current.lines);
        } catch {
          /* Rebuild corrupted translations. */
        }
      }
      const result = validateTranslation(
        cached ||
          (await api<unknown>("/api/translate", {
            trackTitle: current.trackTitle,
            artist: current.artist,
            lines: originals,
          })),
        current.lines,
      );
      if (token !== requestId.current) return;
      const byId = new Map(result.lines.map((l) => [l.id, l.englishText]));
      if (current.lrclibId)
        void saveResource(key, { signature, translation: result }).catch(
          () => {},
        );
      setSong((previous) =>
        previous &&
        previous.videoId === current.videoId &&
        previous.lrclibId === current.lrclibId
          ? {
              ...previous,
              sourceLanguage: result.sourceLanguage,
              translationVersion: "v1",
              lines: previous.lines.map((l) => ({
                ...l,
                englishText: byId.get(l.id),
              })),
              updatedAt: Date.now(),
            }
          : previous,
      );
      setStage("idle");
    } catch (err) {
      fail(err, token);
    }
  }
  async function selectRecord(id: number, current: SongSession, token: number) {
    setStage("lyrics");
    setError("");
    try {
      const result = await api<{
        record: LyricsRecord;
        lines: LyricLine[];
        lyricMode: SongSession["lyricMode"];
      }>(`/api/lyrics/${id}`);
      if (token !== requestId.current) return;
      const savedOffset = await cachedResource(
        `offset:${current.videoId}:${id}`,
      );
      if (token !== requestId.current) return;
      const offset =
        typeof savedOffset === "number" &&
        Number.isFinite(savedOffset) &&
        Math.abs(savedOffset) <= 30
          ? savedOffset
          : 0;
      const selected: SongSession = {
        ...current,
        lrclibId: id,
        trackTitle: result.record.trackName,
        artist: result.record.artistName,
        identificationVersion: IDENTIFICATION_VERSION,
        identificationNotice: undefined,
        lines: result.lines,
        lyricMode: result.lyricMode,
        sourceLanguage: undefined,
        translationVersion: undefined,
        offsetSeconds: current.lrclibId === id ? current.offsetSeconds : offset,
        updatedAt: Date.now(),
      };
      setSong(selected);
      setModal(null);
      setFollow(true);
      if (selected.lines.length) await translate(selected, token);
      else {
        setStage("idle");
        setError(
          result.record.instrumental
            ? "This recording is marked instrumental. Choose another lyrics match if it has vocals."
            : "This match has no readable lyrics. Try another recording.",
        );
      }
    } catch (err) {
      fail(err, token);
    }
  }
  async function search(
    current: SongSession,
    token: number,
    alwaysChoose = false,
  ) {
    setStage("lyrics");
    setError("");
    try {
      const params = new URLSearchParams({
        title: current.trackTitle,
      });
      if (current.artist.trim()) params.set("artist", current.artist.trim());
      const result = await api<{
        candidates: Candidate[];
        selectedId: number | null;
      }>(`/api/lyrics/search?${params}`);
      if (token !== requestId.current) return;
      setCandidates(result.candidates);
      if (result.selectedId && !alwaysChoose)
        await selectRecord(result.selectedId, current, token);
      else {
        setStage("idle");
        setEditTitle(current.trackTitle);
        setEditArtist(current.artist);
        setModal("match");
        if (!result.candidates.length)
          setError(
            "No lyrics match found. Check the song title and artist, or leave the artist blank to broaden the search.",
          );
      }
    } catch (err) {
      fail(err, token);
    }
  }
  async function openSong(input: string) {
    const videoId = parseYouTubeUrl(input);
    if (!videoId) {
      setError(
        "That doesn’t look like a YouTube video link. Paste a watch, music.youtube.com, or youtu.be link.",
      );
      inputRef.current?.focus();
      return;
    }
    const token = ++requestId.current;
    setError("");
    setCandidates([]);
    setTime(0);
    setPlayerState(-1);
    setDuration(0);
    setPlayerReady(false);
    setShowVideo(false);
    setExpandedLyrics(false);
    setFollow(true);
    setSeek(null);
    setModal(null);
    const cached = recents.find((s) => s.videoId === videoId);
    if (
      cached?.identificationVersion === IDENTIFICATION_VERSION &&
      cached.lines.length
    ) {
      setSong({ ...cached, updatedAt: Date.now() });
      setStage("idle");
      setUrl(cached.youtubeUrl);
      return;
    }
    const initial: SongSession = {
      videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoTitle: "YouTube song",
      trackTitle: "",
      artist: "",
      metadataSource: "manual",
      lyricMode: "unavailable",
      targetLanguage: "en",
      offsetSeconds: 0,
      lines: [],
      updatedAt: Date.now(),
    };
    setSong(initial);
    setStage("identify");
    try {
      const track = await api<Partial<SongSession>>("/api/track/identify", {
        videoId,
      });
      if (token !== requestId.current) return;
      const identified = { ...initial, ...track };
      setSong(identified);
      if (identified.trackTitle) await search(identified, token);
      else {
        setStage("idle");
        setEditTitle("");
        setEditArtist("");
        setModal("match");
        setError(
          identified.identificationNotice ||
            "Enter the song name to find its lyrics. You can already use the YouTube player.",
        );
      }
    } catch (err) {
      fail(err, token);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy && !cooldown) void openSong(url);
  }
  function home() {
    requestId.current++;
    setStage("idle");
    setSong(null);
    setError("");
    setModal(null);
    setUrl("");
  }
  function editMatch() {
    if (!song) return;
    setEditTitle(song.trackTitle);
    setEditArtist(song.artist);
    setModal("match");
  }
  function adjustOffset(delta: number | "reset") {
    setSong((previous) =>
      previous
        ? {
            ...previous,
            offsetSeconds:
              delta === "reset"
                ? 0
                : Math.max(-30, Math.min(30, previous.offsetSeconds + delta)),
            updatedAt: Date.now(),
          }
        : previous,
    );
  }
  async function installApp() {
    try {
      if (!(await install())) setModal("install");
    } catch {
      setModal("install");
    }
  }
  const onTime = useCallback(
    (
      seconds: number,
      duration: number,
      state: number,
      audio: { volume: number; muted: boolean },
    ) => {
      setTime(seconds);
      setPlayerState(state);
      setDuration(duration);
      setVolume(audio.volume);
      setMuted(audio.muted);
    },
    [],
  );
  const showBlockedPlayer = useCallback(() => setShowVideo(true), []);
  function seekTo(seconds: number) {
    const value = Math.max(0, Math.min(seconds, duration || seconds));
    setSeek({ seconds: value, nonce: Date.now() });
    setFollow(true);
  }
  async function paste() {
    try {
      setUrl(await navigator.clipboard.readText());
    } catch {
      setError("Use your browser’s Paste command in the link field.");
      inputRef.current?.focus();
    }
  }
  const syncControls = (
    <div className="sync-card clay">
      <div className="sync-title">
        <span>
          <SlidersHorizontal size={16} /> Lyrics sync
        </span>
        <button
          className="text-button"
          disabled={!song || song.lyricMode !== "synced"}
          onClick={() => adjustOffset("reset")}
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <div className="sync-stepper">
        <button
          aria-label="Lyrics 0.5 seconds earlier"
          disabled={song?.lyricMode !== "synced" || song.offsetSeconds <= -30}
          onClick={() => adjustOffset(-0.5)}
        >
          <Minus size={15} /> 0.5 s
        </button>
        <output aria-label="Sync offset">
          {(song?.offsetSeconds || 0) >= 0 ? "+" : ""}
          {(song?.offsetSeconds || 0).toFixed(1)}
          <small> s</small>
        </output>
        <button
          aria-label="Lyrics 0.5 seconds later"
          disabled={song?.lyricMode !== "synced" || song.offsetSeconds >= 30}
          onClick={() => adjustOffset(0.5)}
        >
          <Plus size={15} /> 0.5 s
        </button>
      </div>
      <p className="caption">
        {song?.lyricMode === "synced"
          ? "Lyrics ahead of the song? Add a little time."
          : "Timing controls are available with synced lyrics."}
      </p>
    </div>
  );

  return (
    <div className={`app ${song ? "listening compact-listening" : "home"}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-group">
            {song && (
              <button
                className="icon-button back-button"
                aria-label="Back to home"
                onClick={home}
              >
                <ArrowLeft size={21} />
              </button>
            )}
            <button className="brand" onClick={home} aria-label="Versara home">
              <span className="brand-mark">
                <Music2 size={24} />
              </span>
              <span>Versara</span>
            </button>
          </div>
          {song ? (
            <div className="header-import">
              <UrlForm
                compact
                value={url}
                onChange={setUrl}
                onSubmit={submit}
                onPaste={paste}
                disabled={busy || cooldown > 0}
                busy={busy}
              />
            </div>
          ) : (
            <div className="header-label">
              <Headphones size={15} /> A little closer to the music
            </div>
          )}
          <div className="header-actions">
            {!standalone && (
              <button
                className="secondary install-header"
                onClick={() => void installApp()}
              >
                <Download size={16} /> Install app
              </button>
            )}
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => {
                setClearConfirm(false);
                setModal("settings");
              }}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </header>
      {offline && (
        <div className="network-banner" role="status">
          <WifiOff size={16} /> You’re offline. Saved lyrics are available;
          YouTube playback needs internet.
        </div>
      )}
      <main id="main" className={song ? "listening-main" : "home-main"}>
        {!song ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span className="status-dot" /> Music, with meaning
              </div>
              <h1>
                Feel the music.
                <br />
                <span>Understand every word.</span>
              </h1>
              <p>
                Your favorite songs. Their original words.
                <br className="mobile-break" /> A little more understanding.
              </p>
            </section>
            <section className="import-card clay" aria-label="Open a song">
              <UrlForm
                value={url}
                onChange={setUrl}
                onSubmit={submit}
                onPaste={paste}
                disabled={busy || cooldown > 0}
                busy={busy}
                inputRef={inputRef}
              />
              <div className="import-caption">
                <span>
                  <CheckCircle2 size={14} /> YouTube playback · Synced lyrics ·
                  English translations
                </span>
                <span className="source-credit">Powered by LRCLIB</span>
              </div>
            </section>
            {error && (
              <div className="notice error" role="alert">
                {error}
                {cooldown > 0 && ` Retry in ${cooldown}s.`}
              </div>
            )}
            <section className="recents" aria-labelledby="recent-heading">
              <div className="section-heading">
                <h2 id="recent-heading">
                  <History size={18} /> Recent listens
                </h2>
                <span className="caption">Saved on this device</span>
              </div>
              {recents.length ? (
                <div className="recent-grid">
                  {recents.map((recent) => (
                    <button
                      className="recent-card clay"
                      key={recent.videoId}
                      onClick={() => void openSong(recent.youtubeUrl)}
                    >
                      <span className="recent-art">
                        <Music2 size={26} />
                      </span>
                      <span className="recent-info">
                        <strong>
                          {recent.trackTitle || recent.videoTitle}
                        </strong>
                        <span>{recent.artist || "YouTube"}</span>
                        <small>
                          {recent.lyricMode === "synced"
                            ? "Synced lyrics"
                            : recent.lyricMode === "plain"
                              ? "Untimed lyrics"
                              : "Find lyrics"}
                          {recent.translationVersion ? " · English saved" : ""}
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-recents">
                  <div className="empty-note">
                    <Headphones size={26} />
                  </div>
                  <p>
                    Your next favorite moment starts here.
                    <span>
                      Open a song and it’ll be waiting here next time.
                    </span>
                  </p>
                </div>
              )}
            </section>
            {!standalone && (
              <button
                className="install-hint"
                onClick={() => void installApp()}
              >
                <span className="install-icon">
                  <Download size={20} />
                </span>
                <span>
                  <strong>Make yourself at home.</strong>
                  <span>Add Versara to your home screen.</span>
                </span>
                <ArrowRight size={18} />
              </button>
            )}
          </>
        ) : (
          <>
            <div className="mobile-import">
              <UrlForm
                compact
                value={url}
                onChange={setUrl}
                onSubmit={submit}
                onPaste={paste}
                disabled={busy || cooldown > 0}
                busy={busy}
              />
            </div>
            <div className="listening-grid">
              <div className="player-column">
                <YouTubePlayer
                  ref={playerControls}
                  key={song.videoId}
                  videoId={song.videoId}
                  onTime={onTime}
                  seekRequest={seek}
                  showVideo={showVideo}
                  onReadyChange={setPlayerReady}
                  onPlaybackBlocked={showBlockedPlayer}
                />
                <section className="track-card clay">
                  <Image
                    className="song-thumbnail"
                    src={`https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                    alt={`${song.trackTitle || "Song"} thumbnail`}
                    width={104}
                    height={104}
                    unoptimized
                    onError={(event) => {
                      event.currentTarget.src = "/icons/icon-192.png";
                    }}
                  />
                  <div className="track-details">
                    <p className="now-playing-label">Now playing</p>
                    <div className="track-top">
                      <span className="badge">
                        {song.lyricMode === "synced" ? (
                          <>
                            <span className="status-dot" /> Synced lyrics
                          </>
                        ) : song.lyricMode === "plain" ? (
                          "Timing unavailable"
                        ) : (
                          "Finding the words"
                        )}
                      </span>
                      <button
                        className="text-button"
                        onClick={editMatch}
                        disabled={busy || cooldown > 0}
                      >
                        <SlidersHorizontal size={14} /> Edit match
                      </button>
                    </div>
                    <h1>{song.trackTitle || song.videoTitle}</h1>
                    <p className="artist">{song.artist || "Artist unknown"}</p>
                    <div className="track-bottom">
                      <span>
                        <Languages size={15} />{" "}
                        {song.sourceLanguage
                          ? `${song.sourceLanguage.toUpperCase()} → English`
                          : "Original → English"}
                      </span>
                      <span>
                        {formatTime(time)}{" "}
                        {playerState === 1
                          ? "· Playing"
                          : playerState === 2
                            ? "· Paused"
                            : ""}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
              <section className="lyrics-panel clay" aria-label="Lyrics">
                <div className="lyrics-toolbar">
                  <ModeControl value={mode} onChange={changeMode} />
                  {song.lyricMode === "synced" && (
                    <button
                      className="lyrics-view-toggle"
                      aria-pressed={expandedLyrics}
                      onClick={() => {
                        setExpandedLyrics((value) => !value);
                        setFollow(true);
                      }}
                    >
                      {expandedLyrics ? "Focus view" : "All lyrics"}
                    </button>
                  )}
                  <span className="follow-status">
                    <span
                      className={
                        follow ? "status-dot lavender" : "status-dot muted"
                      }
                    />
                    {follow ? "Following" : "Paused follow"}
                  </span>
                </div>
                {busy && (
                  <div className="processing" role="status">
                    <LoaderCircle size={16} className="spin" />
                    <span>
                      {stage === "identify"
                        ? "Recognizing your song…"
                        : stage === "lyrics"
                          ? "Finding the right lyrics…"
                          : "Translating the meaning…"}
                    </span>
                  </div>
                )}
                {song.lyricMode === "plain" && (
                  <div className="inline-hint">
                    Lyrics found — timing unavailable. Read at your own pace.
                  </div>
                )}
                {!busy &&
                  song.lines.length > 0 &&
                  !hasTranslation &&
                  !error && (
                    <div className="inline-hint">
                      English translation isn’t saved yet.{" "}
                      <button
                        className="text-button"
                        disabled={cooldown > 0}
                        onClick={() =>
                          void translate(song, ++requestId.current)
                        }
                      >
                        Translate to English
                      </button>
                    </div>
                  )}
                {error && (
                  <div className="notice error" role="alert">
                    <p>{error}</p>
                    <div className="actions">
                      {song.lines.length > 0 ? (
                        <button
                          disabled={busy || cooldown > 0}
                          onClick={() =>
                            void translate(song, ++requestId.current)
                          }
                        >
                          <RotateCcw size={14} /> Retry translation
                        </button>
                      ) : (
                        <button
                          disabled={busy || cooldown > 0}
                          onClick={editMatch}
                        >
                          <Search size={14} /> Edit search
                        </button>
                      )}
                      {cooldown > 0 && (
                        <span className="caption">Retry in {cooldown}s</span>
                      )}
                    </div>
                  </div>
                )}
                <div
                  className={`lyrics-scroll ${!expandedLyrics && song.lyricMode === "synced" ? "focus-lyrics" : ""}`}
                  tabIndex={0}
                  aria-label="Scrollable lyrics. Scrolling pauses follow."
                  onWheel={() => {
                    if (expandedLyrics) setFollow(false);
                  }}
                  onTouchMove={() => {
                    if (expandedLyrics) setFollow(false);
                  }}
                  onPointerDown={(event) => {
                    if (expandedLyrics && event.target === event.currentTarget)
                      setFollow(false);
                  }}
                  onKeyDown={(event) => {
                    if (
                      expandedLyrics &&
                      [
                        "ArrowDown",
                        "ArrowUp",
                        "PageDown",
                        "PageUp",
                        "Home",
                        "End",
                        " ",
                      ].includes(event.key)
                    )
                      setFollow(false);
                  }}
                >
                  {song.lines.length ? (
                    <>
                      <div className="lyrics-intro">
                        {playerState === 0
                          ? "Song ended. Revisit any moment."
                          : song.lyricMode === "synced"
                            ? active < 0
                              ? "Press play. Let the words find you."
                              : "Click a line to find that moment."
                            : "Original words, at your own pace."}
                      </div>
                      {song.lines.map((line, index) => {
                        const isActive = active === index;
                        const translated =
                          mode !== "original" && line.englishText !== undefined;
                        const main = translated
                          ? line.englishText
                          : line.originalText;
                        return (
                          <button
                            ref={isActive ? activeRef : undefined}
                            className={`lyric-line ${isActive ? "active" : ""} ${index === active + 1 ? "upcoming" : ""} ${active < 0 && index === 0 ? "first-cue" : ""} ${active > index ? "past" : ""} ${!line.originalText ? "instrumental" : ""}`}
                            key={line.id}
                            aria-current={isActive ? "true" : undefined}
                            disabled={line.startMs === null}
                            onClick={() => {
                              if (line.startMs !== null) {
                                setSeek({
                                  seconds:
                                    line.startMs / 1000 + song.offsetSeconds,
                                  nonce: Date.now(),
                                });
                                setFollow(true);
                              }
                            }}
                          >
                            {isActive && (
                              <span className="current-label">
                                <span className="equalizer">
                                  <i />
                                  <i />
                                  <i />
                                </span>{" "}
                                Current line ·{" "}
                                {formatTime((line.startMs || 0) / 1000)}
                              </span>
                            )}
                            <span className="lyric-primary" dir="auto">
                              {main || "♪"}
                            </span>
                            {mode === "both" &&
                              translated &&
                              line.originalText && (
                                <span className="lyric-original" dir="auto">
                                  {line.originalText}
                                </span>
                              )}
                          </button>
                        );
                      })}
                      <div className="lyrics-end">
                        {song.lyricMode === "synced"
                          ? "Every word, a little closer."
                          : "End of lyrics"}
                      </div>
                    </>
                  ) : (
                    <div className="lyrics-empty">
                      <span className="empty-lyric-icon">
                        <Languages size={34} />
                      </span>
                      <h2>
                        {busy ? "Finding the words" : "Let’s find your lyrics"}
                      </h2>
                      <p>
                        {busy
                          ? "Your video is ready. The lyrics will join you here."
                          : "Choose a recording, or adjust the song title to find a match."}
                      </p>
                      {!busy && (
                        <button
                          className="secondary"
                          disabled={cooldown > 0}
                          onClick={editMatch}
                        >
                          <Search size={16} /> Find lyrics
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="lyrics-footer">
                  <span>
                    <Sparkles size={14} />{" "}
                    {hasTranslation
                      ? "Translated with context"
                      : "Original lyrics"}
                  </span>
                  {!follow && song.lyricMode === "synced" ? (
                    <button
                      className="follow-button"
                      onClick={() => setFollow(true)}
                    >
                      <ArrowDown size={14} /> Follow
                    </button>
                  ) : (
                    <span>{song.lrclibId ? "Lyrics by LRCLIB" : ""}</span>
                  )}
                </div>
              </section>
            </div>
            <PlaybackControls
              time={time}
              duration={duration || song.durationSeconds || 0}
              playing={playerState === 1}
              buffering={playerState === 3}
              ready={playerReady}
              volume={volume}
              muted={muted}
              showVideo={showVideo}
              onTogglePlayback={() => playerControls.current?.togglePlayback()}
              onSeek={seekTo}
              onVolume={(value) => {
                playerControls.current?.setVolume(value);
                setVolume(value);
                if (value > 0) setMuted(false);
              }}
              onMute={() => {
                playerControls.current?.toggleMute();
                setMuted((value) => !value);
              }}
              onToggleVideo={() => setShowVideo((value) => !value)}
              onSync={() => setModal("settings")}
            />
          </>
        )}
        {cacheError && (
          <p className="notice" role="status">
            {cacheError}
          </p>
        )}
      </main>
      <footer className="app-footer">
        <span>Made for listening. Built for understanding.</span>
        <span>
          <ShieldCheck size={13} /> No account. Just your music.
        </span>
      </footer>
      {modal === "match" && song && (
        <Dialog title="Find the right words" onClose={() => setModal(null)}>
          <p className="sheet-description">
            Check the song title and artist, then choose the recording that
            sounds like yours. Leave the artist blank to broaden the search.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || cooldown) return;
              const current = {
                ...song,
                trackTitle: editTitle.trim(),
                artist: editArtist.trim(),
                updatedAt: Date.now(),
              };
              setSong(current);
              void search(current, ++requestId.current, true);
            }}
          >
            <label>
              Song title
              <input
                required
                maxLength={300}
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                placeholder="Song title"
              />
            </label>
            <label>
              Artist (optional)
              <input
                maxLength={300}
                value={editArtist}
                onChange={(event) => setEditArtist(event.target.value)}
                placeholder="Artist name"
              />
            </label>
            <button className="primary full" disabled={busy || cooldown > 0}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Search size={17} />
              )}{" "}
              Search lyrics
            </button>
          </form>
          {error && (
            <p className="notice error" role="alert">
              {error}
              {cooldown > 0 && ` Retry in ${cooldown}s.`}
            </p>
          )}
          <div className="candidate-list">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                className="candidate"
                disabled={busy || cooldown > 0}
                onClick={() =>
                  void selectRecord(candidate.id, song, ++requestId.current)
                }
              >
                <span>
                  <strong>{candidate.trackName}</strong>
                  <span>
                    {candidate.artistName} ·{" "}
                    {candidate.duration
                      ? formatTime(candidate.duration)
                      : "Duration unknown"}
                  </span>
                  <small>{candidate.albumName}</small>
                </span>
                <span className={`badge ${candidate.synced ? "success" : ""}`}>
                  {candidate.synced ? (
                    <>
                      <Check size={12} /> Synced
                    </>
                  ) : candidate.instrumental ? (
                    "Instrumental"
                  ) : candidate.hasLyrics ? (
                    "Untimed"
                  ) : (
                    "No lyrics"
                  )}
                </span>
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog title="Make it yours" onClose={() => setModal(null)}>
          <div className="settings-section">
            <h3>Lyrics display</h3>
            <ModeControl value={mode} onChange={changeMode} />
          </div>
          {song && (
            <div className="settings-section">
              <h3>For this song</h3>
              {syncControls}
              <button
                className="secondary full"
                disabled={busy || !song.lines.length || cooldown > 0}
                onClick={() => {
                  setModal(null);
                  void translate(song, ++requestId.current, true);
                }}
              >
                <RotateCcw size={15} /> Regenerate English translation
              </button>
            </div>
          )}
          <div className="settings-section">
            <h3>English translation</h3>
            <p className="caption">
              {configured === false
                ? "Add GROQ_API_KEY to .env.local and restart the server to enable AI song identification and English translations."
                : configured
                  ? "Translation is configured. Original lyrics stay available if the provider is busy."
                  : "Translation availability will be checked when a song is opened."}
            </p>
          </div>
          {!standalone && (
            <button
              className="secondary full"
              onClick={() => void installApp()}
            >
              <Download size={17} /> Install Versara
            </button>
          )}
          <div className="settings-section">
            <h3>On this device</h3>
            <p className="caption">
              Your last 20 songs, lyrics, translations, and timing adjustments
              are saved here.
            </p>
            <button
              className="danger-button"
              onClick={async () => {
                if (!clearConfirm) {
                  setClearConfirm(true);
                  return;
                }
                try {
                  await clearSongs();
                  requestId.current++;
                  setStage("idle");
                  setRecents([]);
                  setSong(null);
                  setUrl("");
                  setError("");
                  setModal(null);
                } catch {
                  setCacheError(
                    "Couldn’t clear local storage. Please try again in your browser settings.",
                  );
                }
              }}
            >
              <Trash2 size={16} />
              {clearConfirm
                ? "Confirm: clear all saved songs"
                : "Clear saved songs and translations"}
            </button>
          </div>
        </Dialog>
      )}
      {modal === "install" && (
        <Dialog title="Take the music with you" onClose={() => setModal(null)}>
          <p className="sheet-description">
            Add Versara to your home screen for a little space of its own.
          </p>
          <div className="install-steps">
            <h3>iPhone & iPad · Safari</h3>
            <p>
              Tap <strong>Share</strong>, choose{" "}
              <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>
              . You may need to scroll through the Share menu.
            </p>
            <h3>Android · Chrome</h3>
            <p>
              Open the browser menu <strong>⋮</strong>, then choose{" "}
              <strong>Install app</strong> or{" "}
              <strong>Add to Home screen</strong>.
            </p>
            <h3>Desktop · Chrome & Edge</h3>
            <p>
              Use the install icon in the address bar, or open the browser menu
              and choose <strong>Install Versara</strong>.
            </p>
          </div>
          <p className="notice">
            Use HTTPS in production. Installation depends on your browser.
            YouTube playback and new translations need internet.
          </p>
        </Dialog>
      )}
    </div>
  );
}
