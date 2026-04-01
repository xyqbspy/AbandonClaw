"use client";

import { useCallback, useRef } from "react";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import {
  playChunkAudio,
  playSceneLoopAudio,
  playSentenceAudio,
  setTtsLooping,
  stopTtsPlayback,
} from "@/lib/utils/tts-api";
import { useTtsPlaybackState } from "@/hooks/use-tts-playback-state";

type SentenceMode = "normal" | "slow";

type ChunkPlaybackOptions = {
  chunkText: string;
  chunkKey?: string;
  onError?: (error: unknown) => void;
};

type SentencePlaybackOptions = {
  sceneSlug: string;
  sentenceId: string;
  text: string;
  speaker?: string;
  mode?: SentenceMode;
  onError?: (error: unknown) => void;
};

type SceneLoopPlaybackOptions = {
  sceneSlug: string;
  sceneType?: "dialogue" | "monologue";
  segments: Array<{ text: string; speaker?: string }>;
  onBeforePlay?: () => void;
  onError?: (error: unknown) => void;
};

type RepeatingChunkLoopOptions = {
  chunkText: string;
  chunkKey?: string;
  intervalMs?: number;
  onError?: (error: unknown) => void;
};

const normalizeText = (text: string | null | undefined) => (text ?? "").trim();

