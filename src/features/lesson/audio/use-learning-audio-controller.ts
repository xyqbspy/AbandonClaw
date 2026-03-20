"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LessonSentence } from "@/lib/types";
import { buildChunkAudioKey } from "@/lib/shared/tts";
import { ensureChunkTtsFromApi, ensureSentenceTtsFromApi } from "@/lib/utils/tts-api";
import { useSingleAudioPlayer } from "@/hooks/use-single-audio-player";

type SentencePlayMode = "normal" | "slow";

interface LearningAudioConfig {
  sentencePause: number;
  chunkPause: number;
}

interface LearningPlaybackState {
  isPlaying: boolean;
  loopEnabled: boolean;
  currentSentenceId: string | null;
  currentChunkKey: string | null;
  currentChunkText: string | null;
}

const defaultConfig: LearningAudioConfig = {
  sentencePause: 400,
  chunkPause: 300,
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const normalizeChunkOrder = (sentence: LessonSentence) => {
  const detailSorted = [...(sentence.chunkDetails ?? [])]
    .filter((item) => item.text?.trim())
    .sort((a, b) => a.start - b.start)
    .map((item) => item.text.trim());

  if (detailSorted.length > 0) {
    return Array.from(new Set(detailSorted));
  }

  return [...sentence.chunks]
    .filter((chunk) => chunk.trim())
    .sort((a, b) => sentence.text.indexOf(a) - sentence.text.indexOf(b));
};

const speakByBrowser = async (text: string, rate = 1) => {
  if (typeof window === "undefined") {
    throw new Error("window not available");
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    throw new Error("speech synthesis unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = rate;
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("speech synthesis failed"));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
};

export function useLearningAudioController(params: {
  sceneSlug: string;
  config?: Partial<LearningAudioConfig>;
}) {
  const config = useMemo<LearningAudioConfig>(
    () => ({
      sentencePause: params.config?.sentencePause ?? defaultConfig.sentencePause,
      chunkPause: params.config?.chunkPause ?? defaultConfig.chunkPause,
    }),
    [params.config?.chunkPause, params.config?.sentencePause],
  );
  const { playUntilEnd, stop: stopSingleAudio } = useSingleAudioPlayer();
  const runIdRef = useRef(0);
  const loopEnabledRef = useRef(false);
  const sentenceRegistryRef = useRef<Map<string, LessonSentence>>(new Map());
  const [state, setState] = useState<LearningPlaybackState>({
    isPlaying: false,
    loopEnabled: false,
    currentSentenceId: null,
    currentChunkKey: null,
    currentChunkText: null,
  });

  const stopAll = useCallback(() => {
    runIdRef.current += 1;
    stopSingleAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentChunkKey: null,
      currentChunkText: null,
    }));
  }, [stopSingleAudio]);

  const registerSentence = useCallback((sentence: LessonSentence) => {
    sentenceRegistryRef.current.set(sentence.id, sentence);
  }, []);

  const playSentenceInternal = useCallback(
    async (sentence: LessonSentence, mode: SentencePlayMode, runId: number) => {
      const text = (sentence.tts?.trim() || sentence.audioText?.trim() || sentence.text).trim();
      if (!text) return;
      if (runId !== runIdRef.current) return;

      setState((prev) => ({
        ...prev,
        isPlaying: true,
        currentSentenceId: sentence.id,
        currentChunkKey: null,
        currentChunkText: null,
      }));

      try {
        const url = await ensureSentenceTtsFromApi({
          sceneSlug: params.sceneSlug,
          sentenceId: sentence.id,
          text,
          mode,
          speaker: sentence.speaker,
        });
        if (runId !== runIdRef.current) return;
        await playUntilEnd({
          url,
          key: `sentence:${sentence.id}:${mode}`,
          label: text,
        });
      } catch {
        if (runId !== runIdRef.current) return;
        await speakByBrowser(text, mode === "slow" ? 0.8 : 1);
      }
    },
    [params.sceneSlug, playUntilEnd],
  );

  const playChunkInternal = useCallback(
    async (
      payload: {
        chunkKey: string;
        chunkText: string;
        sentenceId?: string | null;
      },
      runId: number,
    ) => {
      const text = payload.chunkText.trim();
      if (!text) return;
      if (runId !== runIdRef.current) return;
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        currentSentenceId: payload.sentenceId ?? prev.currentSentenceId,
        currentChunkKey: payload.chunkKey,
        currentChunkText: text,
      }));

      try {
        const url = await ensureChunkTtsFromApi({
          chunkKey: payload.chunkKey,
          chunkText: text,
        });
        if (runId !== runIdRef.current) return;
        await playUntilEnd({
          url,
          key: `chunk:${payload.chunkKey}`,
          label: text,
        });
      } catch {
        if (runId !== runIdRef.current) return;
        await speakByBrowser(text, 1);
      }
    },
    [playUntilEnd],
  );

  const playSentence = useCallback(
    async (sentenceId: string, mode: SentencePlayMode) => {
      const sentence = sentenceRegistryRef.current.get(sentenceId);
      if (!sentence) return;
      stopAll();
      const runId = runIdRef.current;
      try {
        await playSentenceInternal(sentence, mode, runId);
      } finally {
        if (runId === runIdRef.current) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            currentChunkKey: null,
            currentChunkText: null,
          }));
        }
      }
    },
    [playSentenceInternal, stopAll],
  );

  const playChunk = useCallback(
    async (chunkKey: string, chunkText?: string) => {
      const fallbackText = chunkText?.trim() ?? "";
      if (!fallbackText) return;
      stopAll();
      const runId = runIdRef.current;
      try {
        await playChunkInternal({ chunkKey, chunkText: fallbackText }, runId);
      } finally {
        if (runId === runIdRef.current) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            currentChunkText: null,
          }));
        }
      }
    },
    [playChunkInternal, stopAll],
  );

  const playLearningSequence = useCallback(
    async (sentence: LessonSentence) => {
      registerSentence(sentence);
      stopAll();
      const runId = runIdRef.current;
      const chunkTexts = normalizeChunkOrder(sentence);

      const runOnce = async () => {
        await playSentenceInternal(sentence, "normal", runId);
        if (runId !== runIdRef.current) return;
        await delay(config.sentencePause);
        if (runId !== runIdRef.current) return;

        for (const chunkText of chunkTexts) {
          const chunkKey = buildChunkAudioKey(chunkText);
          await playChunkInternal(
            {
              chunkKey,
              chunkText,
              sentenceId: sentence.id,
            },
            runId,
          );
          if (runId !== runIdRef.current) return;
          await delay(config.chunkPause);
          if (runId !== runIdRef.current) return;
        }
      };

      try {
        do {
          await runOnce();
          if (runId !== runIdRef.current) return;
        } while (loopEnabledRef.current);
      } finally {
        if (runId === runIdRef.current) {
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            currentChunkKey: null,
            currentChunkText: null,
          }));
        }
      }
    },
    [config.chunkPause, config.sentencePause, playChunkInternal, playSentenceInternal, registerSentence, stopAll],
  );

  const toggleLoop = useCallback((enabled: boolean) => {
    loopEnabledRef.current = enabled;
    setState((prev) => ({
      ...prev,
      loopEnabled: enabled,
    }));
  }, []);

  useEffect(
    () => () => {
      stopAll();
    },
    [stopAll],
  );

  return {
    state,
    config,
    registerSentence,
    stopAll,
    toggleLoop,
    playSentence,
    playChunk,
    playLearningSequence,
  };
}
