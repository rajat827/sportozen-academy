"use client";
import { useRef, useState } from "react";
import { Play, Pause, Bookmark } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { formatMediaTime } from "./demo-media";

export function EvidenceVideo({
  src,
  poster,
  bookmarks,
  onBookmark,
}: {
  src: string;
  poster: string;
  bookmarks: number[];
  onBookmark: (seconds: number) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");
  async function toggle() {
    if (!video.current) return;
    if (!video.current.paused) video.current.pause();
    else {
      try {
        await video.current.play();
        setError("");
      } catch {
        setError(
          "Playback could not start. Try the video’s built-in controls.",
        );
      }
    }
  }
  function seek(seconds: number) {
    if (!video.current || !duration) return;
    video.current.currentTime = Math.min(duration, Math.max(0, seconds));
    setTime(video.current.currentTime);
  }
  return (
    <>
      <div className="demo-viewer">
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          poster={poster}
          aria-label="Fictional receiving practice video"
          onLoadedMetadata={(e) =>
            setDuration(
              Number.isFinite(e.currentTarget.duration)
                ? e.currentTarget.duration
                : 0,
            )
          }
          onDurationChange={(e) => {
            if (Number.isFinite(e.currentTarget.duration))
              setDuration(e.currentTarget.duration);
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => {
            setPlaying(true);
            setError("");
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setError(
              "This demo clip could not load. Reload the page or try another browser.",
            );
          }}
        >
          <source src={src} type="video/mp4" />
          <track
            kind="captions"
            src="/demo/receiving-practice.vtt"
            srcLang="en"
            label="English description"
          />
          Your browser does not support video playback.
        </video>
      </div>
      <p className="muted" style={{ margin: "10px 0" }}>
        Fictional practice animation · illustrates the workflow; not recorded
        player footage or proof of the observation.
      </p>
      <Card>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="video-controls">
          <Button
            variant="secondary"
            disabled={!duration || !!error}
            onClick={toggle}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? "Pause" : "Play demo"}
          </Button>
          <label className="timeline">
            <span className="sr-only">Video timeline</span>
            <input
              type="range"
              aria-label="Video timeline"
              min="0"
              max={duration || 0}
              step="1"
              value={time}
              disabled={!duration}
              onChange={(e) => seek(Number(e.target.value))}
            />
          </label>
          <span aria-label="Playback time">
            {formatMediaTime(time)} /{" "}
            {duration ? formatMediaTime(duration) : "Loading…"}
          </span>
          <Button
            variant="secondary"
            disabled={!duration}
            onClick={() =>
              onBookmark(Math.floor(video.current?.currentTime ?? time))
            }
          >
            <Bookmark size={16} />
            Bookmark
          </Button>
        </div>
        <div className="inline">
          {[...new Set(bookmarks)]
            .sort((a, b) => a - b)
            .map((b) => (
              <button
                key={b}
                className="badge blue"
                aria-label={`Seek to ${formatMediaTime(b)}`}
                disabled={!duration || b > duration}
                onClick={() => seek(b)}
              >
                {formatMediaTime(b)}
                {duration && b > duration ? " · outside clip" : ""}
              </button>
            ))}
        </div>
      </Card>
    </>
  );
}
