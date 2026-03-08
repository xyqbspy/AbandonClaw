"use client";

import { useCallback, useRef, useState } from "react";

type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

export function useSpeech() {
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  const stop = useCallback(() => {
    if (!supported) return;
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

      stop();

      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = options?.lang ?? "en-US";
      utter.rate = options?.rate ?? 1;
      utter.pitch = options?.pitch ?? 1;
      utter.onstart = () => {
        setSpeakingText(clean);
        setPaused(false);
        options?.onStart?.();
      };
      utter.onend = () => {
        setSpeakingText((prev) => (prev === clean ? null : prev));
        setPaused(false);
        options?.onEnd?.();
      };
      utter.onerror = () => {
        setSpeakingText((prev) => (prev === clean ? null : prev));
        setPaused(false);
        options?.onError?.();
      };

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
      return true;
    },
    [stop, supported],
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
