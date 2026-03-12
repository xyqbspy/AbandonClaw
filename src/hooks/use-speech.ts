"use client";

import { useCallback, useId, useRef, useState } from "react";

type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

let globalSpeechOwnerId: string | null = null;

export function useSpeech() {
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const instanceId = useId();
  const instanceIdRef = useRef(`speech-${instanceId}`);
  const speakSeqRef = useRef(0);

  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const stop = useCallback(() => {
    if (!supported) return;
    speakSeqRef.current += 1;
    if (globalSpeechOwnerId === instanceIdRef.current) {
      globalSpeechOwnerId = null;
    }
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setSpeakingText(null);
    setPaused(false);
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported) return false;
    if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) return false;
    window.speechSynthesis.pause();
    setPaused(true);
    return true;
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return false;
    if (!window.speechSynthesis.paused) return false;
    window.speechSynthesis.resume();
    setPaused(false);
    return true;
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const clean = text.trim();
      if (!clean || !supported) return false;
      const ownerId = instanceIdRef.current;
      speakSeqRef.current += 1;
      const currentSeq = speakSeqRef.current;
      globalSpeechOwnerId = ownerId;
      window.speechSynthesis.cancel();
      utterRef.current = null;
      setSpeakingText(null);
      setPaused(false);

      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = options?.lang ?? "en-US";
      utter.rate = options?.rate ?? 1;
      utter.pitch = options?.pitch ?? 1;
      utter.onstart = () => {
        if (globalSpeechOwnerId !== ownerId || speakSeqRef.current !== currentSeq) return;
        setSpeakingText(clean);
        setPaused(false);
        options?.onStart?.();
      };
      utter.onend = () => {
        if (globalSpeechOwnerId !== ownerId || speakSeqRef.current !== currentSeq) {
          setSpeakingText(null);
          setPaused(false);
          return;
        }
        setSpeakingText(null);
        setPaused(false);
        options?.onEnd?.();
      };
      utter.onerror = () => {
        if (globalSpeechOwnerId !== ownerId || speakSeqRef.current !== currentSeq) {
          setSpeakingText(null);
          setPaused(false);
          return;
        }
        setSpeakingText(null);
        setPaused(false);
        options?.onError?.();
      };

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
      return true;
    },
    [supported],
  );

  return {
    speak,
    stop,
    pause,
    resume,
    supported,
    speakingText,
    paused,
  };
}
