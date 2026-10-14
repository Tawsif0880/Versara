"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ExternalLink, RotateCcw } from "lucide-react";

type Player = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  seekTo(time: number, ahead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getVolume(): number;
  setVolume(value: number): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  destroy(): void;
};
type PlayerEvent = { target: Player; data: number };
type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady(event: PlayerEvent): void;
        onStateChange(event: PlayerEvent): void;
        onError(event: PlayerEvent): void;
        onAutoplayBlocked(): void;
      };
    },
  ) => Player;
};
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YouTubeApi> | undefined;
function loadApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeApi>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      loading = undefined;
      script.remove();
      reject(new Error("YouTube took too long to respond."));
    }, 20000);
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      clearTimeout(timeout);
      if (window.YT) resolve(window.YT);
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      loading = undefined;
      reject(new Error("YouTube could not be reached."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
export type YouTubeControls = {
  togglePlayback(): void;
  setVolume(value: number): void;
  toggleMute(): void;
};
type AudioState = { volume: number; muted: boolean };
export const YouTubePlayer = forwardRef<
  YouTubeControls,
  {
    videoId: string;
    onTime: (
      seconds: number,
      duration: number,
      state: number,
      audio: AudioState,
    ) => void;
    seekRequest: { seconds: number; nonce: number } | null;
    showVideo: boolean;
    onReadyChange(ready: boolean): void;
    onPlaybackBlocked(): void;
  }
>(function YouTubePlayer(
  { videoId, onTime, seekRequest, showVideo, onReadyChange, onPlaybackBlocked },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const timeCallback = useRef(onTime);
  const pendingSeek = useRef(seekRequest);
  const readyCallback = useRef(onReadyChange);
  const blockedCallback = useRef(onPlaybackBlocked);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    timeCallback.current = onTime;
    readyCallback.current = onReadyChange;
    blockedCallback.current = onPlaybackBlocked;
  }, [onTime, onReadyChange, onPlaybackBlocked]);
  useImperativeHandle(
    ref,
    () => ({
      togglePlayback() {
        const player = playerRef.current;
        if (!player) return;
        if (player.getPlayerState() === 1) player.pauseVideo();
        else {
          if (player.getPlayerState() === 0) player.seekTo(0, true);
          player.playVideo();
        }
      },
      setVolume(value) {
        const player = playerRef.current;
        if (!player) return;
        player.setVolume(Math.max(0, Math.min(100, value)));
        if (value > 0) player.unMute();
      },
      toggleMute() {
        const player = playerRef.current;
        if (!player) return;
        if (player.isMuted()) player.unMute();
        else player.mute();
      },
    }),
    [],
  );
  useEffect(() => {
    let cancelled = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    let player: Player | undefined;
    const sample = () => {
      if (cancelled || !player) return;
      const state = player.getPlayerState();
      timeCallback.current(
        player.getCurrentTime() || 0,
        player.getDuration() || 0,
        state,
        { volume: player.getVolume(), muted: player.isMuted() },
      );
      // A native YouTube seek while paused may not emit a state change.
      timer = setTimeout(sample, state === 1 || state === 2 ? 180 : 500);
    };
    loadApi()
      .then((api) => {
        if (cancelled || !container.current) return;
        const mount = document.createElement("div");
        container.current.replaceChildren(mount);
        player = new api.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              playerRef.current = event.target;
              readyCallback.current(true);
              if (pendingSeek.current)
                event.target.seekTo(
                  Math.max(0, pendingSeek.current.seconds),
                  true,
                );
              if (timer) clearTimeout(timer);
              sample();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              if (event.data === 1) setError("");
              timeCallback.current(
                event.target.getCurrentTime() || 0,
                event.target.getDuration() || 0,
                event.data,
                {
                  volume: event.target.getVolume(),
                  muted: event.target.isMuted(),
                },
              );
            },
            onError: (event) => {
              if (!cancelled) readyCallback.current(false);
              if (!cancelled)
                setError(
                  [101, 150].includes(event.data)
                    ? "The owner has disabled embedded playback for this video."
                    : event.data === 153
                      ? "YouTube could not verify this embed. Open Versara over HTTPS or localhost."
                      : "This video can’t be played here. It may be private, removed, or restricted.",
                );
            },
            onAutoplayBlocked: () => {
              if (cancelled) return;
              setError(
                "Your browser needs a tap on the video to start sound. Press Play in the YouTube player below.",
              );
              blockedCallback.current();
            },
          },
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          readyCallback.current(false);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      playerRef.current = null;
      player?.destroy();
    };
  }, [videoId, attempt]);
  useEffect(() => {
    pendingSeek.current = seekRequest;
    if (seekRequest && playerRef.current) {
      playerRef.current.seekTo(Math.max(0, seekRequest.seconds), true);
      timeCallback.current(
        Math.max(0, seekRequest.seconds),
        playerRef.current.getDuration(),
        playerRef.current.getPlayerState(),
        {
          volume: playerRef.current.getVolume(),
          muted: playerRef.current.isMuted(),
        },
      );
    }
  }, [seekRequest]);
  return (
    <div
      className={`video-card clay ${showVideo ? "video-visible" : "audio-only"}`}
    >
      <div className="video-viewport" ref={container} hidden={!showVideo} />
      {error && (
        <div className="video-error" role="alert">
          <p>{error}</p>
          <div className="actions">
            <button
              onClick={() => {
                setError("");
                readyCallback.current(false);
                setAttempt((a) => a + 1);
              }}
            >
              <RotateCcw size={15} /> Retry player
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open YouTube <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
});