export function useTtsPlaybackController() {
  const playbackState = useTtsPlaybackState();
  const repeatingLoopKeyRef = useRef<string | null>(null);

  const speakingText = playbackState.text ?? null;
  const loadingText = playbackState.status === "loading" ? playbackState.text ?? null : null;

  const stop = useCallback(() => {
    repeatingLoopKeyRef.current = null;
    stopTtsPlayback();
    setTtsLooping(false);
  }, []);

  const isTextActive = useCallback(
    (text: string | null | undefined) => {
      const clean = normalizeText(text);
      return clean.length > 0 && speakingText === clean && playbackState.status !== "idle";
    },
    [playbackState.status, speakingText],
  );

  const isTextLoading = useCallback(
    (text: string | null | undefined) => {
      const clean = normalizeText(text);
      return clean.length > 0 && loadingText === clean;
    },
    [loadingText],
  );

  const isSentenceActive = useCallback(
    (sentenceId: string, mode?: SentenceMode) => {
      if (playbackState.kind !== "sentence") return false;
      if (playbackState.sentenceId !== sentenceId) return false;
      if (playbackState.status === "idle") return false;
      if (!mode) return true;
      return (playbackState.mode ?? "normal") === mode;
    },
    [playbackState.kind, playbackState.mode, playbackState.sentenceId, playbackState.status],
  );

  const isSentenceLoading = useCallback(
    (sentenceId: string, mode?: SentenceMode) => {
      if (playbackState.kind !== "sentence") return false;
      if (playbackState.status !== "loading") return false;
      if (playbackState.sentenceId !== sentenceId) return false;
      if (!mode) return true;
      return (playbackState.mode ?? "normal") === mode;
    },
    [playbackState.kind, playbackState.mode, playbackState.sentenceId, playbackState.status],
  );

  const isChunkActive = useCallback(
    (chunkKey: string) =>
      playbackState.kind === "chunk" &&
      playbackState.chunkKey === chunkKey &&
      playbackState.status !== "idle",
    [playbackState.chunkKey, playbackState.kind, playbackState.status],
  );

  const isChunkLoading = useCallback(
    (text: string | null | undefined) => {
      const clean = normalizeText(text);
      return clean.length > 0 && playbackState.kind === "chunk" && loadingText === clean;
    },
    [loadingText, playbackState.kind],
  );

  const isSceneLooping = useCallback(
    (sceneSlug: string) =>
      playbackState.kind === "scene" &&
      playbackState.sceneSlug === sceneSlug &&
      Boolean(playbackState.isLooping),
    [playbackState.isLooping, playbackState.kind, playbackState.sceneSlug],
  );

  const isSceneLoopLoading = useCallback(
    (sceneSlug: string) =>
      playbackState.kind === "scene" &&
      playbackState.sceneSlug === sceneSlug &&
      playbackState.status === "loading" &&
      Boolean(playbackState.isLooping),
    [playbackState.isLooping, playbackState.kind, playbackState.sceneSlug, playbackState.status],
  );

  const toggleSentencePlayback = useCallback(
    async ({
      sceneSlug,
      sentenceId,
      text,
      speaker,
      mode = "normal",
      onError,
    }: SentencePlaybackOptions) => {
      const clean = normalizeText(text);
      if (!clean) return;
      if (isSentenceActive(sentenceId, mode)) {
        stop();
        return;
      }

      repeatingLoopKeyRef.current = null;
      stopTtsPlayback();
      setTtsLooping(false);

      try {
        await playSentenceAudio({
          sceneSlug,
          sentenceId,
          text: clean,
          speaker,
          mode,
        });
      } catch (error) {
        onError?.(error);
      }
    },
    [isSentenceActive, stop],
  );

  const toggleChunkPlayback = useCallback(
    async ({ chunkText, chunkKey, onError }: ChunkPlaybackOptions) => {
      const clean = normalizeText(chunkText);
      if (!clean) return;

      const resolvedChunkKey = chunkKey ?? buildChunkAudioKey(clean);
      if (isChunkActive(resolvedChunkKey)) {
        stop();
        return;
      }

      repeatingLoopKeyRef.current = null;
      stopTtsPlayback();
      setTtsLooping(false);

      try {
        await playChunkAudio({
          chunkText: clean,
          chunkKey: resolvedChunkKey,
        });
      } catch (error) {
        onError?.(error);
      }
    },
    [isChunkActive, stop],
  );

  const playChunkWithLoopState = useCallback(
    async ({ chunkText, chunkKey, onError }: ChunkPlaybackOptions) => {
      const clean = normalizeText(chunkText);
      if (!clean) return;

      const resolvedChunkKey = chunkKey ?? buildChunkAudioKey(clean);
      if (isChunkActive(resolvedChunkKey) || isTextLoading(clean)) {
        stop();
        return;
      }

      repeatingLoopKeyRef.current = null;
      stopTtsPlayback();
      setTtsLooping(true);

      try {
        await playChunkAudio({
          chunkText: clean,
          chunkKey: resolvedChunkKey,
        });
      } catch (error) {
        onError?.(error);
      } finally {
        setTtsLooping(false);
      }
    },
    [isChunkActive, isTextLoading, stop],
  );

  const toggleRepeatingChunkLoop = useCallback(
    async ({
      chunkText,
      chunkKey,
      intervalMs = 80,
      onError,
    }: RepeatingChunkLoopOptions) => {
      const clean = normalizeText(chunkText);
      if (!clean) return;

      const resolvedChunkKey = chunkKey ?? buildChunkAudioKey(clean);
      if (repeatingLoopKeyRef.current === resolvedChunkKey && isTextActive(clean)) {
        stop();
        return;
      }

      repeatingLoopKeyRef.current = resolvedChunkKey;
      stopTtsPlayback();
      setTtsLooping(true);

      try {
        while (repeatingLoopKeyRef.current === resolvedChunkKey) {
          await playChunkAudio({
            chunkText: clean,
            chunkKey: resolvedChunkKey,
          });

          if (repeatingLoopKeyRef.current !== resolvedChunkKey) {
            break;
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, intervalMs);
          });
        }
      } catch (error) {
        repeatingLoopKeyRef.current = null;
        onError?.(error);
      } finally {
        if (repeatingLoopKeyRef.current === resolvedChunkKey) {
          repeatingLoopKeyRef.current = null;
        }
        setTtsLooping(false);
      }
    },
    [isTextActive, stop],
  );

  const toggleSceneLoopPlayback = useCallback(
    async ({ sceneSlug, sceneType, segments, onBeforePlay, onError }: SceneLoopPlaybackOptions) => {
      if (isSceneLooping(sceneSlug)) {
        stop();
        return;
      }

      repeatingLoopKeyRef.current = null;

      try {
        onBeforePlay?.();
        await playSceneLoopAudio({
          sceneSlug,
          sceneType,
          segments,
        });
      } catch (error) {
        onError?.(error);
      }
    },
    [isSceneLooping, stop],
  );

  return {
    playbackState,
    speakingText,
    loadingText,
    stop,
    isTextActive,
    isTextLoading,
    isSentenceActive,
    isSentenceLoading,
    isChunkActive,
    isChunkLoading,
    isSceneLooping,
    isSceneLoopLoading,
    toggleSentencePlayback,
    toggleChunkPlayback,
    playChunkWithLoopState,
    toggleRepeatingChunkLoop,
    toggleSceneLoopPlayback,
  };
}
