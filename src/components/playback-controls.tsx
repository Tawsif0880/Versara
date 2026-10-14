"use client";

import {
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatTime } from "@/lib/lyrics";
import type { CSSProperties } from "react";

export function PlaybackControls({
  time,
  duration,
  playing,
  buffering,
  ready,
  volume,
  muted,
  showVideo,
  onTogglePlayback,
  onSeek,
  onVolume,
  onMute,
  onToggleVideo,
  onSync,
}: {
  time: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  ready: boolean;
  volume: number;
  muted: boolean;
  showVideo: boolean;
  onTogglePlayback(): void;
  onSeek(seconds: number): void;
  onVolume(value: number): void;
  onMute(): void;
  onToggleVideo(): void;
  onSync(): void;
}) {
  const elapsed = Math.max(0, Math.min(time, duration || time));
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  return (
    <section className="playback-controls" aria-label="Playback controls">
      <div className="seek-bar">
        <input
          aria-label="Playback position"
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={elapsed}
          disabled={!ready || !duration}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`}
          style={{ "--playback-progress": `${progress}%` } as CSSProperties}
        />
        <div className="playback-times">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="transport-row">
        <button
          className="transport-secondary"
          aria-label="Rewind 10 seconds"
          disabled={!ready}
          onClick={() => onSeek(Math.max(0, time - 10))}
        >
          <RotateCcw size={20} />
          <small>10</small>
        </button>
        <button
          className="play-toggle"
          aria-label={playing ? "Pause" : "Play"}
          disabled={!ready}
          onClick={onTogglePlayback}
        >
          {buffering || !ready ? (
            <LoaderCircle className="spin" size={25} />
          ) : playing ? (
            <Pause size={25} fill="currentColor" />
          ) : (
            <Play size={25} fill="currentColor" />
          )}
        </button>
        <button
          className="transport-secondary"
          aria-label="Forward 10 seconds"
          disabled={!ready}
          onClick={() => onSeek(Math.min(duration || time + 10, time + 10))}
        >
          <RotateCw size={20} />
          <small>10</small>
        </button>
      </div>
      <div className="playback-utilities">
        <div className="volume-controls">
          <button
            className="volume-toggle"
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            disabled={!ready}
            onClick={onMute}
          >
            {muted || volume === 0 ? (
              <VolumeX size={19} />
            ) : (
              <Volume2 size={19} />
            )}
          </button>
          <input
            aria-label="Volume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={muted ? 0 : volume}
            disabled={!ready}
            onChange={(event) => onVolume(Number(event.target.value))}
            aria-valuetext={`${muted ? 0 : volume}%`}
          />
        </div>
        <div className="playback-options">
          <button onClick={onSync}>
            <SlidersHorizontal size={16} />
            <span>Sync</span>
          </button>
          <button onClick={onToggleVideo} aria-pressed={showVideo}>
            {showVideo ? <VideoOff size={16} /> : <Video size={16} />}
            <span>{showVideo ? "Hide video" : "Show video"}</span>
          </button>
        </div>
      </div>
      <p className="volume-hint">
        If volume stays unchanged, use your phone’s volume buttons.
      </p>
    </section>
  );
}
