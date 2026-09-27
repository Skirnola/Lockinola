"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RADAR_VIDEO_ID = "kcT-i9xzC-8";
const RADAR_URL = `https://www.youtube.com/watch?v=${RADAR_VIDEO_ID}`;

type YouTubePlayer = { playVideo: () => void; destroy: () => void };
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: {
    width: string;
    height: string;
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { data: number }) => void;
      onAutoplayBlocked: () => void;
      onError: () => void;
    };
  }) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTubeAPI> | null = null;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error("YouTube did not load")), 10_000);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube player unavailable"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error("YouTube did not load")); };
    document.head.appendChild(script);
  });
  void apiPromise.catch(() => { apiPromise = null; });
  return apiPromise;
}

export function FocusAlarm({ open, preview, onDismiss, onVideoPlaying }: {
  open: boolean;
  preview: boolean;
  onDismiss: () => void;
  onVideoPlaying: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onVideoPlayingRef = useRef(onVideoPlaying);
  const [playerState, setPlayerState] = useState<"loading" | "ready" | "playing" | "blocked" | "unavailable">("loading");

  useEffect(() => { onVideoPlayingRef.current = onVideoPlaying; }, [onVideoPlaying]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let host: HTMLDivElement | null = null;
    queueMicrotask(() => { if (!cancelled) setPlayerState("loading"); });
    const watchdog = window.setTimeout(() => {
      if (!cancelled) setPlayerState(state => state === "playing" || state === "blocked" ? state : "unavailable");
    }, 8000);
    void loadYouTubeAPI().then(api => {
      if (cancelled || !hostRef.current) return;
      host = hostRef.current;
      const mount = document.createElement("div");
      host.appendChild(mount);
      player = new api.Player(mount, {
        width: "100%",
        height: "210",
        videoId: RADAR_VIDEO_ID,
        playerVars: { autoplay: 1, controls: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: event => { if (!cancelled) { setPlayerState("ready"); event.target.playVideo(); } },
          onStateChange: event => { if (!cancelled && event.data === 1) { setPlayerState("playing"); onVideoPlayingRef.current(); } },
          onAutoplayBlocked: () => { if (!cancelled) setPlayerState("blocked"); },
          onError: () => { if (!cancelled) setPlayerState("unavailable"); },
        },
      });
    }).catch(() => { if (!cancelled) setPlayerState("unavailable"); });
    return () => { cancelled = true; window.clearTimeout(watchdog); player?.destroy(); host?.replaceChildren(); };
  }, [open]);

  return <Dialog open={open} onOpenChange={next => { if (!next) onDismiss(); }}>
    <DialogContent className="focus-alarm-dialog">
      <DialogHeader>
        <span className="eyebrow"><Timer size={14} /> FOCUS SESSION</span>
        <DialogTitle>{preview ? "Alarm preview." : "Time&apos;s up."}</DialogTitle>
        <DialogDescription>{preview ? "Check the sound before a session. This preview does not save time." : "Your session is complete and its time has been saved."}</DialogDescription>
      </DialogHeader>
      <div className="focus-alarm-source">
        <span>iPhone Radar alarm · YouTube</span>
        <div className={`focus-alarm-player ${playerState === "unavailable" ? "unavailable" : ""}`} ref={hostRef} />
        <p aria-live="polite">{playerState === "playing" ? "Radar is playing." : playerState === "blocked" ? "Autoplay was blocked. Press play in the video; a backup alert also sounds." : playerState === "unavailable" ? "YouTube could not start here. The backup alert sounds; open the clip with the link below." : "Starting Radar. A backup alert sounds until the video plays."}</p>
        <a href={RADAR_URL} target="_blank" rel="noreferrer">Open alarm on YouTube <ExternalLink size={13} /></a>
      </div>
      <button className="primary-btn focus-alarm-stop" onClick={onDismiss}><Check size={16} /> Stop alarm</button>
    </DialogContent>
  </Dialog>;
}
