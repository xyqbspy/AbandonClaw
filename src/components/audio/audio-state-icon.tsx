"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type AudioVisualState = "idle" | "playing" | "paused" | "loading";
export type AudioIconFamily = "tts" | "play";

export function AudioStateIcon({
  family,
  state,
  className,
}: {
  family: AudioIconFamily;
  state: AudioVisualState;
  className?: string;
}) {
  if (family === "play") {
    if (state === "paused") {
      return (
        <Pause
          data-audio-icon-family="play"
          data-audio-icon-state={state}
          className={cn("size-4", className)}
        />
      );
    }

    return (
      <Play
        data-audio-icon-family="play"
        data-audio-icon-state={state}
        className={cn("size-4", state === "playing" && "animate-pulse", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-audio-icon-family="tts"
      data-audio-icon-state={state}
      className={cn("size-4", className)}
    >
      <path
        className={cn(state === "paused" && "opacity-45")}
        d="M10 5L6 9H3v6h3l4 4V5z"
      />
      {state === "idle" ? (
        <path d="M14.8 8.8a4.4 4.4 0 0 1 0 6.4" />
      ) : null}
      {state === "playing" ? (
        <>
          <path className="animate-pulse" d="M14.8 8.8a4.4 4.4 0 0 1 0 6.4" />
          <path className="animate-pulse [animation-delay:120ms]" d="M18 6.2a8.2 8.2 0 0 1 0 11.6" />
          <path className="animate-pulse [animation-delay:220ms]" d="M21.2 3.8a11.8 11.8 0 0 1 0 16.4" />
        </>
      ) : null}
      {state === "paused" ? (
        <>
          <line x1="14.2" y1="8.8" x2="14.2" y2="15.2" />
          <line x1="18" y1="8.8" x2="18" y2="15.2" />
        </>
      ) : null}
    </svg>
  );
}
